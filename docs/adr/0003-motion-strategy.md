# ADR-0003: CSS-first motion with capability-gated layers

**Status:** Proposed
**Date:** 2026-08-17
**Principles:** [P1](../02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it), [P3](../02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order), [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration), [P10](../02-engineering-principles.md#p10--accessibility-is-a-functional-requirement)

## Context

The design is unusually motion-heavy: an accent cycle across six surfaces, an analogue/digital mode that drifts with scroll, a wake splash, a cursor residue trail, a scroll progress rail, ~30 scroll-driven reveals and parallaxes, a projector-treatment sampler, hover scraps, tile shutters, a marquee, animated counters and a word swap.

This has to coexist with four constraints that pull the other way: performance (C4), cross-browser support (C3), mobile (C2), and — implicitly — accessibility.

Three specific tensions:

1. **`animation-timeline` support is uneven.** It is the design's primary reveal mechanism and is not enabled by default in Firefox at time of writing.
2. **Animation libraries are large.** GSAP, Framer Motion and Lenis are 30–70 KB each and would dominate a ~5 KB JS budget.
3. **The naive implementation of scroll reveals hides content.** `opacity: 0` in the stylesheet, revealed by an observer, means anyone whose JS fails or whose browser lacks the feature sees a blank page. This is the most common way animated marketing sites break, and it breaks them in the way that matters most — invisibly, for a subset of users.

## Decision

**Four tiers, ordered by fragility, with content in tier 0 and an inversion that makes hiding content impossible.**

| Tier | Mechanism | If unavailable |
|---|---|---|
| **0 — Content** | HTML | *must never fail* |
| **1 — Baseline CSS** | `transition`, `:hover`, `:focus-visible`, `@keyframes` | ~never fails |
| **2 — Progressive CSS** | `animation-timeline`, `mask-image`, `mix-blend-mode`, `backdrop-filter` | silently absent |
| **3 — JavaScript** | vanilla TS islands, ~5 KB | silently absent |

### The rule that makes it safe

**An element's resting state in the stylesheet is its final state.** Motion is *added* by a capability check; it is never *removed* by the absence of one.

```css
.reveal { opacity: 1; transform: none; }          /* visible by default */

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {         /* preferred: native */
    .reveal { animation: nk-rise .9s linear both;
              animation-timeline: view();
              animation-range: entry 10% entry 90%; }
  }
  .is-armed .reveal            { opacity: 0; transform: translateY(30px);
                                 transition: opacity .9s, transform .9s; }
  .is-armed .reveal.is-visible { opacity: 1; transform: none; }
}
```

`.is-armed` is added by JavaScript **only after** confirming `CSS.supports('animation-timeline: view()') === false`. The hidden state can therefore only exist when JS is running *and* able to reveal it. **Content cannot be stranded invisible.** This inversion is the core of the decision.

### Scroll-driven animation, split by whether it carries meaning

| Animation | Meaning? | Without support |
|---|---|---|
| Reveals (`nk-rise`, `nk-fade`) | Content must appear | `IntersectionObserver` fallback |
| Parallax (`nk-para-*`) | Decorative | **Dropped** — elements sit static |
| Progress rail | Decorative | **Dropped** |

### State via custom properties, not re-rendering

The accent cycle sets three custom properties on `<html>`; the mode sets one attribute. Consumers declare their own `transition`, so crossfades are free and no component re-renders.

```ts
root.style.setProperty('--nk-accent', accent);   // 6 surfaces update
root.dataset.mode = 'analogue';                  // whole-page mode
```

### Everything infinite pauses when unseen

`IntersectionObserver` for off-screen, `visibilitychange` for background tabs. Applies to the marquee, sampler, blinking dots, grain flicker, scan sweep and tear.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **CSS-first, capability-gated** ✅ | Off-main-thread; ~0 bytes; degrades safely; reduced-motion is native | Requires discipline about `@supports` and default states | **Chosen** |
| Scroll-timeline polyfill | Uniform behaviour everywhere | ~15 KB; runs on the main thread — the opposite of why we chose native; for decorative effects only | Rejected |
| GSAP + ScrollTrigger | Powerful; consistent; well documented | 30–70 KB; main-thread; would be ~90% of the JS budget for effects CSS already does | Rejected |
| Framer Motion | Excellent ergonomics | Requires React ([ADR-0001](./0001-static-site-generator.md)); large | Rejected |
| Lenis / Locomotive smooth scroll | Fashionable feel | Hijacks native scroll — banned by [P1](../02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it) and by the direction document's anti-brief; harms accessibility and INP | Rejected |
| `IntersectionObserver` for everything | Universal support; predictable | Main-thread; loses the smooth scroll-linked quality of parallax; more code | Rejected as primary, **kept as the reveal fallback** |

## Consequences

### Good

- **Motion costs almost nothing.** Most of it is CSS the browser runs off the main thread.
- **Content is never hidden by a failed animation** — enforced structurally and [tested in CI](../11-quality-gates.md#1-the-no-js-content-check-p1-p3).
- **Reduced motion is honoured precisely**, per behaviour rather than by a blanket `animation: none`.
- **Firefox users lose only decoration.** Every reveal still works via the fallback; parallax is absent and unnoticeable.
- **The accent system is simpler than the prototype's** — three property writes instead of threading a value through 20+ inline styles.
- **Support changes don't require rework.** When Firefox ships scroll-driven animations, the `@supports` block starts applying and the fallback stops arming itself. No code change.

### Bad / accepted costs

- **`@supports` discipline is on us.** A developer who forgets the guard ships a broken effect in one browser. Mitigated by cross-browser CI and code review.
- **Parallax is absent in some browsers.** Accepted — it is decorative, and nobody who has not seen both can tell.
- **Two reveal code paths** (native and observer) to keep in sync. Contained: both drive the same class and the same keyframes.
- **We write our own interaction code** rather than using a library's tested primitives. Small surface, but ours to get right — hence the shared lifecycle helper for listener and timer cleanup.

### Neutral

- The 30-odd `animation-timeline` declarations move from inline styles into a small number of reusable classes — a simplification the prototype's authoring environment prevented.

## Reversal

**Cost: low.** Adding a library later is additive. If a future set piece genuinely needs timeline sequencing beyond CSS — the direction document's memory box or voice-note player might — a scoped library on that route only would be a reasonable ADR, without disturbing this one.
