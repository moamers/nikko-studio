# 07 — Browser Support & Feature Risk

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) · [Motion](./05-motion-and-interaction.md)

This answers constraint **C3**:

> *"the website should work on major browsers and highlight where there are issues in the design that are not possible"*

## Support policy

| Tier | Browsers | Commitment |
|---|---|---|
| **A — Full fidelity** | Chrome & Edge (last 2), Safari 17+ / iOS 17+, Firefox (last 2), Samsung Internet (last 2) | Every designed behaviour, verified in CI |
| **B — Graceful** | Safari 16.4–16.x, Chrome/Firefox 3–6 versions back | All content and function; decorative motion may be absent |
| **C — Functional** | Anything else with a modern JS engine | Content, layout, links and forms work. No motion guarantee. |
| **Unsupported** | IE 11, legacy Edge, Opera Mini | Not tested. Content still readable via [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) layer 1–2. |

**Safari 16.4 is the floor** because it is where `@property`, `:has()` and `<dialog>` are all reliably present. That corresponds to iOS 16.4 (March 2023).

By the layered model in [05](./05-motion-and-interaction.md), a tier-B or tier-C browser loses only tier-2 and tier-3 effects. **The content, the layout, the reading experience and the form always work.**

---

## Feature risk table

Every non-trivial CSS/JS feature the design depends on, with its fallback. **✅ Safe** = broadly available across tier A · **⚠️ Guard** = needs `@supports` or a prefix · **🔴 Risk** = materially uneven.

| Feature | Used for | Status | Strategy |
|---|---|---|---|
| `animation-timeline: view()` / `scroll(root)` | Scroll reveals, parallax, progress rail | **🔴 Risk** | See [below](#the-one-real-risk-scroll-driven-animations) |
| `backdrop-filter: blur(9px)` | Header veil | ⚠️ Guard | `@supports`; else solid `--nk-veil` at higher alpha. Also a perf watch on iOS ([R14](./06-responsive-and-mobile-risks.md)) |
| `mix-blend-mode: multiply` | Grain overlay, sampler burn, cursor pool | ✅ Safe | Disabled below 768 px for perf, not support ([R6](./06-responsive-and-mobile-risks.md)) |
| `mix-blend-mode: screen` | Hero cobalt signal tint, digital cursor | ✅ Safe | — |
| `mask-image` + `mask-size`/`mask-repeat` | Perforated section edges | ⚠️ Guard | Ship `-webkit-mask-*` alongside unprefixed. Without it the edge is a plain rule — acceptable |
| `overflow: clip` | Page wrapper (allows bleed, keeps sticky) | ✅ Safe | Safari 16+. Below that, `hidden` — which breaks sticky, so `@supports` gates it ([R10](./06-responsive-and-mobile-risks.md)) |
| Elliptical `border-radius` (`50% 50% 8px 8px / 26% …`) | Every arch, dome and lid | ✅ Safe | Universal. The design's signature shape is not at risk |
| `clip-path: inset()` (animated) | Wake aperture, tile shutters, sampler gate | ✅ Safe | — |
| `clip-path: polygon()` with `calc()` | Direction-doc edge treatments | ✅ Safe | Only if those primitives are adopted |
| `aspect-ratio` | Every image crop | ✅ Safe | Also prevents CLS |
| `position: sticky` | Header | ✅ Safe | **Fragile in combination** — see [R10](./06-responsive-and-mobile-risks.md) |
| `@supports` | The gating mechanism itself | ✅ Safe | — |
| `@layer` | Cascade organisation | ✅ Safe | — |
| Container queries | Component-local responsiveness | ✅ Safe | Media-query fallback where used |
| `:has()` | Parent-state styling | ✅ Safe | Safari 15.4+, Firefox 121+ |
| `@property` | Typed custom properties | ✅ Safe | Not strictly required — see [note](#a-note-on-property-and-color-mix) |
| `color-mix(in srgb, …)` | Accent-tinted ground | ✅ Safe | Lets CSS do the lerp; JS fallback trivial |
| `svh` / `dvh` / `lvh` | Mobile viewport height | ✅ Safe | `vh` fallback ([R11](./06-responsive-and-mobile-risks.md)) |
| `text-wrap: pretty` | All prose | ✅ Safe | Degrades to normal wrapping. Zero risk |
| `animation-timing-function: steps(n)` | Mechanical button/gate feel | ✅ Safe | — |
| `conic-gradient` / `repeating-conic-gradient` | Direction-doc patterns | ✅ Safe | Only if adopted |
| `radial-gradient` dot fields | Language section, footer | ✅ Safe | — |
| `filter: blur()` | Cursor pool | ✅ Safe | Desktop-only anyway |
| `-webkit-font-smoothing` | Type rendering | ✅ Safe | Cosmetic, WebKit/Blink only |
| `IntersectionObserver` | Counters, pausing, reveal fallback | ✅ Safe | — |
| `matchMedia` + `prefers-reduced-motion` / `pointer` | All motion gating | ✅ Safe | — |
| `localStorage` / `sessionStorage` | Mode pin, wake guard | ✅ Safe | **Must be `try`/`catch`** — throws in Safari private mode and some embedded webviews |
| `requestAnimationFrame` | Cursor, counters, scroll throttle | ✅ Safe | — |
| `<dialog>` + `showModal()` | Mobile menu ([R1](./06-responsive-and-mobile-risks.md)) | ✅ Safe | Safari 15.4+. Gives focus trap and `Esc` free |
| `scroll-behavior: smooth` | Anchor navigation | ✅ Safe | Gate behind `prefers-reduced-motion` ([R12](./06-responsive-and-mobile-risks.md)) |
| `scroll-snap-type` | Optional mobile tile carousel | ✅ Safe | — |
| AVIF images | Image pipeline | ✅ Safe | `<picture>` with WebP then original |
| `loading="lazy"` / `fetchpriority` | Image loading | ✅ Safe | Ignored where unsupported |

---

## The one real risk: scroll-driven animations

`animation-timeline` is the only feature in this design where support is **materially uneven across tier A**, and the design leans on it heavily — roughly 30 declarations across scroll reveals, three parallax variants and the progress rail.

**Status at time of writing:** shipped in Chromium since 115 and in recent Safari; **not enabled by default in Firefox**, where it sits behind `layout.css.scroll-driven-animations.enabled`.

> ⚠️ **Verify at implementation time.** Browser support moves. Check [caniuse.com/css-scroll-driven-animations](https://caniuse.com/css-scroll-driven-animations) and re-baseline this section before the build starts. The *strategy* below is correct regardless of what has shipped, which is the point of writing it this way.

### Strategy: split by whether the animation carries meaning

| Animation | Carries meaning? | Without support |
|---|---|---|
| Scroll reveals (`nk-rise`, `nk-fade`) | Yes — content must appear | **`IntersectionObserver` fallback.** Content is visible either way; the observer adds the entrance |
| Parallax (`nk-para-slow`/`-fast`/`-rev`) | No | **Dropped.** Elements sit static. Nobody who has not seen both can tell |
| Scroll progress rail | No | **Dropped.** Or a `scroll` listener if it is judged important |

```css
/* Content is visible by default — this is the whole trick */
.reveal { opacity: 1; transform: none; }

@media (prefers-reduced-motion: no-preference) {
  /* Preferred: native, off-main-thread */
  @supports (animation-timeline: view()) {
    .reveal { animation: nk-rise .9s linear both;
              animation-timeline: view();
              animation-range: entry 10% entry 90%; }
  }
  /* Fallback: JS adds .is-armed only when the native path is absent */
  .is-armed .reveal          { opacity: 0; transform: translateY(30px);
                               transition: opacity .9s, transform .9s; }
  .is-armed .reveal.is-visible { opacity: 1; transform: none; }
}
```

`.is-armed` is added by JavaScript **only after** confirming `CSS.supports('animation-timeline: view()') === false`. So the hidden state can only exist when JS is running and able to reveal it — content can never be stranded invisible. This inverts the usual pattern and is the reason it is safe.

### Rejected: a scroll-timeline polyfill

~15 KB, runs animations on the main thread, and buys a decorative effect for a shrinking minority. Fails [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) for negligible benefit.

---

## Things in the design that are *not* possible as specified

Honest answers to "highlight where there are issues in the design that are not possible":

| # | Item | Verdict |
|---|---|---|
| 1 | **Everything visual in the handoff is achievable.** | No token, shape, colour, layout or type treatment is blocked by browser support. The arch radii, perforations, blend modes, dot fields and dome shapes are all universally supported. |
| 2 | Parallax and the progress rail in Firefox | Not currently possible without a polyfill. **Recommendation: accept their absence.** Decorative only. |
| 3 | Hover scraps and tile shutters on touch | Not possible — touch has no hover. Handled as a design decision, not a technical one ([R5](./06-responsive-and-mobile-risks.md)) |
| 4 | The wake splash as authored, on mobile | Possible, but **currently mis-specified** — hardcoded desktop coordinates ([R2](./06-responsive-and-mobile-risks.md)) |
| 5 | The language tiles as authored, on mobile | Possible to render, but the text does not fit. A **design** problem, not a browser one ([R3](./06-responsive-and-mobile-risks.md)) |
| 6 | The grain overlay on low-end mobile | Possible but ill-advised. Disabled below 768 px ([R6](./06-responsive-and-mobile-risks.md)) |
| 7 | `localStorage` in Safari private mode / some in-app webviews | Throws on write. **Must** be wrapped in `try`/`catch` — the prototype does this correctly; keep it. Mode pinning silently degrades to auto-drift |

**Nothing in the design has to be cut for browser-compatibility reasons.** The compromises that exist are mobile-layout and performance decisions, documented in [06](./06-responsive-and-mobile-risks.md).

---

## A note on `@property` and `color-mix()`

Two modern features simplify the accent system enough to be worth calling out.

**Custom properties transition correctly without `@property`.** When `--nk-accent` changes, every element resolving `background: var(--nk-accent)` sees its *computed* `background-color` change, and a `transition: background-color 2600ms` on that element animates it normally. The 2600 ms crossfade needs no special handling. `@property` would only be required to transition a custom property *itself* (e.g. in a gradient stop), which this design does not need.

**`color-mix()` can replace the JavaScript colour maths.** The prototype computes the tinted ground in JS:

```js
paper(hex, depth) {                 // lerp base paper toward the accent's ground
  const base = [242, 236, 223];
  …
}
```

In CSS that is one declaration:

```css
--nk-ground: color-mix(in srgb,
             var(--nk-paper) calc(100% - var(--nk-tint) * 100%),
             var(--nk-ground-target));
```

Now `tintDepth` is a live CSS knob, the JS shrinks to setting two properties, and the tint can be adjusted without a rebuild. Same for `ink(hex)`, the darkened-accent helper: `color-mix(in srgb, var(--nk-accent) 42%, var(--nk-ink))`.

---

## Verification

| Check | How | When |
|---|---|---|
| Chromium, Firefox, WebKit | Playwright, 4 viewports | Every PR |
| Real iOS Safari | Manual device | Every release |
| Real Android Chrome | Manual device | Every release |
| No-JS | Playwright, JS disabled | Every PR |
| Reduced motion | Playwright emulation | Every PR |
| Forced colours / high contrast | Manual | Every release |
| Feature baseline re-check | caniuse review | Start of each phase |

**Note on Playwright's WebKit:** it is not Safari. It shares the engine but not Apple's release build, its compositor tuning, or iOS-specific behaviour. It catches functional regressions; it does **not** substitute for a real device on `backdrop-filter`, momentum scroll or blend-mode performance.

---

**Next:** [08 — Performance](./08-performance.md)
