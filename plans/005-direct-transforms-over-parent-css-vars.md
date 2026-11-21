# 005 — Write ring transforms directly instead of parent CSS variables

- **Status**: DONE
- **Commit**: bbcad03
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files, ~15 lines changed

## Problem

Every scroll frame the pinned sequence writes three custom properties on
`.mf-ring-field`: `--ring-y`, `--ring-s`, and `--sat-s`.

```ts
// src/components/landing/sequence.tsx:598 — current
ringField.style.setProperty('--ring-y', `${((1 - ringE) * -0.24 * vh).toFixed(1)}px`)
ringField.style.setProperty('--ring-s', (Math.pow(clamp01(1 - progress / 0.5), 1.3) * grown).toFixed(4))
ringField.style.setProperty('--sat-s', (Math.pow(clamp01(1 - Math.max(0, progress - 0.1) / 0.5), 1.3) * grown).toFixed(4))
```

Custom properties inherit. Changing them on the parent dirties style for every
descendant that reads them, and the ring subtree reads all three:

```css
/* src/styles/globals.css:467 — current */
.mf-ring-field {
    --ring-d: min(92vmin, 900px);
    position: absolute; left: 50%; top: 50%; z-index: 0; pointer-events: none;
    width: var(--ring-d); height: var(--ring-d);
    margin: calc(var(--ring-d) / -2) 0 0 calc(var(--ring-d) / -2);
    transform: translateY(var(--ring-y, 0px));
}
```

```css
/* src/styles/globals.css:474 — current */
.mf-ring {
    position: absolute; inset: 0; border-radius: 50%;
    transform: scale(var(--ring-s, 1));
    background: color-mix(in oklab, var(--bone) 42%, transparent);
    mask: radial-gradient(closest-side, transparent 39.8%, #000 40.4%);
}
.mf-ring-spin { position: absolute; inset: 0; transform: scale(var(--sat-s, 1)); }
```

This runs while the flood is collapsing, exactly when the orbit and cards are
also doing per-frame work. AUDIT.md Section 5: do not drive child transforms
through a parent CSS variable; set `transform` on the element that moves.

## Target

Query the two child elements once inside the pinned effect and write their
transforms directly. Each write now touches one element, and the custom
properties no longer participate in style recalculation.

```ts
// target — src/components/landing/sequence.tsx, near the other refs
const ring = ringField.querySelector<HTMLElement>('.mf-ring')
const ringSpin = ringField.querySelector<HTMLElement>('.mf-ring-spin')
if (!ring || !ringSpin) return
```

```ts
// target — src/components/landing/sequence.tsx, replacing the three setProperty calls
const ringScale = Math.pow(clamp01(1 - progress / 0.5), 1.3) * grown
const satScale = Math.pow(clamp01(1 - Math.max(0, progress - 0.1) / 0.5), 1.3) * grown
ringField.style.transform = `translate3d(0, ${((1 - ringE) * -0.24 * vh).toFixed(1)}px, 0)`
ring.style.transform = `scale(${ringScale.toFixed(4)})`
ringSpin.style.transform = `scale(${satScale.toFixed(4)})`
```

```css
/* target — src/styles/globals.css */
.mf-ring-field {
    --ring-d: min(92vmin, 900px);
    position: absolute; left: 50%; top: 50%; z-index: 0; pointer-events: none;
    width: var(--ring-d); height: var(--ring-d);
    margin: calc(var(--ring-d) / -2) 0 0 calc(var(--ring-d) / -2);
    transform: translate3d(0, 0, 0);
}
```

```css
/* target — src/styles/globals.css */
.mf-ring {
    position: absolute; inset: 0; border-radius: 50%;
    transform: scale(1);
    background: color-mix(in oklab, var(--bone) 42%, transparent);
    mask: radial-gradient(closest-side, transparent 39.8%, #000 40.4%);
}
.mf-ring-spin { position: absolute; inset: 0; transform: scale(1); }
```

The satellite itself can stay where it is: `.mf-ring-spin` is the element that
scales, and the inner `.mf-ring-track` keeps its `cn-spin` rotation.

## Repo conventions to follow

- Per-frame writes live in the `floodJob.write` path and must not force layout;
  read `src/lib/frame.ts:1` for the read-before-write driver.
- Runtime-computed transforms are set with `style.transform` throughout this
  component; see the orbit cards at
  `src/components/landing/sequence.tsx:737` and the satellite at
  `src/components/landing/sequence.tsx:300`.
- CSS keeps only static base transforms when JS owns the animated value; see
  `.orbit-card` and `.finale-orb` at `src/styles/globals.css:492` and
  `src/styles/globals.css:601`.
- Use `translate3d` for the promoted layer on the field, matching
  `src/components/landing/effects.tsx:123`.

## Steps

1. `src/components/landing/sequence.tsx`: after the existing ref guard at
   line 354, query `ring` and `ringSpin` from `ringField` and return if either is
   missing.
2. `src/components/landing/sequence.tsx:598-600`: replace the three
   `setProperty` calls with the two scale calculations and three
   `style.transform` writes above.
3. `src/styles/globals.css:472`: change
   `transform: translateY(var(--ring-y, 0px));` to
   `transform: translate3d(0, 0, 0);`.
4. `src/styles/globals.css:476`: change
   `transform: scale(var(--ring-s, 1));` to `transform: scale(1);`.
5. `src/styles/globals.css:480`: change
   `transform: scale(var(--sat-s, 1));` to `transform: scale(1);`.

## Boundaries

- Do NOT change the ring's shape, mask, colour, or timing formula. The numeric
  output must stay identical; only the write mechanism changes.
- Do NOT touch the manifesto rows, the flood clip-path, the orbit cards, or the
  satellite hover effect.
- Do NOT add `will-change` unless the Performance panel shows the ring still
  repainting; this plan is about removing inherited style work, not adding
  compositor hints.
- Do NOT convert the ring to a canvas, SVG, or a new dependency.
- If the lines differ at commit `bbcad03`, STOP and report.

## Verification

- **Mechanical**: `node --test src/lib/*.test.mjs` passes; `npx tsc --noEmit`
  passes; `npm run build` completes.
- **Mechanical, variable removal**:
  `git grep -n -e "--ring-y" -e "--ring-s" -e "--sat-s" -- src` returns no
  matches after the change.
- **Feel check**: run `npm run dev`, scroll slowly through the pinned sequence,
  and confirm:
  - the ring still rises into place and melts away at the same visual moment;
  - the satellite still shrinks with the ring and does not detach or lag;
  - the manifesto text stays above the ring and the orbit cards still render in
    front where expected.
  - In DevTools → Performance, record 3 seconds of scrolling through the
    collapse at 4× CPU throttling. The `Recalculate Style` and `Paint` slices
    for the ring subtree should shrink; frame drops during the flash should be
    fewer than before.
  - In DevTools → Rendering, enable Paint flashing and confirm the ring does not
    flash a larger area than before (the transform is still composited).
- **Done when**: no `--ring-*` or `--sat-s` writes remain, and the ring,
  satellite, and manifesto look identical at 0%, 50%, and 100% of the collapse.
