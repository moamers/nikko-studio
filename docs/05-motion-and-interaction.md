# 05 — Motion & Interaction Architecture

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it) · [Browser Support](./07-browser-support.md) · [ADR-0003](./adr/0003-motion-strategy.md)

This answers constraint **C1** — *"highly interactive, animations and micro interactions"* — and explains how that coexists with the performance, accessibility and cross-browser constraints.

## The governing idea

Motion is organised into **four tiers by fragility**. Content lives in tier 0 and never depends on anything above it.

| Tier | Mechanism | If unavailable | Contains |
|---|---|---|---|
| **0 — Content** | HTML | *n/a — must never fail* | All text, images, links, form |
| **1 — Baseline CSS** | `transition`, `:hover`, `:focus-visible`, `@keyframes` | ~never fails | Button lifts, card hovers, marquee, blinking dots, shutters, scraps, wake |
| **2 — Progressive CSS** | `animation-timeline`, `mask-image`, `mix-blend-mode`, `backdrop-filter` | silently absent | Scroll reveals, parallax, progress rail, grain, perforations, header veil |
| **3 — JavaScript** | vanilla TS islands | silently absent | Accent cycle, mode drift, cursor, sampler swap, counters, word swap |

**The rule that makes this work:** an element's *resting* state in the stylesheet is its *final* state. Motion is added by a capability check; it is never removed by one.

```css
/* ✅ Correct — visible by default, animated only where supported */
.reveal { opacity: 1; transform: none; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: nk-rise 0.9s linear both;
      animation-timeline: view();
      animation-range: entry 10% entry 90%;
    }
  }
}

/* ❌ Wrong — content invisible if anything fails */
.reveal { opacity: 0; animation: nk-rise …; }
```

The wrong version is the single most common way animated marketing sites ship blank pages to a subset of users. We do not write it.

---

## Tier 3: the JavaScript, in full

Seven modules, roughly 200 lines of TypeScript, ~5 KB gzipped.

### 1. Accent cycle — `accent.ts`

Three states rotate on a timer (12 s hold, 2600 ms crossfade), driving the page ground, logo stripe, every button's slot bar, the header veil, the language panel and the footer logo.

| # | Name | Accent | Ground target |
|---|---|---|---|
| 1 | Horizon | `#FFD400` | `#F7EED0` |
| 2 | Last light | `#EE5439` | `#F9E9DF` |
| 3 | Offshore * | `#2B45F0` | `#EAEDF8` |

*\* "Offshore" is marked a placeholder in the direction document — "Deep End" and "Blue Hour" are the other candidates. See [Q8](./13-open-questions.md).*

**Implementation:** set three custom properties on `<html>`.

```ts
root.style.setProperty('--nk-accent', state.accent);
root.style.setProperty('--nk-ground', state.ground);
root.style.setProperty('--nk-veil',   state.veil);
```

Every consumer declares its own transition, so the crossfade is free:

```css
.logo__slot     { background: var(--nk-accent); transition: background 2600ms var(--nk-ease-accent); }
.page           { background: var(--nk-ground); transition: background-color 3400ms var(--nk-ease-accent); }
```

This is the key simplification: the prototype threads the accent through 20+ inline styles and would re-render the page every 12 seconds in a component framework. Here it is **three property writes and zero re-renders**. Custom-property changes propagate to the computed `background-color`, and the `transition` on that concrete property animates normally in every target browser.

`prefers-reduced-motion` holds the ground at base paper permanently, per the direction document's explicit instruction.

### 2. Analogue / digital mode — `mode.ts`

Unpinned, drifts with scroll depth: **analogue** above 52% of scrollable height, **digital** below. Clicking the dial pins it to `localStorage['nk-mode']`.

**Implementation:** one attribute on `<html>`; CSS does everything else.

```css
[data-mode="analogue"] { --nk-grain: .13; --nk-img-filter: saturate(.94) contrast(.97) sepia(.09); }
[data-mode="digital"]  { --nk-grain: 0;   --nk-img-filter: saturate(1.06) contrast(1.04); }
```

The scroll listener is rAF-throttled and `{ passive: true }`, and writes only on an actual state change.

### 3. Wake splash — `wake.ts`

2600 ms, once per session (`sessionStorage['nk-wake']`), skippable on any pointer or key event, replayable from the header logo, skipped entirely under `prefers-reduced-motion`. `pointer-events: none` throughout, so it can never trap a user.

**⚠️ Known defect to fix in the build.** The prototype's final keyframe is:

```css
transform: translate(calc(62px - 50vw), calc(37px - 50vh)) scale(0.191);
```

Those `62px` / `37px` are the **desktop** header logo's centre. On mobile — different padding, different header height — the mark lands in the wrong place, and the whole illusion (the mark resolving *into* the header) collapses. **Fix:** compute the target from the real logo's `getBoundingClientRect()` at animation start and drive it through custom properties. See [Mobile Risk R2](./06-responsive-and-mobile-risks.md).

Additionally, the direction document specifies POWER ON as *"under 900ms, skippable, never repeated, never blocking"* — against the handoff's 2600 ms. Logged as [Conflict C4](./14-design-source-conflicts.md).

### 4. Cursor residue — `cursor.ts`

A 340 × 150 blurred aperture pool trailing the pointer at 0.12 lerp, dropping a faint "slot mark" every 110 ms that fades over 820 ms.

Gated off entirely unless **all** hold: motion allowed, `(pointer: fine)`, viewport ≥ 1024 px.

**Change from the prototype:** it calls `createElement` + `remove()` every 110 ms — roughly nine nodes per second, indefinitely. We use a **fixed recycled pool** of ~10 nodes, cycling an index and restarting the animation. Bounded memory, no GC churn, identical visual result. ([P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration).)

### 5. Sampler — `sampler.ts`

Eight fragments, swapping every 3800 ms or on click, with the projector treatment: reel pull-up with overshoot and judder, gate flicker in `steps(8)`, a warm radial burn, a permanent scanline overlay, and a ±0.6 px weave between swaps. Alternating `-a`/`-b` animation names so consecutive swaps re-trigger.

**Two required changes:**

1. **All eight fragments ship in the HTML** — one visible, seven inert. Rendering one at a time from a JS array would hide seven pieces of proof from crawlers and language models, breaking [P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability).
2. The auto-advance **pauses when off-screen** (`IntersectionObserver`) and on `visibilitychange`. No animation runs for a tab nobody is looking at.

The swap must also be announced politely to assistive tech (`aria-live="polite"` on the container, or the auto-advance suppressed and only the manual "Pull another →" announced — the latter is likely calmer).

### 6. Counters — `counters.ts`

`IntersectionObserver` at `threshold: 0.4`, unobserved after firing, 1100 ms cubic ease-out. Targets: phone **80**, countries **12**, members **215,000**.

The **final value is in the HTML**; JS resets it to 0 and counts up only when motion is allowed. Under reduced motion, or with no JS, the reader simply sees the correct number — which is the point of the element.

### 7. Word swap — `wordswap.ts`

`Khara` (coral, with Arabic خرا) ⇄ `Kaka` (cobalt, no Arabic), 320 ms colour transition, with the hint line and note changing together. This is a **control**, not decoration, so it works under reduced motion — only the transition is dropped.

**Both states ship in the HTML** for the same reason as the sampler.

**Not implemented:** the `nk-marks` `localStorage` writes. The handoff is explicit — *"Do not ship a dead localStorage write without the UI."* It is a hook for a future margin rail (the direction document's "RESIDUE" pattern, itself desktop-only at ≥1560 px). Out of scope until that UI exists. ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism).)

---

## Tier 2: scroll-driven animation and the fallback

Scroll reveals and parallax use native `animation-timeline: view()` / `scroll(root)` — no library, no scroll listener, runs off the main thread.

Support is genuinely mixed (see [07](./07-browser-support.md)), so the strategy is split by *what the animation does*:

| Animation | Does it carry meaning? | Without support |
|---|---|---|
| Scroll reveals (`nk-rise`, `nk-fade`) | Content must appear | **Fallback:** `IntersectionObserver` adds `.is-visible`; content is visible regardless |
| Parallax (`nk-para-slow/fast/rev`) | Purely decorative | **Drop it.** Elements sit static. Nobody can tell. |
| Scroll progress rail | Decorative | **Drop it.** |

We deliberately **do not** use a scroll-timeline polyfill. It costs ~15 KB, runs animations on the main thread, and buys a decorative effect for a shrinking minority of browsers — a bad trade against [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration).

**Also deliberately not used:** GSAP, Framer Motion, Lenis, Locomotive Scroll or any smooth-scroll library. The design needs none of them, they are 30–70 KB each, and smooth-scroll libraries in particular hijack native scrolling — banned by both [P1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it) and the direction document's anti-brief.

---

## Reduced motion

The prototype's blanket rule is a good backstop but too crude alone:

```css
@media (prefers-reduced-motion: reduce) { * { animation: none !important } }
```

It kills `animation` but not `transition`, and it would also freeze animations that *are* the content. Our policy, per behaviour:

| Behaviour | Under reduced motion |
|---|---|
| Wake splash | **Skipped entirely** (JS bails before mounting) |
| Cursor residue | **Not initialised** |
| Accent cycle | **Held at base paper** permanently |
| Parallax, scroll reveals | **Off**; content static and visible |
| Marquee | **Paused**, full text readable |
| Counters | **Final value shown**, no count-up |
| Grain, scan sweep, tear, flicker | **Off** |
| Sampler auto-advance | **Off**; manual "Pull another →" still works |
| Word swap, mode dial, tile shutters | **Work normally**, transitions removed |
| Button/card hovers | Colour changes kept, transforms dropped |

The distinction: reduced motion removes *movement*, not *function*.

---

## Performance rules for motion

1. **Only composited properties.** `transform`, `opacity`, `filter`, `clip-path`, `background-color`. Never `top`/`left`/`width`/`height`/`margin`.
2. **`will-change` sparingly** — only on the cursor lens and only while active. Applied broadly it costs more memory than it saves.
3. **Nothing animates off-screen.** Marquee and sampler pause via `IntersectionObserver`; everything pauses on `visibilitychange`.
4. **The grain overlay is the biggest risk in the design.** A fixed, full-viewport `mix-blend-mode: multiply` layer forces the compositor to blend the entire viewport every frame. It is **disabled below 768 px and on coarse pointers** — the effect is close to invisible on a phone and expensive there. ([R6](./06-responsive-and-mobile-risks.md).)
5. **Cap concurrent animations.** The direction document's budget — *"one set-piece per scroll-third"* — is a good discipline; the handoff's homepage is close to it already.
6. **Every timer and listener is registered through one lifecycle helper** so nothing leaks and everything can be torn down in one call.

---

## Interaction inventory

| # | Interaction | Tier | Keyboard | Touch | Reduced motion |
|---|---|---|---|---|---|
| 1 | Accent cycle | 3 | n/a | ✅ | Held at paper |
| 2 | Mode dial | 3 | ✅ button, `aria-pressed` | ✅ | Works |
| 3 | Wake splash | 1+3 | Skippable | Skippable | Skipped |
| 4 | Cursor residue | 3 | n/a | Disabled | Disabled |
| 5 | Scroll progress | 2 | n/a | ✅ | Off |
| 6 | Hero collage hover | 1 | n/a | Static | Off |
| 7 | Ticket cell hover | 1 | ✅ | Tap | Colour only |
| 8 | Marquee | 1 | n/a | ✅ | Paused |
| 9 | Hover scraps | 1 | **⚠️ needs `:focus-within`** | **⚠️ no equivalent** — [R3](./06-responsive-and-mobile-risks.md) | Off |
| 10 | Counters | 3 | n/a | ✅ | Final value |
| 11 | Language tiles | 1 | **⚠️ needs `:focus-within`** | ✅ tap | Instant |
| 12 | Portrait hover | 1 | n/a | Static | Off |
| 13 | Service card hover | 1 | ✅ focus | Static | Shadow only |
| 14 | Sampler swap | 3 | ✅ button | ✅ | Manual only |
| 15 | Word swap | 3 | ✅ button | ✅ | Instant |
| 16 | Button hovers | 1 | ✅ focus | Active state | Colour only |
| 17 | Newsletter form | 0+3 | ✅ | ✅ | ✅ |

Three ⚠️ items need resolution before the relevant sections are built — the handoff itself flags #9 as a *"prototype gap to fix in production."*

---

**Next:** [06 — Responsive & Mobile Risks](./06-responsive-and-mobile-risks.md) · [07 — Browser Support](./07-browser-support.md)
