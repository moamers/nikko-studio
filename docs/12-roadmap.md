# 12 — Delivery Roadmap

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Open Questions](./13-open-questions.md) · [Quality Gates](./11-quality-gates.md)

Sequenced so that **nothing is built twice** and every phase ships something usable. No code has been written yet — this is the proposed plan, for approval.

## Phase 0 — Decisions & foundations

**Goal:** unblock the build. Mostly conversation, not code.

| # | Task | Owner | Blocks |
|---|---|---|---|
| 0.1 | Answer the [architecture-blocking open questions](./13-open-questions.md) (Q1–Q3) | Nadia | Build start |
| 0.2 | Resolve the [design source conflicts](./14-design-source-conflicts.md) — at minimum the turquoise licence and the motion grammar | Nadia + design | Language section, all motion |
| 0.3 | Decide the mobile header ([R1](./06-responsive-and-mobile-risks.md)) | Nadia + design | Header |
| 0.4 | Decide the mobile treatment for the language tiles ([R3](./06-responsive-and-mobile-risks.md)) and hero collage ([R4](./06-responsive-and-mobile-risks.md)) | Nadia + design | Those sections |
| 0.5 | Confirm the domain and secure the Cloudflare account **in Nadia's name** | Nadia | Launch |
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
| 1.11 | Pitch / footer + **working newsletter form** | The highest-value interaction on the page |
| 1.12 | Wake splash | [R2](./06-responsive-and-mobile-risks.md) 🔴 — fix the landing coordinates |
| 1.13 | Cursor residue | Desktop-only; pooled nodes |
| 1.14 | SEO layer — meta, JSON-LD, sitemap, `robots.txt`, `llms.txt`, OG image | [Q6](./13-open-questions.md) |
| 1.15 | Privacy Policy + Terms | **Must ship before the form goes live** ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)) |
| 1.16 | 404 page | — |
| 1.17 | Full audit — a11y, performance, cross-browser, real devices | — |

**Exit:** the homepage live on the real domain, all gates green, Nadia able to edit content herself.

**Note on 1.15:** legal pages are not optional and not phase 2. Capturing email addresses in the UK without a linked, real privacy policy is a compliance problem, and the current design links both to `#pitch`.

## Phase 2 — Make it a website

**Goal:** turn one page into a site the business can actually run on. Driven by what the business needs, not by what is easy.

| # | Deliverable | Why |
|---|---|---|
| 2.1 | **`/pitch` — a real enquiry page and form** | The primary commercial CTA currently has no destination ([Q2](./13-open-questions.md)). Highest business value in this phase |
| 2.2 | **Sveltia CMS** at `/admin` | Editing UI with drag-and-drop images; still Git-backed, still £0 ([04](./04-content-architecture.md#phase-2-a-git-based-cms-recommended-next-step)) |
| 2.3 | **`/show-and-tell`** with a drops system | ~7 dated drops a year with live/gone/sold-out status. `Event` structured data. The current static card cannot express scarcity, which *is* the offer |
| 2.4 | **`/dream-and-do`** | Its own ranking surface for project-work intent |
| 2.5 | `irnnadiaamer.com` redirect map + Search Console migration | Protects eight years of link equity ([Q5](./13-open-questions.md)) |
| 2.6 | Analytics + conversion events | Measure the two things that matter: subscribes and enquiries |
| 2.7 | OG image generation per page | Referral traffic is link-shared; the card *is* the ad |

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

**Why the newsletter form is in phase 1, not phase 2.** It is the site's highest-value interaction ([Job 2](./01-project-brief.md#job-2--capture-email-the-real-conversion-event)). A homepage that looks finished but does not capture email is not finished.

**Why the enquiry page is phase 2, not phase 1.** It needs a decision from Nadia about where enquiries go ([Q2](./13-open-questions.md)) and probably some new copy. The homepage should not wait on it — but it should not be forgotten either, which is why it is 2.1.

**Why the CMS is phase 2, not phase 1.** Direct file editing on GitHub works from day one at zero cost. Adding a CMS before knowing whether it is needed is speculative work. It is also purely additive, so deferring costs nothing.

**Why case studies are phase 3.** They need real client permission, real assets and real writing. Placeholder case studies would be worse than none — for SEO, and for a studio selling distinctiveness.

---

## Risks to delivery

| Risk | Impact | Mitigation |
|---|---|---|
| Design conflicts unresolved ([14](./14-design-source-conflicts.md)) | Rework, or an inconsistent site | Resolve in phase 0. The turquoise and motion questions block real sections |
| Mobile design decisions unresolved ([R1](./06-responsive-and-mobile-risks.md), [R3](./06-responsive-and-mobile-risks.md), [R4](./06-responsive-and-mobile-risks.md)) | Three sections blocked | Phase 0.3–0.4. Engineering can propose; design must sign off |
| Final imagery not ready | Ships with placeholders | Content architecture makes swapping images a one-line change — low risk by design |
| Arabic not signed off | Two sections blocked | Flagged twice in the direction doc. Start the sign-off now ([Q8](./13-open-questions.md)) |
| ESP undecided | Form cannot be wired | [Q1](./13-open-questions.md). Build the form against an interface; swap the provider behind it |
| Scroll-driven animation support shifts | Fallback becomes more/less important | The strategy is support-agnostic by design ([07](./07-browser-support.md)) |
| Scope creep from the direction document | Phase 1 never ships | The memory box, voice notes and word-weight selector are **not** in the homepage handoff. Phase 3 at the earliest |

---

**Next:** [13 — Open Questions](./13-open-questions.md)
