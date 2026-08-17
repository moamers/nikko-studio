# 08 — Performance Budgets

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) · [Quality Gates](./11-quality-gates.md)

This answers constraint **C4** — *"the website must be performant"* — by turning it into numbers a build can fail against.

## The budgets

**Reference conditions:** emulated Moto G Power, 4× CPU throttle, Slow 4G (1.6 Mbps down, 150 ms RTT), cold cache. This is deliberately pessimistic — it is roughly a mid-range Android on a train, which is a realistic context for a link forwarded in a message.

### Core Web Vitals

| Metric | Budget | Google "good" | Why stricter |
|---|---|---|---|
| **LCP** | ≤ **2.0 s** | 2.5 s | The LCP element is the H1 — text, self-hosted font. There is no excuse for slow |
| **INP** | ≤ **200 ms** | 200 ms | Interaction is the product; sluggishness undermines the pitch directly |
| **CLS** | ≤ **0.05** | 0.1 | Every image has `aspect-ratio`; fonts are preloaded. Near-zero is achievable |
| **TTFB** | ≤ **200 ms** | 800 ms | Static file from a CDN edge. Anything more indicates a misconfiguration |
| **FCP** | ≤ **1.2 s** | 1.8 s | Critical CSS inlined, no render-blocking third parties |
| **TBT** | ≤ **150 ms** | 200 ms | ~5 KB of JS should be nowhere near this |

### Payload

| Asset | Budget | Note |
|---|---|---|
| **First-party JS** (homepage, gzipped) | ≤ **20 KB** | Realistic estimate: ~5 KB. The budget is headroom, not a target |
| **Third-party JS** | **0 KB** | Cloudflare Web Analytics injects a ~5 KB beacon; nothing else |
| **CSS** (gzipped) | ≤ **30 KB** | Critical inlined, remainder deferred |
| **Fonts** (total) | ≤ **120 KB** | See [font strategy](#fonts-the-biggest-lever) |
| **Largest image** (at 390 px) | ≤ **150 KB** | AVIF |
| **Total, initial viewport** | ≤ **400 KB** | Everything needed to render the hero |
| **Total page weight** | ≤ **1.2 MB** | All images lazy-loaded below the fold |

For scale: the source assets alone are **9 MB**, and the standalone prototype is **20 MB**. The build pipeline is not an optimisation — it is the difference between a shippable site and an unusable one.

### Lighthouse

| Category | Budget |
|---|---|
| Performance | ≥ **95** mobile, ≥ **98** desktop |
| Accessibility | **100** |
| Best Practices | ≥ **95** |
| SEO | **100** |

Budgets are **build-failing thresholds**. A PR that exceeds one does not merge until it is under, or until the budget is raised *in that same PR* with a written reason.

---

## How the budgets are met

### Fonts: the biggest lever

The design specifies **five families across ten-ish axes**:

```
Archivo (ital, wght 400..700 / 400..600)
Archivo Black
DM Mono (400, 500)
Newsreader (ital, opsz 6..72, wght 300..600 / 300..500)
Noto Kufi Arabic (400, 700)
```

Loaded naively from Google Fonts, that is: two extra DNS lookups and TLS handshakes, a render-blocking stylesheet, and several hundred KB of font data — plausibly the single largest cost on the page, and directly in front of LCP.

**Strategy:**

1. **Self-host.** Removes `fonts.googleapis.com` and `fonts.gstatic.com` entirely — two connections and a render-blocking request gone. (Also removes a third-party data flow, which helps [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism).)
2. **Subset aggressively.** Latin + Latin-Extended only for the Latin faces. Arabic for Noto Kufi. `unicode-range` so the browser fetches only what a page actually uses.
3. **Variable fonts where they earn it** — one Archivo variable file replaces several static weights. `Newsreader` is used **italic only** in the homepage design, so ship only the italic axis (the direction document's font request already does this; the handoff's adds an unused upright range — a free saving).
4. **`font-display: swap`** with a metric-matched fallback via `size-adjust`, `ascent-override` and `descent-override`, so the swap causes no layout shift.
5. **Preload only what the first viewport needs** — Archivo Black (H1, logo) and Archivo regular (lead paragraph). Everything else loads normally.
6. **Noto Kufi Arabic is used for exactly two short strings** (`خشمك. خشمك.` and `خرا`). Subsetting to those glyphs takes it from ~100 KB to a few KB. If it can be subset to the literal characters used, do that.

Expected: **≤ 120 KB total**, versus 400 KB+ naive.

### Images

| Step | Effect |
|---|---|
| AVIF primary, WebP fallback, original last | ~50–70% smaller than PNG at equal quality |
| Responsive `srcset` at 390 / 780 / 1170 / 1560 | Phones never download desktop pixels |
| `width`/`height` emitted → `aspect-ratio` | CLS ≈ 0 |
| `loading="lazy"` below the fold | Only the hero collage loads eagerly |
| `fetchpriority="high"` on the LCP-adjacent image | Prioritised in the queue |
| `decoding="async"` | Never blocks the main thread |

3.1 MB `journal-firstdraft.png` → **≈ 60–90 KB** AVIF at mobile width.

The four hover-scrap image sets (12 image slots, 8 unique files) are **desktop-only** ([R5](./06-responsive-and-mobile-risks.md)) and lazy — mobile never requests them at all.

### CSS

- **Critical CSS inlined** in `<head>` — tokens, reset, header, hero. Astro can inline stylesheets under a size threshold automatically.
- Remaining CSS in one file, cached hard.
- `@layer` for cascade order; no specificity escalation, no `!important` outside the reduced-motion backstop.
- No CSS-in-JS runtime, no unused utility framework.

### JavaScript

- **~5 KB gzipped**, seven small modules.
- Loaded `client:idle` — never competes with LCP. Nothing on the page requires JS to be readable ([P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order)).
- No hydration, no virtual DOM, no framework runtime.
- Zero runtime dependencies.

### Runtime performance (the part budgets usually miss)

Bytes are only half of it. This design's risk is **sustained frame cost**, and it is concentrated in a few places:

| Hazard | Mitigation |
|---|---|
| Full-page `mix-blend-mode: multiply` grain | Disabled < 768 px and on coarse pointers ([R6](./06-responsive-and-mobile-risks.md)) |
| Cursor trail creating a DOM node every 110 ms | Fixed recycled pool of ~10 nodes |
| Marquee, blinks, flicker, scan, tear running off-screen | `IntersectionObserver` pause + `visibilitychange` pause |
| Scroll listener for mode drift | rAF-throttled, `{ passive: true }`, writes only on change |
| Scroll-driven animations | Native `animation-timeline` runs off the main thread — this is *why* we prefer it to a JS library |
| `backdrop-filter` on a sticky header | Verify on real iOS; drop the blur below 768 px if it janks ([R14](./06-responsive-and-mobile-risks.md)) |
| Layout thrash | Animate only `transform`, `opacity`, `filter`, `clip-path`, `background-color` |

**Target: a sustained 60 fps during scroll on a mid-range Android**, verified by a Chrome DevTools performance trace on a real device before each release. This is not automatable and is not optional.

### Delivery

- Static files from Cloudflare's edge — TTFB is a cache hit.
- Brotli compression.
- Immutable, content-hashed filenames with a one-year cache.
- HTTP/3.
- `preconnect` to nothing — there is nothing to preconnect to.

---

## Anti-patterns, explicitly banned

| Banned | Why |
|---|---|
| Google Fonts via `<link>` | Extra connections, render-blocking, no subsetting control |
| A UI framework runtime for static content | 45 KB+ for ~200 lines of DOM logic |
| GSAP / Framer Motion / Lenis / Locomotive | 30–70 KB each; CSS does this natively and better |
| A scroll-timeline polyfill | 15 KB, main-thread, for decorative effects only |
| Shipping source PNGs | 9 MB total |
| Google Analytics 4 | ~45 KB, a consent banner, and a data-protection burden |
| Any chat widget, cookie-consent SaaS, or embed | The largest performance regressions on marketing sites, uniformly |
| `will-change` applied broadly | Costs memory; use only on the cursor lens, only while active |
| Web fonts for icons | There are no icons; the logo is CSS |

---

## Measurement

**In CI, every PR:** Lighthouse CI (mobile + desktop, 3 runs, median) with assertions; a bundle-size check that fails on regression; an image-size check that fails if any built image exceeds its budget.

**Continuously in production:** Cloudflare Web Analytics reports field Core Web Vitals from real visitors — the only numbers that ultimately matter. Lab numbers are a proxy; field data is the truth.

**Manually, every release:** a DevTools performance trace on a real mid-range Android during a full-page scroll, checking for dropped frames and long tasks.

---

## Realistic expectation

Given the stack and the budgets above, a well-built version of this page should land around:

| Metric | Expected |
|---|---|
| LCP (mobile, Slow 4G) | 1.2 – 1.6 s |
| INP | < 50 ms |
| CLS | ~0 |
| Total initial payload | ~250 – 350 KB |
| Lighthouse Performance (mobile) | 97 – 100 |

The design's ambition and these numbers are **not in tension**. Almost all of the motion is CSS, which costs bytes measured in hundreds. The threats to performance here are fonts, images and third parties — none of which are design decisions.

---

**Next:** [09 — SEO & LLM Discoverability](./09-seo-and-llm-discoverability.md)
