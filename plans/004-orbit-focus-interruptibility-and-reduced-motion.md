# 004 — Make the orbit focus interruptible and respect reduced motion

- **Status**: DONE
- **Commit**: bbcad03
- **Severity**: HIGH
- **Category**: Interruptibility & Accessibility
- **Estimated scope**: 2 files, ~35 lines changed

## Problem

The orbit focus overlay starts a new WAAPI animation on every open and close and
never cancels the previous one. Opening a card, closing it, and opening another
before the 520ms close finishes leaves two animations writing to the same
element. The old close's `onfinish` still fires, calls `setFocused(null)`, and
unmounts the overlay the visitor just opened.

Open animation:

```ts
// src/components/landing/sequence.tsx:507 — current
overlay.animate([
    { transform: `translate(${from.left - left}px, ${from.top - top}px) scale(${from.width / w}, ${from.height / h})` },
    { transform: 'none' }
], { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
```

Close animation with an unguarded finish callback:

```ts
// src/components/landing/sequence.tsx:538 — current
const anim = overlay.animate([
    { transform: 'none', opacity: 1 },
    {
        transform: `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(${card.w / box.width}, ${card.h / box.height})`,
        opacity: 0.6
    }
], { duration: 520, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' })
anim.onfinish = () => setFocused(null)
```

The close also sets `focusIndex = null` before the animation starts, so a rapid
reopen changes state while the previous close is still running.

Separately, several CSS motions never consult `prefers-reduced-motion`:

```css
/* src/styles/globals.css:436 — current */
html.js-motion .rise { display: inline-block; transform: translateY(calc(100% + 0.55em)); transition: transform 1.05s cubic-bezier(0.22, 1, 0.36, 1); }
```

```css
/* src/styles/globals.css:456 — current */
.mf-strike::after, .mf-underline::after {
    content: ''; position: absolute; left: 0; right: 0; height: 0.08em; background: var(--bone);
    transform-origin: left; transition: transform 1s cubic-bezier(0.65, 0, 0.35, 1);
}
```

```css
/* src/styles/globals.css:577 — current */
.bio-underline::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -0.06em; height: 2px; background: var(--ember);
    transform: scaleX(0); transform-origin: left; transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1);
}
```

```css
/* src/styles/globals.css:621 — current */
.finale-orb:hover, .finale-orb:focus-visible { scale: 1.06; background: var(--ember-hot); }
.finale-orb:hover::after, .finale-orb:focus-visible::after { opacity: 1; border-style: dashed; animation: cta-ring 5s linear infinite; }
.finale-orb:hover::before, .finale-orb:focus-visible::before { opacity: 1; border-style: dashed; animation: cta-ring 7s linear infinite reverse; }
```

The reduced-motion block at `src/styles/globals.css:649` covers infinite
decorative loops but not these one-shot transitions or the orb's hover rings.
AUDIT.md Section 6 says reduced motion keeps opacity/colour feedback and drops
movement; a reduced-motion visitor should not get a 1.05s slide, a 1s strike
draw, or two counter-rotating hover rings.

## Target

Track the live overlay animation and cancel it before starting another. Guard
the finish callback by identity so a stale animation can never clear a newer
focus. Skip the WAAPI movement when reduced motion is on.

```ts
// target — src/components/landing/sequence.tsx, near pendingFrom
let overlayAnim: Animation | null = null
```

```ts
// target — src/components/landing/sequence.tsx, placeOverlay
const from = pendingFrom
pendingFrom = null
overlayAnim?.cancel()
overlayAnim = null
if (prefersReducedMotion()) return
overlayAnim = overlay.animate([
    { transform: `translate(${from.left - left}px, ${from.top - top}px) scale(${from.width / w}, ${from.height / h})` },
    { transform: 'none' }
], { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
```

```ts
// target — src/components/landing/sequence.tsx, openFocus
const openFocus = (index: number) => {
    if (index < 0) {
        placeOverlay()

        return
    }
    overlayAnim?.cancel()
    overlayAnim = null
    const card = cards[index]
    pendingFrom = (card.inFront ? card.front : card.back).getBoundingClientRect()
    focusIndex = index
    setFocused(card.data)
}
```

```ts
// target — src/components/landing/sequence.tsx, closeFocus
const closeFocus = () => {
    if (focusIndex === null) return
    const overlay = overlayRef.current
    const card = cards[focusIndex]
    focusIndex = null
    overlayAnim?.cancel()
    overlayAnim = null
    if (!overlay || prefersReducedMotion()) {
        setFocused(null)

        return
    }
    const target = (card.inFront ? card.front : card.back).getBoundingClientRect()
    const box = overlay.getBoundingClientRect()
    const anim = overlay.animate([
        { transform: 'none', opacity: 1 },
        {
            transform: `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(${card.w / box.width}, ${card.h / box.height})`,
            opacity: 0.6
        }
    ], { duration: 520, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' })
    overlayAnim = anim
    anim.onfinish = () => {
        if (overlayAnim !== anim) return
        overlayAnim = null
        setFocused(null)
    }
}
```

Add `overlayAnim?.cancel()` to the main effect cleanup so an unmount cannot
leave an animation writing to a detached element.

Extend the existing reduced-motion block:

```css
/* target — src/styles/globals.css, inside the existing
   @media (prefers-reduced-motion: reduce) block at line 649 */
html.js-motion .rise { transition: none; }
.mf-strike::after,
.mf-underline::after,
.bio-underline::after { transition: none; }
.finale-orb:hover,
.finale-orb:focus-visible { scale: 1; }
.finale-orb:hover::before,
.finale-orb:hover::after,
.finale-orb:focus-visible::before,
.finale-orb:focus-visible::after { animation: none !important; }
```

Import the helper at the top of `sequence.tsx`:

```ts
// target — src/components/landing/sequence.tsx
import {
    clamp01,
    easeInOutCubic,
    easeOutCubic,
    pinProgress,
    prefersReducedMotion,
    richMotion
} from '@/lib/motion'
```

## Repo conventions to follow

- Reduced-motion helpers are read from `@/lib/motion`, not written inline; see
  `prefersReducedMotion` at `src/lib/motion.ts:17`.
- The orbit effect already bails for non-rich motion via
  `if (!rich) return` at `src/components/landing/sequence.tsx:343`. Keep that
  gate and add the per-call guard as defence for a preference changed after
  mount.
- CSS reduced-motion overrides are collected in the block at
  `src/styles/globals.css:649`; append there rather than scattering new media
  queries.
- WAAPI easing strings already used in this component are
  `cubic-bezier(0.16, 1, 0.3, 1)` for open and
  `cubic-bezier(0.65, 0, 0.35, 1)` for close; keep them.
- Transitions, not keyframes, are already used for the reversible focus motion;
  that choice is correct and must stay.

## Steps

1. `src/components/landing/sequence.tsx`: add `prefersReducedMotion` to the
   `@/lib/motion` import list.
2. `src/components/landing/sequence.tsx`: declare
   `let overlayAnim: Animation | null = null` beside `let pendingFrom`.
3. `placeOverlay`: cancel and null `overlayAnim` before creating the next
   animation; return before `overlay.animate` when `prefersReducedMotion()`.
4. `openFocus`: cancel and null `overlayAnim` before reading the card rect and
   setting state.
5. `closeFocus`: cancel and null `overlayAnim` after `focusIndex = null`; skip
   WAAPI and call `setFocused(null)` immediately when `prefersReducedMotion()`;
   assign the new animation to `overlayAnim`; guard `onfinish` with
   `if (overlayAnim !== anim) return`.
6. Add `overlayAnim?.cancel()` in the effect cleanup before `stopOrbit?.()`.
7. `src/styles/globals.css`: append the reduced-motion rules above to the block
   at line 649.

## Boundaries

- Do NOT change the open/close durations, curves, or FLIP math.
- Do NOT change the caption, slideshow, or orbit drag logic.
- Do NOT remove the existing reduced-motion rule that disables
  `.mf-ring-track`, `.cn-track`, `.cn-counter`, `.cn-cases`,
  `.site-footer-tick i` and `.orbit-progress::after`.
- Do NOT add a global `* { animation: none }` reset.
- Do NOT touch the hero dock animation; it already gates on `reduced` at
  `src/components/landing/hero.tsx:198`.
- If the excerpts differ at commit `bbcad03`, STOP and report.

## Verification

- **Mechanical**: `node --test src/lib/*.test.mjs` passes; `npx tsc --noEmit`
  passes; `npm run build` completes.
- **Feel check**: run `npm run dev`, open the orbit section, and confirm:
  - clicking card A, pressing `Escape`, and immediately clicking card B opens
    B smoothly; B never disappears when A's close would have finished;
  - spamming a card open/close does not leave a ghost overlay, a stuck caption,
    or a card at `scale(0.001)`;
  - the overlay grows from the clicked card's rect and shrinks back to that
    card's current rect, including after an orbit drag.
  - In DevTools → Rendering, set `prefers-reduced-motion: reduce`, then click a
    card: the overlay should appear and disappear with no grow/shrink motion.
  - With reduced motion still on, reload and confirm the manifesto words,
    strike/underline draws, bio underline, and finale orb do not animate
    positionally; colour and opacity feedback remain.
  - In DevTools → Animations at 10% playback, confirm no two overlay animations
    run at once and no `onfinish` clears the overlay while it is visible.
- **Done when**: rapid open/close cannot produce a stale state, and reduced
  motion removes every listed movement while keeping comprehension feedback.
