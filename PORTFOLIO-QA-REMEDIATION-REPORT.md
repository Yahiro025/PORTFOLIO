# Portfolio QA Remediation Report

Date: 2026-09-08

## Scope

This report records the QA remediation work in the current checkout. The QA report was treated as evidence; reported issues were checked against the implementation before changes were made. Existing visual identity, reel behavior, deferred previews, Resume/PDF behavior, and source/live links remain in scope.

## Verified root causes and changes

### Mobile project preview crop

The attached screenshot was the static TANGLAW poster, not a responsive page render. `public/previews/tanglaw.jpg` is `1512×806`, while the mobile gallery places it in a `4:5` card with `object-cover`. The resulting center crop removes large parts of the desktop page. The mobile gallery also bypassed `FolioPreview`, so it could not use the existing iframe path.

`src/components/landing/mobile-gallery.tsx` now mounts a live iframe only for the selected, non-clone project when its curated data has both `embed: true` and a live URL. The iframe uses the card's native width and height, is lazy, non-focusable, and pointer-disabled. The poster remains visible until the iframe loads and becomes an uncropped fallback if the iframe fails. Inactive projects and loop clones remain poster-only.

Mobile project details now use the existing live-interactive `FolioPreview` path when the project is verified for embedding. Desktop scaling rules were not changed.

### Recruiter metadata and crawler asset

The default Open Graph image referenced `/og-image.png`, but that file was absent. The default now points to the existing `/previews/tanglaw.jpg`, which is present in `public/`. `public/robots.txt` and `public/sitemap.xml` are present and point to the configured production URL.

## Measurements

The following Lighthouse records were already present in `scratch/qa/` and use the same mobile simulation family (412×823, DPR 1.75, 4× CPU):

| Run | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| Baseline 1 | 54 | 4.749 s | 0.0025 | 1,658.5 ms |
| Baseline 2 | 67 | 3.854 s | 0.5232 | 87.5 ms |
| Baseline 3 | 67 | 3.807 s | 0.5144 | 75.5 ms |
| Latest recorded iteration before this mobile-preview patch | 87 | 3.794 s | 0 | 144.5 ms |

The latest mobile-preview patch could not receive a fresh browser or Lighthouse measurement in this environment. Chromium exits with `SIGTRAP` during Playwright startup, the local in-app browser is blocked by the environment's automatic review limit, and local server connections are unavailable from the shell namespace. No post-patch LCP, CLS, or performance score is claimed.

Targets remain performance ≥80, LCP ≤2.5 s, and CLS ≤0.1.

## Validation performed

- `node --test src/lib/*.test.mjs` — passed, 2 test files.
- Focused TypeScript check using a temporary config that excludes stale generated `.next/dev/types` — passed.
- `git diff --check` — passed.
- Impeccable detector over the changed UI and SEO files — passed with no findings.
- Static metadata checks confirm the referenced preview asset, robots file, and sitemap file exist.

## Checks that remain environment-blocked

- Full browser interaction checks at 375×812, 412×823, and 1440px.
- Visual confirmation that TANGLAW's live iframe has loaded its responsive layout.
- Fresh Lighthouse runs after this patch.
- `npm run build` is currently blocked by the sandbox/Turbopack process-binding error (`Operation not permitted`). The webpack fallback also stops while parsing TypeScript's generated configuration. The repository's normal `tsc` command sees duplicate generated validators in `.next/types` and `.next/dev/types`; the focused source check passes.

These limits are recorded instead of treated as successful measurements.
