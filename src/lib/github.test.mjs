import assert from 'node:assert/strict'
import test from 'node:test'

import { loadGitHubSnapshot } from './github.ts'

// Never pass `undefined` as the token: it falls back to process.env.GITHUB_TOKEN.
const TOKEN = 'test-token'

const jsonResponse = (value, status = 200) => new Response(
    JSON.stringify(value),
    { status, headers: { 'Content-Type': 'application/json' } }
)

const restResponse = url => {
    if (url.endsWith('/users/Yahiro025')) {
        return jsonResponse({
            login: 'Yahiro025',
            name: 'Bennett Payoyo',
            avatar_url: 'https://avatars.githubusercontent.com/u/75754746?v=4',
            public_repos: 20
        })
    }

    if (url.includes('/repos?')) {
        return jsonResponse([
            {
                name: 'ScholarAid',
                html_url: 'https://github.com/Yahiro025/ScholarAid',
                homepage: 'https://scholar-aid-rho.vercel.app',
                language: 'TypeScript',
                fork: false,
                archived: false,
                pushed_at: '2026-05-20T14:43:41Z'
            },
            {
                name: 'archived-example',
                html_url: 'https://github.com/Yahiro025/archived-example',
                homepage: null,
                language: null,
                fork: false,
                archived: true,
                pushed_at: '2025-01-01T00:00:00Z'
            },
            {
                name: 'forked-example',
                html_url: 'https://github.com/Yahiro025/forked-example',
                homepage: null,
                language: 'TypeScript',
                fork: true,
                archived: false,
                pushed_at: '2026-06-01T00:00:00Z'
            }
        ])
    }

    return jsonResponse([
        {
            type: 'PushEvent',
            repo: { name: 'Yahiro025/ScholarAid' },
            created_at: '2026-05-20T14:43:41Z',
            payload: {
                commits: [
                    { sha: 'abc123', message: 'fix mobile layout' }
                ]
            }
        }
    ])
}

const DAYS = [
    { date: '2026-09-13', contributionCount: 0, contributionLevel: 'NONE' },
    { date: '2026-09-14', contributionCount: 3, contributionLevel: 'FIRST_QUARTILE' },
    { date: '2026-09-15', contributionCount: 9, contributionLevel: 'FOURTH_QUARTILE' }
]

const calendarBody = (days = DAYS, totalContributions = 12) => ({
    data: {
        user: {
            contributionsCollection: {
                contributionCalendar: {
                    totalContributions,
                    weeks: [{ contributionDays: days }]
                }
            }
        }
    }
})

// Answers the three REST URLs with fixtures and hands the GraphQL request to `graphql`.
const fakeFetch = (graphql = () => jsonResponse(calendarBody()), calls = []) => async (input, init) => {
    const url = String(input)
    calls.push({ url, init })

    return url.endsWith('/graphql') ? graphql(init) : restResponse(url)
}

test('normalizes profile, repository, push-event, and contribution data', async () => {
    const calls = []
    const snapshot = await loadGitHubSnapshot(
        TOKEN,
        fakeFetch(undefined, calls),
        () => new Date('2026-08-30T00:00:00.000Z')
    )

    assert.equal(snapshot?.login, 'Yahiro025')
    assert.equal(snapshot?.repos.length, 1)
    assert.equal(snapshot?.repos[0]?.name, 'ScholarAid')
    assert.equal(snapshot?.commits[0]?.url, 'https://github.com/Yahiro025/ScholarAid/commit/abc123')
    assert.equal(snapshot?.fetchedAt, '2026-08-30T00:00:00.000Z')
    assert.equal(snapshot?.totalContributions, 12)
    assert.deepEqual(snapshot?.contributions, [
        { date: '2026-09-13', count: 0, level: 0 },
        { date: '2026-09-14', count: 3, level: 1 },
        { date: '2026-09-15', count: 9, level: 4 }
    ])

    const graphqlCall = calls.find(call => call.url === 'https://api.github.com/graphql')
    assert.equal(graphqlCall?.init?.method, 'POST')
    assert.equal(graphqlCall?.init?.headers?.Authorization, `Bearer ${TOKEN}`)
    assert.equal(JSON.parse(graphqlCall?.init?.body).variables.login, 'Yahiro025')
})

test('returns null when a REST request fails even though the calendar succeeds', async () => {
    const reposDown = async input => {
        const url = String(input)

        if (url.includes('/repos?')) return jsonResponse({ message: 'Server Error' }, 500)

        return fakeFetch()(input)
    }

    assert.equal(await loadGitHubSnapshot(TOKEN, reposDown), null)
})

test('returns null instead of a fake zero when the contribution calendar is unusable', async t => {
    const cases = [
        ['HTTP 401 from GraphQL', () => jsonResponse({ message: 'Bad credentials' }, 401)],
        // GraphQL can return partial data next to errors; the errors alone must reject it.
        ['errors array next to valid data', () => jsonResponse({ ...calendarBody(), errors: [{ message: 'API rate limit exceeded' }] })],
        ['user is null', () => jsonResponse({ data: { user: null } })],
        ['calendar has no days', () => jsonResponse(calendarBody([]))],
        ['unknown contribution level', () => jsonResponse(calendarBody([
            { date: '2026-09-13', contributionCount: 1, contributionLevel: 'FIFTH_QUARTILE' }
        ]))],
        ['level named like an Object prototype key', () => jsonResponse(calendarBody([
            { date: '2026-09-13', contributionCount: 1, contributionLevel: 'toString' }
        ]))],
        ['network error', () => Promise.reject(new TypeError('fetch failed'))]
    ]

    for (const [name, graphql] of cases) {
        await t.test(name, async () => {
            assert.equal(await loadGitHubSnapshot(TOKEN, fakeFetch(graphql)), null)
        })
    }
})

test('returns null without any request when no token is configured', async () => {
    const calls = []

    assert.equal(await loadGitHubSnapshot('', fakeFetch(undefined, calls)), null)
    assert.equal(calls.length, 0)
})
