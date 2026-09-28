---
name: Bennett Payoyo
description: A student engineer drawn as a gravitational body; merged code pulled into large systems.
colors:
  ink: "#0e0e0d"
  ink-raised: "#1a1a18"
  ink-line: "#2c2b28"
  bone: "#eeebe4"
  bone-deep: "#dcd8ce"
  bone-line: "#c9c4b8"
  ember: "#ff5b2e"
  ember-hot: "#ff7a52"
  muted-on-ember: "#3b1a0f"
  accent-cobalt: "#5b8cff"
  accent-cobalt-hot: "#7da3ff"
  muted-on-cobalt: "#0f1d3b"
  accent-mustard: "#e0a82e"
  accent-mustard-hot: "#ebbd55"
  muted-on-mustard: "#3b2a07"
  muted-on-ink: "#a3a097"
  muted-on-bone: "#5a574f"
typography:
  flood:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 8.2vw, 8.4rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  display-lg:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6.4vw, 6.4rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5.6vw, 5.4rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3.4vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  statement:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  micro:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "tnum"
rounded:
  image: "14px"
  orbit-card: "6px"
  full: "9999px"
spacing:
  gutter-mobile: "20px"
  gutter: "40px"
  section-y: "112px"
  section-y-lg: "144px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ember-hot}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-ink-hover:
    backgroundColor: "{colors.ink-raised}"
  chip-status:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  nav-link:
    textColor: "{colors.bone}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  index-row-toggle:
    rounded: "{rounded.full}"
    size: "48px"
---

<!-- Recorded from the shipped landing page (src/pages/index.tsx, src/components/landing/*, src/styles/globals.css "Gravity interactions" block). Supersedes docs/design.md, which describes the retired reel world. This pass records the full interaction layer added on top of the flood world: cycling accent, Kepler-orbit hero with dock flight, WebGL depth portrait, gravity cursor, pinned manifesto-to-orbit-to-constellation sequence, reading wave, and horizon finale. -->

# Design System: Bennett Payoyo

## Overview

**Creative North Star: "The Gravity Well"**

Bennett is drawn as a body with mass. The whole world is built from three celestial primitives (a solid disc, a thick ring, a small dot) set on an ink ground, lit by one accent body. Everything else orbits: merged pull requests become planets in a constellation, the header mark drifts into a docked mini-glyph, the manifesto collapses into a disc that opens onto an orbiting sphere of real project screenshots before the constellation is born from it. Motion is physical and slow to settle, and now runs as one continuous pinned choreography down the page rather than isolated per-section moments.

Density is low and scale is high. Sections are full-bleed floods of one tone (ink, bone, or accent), and each flood carries its own inversion of the palette rather than a card sitting on a background. Type is Gabarito set tight and heavy, going to uppercase caps only at the loudest moments; Geist Mono appears only where the page reports a measurement (coordinates, dates, counts, star totals, the constellation's orbit labels).

The one chromatic body is no longer a fixed hue: every click on the page advances it through three named states (ember, cobalt, mustard), blended in place over 0.6s rather than snapped, so the world stays "one body, one moment" even as its colour turns. The system still rejects the dark card-grid developer portfolio: no tiled project cards, no glass panels, no gradient accents. Proof is set as rows, rings, orbits, and numbers.

**Key Characteristics:**
- Three tones, each able to own a full-bleed section: ink, bone, accent.
- One accent body per view; it cycles ember → cobalt → mustard on every click, never two at once.
- Disc, ring, and dot are the only ornamental geometry, extended into a full orbit/constellation vocabulary.
- Heavy, tightly tracked Gabarito display; Geist Mono reserved for data.
- Rows, rings, and a pinned scroll sequence instead of cards; pill-shaped controls.

## Colors

A three-tone world (ink, bone, accent) where the accent itself now cycles through three named hues, each with a muted text partner and a hairline.

### Primary
- **Accent** (default **Ember**, `ember` `#ff5b2e`): the one chromatic body in any given moment. Primary buttons, the hero disc, the constellation's inner bodies, the `.` after the wordmark, list bullets on ink, focus rings, selection, scrollbar thumb, and full-bleed accent floods (manifesto, contact). Hover lifts to **Hot Ember** (`ember-hot`, `#ff7a52`). Every click on the page advances the accent to the next state: **Cobalt** (`accent-cobalt` `#5b8cff` / hot `accent-cobalt-hot` `#7da3ff`), then **Mustard** (`accent-mustard` `#e0a82e` / hot `accent-mustard-hot` `#ebbd55`), then back to ember. The swap is a 0.6s colour blend on registered `@property --ember` / `--ember-hot` / `--muted-on-ember` custom properties (`src/styles/globals.css`), not a hard snap. Ember is the resting default on first paint.

### Neutral
- **Ink** (`ink`): page ground and the ink flood; also the text colour on bone and accent floods.
- **Raised Ink** (`ink-raised`): hover fill for ink buttons and the empty state of the pointer lens.
- **Ink Hairline** (`ink-line`): row dividers and rules on ink.
- **Bone** (`bone`): primary text on ink and the bone flood ground.
- **Deep Bone** (`bone-deep`): defined as the bone step below the ground; reserve for bone-on-bone surfaces.
- **Bone Hairline** (`bone-line`): orbit ring strokes and row dividers on bone.
- **Muted on Ink** (`muted-on-ink`), **Muted on Bone** (`muted-on-bone`): secondary copy and meta lines on ink and bone. **Muted on Ember/Cobalt/Mustard** (`muted-on-ember`, `muted-on-cobalt`, `muted-on-mustard`): the matching secondary-text partner for whichever accent state is live; each is tuned to stay AA on its own accent.

### Named Rules
**The Tone-Owns-The-Section Rule.** Every section declares one tone (`data-tone="ink|bone|ember"`) and floods edge to edge. Text colour follows the tone: bone on ink, ink on bone, ink on accent. The fixed header reads the tone under it and inverts to match.

**The One Body, Three States Rule.** The accent is the only chromatic colour live at any moment. It appears as a solid body (disc, planet, button, flood), never as a gradient, glow, or tint wash, and it cycles ember → cobalt → mustard on every click rather than holding a fixed hue — but only one state is ever on screen. On an accent flood, the accent role passes to ink.

**The Accent-Text-On-Ink Rule.** The accent as text colour is legible only on ink, in whichever of its three states is active. On bone and accent grounds, the accent and bone are used as fills and bodies, not as text.

## Typography

**Display Font:** Gabarito (fallback system-ui, sans-serif), loaded as `--font-sans`, weights 400 to 800
**Body Font:** Gabarito
**Label/Mono Font:** Geist Mono, loaded as `--font-geist-mono`

**Character:** One geometric grotesk does all the talking, from 8.4rem caps down to body copy; its round bowls echo the disc. Mono is an instrument readout, never a voice.

### Hierarchy
Every size is a Tailwind token defined in `globals.css` (`text-flood` … `text-micro`); literal sizes are off-system.
- **Flood** (`text-flood`, 800, uppercase, line-height 0.92): the loudest statement on an accent flood (contact).
- **Display Large** (`text-display-lg`, 700): the eclipse title, story headline, project index titles.
- **Display** (`text-display`, 700, balanced wrap): section headlines in sentence case, and now the pinned manifesto itself (uppercase, tracked -0.03em, on the accent flood mid-sequence).
- **Heading** (`text-heading`, 700): the About/ section label, the bio's stacked chapter keys in the reading wave, and the contact email.
- **Statement** (`text-statement`, 400): large bio prose read by the reading wave, the toolbox run, the hero tagline.
- **Title** (`text-title`, 600, tracking -0.02em): the hero name, PR and repository row names, awards, contact links.
- **Lead** (`text-lead`): intro paragraphs (capped around 34 to 36rem), the wordmark.
- **Body** (`text-body`): expanded detail copy and lists.
- **Small** (`text-small`): navigation, buttons, metadata lines, status line, orbit hint text.
- **Data / Micro** (Geist Mono, `text-data` / `text-micro`, tabular numerals): dates, star counts, PR metadata, pointer coordinates, constellation orbit labels.

The constellation's SVG bodies are set in raw `viewBox` user units (roughly 8–9 units for its `cn-label`/`cn-cases-text` glyphs), a coordinate-space number, not a CSS font size, and it is not part of the `text-*` ramp.

### Named Rules
**The Mono-Is-A-Readout Rule.** Geist Mono sets only coordinates, dates, counts, and identifiers, always with tabular numerals. Headlines, labels, and prose stay in Gabarito.

**The Caps-Are-Loud Rule.** Uppercase belongs to the 800-weight flood display and the pinned manifesto only. Everything else is sentence case.

## Layout

Full-bleed sections stacked vertically, each a flood of one tone, scrolled with Lenis smooth scroll (`src/components/landing/effects.tsx`). Horizontal gutters are 20px on mobile and 40px from `sm` up; section vertical padding runs 112px, growing to 144px from `md`.

The hero is a single 100svh composition built around a Kepler-like orbit glyph: a disc, ring, and dot on elliptical guide paths that stretch toward the pointer as an attractor and spring back to their home pose, layered over the WebGL depth portrait. On click (or once introduced), the glyph flies a 1.8s dock flight (`cubic-bezier(0.45, 0, 0.15, 1)`) into the fixed header's `#dock-target` slot, where a static mini glyph (`.dock-mini`) then stands in for it.

Below the hero, a single pinned scroll sequence (`sequence.tsx`) carries the manifesto through three phases without a hard section break: the manifesto flood collapses via `clip-path: circle()` into a disc, a sphere of real project screenshots (`.orbit-card`) orbits in its place, and the sequence ends in a big-bang expansion into the constellation (`.cn-field.is-born` growing from 0.35 scale). The constellation itself is a plexus of merged PRs on concentric orbits around a centre CTA, with the header's full-stop glyph flying out to join it as a guest body. The About/ section runs a reading wave: chapter keys are sticky-stacked at a fixed step while a short highlight sweeps through each block's prose as it centres. The page closes on a horizon finale: a CTA orb travels a parabolic path up from the skyline before the fixed top/end footer appears.

This full choreography (pinning, the dock flight, the orbit sphere, the sequence, the constellation's flight) only runs under `richMotion` — a fine pointer, `prefers-reduced-motion: no-preference`, and `md`+ width. Under reduced motion or a coarse/narrow viewport, sections stop pinning, the hero glyph settles once and never docks, and the project orbit renders instead as a horizontal snap-scroll strip of cards (`overflow-x-auto`, `snap-x snap-mandatory`).

Lists are full-width rows separated by hairlines, never grids of tiles. Expanding rows animate `grid-template-rows` from 0fr to 1fr.

## Elevation & Depth

Flat everywhere outside one bounded exception. Depth normally comes from tone change between sections, from overlapping bodies (ring over disc, orbit over flood), and from scale, not from shadows.

**Bounded exception — the orbit sequence.** Inside the pinned manifesto-to-orbit sequence only, the orbiting project cards and their focused overlay use a small radius and a real drop shadow as 3D depth cues for bodies genuinely moving in a simulated Z-axis: `.orbit-card` is `border-radius: 6px` with `box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45)`, and the focused overlay is `border-radius: 14px` with its own shadow. This is a defect only if read as license for shadows anywhere else; it stays scoped to the one component that is actually staging 3D orbit, not promoted into a general elevation system.

### Named Rules
**The Flat-Flood Rule.** Surfaces never float. If something needs to stand apart, change its tone or make it a body; do not shadow it — except inside the 3D orbit sequence, where depth cues are the point.

## Shapes

Everything else is either a full circle or a full pill. Buttons, chips, nav links, the toggle, contribution-graph cells, bullets, and the pointer lens are all `rounded.full`. Screenshots and posters use `rounded.image` (14px). The orbit sequence's cards and focus overlay are the only components with their own radii (`rounded.orbit-card`, 6px, and 14px on focus — see Elevation & Depth). Ornament is limited to the disc, ring (a thick border on a circle, roughly 30% of its diameter), and dot, plus thin concentric orbit strokes, now choreographed into a full Kepler orbit, a plexus of connecting lines, and parabolic travel paths (the header dock flight, the constellation guest flight, the finale orb).

## Components

### Buttons
Confident pills, weight 600, with a small upward lift on hover.
- **Shape:** full pill (`rounded.full`).
- **Primary:** accent fill, ink text, 14px by 24px; hover lifts to the accent's hot state and `translateY(-2px)`. Used on ink for the main action (Get in touch, See the work, Visit live). Several primary CTAs are also gravity wells (`[data-gravity-well]`, see Gravity Cursor below).
- **Ghost:** transparent with a 35% bone border and bone text; hover floods to bone with ink text.
- **Ink:** ink fill with bone text on bone and accent floods (the primary action's role when the accent is the ground); hover to raised ink.
- **Focus:** 2px accent outline, 3px offset; on accent floods the outline switches to ink.
- **Trailing icon:** an arrow-up-right or arrow-right SVG at 16px, nudging on hover.

### Chips
- **Status chip:** pill with a 20% bone border, 60% ink fill with backdrop blur, bone text, led by an 8px accent dot that pulses. Reserved for availability.
- **Award chip:** pill with a 12% accent tint and accent text, led by a 16px trophy icon, inside expanded project rows on ink.

### Navigation
The header is a fixed full-width bar whose background and text follow the section tone underneath (500ms colour transition). Left: the orbit mark (disc, ring, dot, arriving via the hero's dock flight, then standing as a static `.dock-mini` glyph) and the lowercase wordmark `bennett payoyo.` with an accent full stop. Right: pill nav links at 0.95rem with a 10% tone-contrast hover fill, a Resume link, and a Get in touch pill that is accent on ink and ink on bone or accent. Below `md` the link list collapses to Resume plus Get in touch.

### Index Rows
The house list. A hairline-separated row with a large display title that shifts 12px right and turns accent on hover, a meta column (descriptor in bone, year and stack in muted), and a 48px circular plus toggle that rotates 45 degrees and fills accent when open. Opening expands the row in place (650ms). On fine pointers a circular lens follows the cursor, clipping open from 0% to 50% to preview the project poster.

### Kepler-Orbit Hero + Dock Flight (signature)
The hero's disc, ring, and dot travel on elliptical guide paths that stretch toward the pointer as a gravitational attractor, then spring home; live mono coordinate readouts ride the guide paths. On the first interaction the whole glyph plays a single 1.8s dock flight (`cubic-bezier(0.45, 0, 0.15, 1)`) from the hero into the header's `#dock-target`, where it is replaced by a static mini glyph. Fine pointers and motion-allowed only; reduced motion keeps a settled static pose and skips the dock flight entirely.

### Depth Portrait (signature)
A WebGL canvas (`depth-portrait.tsx`) renders the profile photo through a custom vertex/fragment shader pair that parallax-shifts on pointer movement, giving the cut-out a simulated depth displacement rather than a flat image. Fine pointers only; static image otherwise.

### Gravity Cursor (signature)
A trailing cursor body that is captured by any element marked `[data-gravity-well]` (primary CTAs) within 130px, releasing again past 210px, with an inertial trail and a directional arrow that appears once captured. Fine pointers only.

### Pinned Sequence: Manifesto → Orbit → Constellation (signature)
The system's central set piece. The manifesto flood collapses through a `clip-path: circle()` shrink into a disc; an orbiting sphere of real project screenshots opens in its place, focusable into a full-bleed overlay with a short film-strip of that project's other screens; the sequence resolves into the constellation's big-bang expansion. Runs only under `richMotion`; falls back to a static manifesto and a horizontal snap-scroll card strip otherwise.

### Reading Wave (signature)
The About/ section's chapters are sticky-stacked keys (`text-heading`) at a fixed vertical step; each chapter's prose (`text-statement`) holds in place while a short accent-coloured wave sweeps through its words as it centres in view.

### Horizon Finale + Footer (signature)
A CTA orb travels a parabolic path up the closing section as a horizon arc bulges across the viewport, before a fixed top/end footer strip appears once the finale has fully resolved.

## Do's and Don'ts

### Do:
- **Do** give every section one tone and flood it edge to edge; let the header follow.
- **Do** build ornament only from disc, ring, and dot, at scale, allowed to bleed off the edge, and now to fly along a defined orbit or parabola.
- **Do** keep the accent to one body per view; let it cycle ember → cobalt → mustard on click (0.6s blend) rather than holding a fixed hue, and hand its role to ink on an accent flood.
- **Do** set coordinates, dates, and counts in Geist Mono with tabular numerals, and nothing else.
- **Do** present collections as hairline-separated rows that expand in place, or as the orbit/constellation set piece.
- **Do** provide a static, non-pinned fallback (frozen pose, snap-scroll strip, no dock flight) for reduced motion, coarse pointers, and narrow viewports.

### Don't:
- **Don't** tile projects or PRs as cards in a grid on a dark ground.
- **Don't** add a second chromatic colour live at the same time as the accent, gradients on the accent, or glows.
- **Don't** set the accent or bone as text on bone or accent grounds.
- **Don't** use drop shadows for elevation outside the bounded orbit-sequence exception.
- **Don't** use uppercase outside the flood display and the pinned manifesto, or mono for labels and instructions.
- **Don't** treat the orbit sequence's 6px/14px radii and shadow as a general system radius or elevation license; it stays scoped to that one 3D set piece.
