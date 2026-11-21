# Animation improvement plans

Five self-contained plans for the landing page's motion pass. Each plan was
written against commit `bbcad03` and follows the `improve-animations` plan
template: exact file/line citations, exact target values from `AUDIT.md`,
step-by-step edits, boundaries, and a slow-motion feel check.

These plans are written against `bbcad03`; line numbers and excerpts refer to
that commit. This slice did not modify any file under `src/`. The working tree
already contained concurrent edits from other implementation slices when these
plans were written, so re-check a plan's excerpts before executing it and stop
on drift.

`Status: DONE` in each plan means the plan document is complete and ready to
execute; it does not mean the code change has been applied.

## Plans

| Plan | Severity | Category | Primary files | Depends on |
| --- | --- | --- | --- | --- |
| [001 — Slow the scroll and open up the pinned sequence](001-scroll-and-pinned-pacing.md) | HIGH | Purpose & frequency / Cohesion | `effects.tsx`, `sequence.tsx`, `story.tsx`, `finale.tsx`, `globals.css` | — |
| [002 — Tighten accordion and project-row timing](002-accordion-and-row-timing.md) | HIGH | Easing & duration | `work-index.tsx`, `globals.css` | — |
| [003 — Add tactile press feedback to every CTA pill](003-press-feedback-and-origins.md) | MEDIUM | Physicality & origin | `hero.tsx`, `site-header.tsx`, `work-index.tsx`, `constellation.tsx`, `finale.tsx`, `404.tsx`, `500.tsx`, `globals.css` | — |
| [004 — Make the orbit focus interruptible and respect reduced motion](004-orbit-focus-interruptibility-and-reduced-motion.md) | HIGH | Interruptibility & Accessibility | `sequence.tsx`, `globals.css` | — |
| [005 — Write ring transforms directly instead of parent CSS variables](005-direct-transforms-over-parent-css-vars.md) | MEDIUM | Performance | `sequence.tsx`, `globals.css` | — |

## Recommended execution order

1. **004** first. It fixes the stale `onfinish` bug and the reduced-motion
   gaps. Do it before touching the sequence again so the overlay's animation
   lifecycle is stable.
2. **005** second. It rewrites the ring write path in the same effect file; do
   it while the overlay cleanup from 004 is fresh.
3. **001** third. It changes the sequence constants and pacing after the
   sequence internals are correct. Its finale wrapper change shares
   `finale.tsx` with 003.
4. **002** fourth. Independent timing-only change, safe to batch with 003.
5. **003** last. Broad but mechanical class-string edits across seven files.

If two people work in parallel, keep 004, 005 and 001 serialized because all
three edit `src/components/landing/sequence.tsx`. Keep 001 and 003 serialized
on `src/components/landing/finale.tsx`; they touch different lines but the same
file.

## Verification per plan

Every plan uses the repo's check:

```bash
node --test src/lib/*.test.mjs
npx tsc --noEmit
npm run build
```

Each plan also has a feel check with DevTools slow motion and the
`prefers-reduced-motion` emulation. Do not mark a plan complete on a green build
alone; motion can be mechanically valid and still feel wrong.

## Notes

- All durations and curves come from `AUDIT.md`; do not substitute a "nicer"
  easing.
- `.expand` is shared by the Work index and the Constellation. A timing change
  there must be checked on both.
- `--ease-out` is already defined in `src/styles/globals.css:217`; do not add a
  duplicate token.
- If the code no longer matches a plan's commit-stamped excerpts, stop and
  update the plan instead of improvising.
