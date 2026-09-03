import type { GitHubCommitSummary, GitHubRepoSummary, GitHubSnapshot } from '@/types'

type FetchLike = typeof fetch
type Clock = () => Date

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const stringField = (record: Record<string, unknown>, key: string) =>
    typeof record[key] === 'string' ? record[key] : null

const numberField = (record: Record<string, unknown>, key: string) =>
    typeof record[key] === 'number' ? record[key] : 0

const normalizeGitHubSnapshot = (
    profileValue: unknown,
    reposValue: unknown,
    eventsValue: unknown,
    fetchedAt: string
): GitHubSnapshot | null => {
    if (!isRecord(profileValue)) return null

    const login = stringField(profileValue, 'login')
    const avatarUrl = stringField(profileValue, 'avatar_url')

    if (!login || !avatarUrl) return null

    const repos: GitHubRepoSummary[] = Array.isArray(reposValue)
        ? reposValue
            .filter(isRecord)
            .filter(repo => repo.archived === false && repo.fork !== true)
            .flatMap(repo => {
                const name = stringField(repo, 'name')
                const url = stringField(repo, 'html_url')
                const pushedAt = stringField(repo, 'pushed_at')

                if (!name || !url || !pushedAt) return []

                return [{
                    name,
                    url,
                    homepage: stringField(repo, 'homepage'),
                    language: stringField(repo, 'language'),
                    description: stringField(repo, 'description'),
                    stars: numberField(repo, 'stargazers_count'),
                    pushedAt
                }]
            })
            .slice(0, 12)
        : []

    const commits: GitHubCommitSummary[] = []

    if (Array.isArray(eventsValue)) {
        for (const event of eventsValue) {
            if (!isRecord(event) || event.type !== 'PushEvent') continue
            if (!isRecord(event.repo) || !isRecord(event.payload)) continue

            const repo = stringField(event.repo, 'name')
            const createdAt = stringField(event, 'created_at')
            const eventCommits = event.payload.commits

            if (!repo || !createdAt || !Array.isArray(eventCommits)) continue

            for (const commit of eventCommits) {
                if (!isRecord(commit)) continue

                const sha = stringField(commit, 'sha')
                const message = stringField(commit, 'message')

                if (!sha || !message) continue

                commits.push({
                    repo,
                    sha,
                    message,
                    url: `https://github.com/${repo}/commit/${sha}`,
                    createdAt
                })

                if (commits.length === 12) break
            }

            if (commits.length === 12) break
        }
    }

    return {
        login,
        name: stringField(profileValue, 'name') ?? login,
        avatarUrl,
        bio: stringField(profileValue, 'bio'),
        followers: numberField(profileValue, 'followers'),
        following: numberField(profileValue, 'following'),
        publicRepos: typeof profileValue.public_repos === 'number'
            ? profileValue.public_repos
            : repos.length,
        repos,
        commits,
        fetchedAt
    }
}

export const loadGitHubSnapshot = async (
    token = process.env.GITHUB_TOKEN,
    fetchImpl: FetchLike = fetch,
    now: Clock = () => new Date()
): Promise<GitHubSnapshot | null> => {
    const headers: HeadersInit = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }

    if (token) headers.Authorization = `Bearer ${token}`

    try {
        const urls = [
            'https://api.github.com/users/Yahiro025',
            'https://api.github.com/users/Yahiro025/repos?per_page=100&sort=pushed',
            'https://api.github.com/users/Yahiro025/events/public?per_page=30'
        ]
        const responses = await Promise.all(urls.map(url => fetchImpl(url, { headers })))

        if (responses.some(response => !response.ok)) return null

        const [profile, repos, events] = await Promise.all(responses.map(response => response.json()))

        return normalizeGitHubSnapshot(profile, repos, events, now().toISOString())
    } catch {
        return null
    }
}
