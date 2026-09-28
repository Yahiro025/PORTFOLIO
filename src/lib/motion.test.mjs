import assert from 'node:assert/strict'
import test from 'node:test'

import { pinProgress } from './motion.ts'

const stubWindow = (innerHeight) => {
    const prior = globalThis.window
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerHeight }, writable: true })

    return () => {
        if (prior === undefined) delete globalThis.window
        else Object.defineProperty(globalThis, 'window', { configurable: true, value: prior, writable: true })
    }
}

const stubWrap = (rect) => {
    let calls = 0
    const wrap = {
        getBoundingClientRect: () => {
            calls += 1

            return rect
        }
    }

    return { calls: () => calls, wrap }
}

test('pinProgress reuses a premeasured rect instead of a second geometry read', () => {
    const restore = stubWindow(800)
    try {
        const rect = { height: 2800, top: -500 }
        const first = stubWrap(rect)
        const expected = pinProgress(first.wrap)
        assert.equal(first.calls(), 1)

        const second = stubWrap(rect)
        const premeasured = second.wrap.getBoundingClientRect()
        assert.equal(second.calls(), 1)
        const actual = pinProgress(second.wrap, premeasured)
        assert.equal(actual, expected)
        assert.equal(second.calls(), 1)
    } finally {
        restore()
    }
})

test('pinProgress measures once when no rect is passed', () => {
    const restore = stubWindow(800)
    try {
        const first = stubWrap({ height: 2800, top: -500 })
        pinProgress(first.wrap)
        assert.equal(first.calls(), 1)
    } finally {
        restore()
    }
})
