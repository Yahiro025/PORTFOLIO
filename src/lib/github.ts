import type {
    GitHubCommitSummary,
    GitHubContributionDay,
    GitHubRepoSummary,
    GitHubSnapshot
} from '@/types'

type FetchLike = typeof fetch
type Clock = () => Date

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const stringField = (record: Record<string, unknown>, key: string) =>
    typeof record[key] === 'string' ? record[key] : null

const numberField = (record: Record<string, unknown>, key: string) =>
    typeof record[key] === 'number' ? record[key] : 0

interface ContributionCalendar {
    totalContributions: number
    contributions: GitHubContributionDay[]
}

const CONTRIBUTIONS_QUERY = `query ($login: String!) {
    user(login: $login) {
        contributionsCollection {
            contributionCalendar {
                totalContributions
                weeks { contributionDays { date contributionCount contributionLevel } }
            }
        }
    }
}`

// A Map, not an object literal: a lookup like `levels['toString']` must miss, not return a prototype method.
const CONTRIBUTION_LEVELS = new Map<string, number>([
    ['NONE', 0],
    ['FIRST_QUARTILE', 1],
    ['SECOND_QUARTILE', 2],
    ['THIRD_QUARTILE', 3],
    ['FOURTH_QUARTILE', 4]
])

// GraphQL can answer HTTP 200 with an `errors` array, so every level is checked. Anything unexpected returns null, and the
// caller keeps the last good page instead of publishing a fake zero.
const parseContributionCalendar = (body: unknown): ContributionCalendar | null => {
    if (!isRecord(body) || body.errors !== undefined || !isRecord(body.data)) return null

    const user = body.data.user
    if (!isRecord(user) || !isRecord(user.contributionsCollection)) return null

    const calendar = user.contributionsCollection.contributionCalendar
    if (!isRecord(calendar) || typeof calendar.totalContributions !== 'number' || !Array.isArray(calendar.weeks)) return null

    const contributions: GitHubContributionDay[] = []

    for (const week of calendar.weeks) {
        if (!isRecord(week) || !Array.isArray(week.contributionDays)) return null

        for (const day of week.contributionDays) {
            if (!isRecord(day)) return null

            const date = stringField(day, 'date')
            const level = CONTRIBUTION_LEVELS.get(stringField(day, 'contributionLevel') ?? '')

            if (!date || typeof day.contributionCount !== 'number' || level === undefined) return null

            contributions.push({ date, count: day.contributionCount, level })
        }
    }

    if (contributions.length === 0) return null

    return { totalContributions: calendar.totalContributions, contributions }
}

const normalizeGitHubSnapshot = (
    profileValue: unknown,
    reposValue: unknown,
    eventsValue: unknown,
    fetchedAt: string,
    calendar: ContributionCalendar
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
            if (!isRecord(event)) continue
            const repo = isRecord(event.repo) ? stringField(event.repo, 'name') : null
            const createdAt = stringField(event, 'created_at')

            if (!repo || !createdAt || !isRecord(event.payload)) continue

            if (event.type === 'PushEvent') {
                const eventCommits = event.payload.commits

                if (Array.isArray(eventCommits) && eventCommits.length > 0) {
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
                } else {
                    const head = stringField(event.payload, 'head')
                    if (head) {
                        const ref = (stringField(event.payload, 'ref') ?? 'main').replace('refs/heads/', '')
                        commits.push({
                            repo,
                            sha: head.slice(0, 7),
                            message: `Push to ${ref}`,
                            url: `https://github.com/${repo}/commit/${head}`,
                            createdAt
                        })
                    }
                }
            } else if (event.type === 'PullRequestEvent') {
                const pr = isRecord(event.payload.pull_request) ? event.payload.pull_request : null
                const headSha = pr && isRecord(pr.head) ? stringField(pr.head, 'sha') : null
                const prNumber = numberField(event.payload, 'number')
                const action = stringField(event.payload, 'action') ?? 'PR'

                if (headSha || prNumber > 0) {
                    const sha = headSha ? headSha.slice(0, 7) : String(prNumber)
                    const prUrl = (pr && stringField(pr, 'html_url')) ?? `https://github.com/${repo}/pull/${prNumber}`
                    commits.push({
                        repo,
                        sha,
                        message: `${action} #${prNumber} on ${repo}`,
                        url: prUrl,
                        createdAt
                    })
                }
            }

            if (commits.length === 12) break
        }
    }

    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0)

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
        totalStars,
        totalContributions: calendar.totalContributions,
        contributions: calendar.contributions,
        repos,
        commits,
        fetchedAt
    }
}

let cachedSnapshot: GitHubSnapshot | null = null
let cachedAt = 0
const CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 5000

// Real network calls get a deadline so a hung socket cannot stall the build or ISR. Injected fetchers keep their exact call shape.
const withTimeout = (init: RequestInit, enabled: boolean): RequestInit =>
    enabled ? { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) } : init

export const loadGitHubSnapshot = async (
    token = process.env.GITHUB_TOKEN,
    fetchImpl: FetchLike = fetch,
    now: Clock = () => new Date()
): Promise<GitHubSnapshot | null> => {
    const isDefaultFetch = fetchImpl === fetch
    const nowTime = now().getTime()

    if (isDefaultFetch && cachedSnapshot && nowTime - cachedAt < CACHE_TTL_MS) {
        return cachedSnapshot
    }

    // The contribution calendar is only available through GraphQL, which rejects anonymous requests.
    if (!token) return null

    const headers: HeadersInit = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Portfolio-App',
        Authorization: `Bearer ${token}`
    }

    try {
        const urls = [
            'https://api.github.com/users/Yahiro025',
            'https://api.github.com/users/Yahiro025/repos?per_page=100&sort=pushed',
            'https://api.github.com/users/Yahiro025/events/public?per_page=30'
        ]
        const calendarRequest: RequestInit = {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { login: 'Yahiro025' } })
        }
        const responses = await Promise.all([
            ...urls.map(url => fetchImpl(url, withTimeout({ headers }, isDefaultFetch))),
            fetchImpl('https://api.github.com/graphql', withTimeout(calendarRequest, isDefaultFetch))
        ])

        if (responses.some(response => !response.ok)) return null

        const [profile, repos, events, calendarBody] = await Promise.all(responses.map(response => response.json()))
        const calendar = parseContributionCalendar(calendarBody)

        if (!calendar) return null

        const snapshot = normalizeGitHubSnapshot(profile, repos, events, now().toISOString(), calendar)

        if (isDefaultFetch && snapshot) {
            cachedSnapshot = snapshot
            cachedAt = nowTime
        }

        return snapshot
    } catch {
        return null
    }
}
