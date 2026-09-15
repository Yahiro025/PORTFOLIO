import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import handler from '../pages/api/refresh-github.ts'

const createMockResponse = () => ({
    statusCode: 0,
    body: undefined,
    headers: {},
    revalidatedPaths: [],
    revalidateImpl: async () => {},
    setHeader(name, value) {
        this.headers[name] = value
    },
    status(code) {
        this.statusCode = code
        return this
    },
    json(payload) {
        this.body = payload
        return this
    },
    async revalidate(path) {
        this.revalidatedPaths.push(path)
        return this.revalidateImpl(path)
    }
})

const originalSecret = process.env.CRON_SECRET

afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
})

test('returns 401 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = createMockResponse()
    await handler({ method: 'GET', headers: { authorization: 'Bearer anything' } }, res)

    assert.equal(res.statusCode, 401)
    assert.equal(res.revalidatedPaths.length, 0)
})

test('returns 401 when the authorization header does not match CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret'

    const res = createMockResponse()
    await handler({ method: 'GET', headers: { authorization: 'Bearer wrong-secret' } }, res)

    assert.equal(res.statusCode, 401)
    assert.equal(res.revalidatedPaths.length, 0)
    assert.equal(JSON.stringify(res.body).includes('test-secret'), false)
})

test('returns 405 and does not revalidate for non-GET requests', async () => {
    process.env.CRON_SECRET = 'test-secret'

    const res = createMockResponse()
    await handler({ method: 'POST', headers: { authorization: 'Bearer test-secret' } }, res)

    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.Allow, 'GET')
    assert.equal(res.revalidatedPaths.length, 0)
})

test('revalidates the homepage once and returns 200 for a valid request', async () => {
    process.env.CRON_SECRET = 'test-secret'

    const res = createMockResponse()
    await handler({ method: 'GET', headers: { authorization: 'Bearer test-secret' } }, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.revalidatedPaths, ['/'])
})

test('returns 500 without leaking details when revalidation is rejected', async () => {
    process.env.CRON_SECRET = 'test-secret'

    const originalError = console.error
    console.error = () => {}

    const res = createMockResponse()
    res.revalidateImpl = async () => {
        throw new Error('internal cache exploded')
    }

    try {
        await handler({ method: 'GET', headers: { authorization: 'Bearer test-secret' } }, res)
    } finally {
        console.error = originalError
    }

    const serialized = JSON.stringify(res.body)
    assert.equal(res.statusCode, 500)
    assert.deepEqual(res.revalidatedPaths, ['/'])
    assert.equal(serialized.includes('test-secret'), false)
    assert.equal(serialized.includes('internal cache exploded'), false)
})
