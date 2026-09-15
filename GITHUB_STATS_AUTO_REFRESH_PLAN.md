# GitHub Stats Auto-Refresh Plan

Status: **implemented** — the homepage GitHub statistics now refresh once daily through a
secret-protected on-demand revalidation endpoint.

## Final design

```mermaid
graph LR
    A[Vercel cron<br/>0 17 * * * UTC] -->|GET| B[/api/refresh-github]
    B -->|CRON_SECRET check| C[res.revalidate'/']
    C --> D[getStaticProps]
    D --> E[loadGitHubSnapshot]
    E -->|REST calls| F[api.github.com]
    E -->|HTML scrape| G[github.com/users/.../contributions]
    E --> H[GitHubSnapshot]
    H --> I[Rebuilt page HTML + __NEXT_DATA__]
```

`0 17 * * *` is UTC, which is 1:00 AM the next day in Asia/Manila (UTC+8), so the cron fires
once daily at 1:00 AM local time.

| Environment | Refresh mechanism | Interval |
|---|---|---|
| `npm run dev` | Every page load re-runs `getStaticProps` | ~instant |
| Production (Vercel) | Cron → `/api/refresh-github` → `res.revalidate('/')` | Once daily at 1:00 AM Asia/Manila |

`getStaticProps` no longer declares `revalidate`; the cron endpoint is the only production
refresh trigger.

## Data sources

**GitHub REST API** supplies the profile, repository, and event data:

- `GET /users/Yahiro025` — name, avatar, bio, public repo count, followers, following
- `GET /users/Yahiro025/repos` — repositories sorted by last push, excluding forks and archived
- `GET /users/Yahiro025/events/public` — recent push and pull-request events

**Contribution calendar (HTML scrape).** The exact per-day contribution counts are not exposed by
GitHub's REST API, so `loadGitHubSnapshot()` fetches the public HTML at
`https://github.com/users/Yahiro025/contributions` and `parseGitHubContributions()` reads the
total from the `N contributions in the last year` heading plus each `data-date` / `data-level`
cell and its matching `<tool-tip>` count.

> [!WARNING]
> This scrape depends on GitHub's public markup and **can break if GitHub changes that HTML**.
> When parsing yields nothing, the panel degrades to the recent-commits view and shows
> `Activity unavailable` instead of a stale number. It does not fail the snapshot, so the page
> keeps rebuilding even if the calendar markup changes.

## Failure behaviour

- If any REST request fails, `loadGitHubSnapshot()` returns `null`.
- `getStaticProps` then throws, so Vercel **keeps serving the last successful page** instead of
  publishing an empty snapshot, and the cron invocation reports a failure.
- The endpoint returns 401 without an exact `Authorization: Bearer ${CRON_SECRET}` header, and
  405 with `Allow: GET` for any non-GET method. Revalidation errors return a generic 500 without
  exposing the secret or internal error details.
- A server-only `GITHUB_TOKEN` is optional and only raises the REST rate limit.

## Removed

- `revalidate: 21600` on the homepage and the earlier "reduce the ISR interval to 1 hour"
  recommendation — the cron endpoint replaced both.
- Hardcoded `590` / `51` / `13` / `19` fallbacks in the GitHub panel; unavailable values now
  render as an em dash, and the activity header reads `Activity unavailable`.

## Files

- `src/pages/api/refresh-github.ts` — GET-only, `CRON_SECRET`-protected revalidation endpoint
- `vercel.json` — daily cron entry pointing at that endpoint
- `src/pages/index.tsx` — `getStaticProps` throws when the snapshot is unavailable
- `src/components/landing/profile-reel.tsx` — honest empty-state copy, no hardcoded counts
- `src/lib/refresh-github.test.mjs` — auth, method guard, success, and failure coverage

## Verification

```bash
node --test src/lib/*.test.mjs && npm run build
```

## Deployment handoff (user-owned)

1. Install the Vercel CLI: `npm i -g vercel`
2. Generate a strong secret locally, add it as the production `CRON_SECRET` value.
3. Optionally add a server-only `GITHUB_TOKEN` to raise the REST API rate limit.
4. Deploy, inspect the cron invocation in the Vercel logs, and confirm the homepage snapshot
   reports a newer `fetchedAt` value.

Scheduled refresh is **not** confirmed until a real Vercel cron invocation succeeds in production.
