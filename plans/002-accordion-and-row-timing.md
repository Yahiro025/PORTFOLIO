# 002 — Tighten accordion and project-row timing

- **Status**: DONE
- **Commit**: bbcad03
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 2 files, 6 lines changed

## Problem

Three UI surfaces exceed the duration budget for interactions the visitor
triggers directly. They all use `--ease-out`, so the curve is fine; only the
timing is slow.

The project row title and its plus button take 500ms to move and recolour. This
runs on every row hover and every open/close, so the delay is felt repeatedly.

```tsx
// src/components/landing/work-index.tsx:32 — current
className={cn(
    'display text-display-lg font-bold transition-[color,transform] duration-500 ease-[var(--ease-out)] group-hover:translate-x-3',
    open ? 'text-ember' : 'group-hover:text-ember'
)}
```

```tsx
// src/components/landing/work-index.tsx:44 — current
className={cn(
    'col-start-2 row-span-2 row-start-1 grid size-12 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-500 ease-[var(--ease-out)] md:col-start-3 md:row-span-1',
    open ? 'rotate-45 border-ember bg-ember text-ink' : 'border-bone/30 group-hover:border-bone'
)}
```

The hover lens takes 600ms to wipe in with `clip-path`. It is decorative and
follows the pointer, so it should arrive almost immediately.

```css
/* src/styles/globals.css:339 — current */
.work-lens {
    clip-path: circle(0% at 50% 50%);
    transition: clip-path 600ms var(--ease-out);
}
```

The expand/collapse drawers take 650ms. This rule is shared by the Work index
project rows and the Constellation PR rows, so both feel sticky and late.

```css
/* src/styles/globals.css:347 — current */
.expand {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 650ms var(--ease-out);
}
```

AUDIT.md Section 2 puts UI motion under 300ms, and allows drawers up to 500ms.
The row hover is plain UI and should be 250ms; the lens is a pointer-following
reveal and should be 350ms; the accordions are drawers and should be 420ms.

## Target

```tsx
// target — src/components/landing/work-index.tsx
className={cn(
    'display text-display-lg font-bold transition-[color,transform] duration-[250ms] ease-[var(--ease-out)] group-hover:translate-x-3',
    open ? 'text-ember' : 'group-hover:text-ember'
)}
```

```tsx
// target — src/components/landing/work-index.tsx
className={cn(
    'col-start-2 row-span-2 row-start-1 grid size-12 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-[250ms] ease-[var(--ease-out)] md:col-start-3 md:row-span-1',
    open ? 'rotate-45 border-ember bg-ember text-ink' : 'border-bone/30 group-hover:border-bone'
)}
```

```css
/* target — src/styles/globals.css */
.work-lens {
    clip-path: circle(0% at 50% 50%);
    transition: clip-path 350ms var(--ease-out);
}
```

```css
/* target — src/styles/globals.css */
.expand {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 420ms var(--ease-out);
}
```

## Repo conventions to follow

- `--ease-out` is the established token for UI enters and hover changes; use it
  verbatim. See `src/styles/globals.css:217`.
- Arbitrary Tailwind durations in this repo use bracket syntax when the value is
  not on the default scale, e.g. `duration-[160ms]` in plan 003. Use
  `duration-[250ms]` here, not `duration-250`.
- The `.expand` rule is intentionally shared by
  `src/components/landing/work-index.tsx:53` and
  `src/components/landing/constellation.tsx:374`; change it once in
  `globals.css` rather than duplicating a variant.
- `.work-lens` is hidden on touch via the `[@media(hover:hover)_and_(pointer:fine)]:block`
  utility at `src/components/landing/work-index.tsx:204`; do not change that
  gating.

## Steps

1. `src/components/landing/work-index.tsx:32`: replace `duration-500` with
   `duration-[250ms]` on the title span.
2. `src/components/landing/work-index.tsx:44`: replace `duration-500` with
   `duration-[250ms]` on the plus-button span.
3. `src/styles/globals.css:341`: change `transition: clip-path 600ms var(--ease-out);`
   to `transition: clip-path 350ms var(--ease-out);`.
4. `src/styles/globals.css:350`: change
   `transition: grid-template-rows 650ms var(--ease-out);` to
   `transition: grid-template-rows 420ms var(--ease-out);`.

## Boundaries

- Do NOT change the row hover offsets, colours, or the plus rotation.
- Do NOT change the drawer's `grid-template-rows` technique; measured height is
  the documented accordion exception and interpolating `fr` is correct here.
- Do NOT touch the `prefers-reduced-motion` block at
  `src/styles/globals.css:355`; it already disables both transitions.
- Do NOT alter the work lens's clip-path shape, size, or pointer tracking.
- Do NOT add dependencies.
- If the lines differ from the commit `bbcad03` excerpts, STOP and report.

## Verification

- **Mechanical**: `node --test src/lib/*.test.mjs` passes; `npx tsc --noEmit`
  passes; `npm run build` completes.
- **Feel check**: run `npm run dev` and confirm:
  - hovering a Work row moves and recolours the title in 250ms; the response
    starts on the same frame as the pointer enters the row;
  - entering a Work row brings the lens in quickly enough that it reads as a
    direct pointer response, not a delayed effect;
  - clicking a Work row expands its panel in 420ms and a second click retracts
    it from the current height, never restarting from zero;
  - clicking a Constellation PR row expands at the same 420ms.
  - In DevTools → Animations, set playback to 10% and confirm the row title
    colour and translate finish together, and the drawer does not overshoot or
    flash its content.
  - Toggle `prefers-reduced-motion` in the Rendering panel and confirm drawers
    still open and close instantly with no animated height.
- **Done when**: the two row transitions report 250ms, the lens 350ms, the
  drawers 420ms, and every interaction still starts and reverses without a
  visible restart.
