import assert from 'node:assert/strict'
import test from 'node:test'

import { loadGitHubSnapshot } from './github.ts'

const jsonResponse = (value, status = 200) => new Response(
    JSON.stringify(value),
    { status, headers: { 'Content-Type': 'application/json' } }
)

const successFetch = async input => {
    const url = String(input)

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

test('normalizes public profile, repository, and push-event data', async () => {
    const snapshot = await loadGitHubSnapshot(
        undefined,
        successFetch,
        () => new Date('2026-08-30T00:00:00.000Z')
    )

    assert.equal(snapshot?.login, 'Yahiro025')
    assert.equal(snapshot?.repos.length, 1)
    assert.equal(snapshot?.repos[0]?.name, 'ScholarAid')
    assert.equal(snapshot?.commits[0]?.url, 'https://github.com/Yahiro025/ScholarAid/commit/abc123')
    assert.equal(snapshot?.fetchedAt, '2026-08-30T00:00:00.000Z')
})

test('returns null when any GitHub request fails', async () => {
    const failedFetch = async () => jsonResponse(
        { message: 'rate limited' },
        500
    )

    assert.equal(await loadGitHubSnapshot(undefined, failedFetch), null)
})
