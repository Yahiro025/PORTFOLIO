# 001 — Slow the scroll and open up the pinned sequence

- **Status**: DONE
- **Commit**: bbcad03
- **Severity**: HIGH
- **Category**: Purpose & frequency / Cohesion
- **Estimated scope**: 4 files, ~45 lines changed

## Problem

The page moves faster than its own choreography. Three separate pacing decisions
stack into one rushed feeling:

1. Lenis is configured with a short 1.05s duration and no wheel multiplier, so a
   single wheel notch travels a large distance before easing out. The pinned
   sequence therefore arrives at the orbit section already near the end of its
   scroll budget.

   ```ts
   // src/components/landing/effects.tsx:240 — current
   lenis = new Lenis({
       duration: 1.05,
       smoothWheel: true,
       syncTouch: false,
       anchors: true,
       autoRaf: false,
       prevent: node => node.hasAttribute('data-lenis-prevent')
   })
   ```

2. The pinned sequence is only 430vh tall, so the flood, the orbit and the
   big-bang collapse all happen inside roughly three viewport-heights of scroll.

   ```css
   /* src/styles/globals.css:441 — current */
   .seq.is-rich { height: 430vh; }
   ```

3. The scroll fractions give the interactive orbit a narrow window. The mask
   finishes at 52.4% of the pin and collapse starts at 76.7%, so the orbit is
   only live for about 28% of the pin travel.

   ```ts
   // src/components/landing/sequence.tsx:43 — current
   const MASK_START = 0.152
   const MASK_DONE = 0.524
   const ENTRY_DONE = 0.439
   const COLLAPSE_START = 0.767
   ```

The About section has no reserved space below its sticky key stack, so the
keys can run into the section's 18svh bottom padding and collide with the
invite copy that follows. The grid ends at the last chapter; the sticky keys
are still stacked up to 3 steps plus one key-height below their start.

```css
/* src/styles/globals.css:559 — current */
.bio { --bio-top: 22svh; --bio-step: calc(clamp(1.6rem, 3.4vw, 3.4rem) * 1.1); }
.bio-grid { display: grid; grid-template-columns: auto auto minmax(0, 1fr); row-gap: clamp(60px, 10vh, 140px); }
```

```tsx
// src/components/landing/story.tsx:163 — current
<section ref={sectionRef} id='about' data-tone='ink' className='bio tone-ink relative px-5 pb-[18svh] pt-[16svh] sm:px-10'>
```

The finale keeps its 100svh stage pinned until the end of the whole section,
including the contact email block. The email block has to scroll over a stage
that is still stuck to the viewport top, which produces a long overlap and
covers the horizon/orb at the exact moment the visitor reaches the contact
details.

```tsx
// src/components/landing/finale.tsx:166 — current
<section ref={wrapRef} id='contact' data-tone='bone' className='finale relative'>
    <div className='finale-stage sticky top-0 h-[100svh] overflow-hidden'>
        ...
    </div>

    <div aria-hidden className='h-[45svh]' />

    <div className='relative bg-bone px-5 pb-28 pt-10 text-ink sm:px-10'>
```

## Target

Slow the wheel and lengthen the read before the pin:

```ts
// target — src/components/landing/effects.tsx
lenis = new Lenis({
    duration: 1.35,
    wheelMultiplier: 0.65,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
    autoRaf: false,
    prevent: node => node.hasAttribute('data-lenis-prevent')
})
```

Give the pinned sequence more travel and widen the live orbit window:

```css
/* target — src/styles/globals.css */
.seq.is-rich { height: 620vh; }
```

```ts
// target — src/components/landing/sequence.tsx
const MASK_START = 0.14
const MASK_DONE = 0.44
const ENTRY_DONE = 0.439
const COLLAPSE_START = 0.8
```

With these fractions the orbit becomes interactive when the mask is 90% done:
`0.14 + 0.9 * (0.44 - 0.14) = 0.41`. Collapse starts at `0.80`, so the live
window is 39% of 620vh instead of 28% of 430vh. That is roughly 242vh of travel
against 120vh today.

Reserve the About key stack's own height below the grid:

```css
/* target — src/styles/globals.css */
.bio {
    --bio-top: 22svh;
    --bio-step: calc(clamp(1.6rem, 3.4vw, 3.4rem) * 1.1);
    --bio-key-size: clamp(1.6rem, 3.4vw, 3.4rem);
    --bio-stack: calc(3 * var(--bio-step) + var(--bio-key-size));
}
.bio-grid {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    row-gap: clamp(60px, 10vh, 140px);
    padding-bottom: var(--bio-stack);
}
@media (max-width: 720px) {
    .bio-grid { padding-bottom: 0; }
}
```

Keep the finale pinned for 45svh of travel, then release it before the contact
email block instead of holding it behind that block:

```tsx
// target — src/components/landing/finale.tsx
<section ref={wrapRef} id='contact' data-tone='bone' className='finale relative'>
    <div className='finale-pin'>
        <div className='finale-stage sticky top-0 h-[100svh] overflow-hidden'>
            ...
        </div>
    </div>

    <div className='relative bg-bone px-5 pb-28 pt-10 text-ink sm:px-10'>
```

```css
/* target — src/styles/globals.css */
.finale-pin { position: relative; height: 145svh; }
```

The 145svh wrapper keeps the existing 45svh of pin travel (`145svh - 100svh`)
but ends the sticky containing block before the email block.

## Repo conventions to follow

- Easing and duration tokens live in `src/styles/globals.css` under `:root`;
  reuse `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` rather than typing a new
  curve. See `src/styles/globals.css:217`.
- Scroll choreography constants are plain module constants at the top of
  `src/components/landing/sequence.tsx`; keep the existing order and comments.
  See the current block at `src/components/landing/sequence.tsx:42`.
- Section-level spacing uses `svh` units, not `vh`. Follow the existing
  `100svh` stage and `18svh` section padding. See
  `src/components/landing/finale.tsx:167`.
- Lenis options are passed once in `Effects`; do not create a second instance.
  See `src/components/landing/effects.tsx:238`.

## Steps

1. `src/components/landing/effects.tsx`: change `duration: 1.05` to
   `duration: 1.35` and add `wheelMultiplier: 0.65` as the second option.
2. `src/styles/globals.css`: change `.seq.is-rich` from `height: 430vh` to
   `height: 620vh`.
3. `src/components/landing/sequence.tsx`: set `MASK_START = 0.14`,
   `MASK_DONE = 0.44`, `COLLAPSE_START = 0.8`. Leave `ENTRY_DONE`,
   `FLASH_START`, `FLASH_PEAK`, `EXPLODE_START` and the rest unchanged.
4. `src/styles/globals.css`: add `--bio-key-size` and `--bio-stack` to `.bio`,
   and add `padding-bottom: var(--bio-stack)` to `.bio-grid`.
5. `src/styles/globals.css`: inside the existing `@media (max-width: 720px)`
   block near `.bio-grid`, add `.bio-grid { padding-bottom: 0; }`.
6. `src/components/landing/finale.tsx`: wrap the existing
   `<div className='finale-stage ...'>` in `<div className='finale-pin'>`, and
   delete the `<div aria-hidden className='h-[45svh]' />` spacer.
7. `src/styles/globals.css`: add `.finale-pin { position: relative; height: 145svh; }`
   immediately before the `.finale` rule.

## Boundaries

- Do NOT touch the orbit interaction math, the ring, or the focus overlay; plans
  004 and 005 own those.
- Do NOT change Lenis easing or add a second scroll library.
- Do NOT change the manifesto markup, the flood clip-path math, or the finale
  orb flight path.
- Do NOT alter `.seq:not(.is-rich)` (the reduced-motion/static path).
- Do NOT add dependencies.
- If any constant or class does not match the excerpts at commit `bbcad03`,
  STOP and report the drift instead of improvising.

## Verification

- **Mechanical**: `node --test src/lib/*.test.mjs` passes; `npx tsc --noEmit`
  passes; `npm run build` completes.
- **Feel check**: run `npm run dev`, open the home page at a 1440×900 viewport,
  and confirm:
  - one wheel notch moves roughly one third less than before, and the page eases
    to a stop in about 1.35s rather than snapping;
  - the manifesto stays legible long enough to read the first two lines before
    the disc closes;
  - the orbit accepts drag and card clicks from the moment the disc is nearly
    closed until the flash, and the window is clearly wider than before.
  - In DevTools → Animations, set playback to 10% and confirm the mask closes
    without the manifesto text clipping at the edges.
  - Scroll to About and confirm the last key (`Toolbox`) never touches the
    "Want to build something together?" paragraph; it should release with
    visible clearance.
  - Scroll to the contact email block and confirm the finale stage has already
    begun scrolling away; the email block no longer overlaps a pinned horizon.
- **Done when**: the sequence has 620vh of travel, the orbit is interactive for
  about 39% of it, About's key stack clears the invite copy, and the contact
  block follows an unpinned stage.
