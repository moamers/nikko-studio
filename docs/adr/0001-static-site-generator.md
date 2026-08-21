# ADR-0001: Astro as the static site generator

**Status:** Proposed
**Date:** 2026-08-17
**Principles:** [P3](../02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order), [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration), [P5](../02-engineering-principles.md#p5--the-document-is-the-product-technical-seo), [P6](../02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability), [P7](../02-engineering-principles.md#p7--content-is-data-code-is-presentation), [P8](../02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure)

## Context

We are building a marketing website for Nikko Studio: initially one long homepage with ten sections, growing to perhaps eight to twelve routes. It must be:

- highly animated and interactive (C1)
- fully responsive (C2), cross-browser (C3), fast (C4)
- excellent at technical SEO (C5) and machine-readable (C6)
- content-editable by a non-technical founder, from files now and possibly a CMS later (C7)
- deployable via `git push` to cheap hosting (C8)

The framework choice is the most consequential technical decision, because it determines the default JavaScript payload, the content story, and the image pipeline — three of the six constraints above.

**The decisive observation** came from auditing the design source rather than reasoning from habit. Of the design's motion, almost everything is CSS: scroll reveals and parallax (`animation-timeline`), all hover states, the marquee, the blinking dots, the grain flicker, the scan sweep, the tile shutters, the hover scraps, every shape and blend. What genuinely needs JavaScript is:

| Behaviour | Estimated lines |
|---|---|
| Accent cycle | ~15 |
| Analogue/digital mode drift | ~20 |
| Wake splash | ~25 |
| Cursor residue | ~50 |
| Sampler swap | ~25 |
| Counters | ~25 |
| Word swap | ~10 |
| **Total** | **≈ 170–200 lines** |

None of it is component-tree state. All of it is "set a CSS custom property or a `data-` attribute on `<html>`". The accent cycle in particular — which the prototype threads through 20+ inline styles — reduces to three `setProperty` calls on one element, with CSS `transition` handling the 2600 ms crossfade for free.

**A site whose entire interactive surface is 200 lines of DOM manipulation does not need a UI framework runtime.**

## Decision

**Use Astro 5.x with static output (`output: 'static'`), TypeScript in strict mode, and no UI framework.** The interactive behaviours ship as small vanilla-TypeScript islands loaded `client:idle`.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Astro** ✅ | Zero JS by default; Content Layer with swappable loaders is exactly C7; excellent image pipeline; components are essentially HTML+CSS, which suits a bespoke design; islands available if a complex widget ever appears | Smaller ecosystem; a framework a future contractor may not know | **Chosen** |
| **Next.js (App Router) + Tailwind** | Largest ecosystem; most hireable; strong image handling; scales to app-like features | Ships a React runtime (~45 KB gz) for 200 lines of DOM logic — fails [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) with nothing gained; RSC adds significant conceptual overhead for static marketing content; the accent cycle would trigger a full re-render every 12 s unless deliberately routed around React, at which point React is dead weight | Rejected |
| **SvelteKit** (`adapter-static`) | Small runtime; genuinely excellent motion primitives; compiles away | Weaker content-source-abstraction story than Astro's loaders; less mature image pipeline. Both are constraint-critical here | Rejected, narrowly |
| **Eleventy + vanilla** | Lightest possible; near-zero lock-in; extremely durable | No first-class image pipeline; weaker TypeScript ergonomics; schema validation is DIY; slower iteration | Rejected — a defensible second choice if minimalism outranked developer experience |
| **Plain HTML/CSS/JS, no build** | Simplest conceivable; no toolchain to rot | Fails C7 outright — no content/presentation separation, no schema, no CMS path; no image optimisation; copy duplicated across pages as the site grows | Rejected |
| **Webflow / Framer / Squarespace** | No engineering; founder edits everything | Cannot express this design — scroll-driven animation, blend-mode grain, mask perforations, the accent-cycle system; fails the performance budget; £14–39/mo; heavy lock-in with a poor exit | Rejected |
| **WordPress** | Ubiquitous; founder-familiar CMS | A server, a database, updates, security exposure — fails [P8](../02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure); performance requires substantial work to reach where Astro starts | Rejected |

## Consequences

### Good

- **Near-zero JavaScript.** ~5 KB gz versus 45 KB+ for a React baseline. [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) becomes easy rather than a fight.
- **Complete HTML on first byte.** [P5](../02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) and [P6](../02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability) are satisfied by the architecture, not by extra work.
- **The content requirement is a built-in primitive.** See [ADR-0002](./0002-content-source-abstraction.md).
- **Images handled.** 9 MB of source PNGs become a few hundred KB of responsive AVIF.
- **Nothing between the design and the CSS.** Astro components are HTML with scoped `<style>` — important for a design specified to the exact unit.
- **Deploys anywhere.** Static output; no vendor coupling ([P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)).
- **An escape hatch exists.** If a genuinely complex stateful widget appears, add a Preact island (~3 KB) on that route only.

### Bad / accepted costs

- **A less common framework.** Mitigated by Astro components being ~95% plain HTML and CSS — the learning curve is hours, and it is the fastest-growing content-site framework.
- **No React component ecosystem.** Not a real loss: this design shares nothing with any component library. Everything is bespoke.
- **We write our own interaction code** instead of using framework state. This is the point, and the code is small — but it means our own discipline about listener cleanup and memory, which we handle with a shared lifecycle helper.
- **If the site becomes app-like** (accounts, dashboards, real-time), we would revisit. Islands make that incremental rather than a rewrite.

### Neutral

- Build times of 1–3 minutes at this size.
- Astro's `.astro` format is a new file type in the repo, but it is close enough to HTML to read without documentation.

## Reversal

**Cost: moderate.** The content files, schemas, CSS and vanilla-TS modules all port. What would be rewritten is the template layer — `.astro` files become `.tsx` or `.svelte`. For a ten-section homepage that is a few days, not a rebuild.

Reversal would be triggered by the site needing genuine application behaviour — authentication, a dashboard, real-time state — that islands cannot serve cleanly. Nothing currently on the [roadmap](../12-roadmap.md) implies that.
