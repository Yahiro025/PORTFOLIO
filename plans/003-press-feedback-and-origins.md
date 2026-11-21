# 003 — Add tactile press feedback to every CTA pill

- **Status**: DONE
- **Commit**: bbcad03
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 7 files, ~1 line per CTA

## Problem

Every call to action responds to hover and to colour, but none responds to the
press itself. On a mouse click or a touch tap the control changes only after the
navigation begins, so the interface feels glassy rather than physical.

Hero primary and secondary pills:

```tsx
// src/components/landing/hero.tsx:686 — current
className='group inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3.5 font-semibold text-ink transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-ember-hot'
```

```tsx
// src/components/landing/hero.tsx:693 — current
className='inline-flex items-center rounded-full border border-bone/35 px-6 py-3.5 font-semibold transition-colors duration-300 hover:border-bone hover:bg-bone hover:text-ink'
```

Header CTA:

```tsx
// src/components/landing/site-header.tsx:140 — current
className={cn(
    'whitespace-nowrap rounded-full px-4 py-2.5 text-small font-semibold transition-[background-color,color,transform] duration-500 hover:-translate-y-px sm:px-5',
    onDark ? 'bg-ember text-ink hover:bg-ember-hot' : 'bg-ink text-bone hover:bg-ink-2'
)}
```

Work index panel CTAs:

```tsx
// src/components/landing/work-index.tsx:90 — current
className='inline-flex items-center gap-1.5 rounded-full bg-ember px-5 py-3 font-semibold text-ink transition-colors hover:bg-ember-hot'
```

```tsx
// src/components/landing/work-index.tsx:101 — current
className='inline-flex items-center gap-1.5 rounded-full border border-bone/35 px-5 py-3 font-semibold transition-colors hover:border-bone hover:bg-bone hover:text-ink'
```

Constellation centre CTA:

```tsx
// src/components/landing/constellation.tsx:340 — current
className='cn-center absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ember text-ink'
```

```css
/* src/styles/globals.css:541 — current */
transition: width 0.45s var(--ease-out), opacity 0.6s ease;
```

Finale copy-email button:

```tsx
// src/components/landing/finale.tsx:198 — current
className='inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-small font-semibold text-bone transition-colors hover:bg-ink-2'
```

404 and 500 return links:

```tsx
// src/pages/404.tsx:27 — current
className='text-sm underline underline-offset-4 hover:text-primary'
```

```tsx
// src/pages/500.tsx:23 — current
className='text-sm underline underline-offset-4 hover:text-primary'
```

AUDIT.md Section 3 asks for `scale(0.97)` on `:active` with a 100–160ms
`ease-out` transition.

## Target

Add `active:scale-[0.97]` to every CTA above, and make sure `scale` is in the
transition property list with a 160ms `--ease-out`. Tailwind v4 compiles
`scale-[0.97]` to the `scale` property, not `transform`, so `transform` alone in
the transition list will not animate it.

```tsx
// target — src/components/landing/hero.tsx:686
className='group inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3.5 font-semibold text-ink transition-[background-color,translate,scale] duration-[160ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-ember-hot active:scale-[0.97]'
```

```tsx
// target — src/components/landing/hero.tsx:693
className='inline-flex items-center rounded-full border border-bone/35 px-6 py-3.5 font-semibold transition-[background-color,border-color,color,scale] duration-[160ms] ease-[var(--ease-out)] hover:border-bone hover:bg-bone hover:text-ink active:scale-[0.97]'
```

```tsx
// target — src/components/landing/site-header.tsx:140
className={cn(
    'whitespace-nowrap rounded-full px-4 py-2.5 text-small font-semibold transition-[background-color,color,translate,scale] duration-[160ms] ease-[var(--ease-out)] hover:-translate-y-px active:scale-[0.97] sm:px-5',
    onDark ? 'bg-ember text-ink hover:bg-ember-hot' : 'bg-ink text-bone hover:bg-ink-2'
)}
```

```tsx
// target — src/components/landing/work-index.tsx:90
className='inline-flex items-center gap-1.5 rounded-full bg-ember px-5 py-3 font-semibold text-ink transition-[background-color,scale] duration-[160ms] ease-[var(--ease-out)] hover:bg-ember-hot active:scale-[0.97]'
```

```tsx
// target — src/components/landing/work-index.tsx:101
className='inline-flex items-center gap-1.5 rounded-full border border-bone/35 px-5 py-3 font-semibold transition-[background-color,border-color,color,scale] duration-[160ms] ease-[var(--ease-out)] hover:border-bone hover:bg-bone hover:text-ink active:scale-[0.97]'
```

```tsx
// target — src/components/landing/constellation.tsx:340
className='cn-center absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ember text-ink active:scale-[0.97]'
```

```css
/* target — src/styles/globals.css:541 */
transition: width 0.45s var(--ease-out), opacity 0.6s ease, scale 160ms var(--ease-out);
```

```tsx
// target — src/components/landing/finale.tsx:198
className='inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-small font-semibold text-bone transition-[background-color,scale] duration-[160ms] ease-[var(--ease-out)] hover:bg-ink-2 active:scale-[0.97]'
```

```tsx
// target — src/pages/404.tsx:27
className='inline-block rounded-sm text-sm underline underline-offset-4 transition-[color,scale] duration-[160ms] ease-[var(--ease-out)] hover:text-primary active:scale-[0.97]'
```

```tsx
// target — src/pages/500.tsx:23
className='inline-block rounded-sm text-sm underline underline-offset-4 transition-[color,scale] duration-[160ms] ease-[var(--ease-out)] hover:text-primary active:scale-[0.97]'
```

## Repo conventions to follow

- CTA pills are `inline-flex items-center rounded-full` with `px-5 py-3` or
  `px-6 py-3.5`; keep those classes and append motion utilities only. See the
  hero primary at `src/components/landing/hero.tsx:686`.
- Custom easings use `ease-[var(--ease-out)]`, never a hand-typed
  `cubic-bezier`. See `src/components/landing/work-index.tsx:32`.
- Tailwind v4 uses separate `translate`, `rotate` and `scale` properties.
  Existing code already relies on this for `hover:-translate-y-0.5`; include
  those property names in the transition list. Do not rewrite them to
  `transform`.
- The 404/500 pages are minimal and use default Tailwind colours; keep their
  existing type scale and underline treatment.

## Steps

1. `src/components/landing/hero.tsx:686`: replace the class string on the
   "See the work" link with the target above.
2. `src/components/landing/hero.tsx:693`: replace the class string on the
   "Get in touch" link with the target above.
3. `src/components/landing/site-header.tsx:140`: replace the `cn()` class string
   on the header CTA with the target above.
4. `src/components/landing/work-index.tsx:90`: replace the "Open live site"
   class string.
5. `src/components/landing/work-index.tsx:101`: replace the "Source" class
   string.
6. `src/components/landing/constellation.tsx:340`: append
   `active:scale-[0.97]` to the centre link's class string.
7. `src/styles/globals.css:541`: add `scale 160ms var(--ease-out)` to the
   `.cn-center` transition list.
8. `src/components/landing/finale.tsx:198`: replace the copy-email button class
   string.
9. `src/pages/404.tsx:27` and `src/pages/500.tsx:23`: replace both return-link
   class strings with the target above.

## Boundaries

- Do NOT add press feedback to the finale orb, header nav items, footer links,
  or the orbit close button; this plan covers pills and return links only.
- Do NOT add `:active` scaling to `html` or any container.
- Do NOT change CTA padding, radius, colour, or wording.
- Do NOT add `transition-all`.
- Do NOT add dependencies.
- If a class string differs from the commit `bbcad03` excerpts, STOP and
  report the drift.

## Verification

- **Mechanical**: `node --test src/lib/*.test.mjs` passes; `npx tsc --noEmit`
  passes; `npm run build` completes.
- **Feel check**: run `npm run dev` and confirm:
  - pressing and holding each pill shrinks it to 97% within about 160ms;
    releasing restores it at the same speed;
  - the header CTA no longer takes 500ms to settle after a press;
  - hovering still lifts the hero and header CTAs; the hover lift and press
    scale do not fight or jump on release;
  - the constellation centre CTA still widens on hover, and pressing while
    hovered scales down without flicker;
  - keyboard `Tab` focus is unchanged and `Enter` on the 404/500 links still
    navigates.
  - In DevTools → Animations, set playback to 10% and confirm the scale starts
    on pointer-down, not after the click handler returns.
  - On a touch device, confirm a tap shows a brief 97% press and does not leave
    the pill stuck small.
- **Done when**: every listed control has a visible press state and no layout
  shift occurs at rest.
