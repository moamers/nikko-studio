# 06 — Responsive Strategy & Mobile Risk Register

> **Status:** Draft for review · **Owner:** Engineering · **Needs design input** · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation) · [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged)

This answers constraint **C2**:

> *"the website must be fully responsive. always tested for mobile. highlight where there are issues in the design that are not possible or recommended on mobile"*

The design handoff is specified at **1280 px** (`$preview: { width: 1280 }`) and contains **no media queries** — responsiveness is entirely intrinsic (`clamp()`, `flex-wrap`, `minmax(min(100%, Npx), 1fr)`). That approach carries a long way, and much of this page genuinely will hold. But it is not enough everywhere, and the analysis below identifies **four hard breaks** and **twelve issues** that need decisions.

The numbers here are computed from the actual declared values in `Nikko Homepage.dc.html` at a 390 px viewport (iPhone 14/15/16 logical width), which is the most common phone width in UK traffic.

---

## Breakpoint strategy

Intrinsic-first, with named breakpoints only where the design genuinely changes shape.

| Token | Width | Role |
|---|---|---|
| — | 320–389 | Smallest supported (iPhone SE). Must not break. |
| `--bp-sm` | 390 | **Primary mobile design target** |
| `--bp-md` | 768 | Tablet portrait; grain and cursor enable above |
| `--bp-lg` | 1024 | Tablet landscape / small laptop; hover interactions enable above |
| `--bp-xl` | 1280 | **The designed width** — full fidelity |
| — | 1440+ | Content column caps at 1280; gutters grow |

Container queries are preferred over media queries for components that appear in more than one context (service cards, arch figures), so a component responds to *its own* space.

---

## Risk register

Severity: **🔴 Hard break** — ships broken without a design decision · **🟠 Needs change** — works but is poor · **🟡 Watch** — monitor and verify.

| # | Element | Severity | Issue |
|---|---|---|---|
| [R1](#r1--header-has-no-mobile-design-) | Header | 🔴 | ~774 px of content in a 310 px row. No mobile design exists. |
| [R2](#r2--wake-splash-lands-in-the-wrong-place-) | Wake splash | 🔴 | Landing coordinates hardcoded to the desktop header |
| [R3](#r3--language-tiles-text-does-not-fit-) | Language tiles | 🔴 | Copy needs ~148 px of height in a 132 px tile, 71 px wide |
| [R4](#r4--hero-h1-is-crushed-to-218-px-) | Hero H1 | 🔴 | 130-char headline constrained to 218 px |
| [R5](#r5--hover-scraps-have-no-touch-equivalent-) | Hover scraps | 🟠 | Hover-only; overflows viewport; invisible on touch |
| [R6](#r6--full-page-grain-overlay-is-expensive-) | Grain overlay | 🟠 | Fixed full-viewport `mix-blend-mode: multiply` |
| [R7](#r7--ticket-bar-wraps-into-a-ragged-shadow-) | Ticket bar | 🟠 | 363 px in 310 px; wraps under a hard offset shadow |
| [R8](#r8--service-card-divider-points-the-wrong-way-) | Service cards | 🟠 | Vertical dashed rule survives into the stacked layout |
| [R9](#r9--touch-targets-below-44-px-) | Nav, dial, ticket | 🟠 | Interactive targets 15–38 px tall |
| [R10](#r10--overflow-x-hidden-on-body-breaks-the-sticky-header-) | Page wrapper | 🟠 | `body { overflow-x: hidden }` vs wrapper `clip` |
| [R11](#r11--100vh-jumps-on-mobile-) | Page wrapper | 🟠 | `100vh` should be `100dvh`/`100svh` |
| [R12](#r12--smooth-scroll-ignores-reduced-motion-) | `html` | 🟠 | `scroll-behavior: smooth` is unconditional |
| [R13](#r13--language-tile-row-overflows-by-10-px-) | Language section | 🟡 | `min-width: 320px` inside a 310 px container |
| [R14](#r14--backdrop-filter--fixed-blend-layer-on-ios-) | Header | 🟡 | Compositing cost on iOS Safari |
| [R15](#r15--continuous-animation-battery-cost-) | Marquee, blinks | 🟡 | Infinite animations running off-screen |
| [R16](#r16--source-images-are-13-mb-) | All images | 🟡 | Unusable as-is on mobile data |

---

## Hard breaks

### R1 — Header has no mobile design 🔴

**The arithmetic at 390 px.** Available row width is `390 − 80` (padding) = **310 px**. Required:

| Item | Approx. width |
|---|---|
| Logo oval + gap + "NIKKO" @ 22 px Archivo Black | 131 px |
| Nav: "The work" · "Put us to work" · "Founder" + 2 × 30 px gaps | 275 px |
| Mode dial (dot + "Analogue" + "Auto" + border + padding) | 130 px |
| CTA pill "Pitch your project" (14 px × 26 px padding) | 162 px |
| Row gaps | ~76 px |
| **Total** | **≈ 774 px** |

That is **2.5× the available space**, and `flex` has no `flex-wrap`, so it will either overflow or compress every child past legibility.

**This is the single largest gap in the handoff** — no hamburger, drawer, sheet or condensed variant is specified anywhere in either design document.

**Recommendation (needs design sign-off):** below 1024 px, the header becomes **logo + mode dial + menu button**. The menu opens a full-screen ink panel carrying the three nav links at display scale, the CTA as a full-width pill, and the mode dial with its explanatory label. Built as a `<dialog>` with `showModal()` for free focus trapping, `Esc` handling and inert background — no JS focus-management code, and it works with the keyboard by default.

The mode dial is arguably the item to cut on mobile: it is a connoisseur's control, and analogue mode's most visible effect (the grain overlay) is [disabled on mobile anyway](#r6--full-page-grain-overlay-is-expensive-). Worth a decision — see [Q9](./13-open-questions.md).

### R2 — Wake splash lands in the wrong place 🔴

The final keyframe:

```css
100% { transform: translate(calc(62px - 50vw), calc(37px - 50vh)) scale(0.191) }
```

`62px` and `37px` are the **desktop** header logo's centre (40 px gutter + 22 px to the oval's middle; 16 px padding + 15 px to its middle). At 390 px the header's padding and height differ, so the mark resolves to a point that is not where the logo is — and the entire premise of the animation (the mark *becoming* the header logo) fails. It is most conspicuous on the device where a mistimed full-screen splash is least forgivable.

**Fix.** Measure the real logo at animation start and drive the keyframe from custom properties:

```ts
const { left, top, width, height } = logoEl.getBoundingClientRect();
root.style.setProperty('--wake-x', `${left + width / 2}px`);
root.style.setProperty('--wake-y', `${top + height / 2}px`);
```

```css
100% { transform: translate(calc(var(--wake-x) - 50vw), calc(var(--wake-y) - 50vh)) scale(0.191) }
```

Correct at every width, and it also survives a change to the header's padding.

Also: the splash's oval is `230 × 156 px` scaled ×16 = **3680 px wide**. On a 390 px viewport that is nearly 10× the viewport — fine visually (it is clipped to an aperture), but it should be verified for compositing cost on a mid-range Android.

### R3 — Language tiles: text does not fit 🔴

Three tiles, `display: flex`, `flex: 1 1 0` each, `gap: clamp(12px, 2vw, 20px)` → 12 px at this width, in a ~320 px row:

- Tile width = `(320 − 24) / 3` = **98.7 px**
- `aspect-ratio: 3/4` → height = **131.6 px**
- Shutter padding = `clamp(14px, 1.6vw, 22px)` → 14 px, so **text width = 70.7 px**

Into that 70.7 × ~104 px box the design puts a mono "Step 01" label *and* an Archivo Black line at `clamp(15px, 1.5vw, 21px)` = 15 px. Archivo Black is a very wide face; at 15 px it averages ~9.3 px per character, giving **~7.6 characters per line**.

> "Gather your people — the room, the history, the in-jokes." — 56 characters → **≈ 8 lines** → 8 × 15.75 px = **126 px**, plus the label and gap ≈ **148 px** of content in a **132 px** tile.

It overflows, and at seven characters per line it is unreadable regardless.

**Recommendation (needs design sign-off), in order of preference:**

1. **Below 768 px, stack the three tiles vertically at full width** (310 px), each with `aspect-ratio: 16/10`. Copy becomes comfortable; the parallax variance is lost but it is decorative.
2. **A horizontal scroll-snap carousel** — three tiles at ~78% viewport width, `scroll-snap-type: x mandatory`. Preserves the "three artefacts" feel and is a natural touch gesture. More build cost.
3. **Show the copy below the images rather than inside them** on mobile — always visible, no shutter. Cheapest, loses the set-piece.

Option 1 is the safe default; option 2 is the one that keeps the design's character.

### R4 — Hero H1 is crushed to 218 px 🔴

The H1 carries:

```css
max-width: min(24ch, calc(100% + 56px - min(38vw, 430px)))
```

At 390 px: `38vw` = 148.2 px, container content width = 310 px, so the second term is `310 + 56 − 148.2` = **217.8 px**.

That reservation exists to keep the text clear of the collage, which at this width sits at `right: −60px` (the `clamp(-140px, -7vw, -60px)` clamps up to `−60px`) with `width: min(46vw, 530px)` = 179.4 px — occupying the rightmost ~119 px of the viewport.

So the 130-character headline renders at 32 px into a 218 px column: roughly **7–8 characters per line, ~17 lines, ~510 px of vertical space** for the headline alone, with a decorative collage crowding it. The hero stops working.

**Recommendation (needs design sign-off):** below 900 px, **take the collage out of the overlap**. Either:

- **(a)** Move it below the hero copy as a full-width figure — the H1 then gets all 310 px, and the collage reads as an artefact rather than a crowded corner. *Preferred.*
- **(b)** Keep it as an overlap but shrink it to `min(34vw, 200px)` at `right: −80px` with reduced opacity, and drop the width reservation on the H1 entirely, letting the text run underneath.

Option (a) is more likely to look intentional. Either way the `calc(100% + 56px - min(38vw,430px))` reservation must be removed below the breakpoint — it is the direct cause.

---

## Needs change

### R5 — Hover scraps have no touch equivalent 🟠

The four heading words deal three rotated image scraps on `mouseenter`. On touch there is no hover, so **the entire interaction is invisible on mobile** — one of the page's most distinctive moments, absent for most visitors.

There is also a geometry problem: the lane is `width: min(52vw, 360px)` = 202 px at `left: 26%` of the word, with cards at 50% of the lane plus rotations, extending roughly `word_left + 246 px`. For any word that is not at the far left, that is off-screen. The page wrapper's `overflow-x: clip` prevents a scrollbar, so they would be silently cut in half rather than causing a horizontal scroll.

**Recommendation:** disable below 1024 px (`@media (hover: hover) and (min-width: 1024px)`). They are `aria-hidden` decoration, so nothing is lost semantically. If the moment is considered essential on mobile, the alternative is auto-dealing one set on scroll-into-view — but that adds motion to a section that is already busy.

**Separately, and required on desktop:** the trigger words are `<span>`s with `onMouseEnter` and no keyboard path. Per [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement) and the handoff's own note, they become focusable elements with `:focus-within` triggering the same reveal.

### R6 — Full-page grain overlay is expensive 🟠

```css
position: fixed; inset: 0; z-index: 90;
mix-blend-mode: multiply;
background-image: repeating-linear-gradient(…), repeating-linear-gradient(…);
```

A viewport-sized element with `mix-blend-mode: multiply` forces the compositor to blend everything beneath it, every frame, for the life of the page. On a mid-range Android with a marquee and a scroll-driven parallax also running, this is the most likely source of jank in the whole design.

It is also nearly invisible at 0.13 opacity on a high-DPI phone at typical viewing distance — a 1 px/3 px gradient on a 3× display is sub-pixel.

**Recommendation:** disable below 768 px and on `(pointer: coarse)`. Analogue mode keeps its other tells (image filter, hero scanlines, chromatic misregistration on the H1) so the mode remains meaningful. Verify with a profile before finalising.

### R7 — Ticket bar wraps into a ragged shadow 🟠

Three cells at 11 px mono with `0.16em` letter-spacing (≈ 8.4 px/char) and `10px 16px` padding:

| Cell | Width |
|---|---|
| London | ~82 px |
| UAE | ~57 px |
| Creative design studio | ~216 px |
| **Total incl. gaps + border** | **≈ 363 px** in 310 px |

`flex-wrap: wrap` is present so it will not overflow — but "Creative design studio" drops to its own row, and the `box-shadow: 8px 8px 0 #00B2A9` (a hard offset shadow, no blur) then traces a ragged two-row silhouette rather than the clean ticket stub it is meant to be.

**Recommendation:** below 480 px, make the ticket a deliberate two-row block — "London · UAE" on row one, the accent-filled "Creative design studio" full-width on row two — so the shadow reads as intentional. Alternatively shorten the third cell to "Story studio" on mobile (a content decision — the label lives in `hero.yaml`, so the founder could set a `shortLabel`).

### R8 — Service card divider points the wrong way 🟠

Column C's separator:

```css
position: absolute; left: 0; top: 18px; bottom: 18px;
border-left: 1.5px dashed rgba(17,17,16,0.28);
```

The card's grid is `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`, which correctly collapses to one column below ~380 px. But the divider is absolutely positioned and does not know that — it becomes a stray vertical dashed line down the left edge of a full-width block.

**Recommendation:** replace with a logical border that flips orientation via a container query — `border-inline-start` when side-by-side, `border-block-start` when stacked.

### R9 — Touch targets below 44 px 🟠

| Element | Effective height | WCAG 2.2 AA (2.5.8) |
|---|---|---|
| Nav links (11 px mono, no padding) | ~15 px | ❌ |
| Mode dial (`9px 12px`) | ~28 px | ❌ |
| Ticket cells (`10px 16px`) | ~38 px | ❌ |
| Header CTA (`14px 26px`) | ~45 px | ✅ |
| Hero CTA (`20px 38px`) | ~57 px | ✅ |

**Recommendation:** on touch, expand the hit area without changing the visual — a `::after` overlay or `padding` with negative `margin` — so the ticket stays a 38 px stub but is 44 px to a finger. In the mobile menu ([R1](#r1--header-has-no-mobile-design-)), nav links get real padding and become comfortably large.

### R10 — `overflow-x: hidden` on `body` breaks the sticky header 🟠

The design source declares both:

```css
body { … overflow-x: hidden; }                    /* line 20 */
.page-wrapper { … overflow-x: clip; }             /* line 71 */
```

The handoff README explains the wrapper choice correctly — *"clip, not hidden — hidden breaks the sticky header"* — but `overflow-x: hidden` is still set on `body`, which establishes a scroll container and is exactly the condition that detaches `position: sticky` from the viewport.

**Recommendation:** remove `overflow-x` from `body` entirely; keep `clip` on the wrapper. Then add an explicit Playwright assertion that the header remains pinned during scroll, at every breakpoint, in every browser — this class of bug reappears easily.

### R11 — `100vh` jumps on mobile 🟠

`min-height: 100vh` on the page wrapper. On mobile browsers `100vh` is the *largest* viewport height, so content is sized against a viewport taller than the visible one until the chrome collapses.

**Recommendation:** `min-height: 100svh` with a `100vh` fallback for older browsers. Use `dvh` only where a live-resizing box is genuinely wanted, since it triggers reflow as the chrome moves.

### R12 — Smooth scroll ignores reduced motion 🟠

```css
html { scroll-behavior: smooth; }
```

Unconditional. Anchor navigation animates for users who have asked it not to.

**Recommendation:** wrap in `@media (prefers-reduced-motion: no-preference)`.

---

## Watch

### R13 — Language tile row overflows by ~10 px 🟡

The tile row declares `flex: 1 1 440px; min-width: 320px` inside a 310 px container. `min-width` wins over the flex basis, producing a 320 px child in a 310 px parent. The wrapper's `overflow-x: clip` absorbs it silently, but ~10 px of the third tile is cut. Resolved automatically by the [R3](#r3--language-tiles-text-does-not-fit-) fix, but worth an explicit `min-width: min(320px, 100%)` as a general pattern — the same construction appears in several sections.

### R14 — `backdrop-filter` + fixed blend layer on iOS 🟡

`backdrop-filter: blur(9px)` on a sticky header, beneath a fixed `mix-blend-mode: multiply` layer, is a combination iOS Safari has historically handled expensively — and occasionally with visual artefacts at the sticky boundary during momentum scroll. Supported everywhere; the concern is cost, not capability.

**Recommendation:** test on a real device early. If it janks, drop the blur below 768 px and use a solid `--nk-veil` at higher alpha — visually near-identical on a phone. [R6](#r6--full-page-grain-overlay-is-expensive-) removes the other half of the problem anyway.

### R15 — Continuous animation battery cost 🟡

The marquee (34 s infinite), two blinking dots (1.6 s infinite), the grain flicker (2.6 s), the hero scan sweep (5.2 s), the tear (9 s) and the sampler weave (2.4 s) all run indefinitely, including while off-screen.

**Recommendation:** `IntersectionObserver` pauses each when out of view; `visibilitychange` pauses everything on tab blur. Cheap to implement, and the correct default for anything infinite.

### R16 — Source images are 1–3 MB 🟡

| File | Size |
|---|---|
| `journal-firstdraft.png` | 3.1 MB |
| `collage-hero.png` | 1.7 MB |
| `collage-artefacts.png` | 1.1 MB |
| `workshop-proof.png` | 1.1 MB |
| `journal-crt.png` | 906 KB |
| …plus 5 more | 224 KB – 508 KB |
| **`chips-pattern.png`** | **2 bytes — corrupt** ⚠️ |

Total ~9 MB. Handled by the [build pipeline](./03-tech-stack.md), which is why this is 🟡 rather than 🟠 — but `chips-pattern.png` is referenced twice in the design source and needs replacing. See [Q7](./13-open-questions.md).

---

## What holds up well

Worth stating, because the intrinsic approach genuinely does most of the work:

- ✅ All `clamp()` type scales — heading and body sizes land sensibly at 390 px
- ✅ Service card grid — `repeat(auto-fit, minmax(min(100%, 340px), 1fr))` collapses correctly
- ✅ Most two-column rows — `flex-wrap` with sensible bases stack cleanly
- ✅ Arch radii and dome shapes — percentage-based, scale correctly
- ✅ Founder section, joyride section, pitch/footer — stack well as authored
- ✅ Form inputs at 16 px — avoids the iOS focus-zoom
- ✅ Word swap at `clamp(52px, 7vw, 110px)` — 52 px fits comfortably
- ✅ Section padding rhythm `clamp(80px, 10vw, 150px)` — appropriate at both ends
- ✅ Marquee — full-bleed, `overflow: hidden`, width-agnostic

---

## Testing protocol

**Automated, every PR:** Playwright at 390 / 768 / 1024 / 1440 across Chromium, Firefox and WebKit — screenshot comparison, `scrollWidth <= clientWidth`, sticky-header assertion, `axe-core`, tap-target size check.

**Manual, every release:** a real iPhone (Safari) and a real mid-range Android (Chrome) — because emulation does not reproduce compositing cost, momentum scroll, or `backdrop-filter` behaviour. Plus one throttled run on a genuinely slow connection.

---

## Deviations log

Per [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged), every accepted departure from the handoff is recorded here as it is made.

| # | Deviation | Reason | Applies at | Signed off |
|---|---|---|---|---|
| *(none yet — populated during build)* | | | | |

---

**Next:** [07 — Browser Support](./07-browser-support.md)
