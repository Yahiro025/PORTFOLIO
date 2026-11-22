# GitHub Stats Auto-Refresh

Status: **implemented**. The homepage GitHub statistics refresh once a day through a
secret-protected revalidation endpoint, and a GitHub Actions monitor checks every day that the
live page is actually fresh.

## Design

```
Vercel cron 0 17 * * * UTC (Hobby: fires 17:00-17:59 UTC, never retries)
  -> GET /api/refresh-github            Authorization: Bearer $CRON_SECRET (401 otherwise)
     -> res.revalidate('/')
        -> getStaticProps -> loadGitHubSnapshot()
             Promise.all, 5 s timeout each, all with Authorization: Bearer $GITHUB_TOKEN
             |- REST GET /users/Yahiro025
             |- REST GET /users/Yahiro025/repos
             |- REST GET /users/Yahiro025/events/public
             '- GraphQL POST /graphql  contributionsCollection.contributionCalendar
           any failure -> null -> getStaticProps throws -> Vercel keeps the last good page

GitHub Actions .github/workflows/github-snapshot-monitor.yml (17 19 * * * UTC + manual run)
  read fetchedAt from the live homepage
    age <= 6 h ............................... pass
    stale or unreadable -> GET /api/refresh-github (3 retries, 60 s apart)
                        -> wait up to 60 s for a strictly newer fetchedAt
                        -> job FAILS either way, so GitHub emails the owner that the cron missed;
                           the error says whether the page was repaired
  manual run with force_refresh -> refresh -> pass only if fetchedAt became strictly newer
```

`0 17 * * *` is UTC, which is 1:00 AM the next day in Asia/Manila (UTC+8).

| Environment | Refresh mechanism | Interval |
|---|---|---|
| `npm run dev` | Every page load re-runs `getStaticProps` | instant |
| Production (Vercel) | Cron -> `/api/refresh-github` -> `res.revalidate('/')` | once daily, 01:00-01:59 Asia/Manila |
| Production (repair) | Monitor -> `/api/refresh-github`, only when the page is older than 6 h | daily check at 03:17 Asia/Manila |

`getStaticProps` declares no `revalidate`; the cron and the monitor are the only production
refresh triggers. Every deploy also fetches a fresh snapshot at build time.

## Data sources

All calls go to `api.github.com` with the `GITHUB_TOKEN` bearer:

- `GET /users/Yahiro025` — name, avatar, bio, public repo count, followers, following
- `GET /users/Yahiro025/repos` — repositories sorted by last push, excluding forks and archived
- `GET /users/Yahiro025/events/public` — recent push and pull-request events
- `POST /graphql` — `user(login: "Yahiro025").contributionsCollection.contributionCalendar`:
  `totalContributions` and, per day, `date`, `contributionCount`, `contributionLevel`
  (`NONE`..`FOURTH_QUARTILE`, mapped to levels 0-4)

GraphQL rejects anonymous requests, so `GITHUB_TOKEN` is **required**. The calendar covers the
last 365 days, so its total can differ by a few from the number on the GitHub profile page.

## Failure behaviour

`loadGitHubSnapshot()` returns `null` when:

- `GITHUB_TOKEN` is missing (no request is made),
- any REST or GraphQL request fails, times out, or returns a non-2xx status,
- the GraphQL body has an `errors` array, a null user, zero calendar days, or an unknown
  `contributionLevel`.

`getStaticProps` then throws, so Vercel keeps serving the last successful page. The site never
shows a fake "0 contributions". A failed build also fails the deploy, which keeps the previous
deployment live.

The endpoint returns 401 without an exact `Authorization: Bearer ${CRON_SECRET}` header, 405 with
`Allow: GET` for any non-GET method, and a generic 500 when revalidation fails.

## Secrets

| Secret | Where | Value |
|---|---|---|
| `CRON_SECRET` | Vercel (Production) **and** GitHub repo secrets | Same random value in both places. Vercel sends it to the cron; the monitor sends it to the endpoint. |
| `GITHUB_TOKEN` | Vercel (Production and Preview) | Classic token with **no scopes** and no expiration. It only reads public data. |

Rotate `CRON_SECRET` in both places at once, then redeploy. Local builds and `npm run dev` need
`GITHUB_TOKEN` too: add it to `.env.local` (gitignored), or run
`GITHUB_TOKEN=$(gh auth token) npm run build`.

## Monitor caveats

- GitHub disables scheduled workflows after 60 days without activity in a public repository.
  The run history then stops and no email is sent. Re-enable with
  `gh workflow enable github-snapshot-monitor.yml`.
- Scheduled runs can start late or, under heavy GitHub load, be skipped. The next day's run
  catches anything a skipped run missed.
- A deploy within the 6 hours before 19:17 UTC makes the page fresh, so a cron miss on that day
  goes unreported.
- Failure emails need GitHub Settings -> Notifications -> Actions set to email you about failed
  workflows. For scheduled workflows, GitHub notifies the user who last changed the `cron` line.
- Refreshes within 10 minutes of each other on the same warm function reuse the in-memory
  snapshot cache in `src/lib/github.ts`, so `fetchedAt` does not change. Wait 11 minutes after a
  deploy or refresh before a forced manual run.
- Manual check: `gh workflow run github-snapshot-monitor.yml`. Manual refresh:
  `gh workflow run github-snapshot-monitor.yml -f force_refresh=true`.

## Files

- `src/lib/github.ts` — `loadGitHubSnapshot()`, GraphQL calendar parsing, REST normalization
- `src/lib/github.test.mjs` — snapshot, GraphQL failure, and missing-token coverage
- `src/pages/api/refresh-github.ts` — GET-only, `CRON_SECRET`-protected revalidation endpoint
- `src/lib/refresh-github.test.mjs` — auth, method guard, success, and failure coverage
- `src/pages/index.tsx` — `getStaticProps` throws when the snapshot is unavailable
- `vercel.json` — daily cron entry
- `.github/workflows/github-snapshot-monitor.yml` — daily freshness check and repair

## Verification

```bash
npm run typecheck
npm run test
GITHUB_TOKEN=$(gh auth token) npm run build
gh workflow run github-snapshot-monitor.yml -f force_refresh=true
```
