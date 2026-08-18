# 12 — Delivery Roadmap

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Open Questions](./13-open-questions.md) · [Quality Gates](./11-quality-gates.md)

Sequenced so that **nothing is built twice** and every phase ships something usable. No code has been written yet — this is the proposed plan, for approval.

## Phase 0 — Decisions & foundations

**Goal:** unblock the build. Mostly conversation, not code.

| # | Task | Owner | Blocks |
|---|---|---|---|
| **0.0** | 🔴 **Migrate DNS off Squarespace to Cloudflare** — both `nikkostudio.co` and `imnadiaamer.com`, preserving the Google Workspace MX records, then verify email still flows. **Do this first; it is independent of the build and it removes an email-outage risk.** See [15](./15-migration-and-cutover.md) | Eng + Nadia | Cancelling Squarespace |
| 0.1 | Answer the [architecture-blocking open questions](./13-open-questions.md) (Q1–Q3) | Nadia | Build start |
| 0.2 | Resolve the [design source conflicts](./14-design-source-conflicts.md) — at minimum the turquoise licence and the motion grammar | Nadia + design | Language section, all motion |
| 0.3 | Decide the mobile header ([R1](./06-responsive-and-mobile-risks.md)) | Nadia + design | Header |
| 0.4 | Decide the mobile treatment for the language tiles ([R3](./06-responsive-and-mobile-risks.md)) and hero collage ([R4](./06-responsive-and-mobile-risks.md)) | Nadia + design | Those sections |
| 0.5 | Set up the Cloudflare account **in Nadia's name**; confirm GoDaddy auto-renew is on for both domains; add the missing SPF/DKIM/DMARC records | Nadia + Eng | Launch |
| 0.6 | Scaffold Astro + TypeScript + CI + Cloudflare Pages; verify a "hello world" deploys | Eng | Everything |
| 0.7 | Build the token layer from the handoff — every colour, type step, radius, duration, easing as a custom property | Eng | Every section |
| 0.8 | Font pipeline: self-host, subset, metric-matched fallbacks, preload | Eng | LCP |
| 0.9 | Image pipeline; replace the corrupt `chips-pattern.png` | Eng + Nadia | Any image |
| 0.10 | Content schemas + the content API façade | Eng | Every section |

**Exit:** a deployed, empty, token-complete site passing all [gates](./11-quality-gates.md), with a green CI pipeline and a working preview URL.

The order matters: 0.6–0.10 are the parts everything else sits on, and they are cheap to get right first and expensive to retrofit.

## Phase 1 — The homepage

**Goal:** the handoff, built, at full fidelity, excellent on mobile.

Built **section by section, in reading order**, each one reviewed on a preview URL before the next starts — so problems surface early and the review burden stays small.

| # | Section | Notable risk |
|---|---|---|
| 1.1 | Global shell — page wrapper, accent system, mode system, scroll rail | The accent architecture is the spine; get it right first |
| 1.2 | Header + mobile menu | [R1](./06-responsive-and-mobile-risks.md) 🔴, [R9](./06-responsive-and-mobile-risks.md), [R10](./06-responsive-and-mobile-risks.md) |
| 1.3 | Hero | [R4](./06-responsive-and-mobile-risks.md) 🔴, [R7](./06-responsive-and-mobile-risks.md) |
| 1.4 | Marquee | [R15](./06-responsive-and-mobile-risks.md) |
| 1.5 | Attention (`#work`) — counter, pull-quote | [R5](./06-responsive-and-mobile-risks.md) hover scraps |
| 1.6 | Language (turquoise) | [R3](./06-responsive-and-mobile-risks.md) 🔴, [C1](./14-design-source-conflicts.md) turquoise licence |
| 1.7 | Founder | Low |
| 1.8 | Put us to work — service cards | [R8](./06-responsive-and-mobile-risks.md) |
| 1.9 | Sampler + testimonial | [P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability) — all 8 fragments in the HTML |
| 1.10 | Joyride / word swap | Arabic sign-off ([Q8](./13-open-questions.md)) |
| 1.11 | Pitch / footer + **working newsletter form** (→ Kit API) | The highest-value interaction on the page ([16](./16-forms-and-data-capture.md)) |
| 1.12 | Wake splash | [R2](./06-responsive-and-mobile-risks.md) 🔴 — fix the landing coordinates |
| 1.13 | Cursor residue | Desktop-only; pooled nodes |
| 1.14 | SEO layer — meta, JSON-LD, sitemap, `robots.txt`, `llms.txt`, OG image | [Q6](./13-open-questions.md) |
| 1.15 | **Kit integration** — signup form → Cloudflare Function → Kit API, source tagging, end-to-end test | [K1–K6](./17-action-tracker.md#-kit--newsletter-integration) |
| 1.16 | **Resend** — notification to Nadia (`Reply-To` the enquirer) + confirmation to the enquirer | [E1–E6](./17-action-tracker.md#-email-notifications--form-submissions) |
| 1.17 | **Cookie consent banner** — build to Nadia's design; gates all tracking | [D3](./17-action-tracker.md#-nadia--design-tasks-with-claude-design) |
| 1.18 | **Google Tag Manager + GA4**, consent-gated, plus Cloudflare Web Analytics always-on | [A1–A7](./17-action-tracker.md#-analytics--tracking) |
| 1.19 | **Conversion events** — `newsletter_subscribe`, `enquiry_submit` (+ budget band) | The only two numbers that map to revenue |
| 1.20 | **`/contact` — rebuild the enquiry form** with durable storage, notification to Nadia, confirmation to the enquirer ([16](./16-forms-and-data-capture.md)) | Replaces a hacky Apps Script that can silently lose a five-figure lead |
| 1.21 | Privacy Policy + Terms — migrate from the live site, review against the new processor list | **Must ship before either form goes live** ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)) |
| 1.22 | 404 page | — |
| 1.23 | Redirect map + Search Console baseline | [15](./15-migration-and-cutover.md) |
| 1.24 | Full audit — a11y, performance, cross-browser, real devices | — |
| 1.25 | **Cutover**, then watch for 1–2 weeks, **then** cancel Squarespace | [15](./15-migration-and-cutover.md) — cancelling early is the one irreversible mistake |

**Exit:** the new site live on `www.nikkostudio.co`, all gates green, both forms working end-to-end, Nadia able to edit content herself, Squarespace safely cancelled.

**Note:** `/contact` moves into phase 1 (it was phase 2) because the form already exists and is load-bearing — the replatform cannot ship without it.

**Note on 1.21:** legal pages are not optional and not phase 2. Capturing email addresses in the UK without a linked, real privacy policy is a compliance problem, and the current design links both to `#pitch`.

## Phase 2 — Make it a website

**Goal:** turn one page into a site the business can actually run on. Driven by what the business needs, not by what is easy.

| # | Deliverable | Why |
|---|---|---|
| 2.1 | **Sveltia CMS** at `/admin` | Editing UI with drag-and-drop images; still Git-backed, still £0 ([04](./04-content-architecture.md#phase-2-a-git-based-cms-recommended-next-step)) |
| 2.2 | **`/show-and-tell`** with a drops system | ~7 dated drops a year with live/gone/sold-out status. `Event` structured data. The current static card cannot express scarcity, which *is* the offer |
| 2.3 | **`/dream-and-do`** | Its own ranking surface for project-work intent |
| 2.4 | **`imnadiaamer.com`** retirement — 301 the domain, Search Console change of address | Consolidates eight years of link equity instead of splitting it ([Q5](./13-open-questions.md)) |
| 2.5 | Google Sheet mirror for enquiries, if wanted | Nadia's existing working view ([Q13](./13-open-questions.md)) |
| 2.6 | GA4 funnels, campaign tagging, attribution reporting | Once there is enough traffic to analyse |
| 2.7 | OG image generation per page | Referral traffic is link-shared; the card *is* the ad |
| 2.8 | Registrar review — transfer `.co` to Cloudflare at renewal? | At-cost renewals; low risk once cutover is settled ([15](./15-migration-and-cutover.md)) |

## Phase 3 — Compounding assets

**Goal:** the things that earn links and rankings over time. Gated on content existing — **a thin page is worse than no page.**

| # | Deliverable |
|---|---|
| 3.1 | `/work` + `/work/[slug]` — case studies. The strongest link-earning asset available to this business, and the fragments in the sampler are already the seeds |
| 3.2 | `/founder` — "Nadia Amer" is a real navigational query with eight years behind it |
| 3.3 | `/journal/[slug]` + RSS — newsletter archive; compounding long-tail and a natural home for the "season" model |
| 3.4 | Direction-doc set pieces if adopted: memory box, voice notes, word-weight selector, margin residue rail |
| 3.5 | Reassess: hosted CMS? More languages? Booking on-site? |

---

## Sequencing rationale

**Why tokens and content schemas before any section.** Both are consumed by every section. Building them after two sections means rewriting two sections.

**Why DNS migration is task zero.** It is the only item here that can cause an outage of something already working — Nadia's business email. It is also completely independent of the website build, so there is no reason to sequence it behind anything. Do it this week.

**Why analytics and consent are in phase 1, not phase 2.** The banner gates the tracking, so they ship together or not at all — and launching without measurement means the replatform's before/after is unmeasurable exactly when it matters most.

**Why both forms are in phase 1.** The newsletter is the site's highest-value interaction ([Job 2](./01-project-brief.md#job-2--capture-email-the-real-conversion-event)), and `/contact` already exists and already receives enquiries — a replatform that drops a working commercial surface is not a replatform, it is a regression.

**Why the CMS is phase 2, not phase 1.** Direct file editing on GitHub works from day one at zero cost. Adding a CMS before knowing whether it is needed is speculative work. It is also purely additive, so deferring costs nothing.

**Why case studies are phase 3.** They need real client permission, real assets and real writing. Placeholder case studies would be worse than none — for SEO, and for a studio selling distinctiveness.

---

## Risks to delivery

| Risk | Impact | Mitigation |
|---|---|---|
| 🔴 **Squarespace cancelled before DNS migrates** | **Business email outage** | Task 0.0. This is the only genuinely dangerous step in the project ([15](./15-migration-and-cutover.md)) |
| Design conflicts unresolved ([14](./14-design-source-conflicts.md)) | Rework, or an inconsistent site | Resolve in phase 0. The turquoise and motion questions block real sections |
| Mobile design decisions unresolved ([R1](./06-responsive-and-mobile-risks.md), [R3](./06-responsive-and-mobile-risks.md), [R4](./06-responsive-and-mobile-risks.md)) | Three sections blocked | Phase 0.3–0.4. Engineering can propose; design must sign off |
| Final imagery not ready | Ships with placeholders | Content architecture makes swapping images a one-line change — low risk by design |
| Arabic not signed off | Two sections blocked | Flagged twice in the direction doc. Start the sign-off now ([Q8](./13-open-questions.md)) |
| Cookie banner design not ready | GTM cannot ship → no GA4 at launch | [D3](./17-action-tracker.md). Cloudflare Web Analytics still gives a baseline, so launch is not blocked |
| GTM pushes the page past its performance budget | Budget breach | Consent-gated and lazy-loaded, so it never competes with LCP. Measure before and after ([17 A7](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm)) |
| Scroll-driven animation support shifts | Fallback becomes more/less important | The strategy is support-agnostic by design ([07](./07-browser-support.md)) |
| Scope creep from the direction document | Phase 1 never ships | The memory box, voice notes and word-weight selector are **not** in the homepage handoff. Phase 3 at the earliest |

---

**Next:** [13 — Open Questions](./13-open-questions.md)
