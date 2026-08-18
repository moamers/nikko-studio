# 03 — Technical Architecture & Tech Stack

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Principles](./02-engineering-principles.md) · [ADRs](./adr/README.md)

## The recommendation in one paragraph

Build the site as a **statically generated Astro site in TypeScript**, styled with **plain CSS driven by custom-property design tokens**, with **zero UI-framework runtime** — the handful of interactive systems ship as small vanilla-TypeScript islands that mutate CSS custom properties and `data-` attributes rather than re-rendering a component tree. All content lives in **schema-validated YAML and Markdown** read through Astro's Content Layer, behind a loader that can be swapped for a CMS without touching a template. Images are optimised at build time to AVIF/WebP with responsive `srcset`. It deploys from GitHub to **Cloudflare Pages**; the domain stays at **GoDaddy** while DNS moves to **Cloudflare**. Two serverless functions handle the forms — the newsletter to **Kit's API**, enquiries to **Cloudflare D1** with **Resend** notifying both Nadia and the enquirer. Expected running cost: **£0/month on top of the domain and the tools the business already pays for** — and cancelling Squarespace after cutover reduces the bill.

---

## The stack

| Layer | Choice | Why | ADR |
|---|---|---|---|
| **Framework** | **Astro 5.x** (static output) | Zero JS by default; islands; first-class content layer; best-in-class image pipeline | [0001](./adr/0001-static-site-generator.md) |
| **Language** | **TypeScript**, `strict` | Content schemas become types; refactors are safe | — |
| **Styling** | **Plain CSS**, `@layer`-organised, CSS custom-property tokens, Astro scoped `<style>` | The design is entirely bespoke; utility classes would be arbitrary values all the way down | [0004](./adr/0004-styling-approach.md) |
| **Interactivity** | **Vanilla TS islands**, `client:idle` / `client:visible` | Six page-level behaviours, none of which need a virtual DOM | [0003](./adr/0003-motion-strategy.md) |
| **Content** | **Astro Content Layer** + **Zod** schemas over **YAML + Markdown** | Founder-editable plain text; build-time validation; loader-swappable | [0002](./adr/0002-content-source-abstraction.md) |
| **Images** | `astro:assets` (sharp) → AVIF/WebP + `srcset` | 1–3 MB PNGs become ~40–120 KB responsive sets | — |
| **Fonts** | Self-hosted, subset, `woff2`, selective `preload` | Removes two third-party connections and a render-blocking request | — |
| **Forms** | Cloudflare Pages Functions → **Kit** (newsletter) / **D1 + Resend** (enquiry) | Keeps the site static; keeps API keys server-side; no third-party form widget | [16](./16-forms-and-data-capture.md) |
| **Hosting** | **Cloudflare Pages** | Free, global, GitHub-native, PR previews, free SSL | [0005](./adr/0005-hosting-and-domain-management.md) |
| **DNS** | **Cloudflare DNS** | Must move off Squarespace before it is cancelled — see [15](./15-migration-and-cutover.md) | [0005](./adr/0005-hosting-and-domain-management.md) |
| **Domain** | **GoDaddy** (existing, unchanged for now) | Only the nameservers change. Revisit the registrar after cutover | [0005](./adr/0005-hosting-and-domain-management.md) |
| **Analytics (baseline)** | **Cloudflare Web Analytics** | Free, cookieless, no consent needed → sees 100% of traffic, reports real-user Core Web Vitals | — |
| **Analytics (detail)** | **Google Tag Manager + GA4** | Requested by Nadia. **Consent-gated** — loads only after accept | [17 A7](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm) |
| **Consent** | Own cookie banner | Required once GTM loads. Design task [D3](./17-action-tracker.md) | — |
| **CI** | **GitHub Actions** | Types, lint, a11y, Lighthouse, Playwright, budgets | — |
| **Testing** | **Playwright** (+ `axe-core`), **Lighthouse CI** | Cross-browser and responsive matrix as a gate | — |

**Not** in the stack, deliberately: React, Vue, Svelte, Tailwind, a CSS-in-JS runtime, a headless CMS (yet), jQuery, GSAP, Framer Motion, Lenis or any smooth-scroll library.

**In the stack by explicit request, against the original recommendation:** Google Tag Manager and GA4. They bring a mandatory cookie banner and are the largest script on the page by some margin — trade-offs recorded at [17 A7](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm) and [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism). Cloudflare D1 is also in, as the durable store for enquiry submissions — a justified exception to [P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure), reasoned in [16](./16-forms-and-data-capture.md).

---

## Why Astro

The founder described the pattern they remembered:

> *"you combine text with code template to pre-generate HTML, preloads quick and if i change text you recompile"*

That is **static site generation**, and the instinct is exactly right for this project. Astro is the current best expression of it, for four specific reasons that map onto four of the nine constraints.

### 1. The JavaScript profile matches the design almost perfectly

Read the design source carefully and the motion divides cleanly:

| Behaviour | Actually needs | JS required? |
|---|---|---|
| Scroll reveals, parallax | `animation-timeline: view()` | No |
| Hover states, button lifts, card hovers | CSS `:hover` | No |
| Marquee, blinking dots, grain flicker, scan sweep, tear | CSS `@keyframes` | No |
| Hover scraps, language tile shutters | CSS `:hover` + `:focus-within` | No |
| Arch radii, perforations, dot fields, blend modes | CSS | No |
| Accent cycle | A timer setting 3 custom properties on `<html>` | **~15 lines** |
| Analogue/digital drift | A rAF-throttled scroll listener setting one attribute | **~20 lines** |
| Wake splash | One class toggle + `sessionStorage` | **~25 lines** |
| Cursor residue | rAF lerp + pooled nodes | **~50 lines** |
| Sampler swap | An index + class toggle | **~25 lines** |
| Counters | `IntersectionObserver` + rAF | **~25 lines** |
| Word swap | A boolean toggle | **~10 lines** |

That is roughly **200 lines of vanilla TypeScript** for the entire interactive surface — comfortably under 5 KB gzipped. A React runtime is ~45 KB gzipped before we write a line. Paying that for 200 lines of DOM manipulation fails [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) with nothing to show for it.

**The key architectural insight:** the prototype threads `{{ accent }}` through twenty-plus inline styles, which in a component framework means re-rendering the page every 12 seconds. In production this becomes **three CSS custom properties on `:root`**:

```css
:root {
  --nk-accent: #FFD400;
  --nk-ground: #F7EED0;
  --nk-veil:   rgba(247,238,208,0.74);
}
```

Everything reads `var(--nk-accent)`. The accent cycle sets three properties on one element every 12 seconds. **Zero re-renders, zero reconciliation, and the CSS `transition` on each consuming element does the 2600 ms crossfade for free.** The same trick handles the mode: `<html data-mode="analogue">` and CSS does the rest. This is not a workaround — it is genuinely better than the prototype, and it is why the framework question mostly dissolves.

### 2. The content layer is precisely constraint C7

Astro's Content Layer is a **loader** abstraction. Today:

```ts
// src/content.config.ts
const homepage = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/homepage' }),
  schema: heroSchema,
});
```

Later, to move to a CMS, that becomes `loader: sanityLoader({ ... })` or a twenty-line custom loader. **The schema does not change. The templates do not change.** The founder's requirement — *"built in a way that could read that content from static files (b) or some CMS (a) in case in the future we wanted to swap"* — is the primitive the framework is built around, not something we bolt on. See [ADR-0002](./adr/0002-content-source-abstraction.md).

### 3. Images

The handoff ships ten PNGs between 224 KB and 3.1 MB. `astro:assets` converts them at build time to AVIF with WebP fallback, generates a `srcset`, and emits width/height so there is no layout shift. This alone is likely a 90%+ reduction in image bytes, and it is a config line rather than a pipeline.

*(Flagged: `assets/chips-pattern.png` is a **2-byte file** — it is corrupt or a placeholder. It is referenced twice in the design source. Needs replacing. See [Q7](./13-open-questions.md).)*

### 4. It stays out of the way of the CSS

This design lives or dies on exact CSS: `border-radius: 50% 50% 8px 8px / 26% 26% 8px 8px`, `mask-image` perforations, `mix-blend-mode` grain, `animation-timeline: view()`, elliptical dot fields. Astro components are HTML with a scoped `<style>` block. There is no abstraction between what the design specifies and what we write.

### What we give up, honestly

| Trade-off | Mitigation |
|---|---|
| Smaller ecosystem than Next.js | The site needs almost nothing from an ecosystem |
| No React component libraries | The design shares nothing with any component library |
| If the site later needs auth/dashboards/app-like state | Astro supports React/Preact islands; add one then, scoped to that route |
| Astro-specific knowledge for a future contractor | Astro components are ~95% plain HTML/CSS; the learning curve is hours |

### Alternatives considered

| Option | Verdict |
|---|---|
| **Next.js (App Router) + Tailwind** | Strong default, biggest ecosystem — but ships a React runtime for a site with ~200 lines of DOM logic, and RSC adds mental overhead with no payoff for static marketing content. Reconsider only if the site becomes app-like. |
| **SvelteKit** (`adapter-static`) | Genuinely good fit; small runtime, excellent transitions. Loses to Astro on the content-layer/loader story and the image pipeline, which are the two constraint-critical features. |
| **Eleventy + vanilla** | Lightest, most durable, zero lock-in. Loses on the image pipeline, TypeScript ergonomics and schema validation. A defensible second choice if minimalism is prioritised over developer experience. |
| **Plain HTML/CSS/JS, no build** | Tempting for a one-pager, but fails C7 immediately: no content/presentation separation, no schema, no CMS path, no image pipeline. |
| **Webflow / Framer / Squarespace** | Cannot express this design — scroll-driven animations, blend-mode grain, mask perforations, the accent-cycle system. Would also fail the performance budget and cost more per month than the whole stack above. |

Full reasoning: [ADR-0001](./adr/0001-static-site-generator.md).

---

## Why plain CSS and not Tailwind

Tailwind's value is speed on *conventional* layouts using a *constrained* scale. This design is the opposite: nearly every value is bespoke and specified to the unit.

In Tailwind, the arch radius becomes:

```html
class="rounded-[50%_50%_8px_8px/26%_26%_8px_8px]"
```

That is worse than CSS in every dimension — harder to read, harder to search, harder to change, and it defeats the purpose of the tool. Repeat for `mask-image` perforations, `animation-timeline`, blend modes, `clamp()` type and the six keyframe families.

More decisively: **the accent system requires CSS custom properties on `:root` regardless.** Once the token layer exists in CSS, a second token system in a Tailwind config violates [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact).

We keep Tailwind's actual discipline — a constrained scale, no magic numbers — via a token layer and a Stylelint rule banning raw colour values outside `tokens.css`.

**CSS organisation** uses native cascade layers, so specificity never becomes a fight:

```css
@layer reset, tokens, base, layout, components, utilities, overrides;
```

See [ADR-0004](./adr/0004-styling-approach.md).

---

## Repository structure

```
nikko-studio/
├── README.md                      # entry point → docs
├── docs/                          # this documentation set
├── homepage-1-handoff/            # design handoff (reference; never imported)
└── site/                          # the application
    ├── astro.config.mjs
    ├── src/
    │   ├── content.config.ts      # Zod schemas + loaders  ← the swap point
    │   ├── content/               # ← THE FOUNDER EDITS HERE
    │   │   ├── settings/site.yaml
    │   │   ├── homepage/*.yaml    # one file per section
    │   │   ├── services/*.yaml    # show-and-tell, dream-and-do
    │   │   ├── fragments/*.yaml   # the eight sampler lines
    │   │   ├── testimonials/*.yaml
    │   │   └── pages/*.md         # legal, long-form prose
    │   ├── lib/content/           # the content API templates import from
    │   ├── styles/
    │   │   ├── tokens.css         # ← every design token, defined once
    │   │   ├── reset.css
    │   │   └── motion.css         # keyframes + @supports layers
    │   ├── components/            # Logo, Button, ArchImage, TicketBar, …
    │   ├── sections/              # Hero, Marquee, Attention, Language, …
    │   ├── scripts/               # accent.ts, mode.ts, wake.ts, cursor.ts, …
    │   ├── layouts/
    │   ├── pages/
    │   └── assets/images/         # optimised source images
    ├── functions/api/subscribe.ts # newsletter proxy (Pages Function)
    ├── public/                    # robots.txt, llms.txt, favicons
    └── tests/e2e/
```

Two rules about this tree:

1. **`homepage-1-handoff/` is reference material and is never imported.** Nothing in `site/` may depend on it. It stays in the repo as the fidelity record.
2. **`src/content/` is the founder's directory.** Everything else is the engineer's. That boundary is the whole point of [P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation).

---

## The interactive systems, concretely

Each is one small module, registered once, defensive by default.

| Module | Trigger | Storage | Bails out when |
|---|---|---|---|
| `accent.ts` | `setInterval`, 12 s | — | `prefers-reduced-motion` (holds at paper, per direction doc) |
| `mode.ts` | rAF-throttled `scroll` | `localStorage['nk-mode']` | never (pinning still works) |
| `wake.ts` | mount, once per session | `sessionStorage['nk-wake']` | `prefers-reduced-motion` |
| `cursor.ts` | `pointermove` | — | `prefers-reduced-motion`, `(pointer: coarse)`, small viewports |
| `sampler.ts` | `setInterval` 3800 ms + click | — | pauses when off-screen |
| `counters.ts` | `IntersectionObserver` | — | `prefers-reduced-motion` (shows final value) |
| `wordswap.ts` | click | — | never (it is a control, not motion) |

Shared discipline: every timer and listener is registered through one small lifecycle helper so nothing leaks; every `IntersectionObserver` unobserves after firing; every listener that can be is `{ passive: true }`.

Detail: [05 — Motion & Interaction](./05-motion-and-interaction.md).

---

## Data flow

```
  src/content/*.yaml ──┐
                       ├─→ Zod schema ──→ Content API ──→ .astro templates ──→ static HTML
  (later: CMS API) ────┘   (validate)      (typed)          (build time)         (CDN)
       ↑                                                                            │
       │                                                                            ▼
   swap the loader                                              browser: CSS + ~5 KB islands
   only — schema and                                                                │
   templates unchanged                                                              ▼
                                                        POST /api/subscribe → Pages Function → ESP
```

---

## Cost

| Item | Provider | Cost |
|---|---|---|
| Hosting, CDN, SSL, PR previews, unlimited bandwidth | Cloudflare Pages | **£0** |
| Serverless functions (both forms) | Cloudflare Pages Functions | **£0** (100k req/day free) |
| Enquiry storage | Cloudflare D1 | **£0** (5 GB free) |
| Spam protection | Cloudflare Turnstile | **£0** |
| DNS | Cloudflare | **£0** |
| Analytics (baseline, cookieless) | Cloudflare Web Analytics | **£0** |
| Analytics (detail, consent-gated) | Google Tag Manager + GA4 | **£0** |
| Transactional email (form notifications) | Resend | **£0** (3,000/mo free) |
| CI | GitHub Actions | **£0** |
| Git-based CMS *(optional, phase 2)* | Sveltia CMS | **£0** |
| Hosted CMS *(optional, later)* | Sanity free tier | **£0** up to limits |
| **Domain** | **GoDaddy** *(existing)* | **~£25–40/yr** — verify on the renewal invoice |
| **Newsletter** | **Kit** *(existing)* | Existing plan, unchanged |
| **Business email** | **Google Workspace** *(existing)* | Existing plan, unchanged |
| ~~Website hosting~~ | ~~Squarespace~~ | **Cancelled → saving ~£10–20/mo** |

**The only new recurring cost is £0.** Everything the new stack adds sits on a free tier; Kit, Google Workspace and the domain are pre-existing. Cancelling Squarespace after cutover means **the total monthly bill goes down**, not up.

A plain-English version of this table — separating *services you have an account with* from *build tools you'll never log into* — is at [00 — Start Here](./00-start-here.md#1-every-tool-what-it-does-how-it-connects-what-it-costs).


---

## Assumptions this rests on

Stated explicitly so they can be corrected rather than silently inherited:

1. The site is **content-led marketing**, not an application. No user accounts, no dashboard, no e-commerce checkout on-site.
2. Traffic is in the thousands-to-tens-of-thousands of monthly visits, not millions.
3. Content changes weekly at most — a build-and-deploy cycle of 1–3 minutes is acceptable.
4. Show&Tell bookings and payments happen on a **third-party platform** (Eventbrite, Lu.ma, Stripe Payment Links…), not on this site. If seat counts must be live and on-site, that is a real architectural change — [Q3](./13-open-questions.md).
5. The founder is comfortable editing structured plain text, or will use a Git-based CMS UI from phase 2.
6. English is the only site language. Arabic appears as designed typographic content, not as a localisation.
7. **This is a replatform, not a launch.** `nikkostudio.co` is live on Squarespace with 4 URLs, and its DNS zone — which also carries the Google Workspace mail records for `imnadiaamer.com` — must move before Squarespace is cancelled. See [15](./15-migration-and-cutover.md).
8. **Kit remains the system of record for the newsletter**; we replace its widget, not the service.

If any of these is wrong, tell us — several of them would change the recommendation.

---

**Next:** [04 — Content Architecture](./04-content-architecture.md) · [05 — Motion & Interaction](./05-motion-and-interaction.md)
