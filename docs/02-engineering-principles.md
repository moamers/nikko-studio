# 02 — Engineering Principles (The Doctrine)

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Project Brief](./01-project-brief.md) · [Tech Stack](./03-tech-stack.md) · [ADRs](./adr/README.md)

These are the **guardrails**. Every technical decision on this project should be defensible by pointing at one of them. They are meant to be argued with and added to — but changed *deliberately*, in a pull request, not drifted away from in the middle of a build.

**How to read this document.** Each principle has:
- **The rule** — stated so it can be violated (a principle you cannot break is not a principle).
- **Why** — the commercial or user reason.
- **This forbids** — the concrete things it rules out, so the principle has teeth.
- **Verified by** — how we know we are complying. A principle with no verification is a wish.

P1–P9 are the founder's constraints, elaborated. P10–P16 are added by engineering.

---

## P0 — Precedence: when sources conflict, we escalate, we do not guess

**The rule.** Where two source documents disagree, the order of authority is:

1. **Active task instructions** from the founder
2. **`/README.md`** — for business meaning, pricing, positioning, service definitions
3. **`design-handoff/homepage/`** — for the homepage build: exact tokens, copy, timings, layout
4. **`Nikko Direction v2.dc.html`** — for system-level direction on surfaces the homepage handoff does not cover
5. Engineering judgement, recorded as an [ADR](./adr/README.md)

Where 3 and 4 conflict — and [they conflict materially, in at least eight places](./14-design-source-conflicts.md) — **we build the homepage to (3), log the conflict, and get a ruling before building a second page.**

**Why.** The homepage handoff is specific, copy-approved and buildable. The direction document is a system board that still carries open decisions (the logo mark is not chosen; the house pattern is not picked; Arabic glyphs await native sign-off). Building page 1 to one document and page 2 to the other produces a site that does not look like itself — which, for a studio selling memorability, is the worst available outcome.

**This forbids.** Silently picking a value when two documents give two values. Averaging them. Deciding turquoise "is probably fine" because it looks good.

**Verified by.** [Design Source Conflicts register](./14-design-source-conflicts.md), reviewed before each new page type.

---

## P1 — Motion serves the story; it never blocks it

**The rule.** The site is highly interactive and animated. That is the product, not the polish. But **no animation may be the only path to content, and no animation may delay content.** Every element renders in its final, readable, interactive state if JavaScript never runs, if the browser lacks the CSS feature, or if the user has asked for reduced motion.

**Why.** Nikko sells memorability. A site that is merely correct would undercut the pitch. But the commercial jobs — capture the email, receive the enquiry — must survive a 3G connection, a locked-down corporate browser and a vestibular disorder.

**This forbids.**
- Reveal animations that start at `opacity: 0` in the stylesheet. Content starts **visible**; motion is *added* by a capability check, never *removed* by its absence.
- Blocking splash screens. The opening sequence (§0) is scroll-driven, `aria-hidden`, and never traps the user — and per this principle we **invert its chrome gate**: the header, rail and overlays are visible by default and only hidden once the sequence has explicitly claimed the screen. The handoff itself flags the alternative as dangerous — *"default-hidden means a JS failure would leave the site with no navigation"*.
- Hover as the only route to information. Per the direction document: *"Hover — Easter eggs only. No information lives behind a pointer."* The hover scraps and language tiles are decorative or duplicated in visible copy.
- Scroll-jacking, scroll hijacking, or overriding native scroll physics. Explicitly banned in the direction document's anti-brief.
- Layout-affecting animation. Animate `transform`, `opacity`, `clip-path`, `filter`, `background-color`. Never `top`/`left`/`width`/`height`/`margin`.

**Verified by.** A Playwright run with JavaScript disabled asserting every heading, paragraph, price, CTA and form field is present and visible. A second run with `prefers-reduced-motion: reduce` asserting no animation is in flight. Both in CI. See [Quality Gates](./11-quality-gates.md).

---

## P2 — Mobile is the design target, not an adaptation

**The rule.** Every section is designed, built and reviewed at **390 px first**, then 768, 1024, 1280, 1440. A section is not complete until it is *good* on a phone — not merely un-broken. Where the design cannot work on mobile, we say so in writing and propose a specific alternative rather than shipping a squeezed desktop layout.

**Why.** Nikko's traffic is referral-heavy — forwarded emails, DMs, links passed between founders. That traffic is overwhelmingly mobile, and it is the *commercially valuable* traffic. The desktop build wins the craft argument; the mobile build takes the money.

**This forbids.**
- Reviewing at 1440 and assuming it "will wrap".
- Horizontal page scroll. Ever. At any width. (Full-bleed uses `overflow-x: clip` on the wrapper — `clip`, not `hidden`, because `hidden` breaks the sticky header.)
- Touch targets below 44 × 44 CSS px for anything interactive.
- `100vh` for full-height regions — use `100svh` / `100dvh` so mobile browser chrome does not cause a jump.
- Hover-dependent interactions with no tap equivalent, unless the content is genuinely decorative.
- Font sizes below 16 px on form inputs (iOS Safari zooms the viewport on focus below 16 px).

**Verified by.** Playwright viewport matrix in CI at 390/768/1024/1440 with an assertion that `document.documentElement.scrollWidth <= clientWidth`. Manual review on a real iPhone and a real mid-range Android before each release. The [Mobile Risk Register](./06-responsive-and-mobile-risks.md) is updated, not quietly closed.

**Already logged:** eight design elements have identified mobile problems, two of which are hard breaks. See [06](./06-responsive-and-mobile-risks.md).

---

## P3 — Progressive enhancement, in layers, in that order

**The rule.** The site is built in four layers, each fully functional without the one above it:

| Layer | Delivers | Fails to |
|---|---|---|
| **1. Semantic HTML** | All content, all links, a submittable form | Layer 0: nothing. This layer must never fail. |
| **2. CSS (baseline)** | Full layout, typography, colour, shape | Layer 1 |
| **3. CSS (progressive)** | Scroll-driven motion, blend modes, masks — behind `@supports` | Layer 2 |
| **4. JavaScript** | Opening sequence, accent cycle, mode drift, cursor, sampler, counters | Layer 2 |

**Why.** This is what makes the site simultaneously fast, accessible, crawlable, LLM-readable and cross-browser — four of the founder's nine constraints — with one architectural decision rather than four bolt-ons.

**This forbids.**
- Client-side rendering of any content. If a crawler or a reader with JS off cannot see it, it does not exist.
- `@supports`-less use of `animation-timeline`, `mask-image`, `mix-blend-mode` or `backdrop-filter`.
- Feature detection by user-agent sniffing. Detect the feature, not the browser.

**Verified by.** The no-JS Playwright run (P1). `@supports` coverage checked in review. See [Browser Support](./07-browser-support.md).

---

## P4 — Performance is a budget, enforced in CI, not an aspiration

**The rule.** The numbers in [08 — Performance](./08-performance.md) are **build-failing thresholds**, not targets. A pull request that exceeds a budget does not merge until it is under, or the budget is formally raised in that same PR with a reason.

Headline budgets: **LCP ≤ 2.0 s** and **INP ≤ 200 ms** on emulated Moto G Power / 4G; **CLS ≤ 0.05**; **≤ 20 KB gzipped first-party JS** on the homepage; **≤ 150 KB** for the largest image at mobile width; **≤ 120 KB** total font payload.

**Why.** Performance is the one quality attribute that silently degrades on every single commit unless something is watching. And it compounds with everything else here: it is a ranking factor, it is what LLM crawlers experience, and it is what a founder on a train sees.

**This forbids.**
- Shipping the 1–3 MB source PNGs. They become AVIF/WebP with responsive `srcset`, or they do not ship.
- Google Fonts via `<link>` to `fonts.googleapis.com` — an extra connection, a render-blocking stylesheet, and no control over subsetting. Fonts are self-hosted, subset, and preloaded selectively.
- Any client-side framework runtime for content that could be static HTML.
- Adding a dependency without recording its gzipped cost.
- Unbounded DOM growth. The cursor residue trail creates a node every 110 ms — it uses a fixed-size recycled pool, not `createElement`/`remove`.

**Verified by.** Lighthouse CI with assertions, plus a bundle-size check, on every PR. See [Quality Gates](./11-quality-gates.md).

---

## P5 — The document is the product (technical SEO)

**The rule.** The HTML that arrives from the server is complete, semantic and correct **before** any script runs. One `<h1>` per page, a logical heading hierarchy, real `<nav>`/`<main>`/`<section>`/`<article>`/`<blockquote>`, meaningful `alt` text, canonical URLs, `sitemap.xml`, `robots.txt`, Open Graph and Twitter cards, and JSON-LD structured data.

**Why.** Referral traffic means a lot of navigational search. The site must win its own name unambiguously and be correctly understood as a UK/UAE marketing studio with two named service lines and stated prices.

**This forbids.**
- `<div>` where a semantic element exists.
- Decorative images with invented `alt` text — decorative layers are `alt=""` and `aria-hidden="true"`; content images get real descriptions.
- Text baked into images.
- Anchor-only architecture forever. A ten-section single page is one URL and can rank for one intent. The [roadmap](./12-roadmap.md) splits Show&Tell, Dream&Do and case studies onto real URLs as content exists to fill them.
- Changing a URL without a 301.

**Verified by.** Structured-data validation, a link/sitemap check, and heading-order lint in CI.

---

## P6 — Machine-readable by default (LLM discoverability)

**The rule.** Assume a meaningful and growing share of discovery happens inside an LLM. The facts a model needs — who Nikko is, what it sells, at what price, where it operates, how to contact it — are present in the initial HTML as plain prose and as structured data, stated once, unambiguously, and not contradicted anywhere on the page.

**Why.** "Become the go-to" now includes being the studio a model names when a founder asks it for a story-led marketing agency. Models cannot execute the accent cycle or hover a word.

**This forbids.**
- Content that only exists in a JavaScript array and is rendered one item at a time. **The sampler's eight fragments all ship in the HTML** — one visible, seven present. Same for both word-swap states and all service card copy.
- Facts stated only in an image or only in motion.
- Contradicting the README's business facts in page copy.
- Blocking AI crawlers by accident. Whether to *allow* them is a business decision — see [Open Questions Q6](./13-open-questions.md) — but it must be a decision, expressed in `robots.txt`, not an oversight.

**Verified by.** A CI check that greps the built HTML for every sampler fragment and both word-swap states. `llms.txt` present and current. See [SEO & LLM](./09-seo-and-llm-discoverability.md).

---

## P7 — Content is data; code is presentation

**The rule.** No user-facing string, price, image path, link or list lives in a component. All of it lives in **schema-validated content files**, and templates consume **typed objects** through a single content API. The content *source* sits behind a loader that can be swapped — flat files today, a CMS later — **without touching a single template**.

**Why.** This is constraint C7, and it is the difference between a site the founder owns and a site she has to hire someone to change. It is also what makes the CMS question ([Q4](./13-open-questions.md)) a reversible, low-stakes decision instead of a fork in the road.

**This forbids.**
- Hardcoded copy in `.astro`/`.tsx` files. Including "just this one" microcopy label.
- Content files without a schema. An unvalidated YAML file is a runtime error waiting for a Friday.
- Templates importing from `src/content/**` directly. They import from the content API.
- A CMS whose export is not a plain, portable format we can walk away with. See [P16](#p16--every-vendor-choice-has-a-documented-exit).

**Verified by.** A lint rule banning string literals in JSX/template text nodes. Schema validation at build time — a bad content file fails the build, loudly, with the file and field named. See [Content Architecture](./04-content-architecture.md) and [ADR-0002](./adr/0002-content-source-abstraction.md).

---

## P8 — Boring, cheap, replaceable infrastructure

**The rule.** `git push` → build → deploy. Static output. No servers to patch, no database, no container. Serverless functions only where genuinely required (currently: one, for the newsletter proxy). Running cost target: **£0–15/month excluding the domain**.

**Why.** Constraint C8. A marketing site for a founder-led studio should not have an ops burden, an on-call rotation, or a bill that scales with a traffic spike from a viral post.

**This forbids.**
- A database, unless a feature genuinely needs one (Show&Tell seat counts might; we will cross that bridge with an ADR).
- Server-side rendering at request time for content that changes weekly.
- Any paid tier adopted without a line in the [cost table](./10-hosting-domains-and-ops.md).
- Secrets in the repository. API keys live in the host's environment variables and are referenced, never committed.

**Verified by.** Cost table reviewed each phase. Secret scanning in CI.

---

## P9 — Own the front door

**The rule.** The founder holds the registrar account and the DNS zone directly. Domain, DNS, TLS and redirects are configured as code or as documented, reproducible steps — not as tribal knowledge in an agency's account.

**Why.** Constraint C9. The domain is the single asset that cannot be rebuilt. Everything else — code, design, hosting — is replaceable in a week.

**This forbids.**
- Registering the domain in an engineer's personal account.
- A host that also holds the registration in a way that makes leaving painful.
- Losing `imnadiaamer.com` or its inbound links. Any migration ships a redirect map with 301s.
- **Cancelling a provider that holds a live DNS zone.** Squarespace currently holds the zone carrying the Google Workspace mail records — see [15](./15-migration-and-cutover.md). Own the front door means knowing where it actually is.

**Verified by.** [Hosting, Domains & Ops](./10-hosting-domains-and-ops.md) records the registrar, the DNS provider, the account holder and the renewal date.

---

## P10 — Accessibility is a functional requirement

**The rule.** **WCAG 2.2 AA** is the floor, not the ceiling. Keyboard-operable throughout, visible focus (`3px solid #EE5439`, `outline-offset: 3px`), correct contrast, correct roles and labels, `prefers-reduced-motion` honoured completely.

**Why.** It is a legal expectation for a UK business, it overlaps almost entirely with SEO and LLM-readability, and this design has specific hazards: a full-page `multiply` grain overlay sitting over all text, `#B5AC98` mono type that is only legible on ink, a heading whose interactive words are `<span>`s, and a form with no `<form>`.

**This forbids.**
- `<div onClick>`. Interactive elements are `<button>` or `<a>`.
- `<span>` hover targets with no keyboard equivalent. The handoff itself flags this: *"the scrap-dealing words should be keyboard-focusable or the imagery treated as purely decorative."*
- Reusing `#B5AC98` on any light background — it fails contrast. It is an on-ink colour only.
- The newsletter inputs shipping without a real `<form>`, `<label>`s and an `aria-live` region for success and error.
- Decorative layers that are not `aria-hidden="true"` and `pointer-events: none`.

**Verified by.** `axe-core` via Playwright in CI at every breakpoint, keyboard-path tests, and a contrast check of the token pairs — including against the **live accent-tinted grounds**, which shift the background under fixed text.

---

## P11 — One source of truth per fact

**The rule.** Every design token is defined **once**, as a CSS custom property, and referenced everywhere. Colour, type scale, spacing rhythm, radii, motion durations and easings. No hex literal appears in a component. No duration is typed twice.

**Why.** The accent cycle mutates six different surfaces from one state — logo stripe, button slots, page ground, header veil, language panel, footer logo. If those read from six copies of a hex value, they will drift the first time anything changes.

**This forbids.**
- A hardcoded `#EE5439` anywhere outside the token file.
- A magic `2600ms` in a component.
- Duplicating a token into a JS config *and* a stylesheet. Values flow one direction: CSS custom properties are the source; JS reads them via `getComputedStyle` or sets them via `style.setProperty`.

**Verified by.** Stylelint rule banning raw colour values outside `tokens.css`. See [ADR-0004](./adr/0004-styling-approach.md).

---

## P12 — Design fidelity is a specification; deviations are logged

**The rule.** The handoff's values are exact and are reproduced exactly at desktop. Where we must deviate — mobile layout, a browser fallback, an accessibility fix, a performance cut — we **record it**: what changed, why, and whether it needs design sign-off.

**Why.** "High fidelity" was stated explicitly. Undocumented drift is how a distinctive design becomes a generic one, one reasonable-seeming compromise at a time.

**This forbids.** Approximating a timing "close enough". Rounding a `clamp()`. Substituting a similar font. Quietly dropping an interaction because it was awkward.

**Verified by.** A **Deviations** section maintained in [06](./06-responsive-and-mobile-risks.md) and [07](./07-browser-support.md). Visual comparison against the standalone prototype at 1440 before sign-off.

---

## P13 — Privacy and data minimalism

**The rule.** Collect the minimum: first name and email for the newsletter; whatever the enquiry form genuinely needs. **No cookie is set, and no tracking script loads, before the visitor has agreed.** The site must be fully functional — including both forms — for anyone who declines. A real Privacy Policy ships **before** either form goes live.

**Why.** UK GDPR applies. And a visitor who declines tracking is still a customer: the site owes them the same experience.

**Amended 2026-08-17.** This principle originally said *"prefer analytics that require no consent banner at all"*, and forbade GA4 outright. **Nadia has asked for Google Tag Manager and GA4**, accepting the cookie banner that comes with them — she raised the banner herself, so the decision is deliberate rather than accidental. The principle is amended rather than quietly broken, and the trade-offs are recorded at [17 — A7](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm).

**The resulting two-track approach:**

| Track | Tool | Consent | Sees |
|---|---|---|---|
| **Baseline** | Cloudflare Web Analytics | Not required — cookieless | **100% of visitors**, plus real-user Core Web Vitals |
| **Detail** | GTM + GA4 | **Required** — loads only after accept | Visitors who opt in |

The baseline track exists precisely so that declining consent costs us depth, not our fundamental numbers.

**This forbids.**
- GTM, GA4 or any cookie-setting script loading before consent. The tag manager is **consent-gated, not merely present**.
- A consent banner where "reject" is harder to find or click than "accept" — UK GDPR requires them to be equally easy.
- Third-party embeds that set cookies — including an ESP's own hosted form widget, which is why we call [Kit's API](./16-forms-and-data-capture.md#part-1--newsletter--kit) instead.
- Shipping either form while the Privacy Policy is missing or its links are broken.
- A Privacy Policy that does not list every processor: Cloudflare, Resend, Kit, Google Workspace, GA4.
- The `nk-marks` `localStorage` write. The handoff is explicit: *"Do not ship a dead localStorage write without the UI."* Out of scope until a UI exists for it.

**Verified by.** A Playwright assertion that **no cookies exist before consent is given**, and that the site works fully when consent is refused. Privacy Policy present and linked before either form launches.

---

## P14 — Build it so someone else can maintain it

**The rule.** Boring, conventional, well-named code. TypeScript strict. Comments explain *why*, never *what*. Every non-obvious decision becomes an [ADR](./adr/README.md). A competent developer — or Nadia with an AI assistant — should be able to open this repo and find their way in under an hour.

**Why.** "Founder-led, not founder-limited" applies to the website too. Constraint C10.

**This forbids.** Clever abstractions with one call site. Undocumented magic numbers — every one of the design's exact values gets a token name and a source reference. A build that only works on one machine.

**Verified by.** A fresh `git clone && npm install && npm run dev` works on a clean machine, documented in the root README. New contributor onboarding is the test.

---

## P15 — Nothing is trusted at the boundary

**The rule.** The newsletter and enquiry forms validate on the client for UX **and** on the server for safety. Rate limiting, a honeypot field, and a strict Content-Security-Policy. No secrets reach the browser.

**Why.** A public form on a static site is the entire attack surface, and it is enough to get the domain onto a spam blocklist — which would damage the email channel the business actually runs on.

**This forbids.** Calling an ESP API directly from the browser with a key. Trusting client validation. `dangerouslySetInnerHTML` / `set:html` on anything content-derived without sanitisation. Inline scripts that force `unsafe-inline` in the CSP.

**Verified by.** CSP header present and tight. A CI check that no `PUBLIC_`-prefixed variable holds a secret.

---

## P16 — Every vendor choice has a documented exit

**The rule.** For each third party — host, registrar, ESP, CMS, analytics — the [ops doc](./10-hosting-domains-and-ops.md) records what it costs, what it locks in, how the data comes out, and what the migration looks like. Prefer open formats and portable data.

**Why.** Reversibility is what makes it safe to decide quickly now. It is also the mechanism behind constraint C7: the file-based-then-CMS path only works if "swap the source" is genuinely cheap.

**This forbids.** A CMS with no clean export. A host requiring proprietary APIs in application code. An ESP holding the list without export.

**Verified by.** Exit-path column filled in for every vendor before adoption.

---

## Summary card

| # | Principle | One line |
|---|---|---|
| P0 | Precedence | Conflicts escalate; we never guess between two sources |
| P1 | Motion serves the story | It is the product, but never the gatekeeper |
| P2 | Mobile is the target | 390 px first, and *good*, not merely unbroken |
| P3 | Progressive enhancement | HTML → CSS → progressive CSS → JS, each standing alone |
| P4 | Performance is a budget | CI-enforced thresholds, not aspirations |
| P5 | The document is the product | Complete semantic HTML before any script |
| P6 | Machine-readable by default | Models are a real audience; facts ship in the HTML |
| P7 | Content is data | Schema-validated files behind a swappable loader |
| P8 | Boring infrastructure | Static, cheap, no ops burden |
| P9 | Own the front door | The founder holds domain and DNS |
| P10 | Accessibility is functional | WCAG 2.2 AA is the floor |
| P11 | One source of truth per fact | Tokens defined once, referenced everywhere |
| P12 | Fidelity is a spec | Deviations are logged, not absorbed |
| P13 | Privacy and minimalism | Least data, no consent banner, policy before form |
| P14 | Maintainable by others | Founder-led, not founder-limited |
| P15 | Nothing trusted at the boundary | Server validation, rate limits, tight CSP |
| P16 | Every vendor has an exit | Reversibility makes speed safe |

---

**Next:** [03 — Tech Stack](./03-tech-stack.md) — the concrete choices these principles produce.
