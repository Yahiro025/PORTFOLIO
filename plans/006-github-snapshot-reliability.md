# 006 — GitHub snapshot reliability: GraphQL calendar, fail closed, daily monitor

- **Status**: READY TO EXECUTE (the plan is complete; the code change is not applied yet)
- **Verified against commit**: be87850
- **Severity**: HIGH
- **Category**: Data correctness / Operations
- **Estimated scope**: 4 files, +342 / -159 lines, delivered as a pre-verified patch
- **Patch**: [`006-github-snapshot-reliability.patch`](006-github-snapshot-reliability.patch)
  (sha256 starts with `a125b23c9d7d136b`)
- **Review record**: `~/.gstack/projects/Yahiro025-PORTFOLIO/main-eng-review-20261122-022444.md`
  (decisions D4, D5, D6) plus a Codex (gpt-6.2-sol) outside review, whose 9 findings are fixed
  in this version.

## Who does what

| Role | Model | Does | Never does |
|---|---|---|---|
| Implementer | DeepSeek V4.1 Flash 1017 (`opencode-go/deepseek-v4.1-flash`, `variant=max`), OpenCode main session | Steps 0, 1, 2, 4, 5, 6 | Edit code by hand, change the patch, touch files outside the list below |
| Worker | GLM-5.3 (`opencode-go/glm-5.3`, `variant=max`), launched by the Implementer as an OpenCode subagent | Step 3 only: read-only review against the checklist | Edit any file, stage, commit, push |

Both models must read and follow `C:\Users\Bennett\.agents\AGENTS.md` before starting, and say
that they did. If a model cannot read it, it stops and reports that.

## Rules for this plan (read before Step 0)

1. **Apply the patch. Do not retype the code.** Every line in the patch was written and checked
   against `be87850`: typecheck clean, 44/44 tests, every guard mutation-tested, the loader run
   live against GitHub, builds checked with and without a token, and the monitor script
   exercised in 7 scenarios against a fake site. Hand edits are where mistakes come from.
2. **Only these four files change:**
   `src/lib/github.ts`, `src/lib/github.test.mjs`, `GITHUB_STATS_AUTO_REFRESH_PLAN.md`,
   `.github/workflows/github-snapshot-monitor.yml` (new). Plus this plan and its patch, which
   are committed in Step 4.
3. **Never touch:** `package.json` scripts, `next.config.ts`, `tsconfig.json`,
   `postcss.config.*`, `next-env.d.ts`, `vercel.json`, `src/pages/**`, `src/types/**`,
   `src/components/**`, `AGENTS.md` (it has the user's own uncommitted edit), `.env.local`,
   `.vercel/`.
4. **Do not add dependencies.** Do not run `npm install`, `npx shadcn`, or any formatter over
   the whole repo.
5. **Secrets are already set up. Do not create, print, or change them** (see "Already done").
   Never echo `CRON_SECRET` or `GITHUB_TOKEN` and never write them into a file.
6. **Stop and report on any surprise.** If a result differs from its "Expected" line, stop,
   paste the full output, and do not try to fix it. The stop conditions are listed at the end.
7. No AI co-author trailers or AI attribution in commit messages.
8. **Shell:** run every command in **Git Bash** from `C:\Users\Bennett\PORTFOLIO`. Run each
   fenced block as written, one command at a time where the expected output says so.
9. **`grep` exit codes:** when a check expects "prints nothing", `grep` exits with code 1.
   That is the expected PASS, not an error.

## Already done (do not redo)

Verified on 2026-11-22 by the reviewer:

- **Root cause of "the cron never refreshed":** Vercel had no environment variables at all, so
  `CRON_SECRET` was missing and `/api/refresh-github` answered 401 to every cron call. Fixed.
- `CRON_SECRET` set in Vercel (Production, sensitive) and as a GitHub repo secret, same value.
- `GITHUB_TOKEN` set in Vercel (Production and Preview, sensitive): a classic token with no
  scopes and no expiry. Verified live: `X-OAuth-Scopes` is empty, and the GraphQL calendar
  query returns 1261 contributions across 53 weeks / 365 days.
- Production redeployed so both variables load. A triggered cron run then revalidated `/`
  (the CDN `Age` header reset to 0).

## Problem (why this change exists)

1. `src/lib/github.ts:20-54` scrapes `https://github.com/users/Yahiro025/contributions` HTML with
   regexes. When that fetch fails, the error is swallowed (`:237-239`). When GitHub changes the
   markup, the parser returns `{ totalContributions: 0, contributions: [] }` (`:23-26`). Either
   way `:163-164` (`?? 0`, `?? []`) publishes **"0 contributions"** with the calendar hidden.
2. A failed refresh is invisible. Nobody is told when the daily cron fails, which is how the
   missing `CRON_SECRET` went unnoticed.

## What the patch does

### `src/lib/github.ts`
- Deletes `parseGitHubContributions`, the HTML fetch, and the spoofed browser `User-Agent`.
- Adds a private `parseContributionCalendar(body)` that reads
  `data.user.contributionsCollection.contributionCalendar` and maps `contributionLevel`
  `NONE`, `FIRST_QUARTILE`, `SECOND_QUARTILE`, `THIRD_QUARTILE`, `FOURTH_QUARTILE` to 0-4 through
  a `Map`. It must be a `Map`: an object literal would return a prototype method for a level
  like `toString`, and a test guards this.
- Returns `null` (and makes no request) when the token is empty, because GraphQL rejects
  anonymous calls.
- Sends `POST https://api.github.com/graphql` in the **same** `Promise.all` as the three REST
  calls, with the same headers (now always including the bearer) and 5 s timeout.
- Returns `null` on any non-OK response, an `errors` array (even next to valid data), a null
  user, zero days, an unknown level, or a thrown error. `getStaticProps`
  (`src/pages/index.tsx:56-58`, unchanged) then throws, and Vercel keeps the last good page.
- `normalizeGitHubSnapshot` now takes a required `calendar`; the `?? 0` / `?? []` fallbacks are
  gone.

### `src/lib/github.test.mjs` (11 tests in this file; 44 in `npm run test`)
- Fixture answers the 3 REST URLs plus `POST /graphql`.
- Happy path also asserts the calendar mapping, `method: 'POST'`, the bearer header, and
  `variables.login`.
- REST failure test: only `/repos` fails while the calendar succeeds.
- One table test with 7 GraphQL failure cases, each expecting `null`.
- Missing token: `null`, and zero requests. It passes `''`, never `undefined`, because
  `undefined` falls back to `process.env.GITHUB_TOKEN`.
- The two HTML-parser tests are removed with the parser.
- Mutation-checked: removing the token, `!ok`, `errors`, or empty-calendar guard, or the bearer
  header, makes at least one test fail.

### `.github/workflows/github-snapshot-monitor.yml` (new)
- Runs daily at `17 19 * * *` UTC (after the Vercel cron window) and on manual dispatch, with an
  optional `force_refresh` checkbox. `permissions: {}`, no checkout, every `curl` time-boxed.
- **Scheduled run:** `fetchedAt` 6 hours old or less passes. Otherwise it calls
  `/api/refresh-github` with the `CRON_SECRET` bearer (3 retries, 60 s apart) and waits up to
  60 s for a **strictly newer** `fetchedAt`. The job then **fails either way**, because a stale
  page at 19:17 UTC means the Vercel cron missed. The error message says whether the page was
  repaired.
- **Manual run with `force_refresh`:** refresh, then pass only if `fetchedAt` became strictly
  newer.

### `GITHUB_STATS_AUTO_REFRESH_PLAN.md`
- Rewritten for GraphQL, the monitor, both secrets, local `.env.local` use, the email setting,
  the 10-minute cache caveat, and the 60-day scheduled-workflow caveat. Removes stale references
  to `profile-reel.tsx` and `Activity unavailable`.

## Steps

### Step 0 — Preflight (Implementer)

Run these one at a time:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git merge-base --is-ancestor be87850 HEAD && echo BASE_OK
git status --porcelain --untracked-files=all
git apply --check plans/006-github-snapshot-reliability.patch && echo PATCH_OK
sha256sum plans/006-github-snapshot-reliability.patch | cut -c1-16
```

Expected:
- branch `main`.
- Write down the short HEAD SHA. It is `START` in Step 4. (It is `be87850` unless the user
  committed something since; newer commits are fine if `BASE_OK` and `PATCH_OK` both print.)
- `BASE_OK`.
- `git status` shows only these lines (order may differ):
  ` M AGENTS.md`, `?? plans/006-github-snapshot-reliability.md`,
  `?? plans/006-github-snapshot-reliability.patch`. Anything under `src/` or `.github/` is a
  stop condition.
- `PATCH_OK`.
- hash `a125b23c9d7d136b`.

### Step 1 — Apply (Implementer)

```bash
git apply plans/006-github-snapshot-reliability.patch
git status --porcelain --untracked-files=all
```

Expected `git status` (order may differ):

```
 M AGENTS.md
 M GITHUB_STATS_AUTO_REFRESH_PLAN.md
 M src/lib/github.test.mjs
 M src/lib/github.ts
?? .github/workflows/github-snapshot-monitor.yml
?? plans/006-github-snapshot-reliability.md
?? plans/006-github-snapshot-reliability.patch
```

Do not edit any file after applying. If something looks wrong, stop.

### Step 2 — Verify locally (Implementer)

```bash
npm run typecheck
npm run test
```

Expected:
- `npm run typecheck`: exit code 0, nothing printed after the `tsc --noEmit` line.
- `npm run test`: the summary shows `ℹ tests 44`, `ℹ pass 44`, `ℹ fail 0`.

Get a token for local builds. **Run this alone and check it before building:**

```bash
LOCAL_TOKEN=$(gh auth token) && [ -n "$LOCAL_TOKEN" ] && echo TOKEN_OK
```

Expected: `TOKEN_OK`. If it is missing, stop: the user must run `gh auth login`. Never print
`$LOCAL_TOKEN`.

```bash
GITHUB_TOKEN= npm run build; echo "exit=$?"
```

Expected: `exit=1` (non-zero), and the output contains
`Unable to load the GitHub snapshot for the homepage`. This proves that with no token, the build
fails closed instead of publishing zeros.

```bash
GITHUB_TOKEN="$LOCAL_TOKEN" npm run build; echo "exit=$?"
```

Expected: `exit=0`, and the output contains `Generating static pages` with `(3/3)` and a line
`● /`. Your `gh` token has extra scopes, which is fine locally; production uses the no-scope
token.

### Step 3 — Independent review (Worker, read-only)

Launch the Worker as an OpenCode subagent pinned to `opencode-go/glm-5.3` with `variant=max`,
and give it this exact brief:

> Read and follow `C:\Users\Bennett\.agents\AGENTS.md` first and confirm you read it. You are a
> read-only reviewer: do not edit, stage, commit, run builds, or run `npm install`. Working
> directory `C:\Users\Bennett\PORTFOLIO`, Git Bash. Run each check and report it as PASS or
> FAIL with the exact command output. When a check expects "prints nothing", grep exits with
> code 1; that is a PASS. Report verified facts only.
>
> 1. `git diff --stat -- src .github GITHUB_STATS_AUTO_REFRESH_PLAN.md` lists exactly
>    `GITHUB_STATS_AUTO_REFRESH_PLAN.md`, `src/lib/github.test.mjs`, `src/lib/github.ts`, and
>    `git status --porcelain --untracked-files=all .github` prints exactly
>    `?? .github/workflows/github-snapshot-monitor.yml`.
> 2. `grep -rn "parseGitHubContributions\|Mozilla/5.0\|github.com/users/Yahiro025/contributions" src`
>    prints nothing.
> 3. `grep -n "new Map<string, number>" src/lib/github.ts` prints exactly one line.
> 4. `grep -n "if (!token) return null\|const headers" src/lib/github.ts` prints two lines, and
>    the `if (!token) return null` line number is smaller.
> 5. `grep -n "api.github.com/graphql\|Promise.all(\[" src/lib/github.ts` prints two lines, and
>    the `api.github.com/graphql` line number is 1-3 higher than the `Promise.all([` line.
> 6. `grep -n "?? 0\|?? \[\]" src/lib/github.ts` prints nothing.
> 7. In `.github/workflows/github-snapshot-monitor.yml`, each of these greps prints at least
>    one line: `grep -n "permissions: {}"`, `grep -n "cron: '17 19 \* \* \*'"`,
>    `grep -n "workflow_dispatch:"`, `grep -n "force_refresh"`,
>    `grep -n 'CRON_SECRET: ${{ secrets.CRON_SECRET }}'`, `grep -n "max-time"`. And
>    `grep -n "actions/checkout"` prints nothing.
> 8. `git diff -- package.json next.config.ts tsconfig.json vercel.json src/pages src/types src/components`
>    prints nothing.
> 9. `npm run test` shows `ℹ tests 44`, `ℹ pass 44`, and `ℹ fail 0`.

The Implementer reads the report. Any FAIL is a stop condition.

### Step 4 — Commit (Implementer)

Three commits, in this order. Stage only the named paths. Never use `git add -A` or `git add .`,
because `AGENTS.md` has the user's unrelated edit.

```bash
git add plans/006-github-snapshot-reliability.md plans/006-github-snapshot-reliability.patch
git commit -m "docs(plans): add GitHub snapshot reliability plan"
```

```bash
git add src/lib/github.ts src/lib/github.test.mjs GITHUB_STATS_AUTO_REFRESH_PLAN.md
git commit -m "fix(github): read contribution calendar from GraphQL and fail closed" -m "The HTML scrape swallowed fetch errors and parsed markup changes as zero, so the homepage could publish 0 contributions. The calendar now comes from the GraphQL contributionCalendar, and any failure returns null so getStaticProps keeps the last good page. GITHUB_TOKEN is now required."
```

```bash
git add .github/workflows/github-snapshot-monitor.yml
git commit -m "ci: add daily GitHub snapshot freshness monitor" -m "Checks the live fetchedAt every day at 19:17 UTC. A stale page is refreshed through /api/refresh-github and the run fails so the owner learns the Vercel cron missed. Manual runs can force a refresh."
```

```bash
git status --porcelain --untracked-files=all
git log --oneline -4
```

Expected: `git status` shows only ` M AGENTS.md`. The log shows the three new commits, newest
first: `ci: ...`, `fix(github): ...`, `docs(plans): ...`, and then `START` from Step 0.

### Step 5 — Push and wait for Vercel (Implementer, only with the user's go-ahead)

Pushing `main` deploys production on Vercel. Ask the user first, then:

```bash
git push origin main
```

Check the **Vercel** status of the pushed commit. Run this once a minute, **at most 10 times**:

```bash
gh api "repos/Yahiro025/PORTFOLIO/commits/$(git rev-parse HEAD)/statuses" --jq '[.[] | select(.context == "Vercel")][0].state // "none"'
```

Expected: `pending` (or `none` for the first minute or two), then `success`. Stop if it prints
`failure` or `error`, or is not `success` after the 10th check.

### Step 6 — Verify production (Implementer)

6a. Live data. Run right after Step 5:

```bash
node -e "fetch('https://bennettpayoyo.vercel.app',{cache:'no-store'}).then(r=>r.text()).then(t=>console.log({fetchedAt:(t.match(/\"fetchedAt\":\"([^\"]+)\"/)||[])[1], total:(t.match(/\"totalContributions\":(\d+)/)||[])[1], days:(t.match(/\"date\":\"\d{4}-\d{2}-\d{2}\",\"count\"/g)||[]).length}))"
```

Expected: `fetchedAt` within the last 15 minutes (it is UTC), `total` over 1000 (1261 on
2026-11-22), and `days` between 365 and 371. If `fetchedAt` is older, wait 2 minutes and retry
once; then stop.

6b. Forced monitor run. **Wait at least 11 minutes after Step 5 printed `success`**. Refreshes
less than 10 minutes apart can reuse the in-memory snapshot cache, and `fetchedAt` would not
change. Then:

```bash
gh auth status
LAST_ID=$(gh run list --workflow github-snapshot-monitor.yml --limit 1 --json databaseId --jq '.[0].databaseId // 0')
gh workflow run github-snapshot-monitor.yml -f force_refresh=true
```

Expected: `gh auth status` shows you logged in to github.com. `gh workflow run` prints that it
created a workflow_dispatch event. Then find **this** run's ID. Run the next command up to 12
times, 5 seconds apart, until it prints a number different from `$LAST_ID`:

```bash
gh run list --workflow github-snapshot-monitor.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId // 0'
```

```bash
RUN_ID=<the new number from the previous command>
gh run watch "$RUN_ID" --exit-status; echo "exit=$?"
gh run view "$RUN_ID" --log | grep -E "Forced refresh succeeded|::error::"
```

Expected: `exit=0`, and the log line `Forced refresh succeeded.` If the log has `::error::` with
`401`, the GitHub repo secret and the Vercel secret differ. Stop and tell the user; do not touch
secrets.

6c. Tell the user (they do this, not the Implementer): open GitHub -> Settings ->
Notifications -> Actions, and make sure email is on for failed workflows. Otherwise a failing
monitor sends no email.

6d. Next-day check, any time on 2026-11-24 (UTC):

```bash
gh run list --workflow github-snapshot-monitor.yml --event schedule --limit 3 --json createdAt,conclusion
```

Expected: at least one run created on `2026-11-23` with `"conclusion":"success"`. A `failure`
means the Vercel cron missed that night. Report it to the user with `gh run view <id> --log`.

## Stop conditions

Stop, report the full output, and wait for the user when:

- Step 0: the branch is not `main`; `BASE_OK` or `PATCH_OK` is missing; the hash differs; or
  `src/`/`.github/` already has changes.
- `TOKEN_OK` is missing.
- Any command exits non-zero when the plan expects 0, or zero when it expects a failure.
- The test counts differ from 44 / 44 / 0.
- Any Step 3 check is FAIL.
- The Vercel status is `failure`/`error`, or not `success` after 10 checks.
- The forced monitor run fails.
- You feel the need to edit code to make something pass. Do not; report instead.

## Rollback (only with the user's explicit approval; it redeploys production)

```bash
FIX_SHA=$(git log --format=%H -1 --grep='^fix(github): read contribution calendar from GraphQL')
CI_SHA=$(git log --format=%H -1 --grep='^ci: add daily GitHub snapshot freshness monitor')
echo "fix=$FIX_SHA ci=$CI_SHA"
```

Check that both are non-empty 40-character SHAs, then:

```bash
git revert --no-edit "$CI_SHA" "$FIX_SHA"
git push origin main
```

The secrets can stay; they are harmless with the old code. The old code uses `GITHUB_TOKEN`
optionally and needs `CRON_SECRET` for the cron.

## Not in scope

- The "Snapshot refreshed" date is shown in UTC (`src/components/landing/activity.tsx:10-11`).
- A keepalive for the 60-day scheduled-workflow rule. Normal pushes keep the repo active.
- Extra calendar sanity rules (minimum day count, duplicate or negative values). The source is
  GitHub's typed API, and any shape change already fails closed.
- Moving profile, repos, and events from REST to GraphQL.
