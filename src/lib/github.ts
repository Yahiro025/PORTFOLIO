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

export const parseGitHubContributions = (
    html: string
): { totalContributions: number; contributions: GitHubContributionDay[] } => {
    if (!html || typeof html !== 'string') return { totalContributions: 0, contributions: [] }

    const totalMatch = html.match(/([\d,]+)\s+contributions\s+in the last year/i)
    const totalContributions = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0

    const tooltipMap = new Map<string, number>()
    const tooltipRegex = /<tool-tip[^>]*for="([^"]+)"[^>]*>(.*?)<\/tool-tip>/gs
    let tm: RegExpExecArray | null
    while ((tm = tooltipRegex.exec(html)) !== null) {
        const text = tm[2].trim()
        const countMatch = text.match(/^(\d+)\s+contribution/)
        tooltipMap.set(tm[1], countMatch ? parseInt(countMatch[1], 10) : 0)
    }

    const tdMatches = html.match(/<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g) || []
    const contributions: GitHubContributionDay[] = []

    for (const td of tdMatches) {
        const date = td.match(/data-date="([^"]+)"/)?.[1]
        const levelStr = td.match(/data-level="(\d+)"/)?.[1]
        const id = td.match(/id="([^"]+)"/)?.[1]
        if (date) {
            const level = levelStr ? parseInt(levelStr, 10) : 0
            const count = id && tooltipMap.has(id) ? tooltipMap.get(id)! : (level > 0 ? level : 0)
            contributions.push({ date, level, count })
        }
    }

    contributions.sort((a, b) => a.date.localeCompare(b.date))

    return { totalContributions, contributions }
}

const normalizeGitHubSnapshot = (
    profileValue: unknown,
    reposValue: unknown,
    eventsValue: unknown,
    fetchedAt: string,
    contributionsData?: { totalContributions?: number; contributions?: GitHubContributionDay[] }
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
    const totalContributions = contributionsData?.totalContributions ?? 0
    const contributions = contributionsData?.contributions ?? []

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
        totalContributions,
        contributions,
        repos,
        commits,
        fetchedAt
    }
}

let cachedSnapshot: GitHubSnapshot | null = null
let cachedAt = 0
const CACHE_TTL_MS = 10 * 60 * 1000

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

    const headers: HeadersInit = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Portfolio-App'
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

        let contributionsData: { totalContributions: number; contributions: GitHubContributionDay[] } | undefined
        try {
            const contribRes = await fetchImpl('https://github.com/users/Yahiro025/contributions', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
            if (contribRes.ok) {
                const html = await contribRes.text()
                contributionsData = parseGitHubContributions(html)
            }
        } catch {
            // Ignore failure for contributions - core snapshot still succeeds
        }

        const snapshot = normalizeGitHubSnapshot(profile, repos, events, now().toISOString(), contributionsData)

        if (isDefaultFetch && snapshot) {
            cachedSnapshot = snapshot
            cachedAt = nowTime
        }

        return snapshot
    } catch {
        return null
    }
}
