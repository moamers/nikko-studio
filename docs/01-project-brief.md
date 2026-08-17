# 01 — Project Brief: What We Are Building, and Why

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Engineering Principles](./02-engineering-principles.md) · [Roadmap](./12-roadmap.md) · [Open Questions](./13-open-questions.md)

This document is the engineering team's reading of the business, so that every technical decision downstream can be traced back to a commercial reason. It is a **synthesis**, not a new source of truth.

Sources it draws on:

| Source | What it is | Authority |
|---|---|---|
| [`/README.md`](../README.md) | Business context — what Nikko is, who it serves, how it makes money | **Source of truth for business meaning** |
| [`homepage-1-handoff/README.md`](../homepage-1-handoff/README.md) | Design handoff spec — tokens, sections, interactions, a11y notes | **Source of truth for design intent** |
| [`homepage-1-handoff/Nikko Homepage.dc.html`](../homepage-1-handoff/Nikko%20Homepage.dc.html) | Design source — template + logic class | Source of truth for exact values & copy |
| [`homepage-1-handoff/Nikko Homepage (standalone).html`](../homepage-1-handoff/) | Runnable prototype (~20 MB, images inlined) | Reference for motion only — **never** production code |
| [`homepage-1-handoff/Nikko Direction v2.dc.html`](../homepage-1-handoff/) | Broader creative direction | Reference |

---

## 1. What the business is

Nikko Studio is a **founder-led story studio** created by writer and strategist **Nadia Amer**, operating from London and the UAE. Its commercial shorthand is **"market for memorability"**, and its internal strategic logic is:

> **Know the customer → market for memorability → become the go-to.**

It is deliberately broader than copywriting. It treats language, cultural understanding, customer insight, strategy, creative ideas and experience as **commercial materials**.

Two productised ways in:

| | **Show&Tell** | **Dream&Do** |
|---|---|---|
| What | Workshops & talks, delivered live | Bespoke, founder-led project work |
| Model | Limited drop (~7/year), replay for attendees, then vanishes | Scoped per challenge, not a retainer |
| Price | From £35 public · £500+ private/team | From £5,000+ |
| Character | Scarcity is **structural**, not manufactured | Problem-led, not a service menu |

Plus two non-productised channels that carry most of the commercial weight: **email** (historically the majority of sales in the predecessor business) and **selective 1:1 founder access** (~2 spots every few months, released to the email list).

## 2. Why a website, and what job it has to do

The website is not a brochure. Read against the business model, it has **four distinct jobs**, and they are not equally weighted.

### Job 1 — Prove memorability by being memorable *(primary)*

Nikko sells the ability to make a business impossible to forget. A conventional agency site would be a **counter-argument to the product**. The whole reason the design is loaded with a living accent cycle, an analogue/digital drift, a wake splash, a projector-style sampler and hover scraps is that **the site is the portfolio piece**. Someone should be able to describe this site to a friend from memory.

**Engineering consequence:** motion and micro-interaction are not decoration to be value-engineered away when the schedule tightens. They are the deliverable. But — see [Principle 1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it) — they must never be the thing standing between a visitor and the content.

### Job 2 — Capture email *(the real conversion event)*

The business runs on a list. The README is explicit that email has historically generated the large majority of sales, that Show&Tell drops are announced to the list, and that 1:1 access is released through it. The newsletter capture in the footer is therefore **the highest-value interaction on the page**, not a footer afterthought.

**Engineering consequence:** the newsletter form is a first-class feature with real validation, real error states, real double-opt-in handling and real analytics — not an embed dropped in at the end. It is currently **inert in the prototype**. See [Open Questions Q1](./13-open-questions.md).

### Job 3 — Qualify and receive project enquiries

Dream&Do enquiries are low-volume, high-value. The site needs to let a well-matched founder self-identify ("outliers, category-of-one creatives") and self-deselect if they want commodity content production.

**Engineering consequence, and a gap:** in the prototype, **every** CTA — "Pitch your project", "Grab a seat", "Submit your project here" — points at `#pitch`, which is the *newsletter*. The site's primary commercial action currently has no destination. This is a business-level gap, not a code detail. See [Open Questions Q2](./13-open-questions.md).

### Job 4 — Be findable

Referral and word-of-mouth are strategically central, which means a lot of traffic will be **navigational** — someone half-remembers "Nikko" or "the story studio in London" and searches for it. Increasingly that search happens inside an LLM rather than a search engine.

**Engineering consequence:** technical SEO and machine-readability are load-bearing. See [SEO & LLM Discoverability](./09-seo-and-llm-discoverability.md).

## 3. Who it is for

| Audience | Arrives via | Wants | What the site owes them |
|---|---|---|---|
| **Prospective Dream&Do client** (founder, category-of-one business) | Referral, search, forwarded email | To see judgement and point of view, fast | Credible proof, a clear price floor, an obvious way to start a conversation |
| **Prospective Show&Tell attendee** | Email list, social | To know what it is, when, and how much | Drop dates, price, a low-friction booking path |
| **Future email subscriber** | Anywhere | A reason to hand over an email address | A capture form that is impossible to miss and trivially easy to complete |
| **Peer / referrer** | Social, word of mouth | Something worth passing on | A site that survives being described second-hand |
| **Machine readers** (Google, ClaudeBot, GPTBot, Perplexity) | Crawl | Unambiguous facts about who Nikko is and what it sells | Semantic HTML, structured data, stable URLs |

Note the asymmetry: **most of these people arrive on mobile, from a link in a message or an email.** The desktop experience showcases the craft; the mobile experience does the commercial work. See [Principle 2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation).

## 4. What the design handoff actually asks for

The handoff specifies **one route** — a single long homepage with ten sections and anchor navigation (`#top`, `#work`, `#services`, `#founder`, `#pitch`).

Ten sections, in order:

1. **Header** (sticky) — logo lockup, 3 nav links, analogue/digital mode dial, CTA pill
2. **Hero** — ticket bar, H1, lead copy, CTA, parallaxed collage
3. **Marquee** — 34s infinite scroll band
4. **Attention** (`#work`) — hover-scrap heading, animated counter (80), pull-quote row
5. **Language** — full-bleed turquoise, Arabic setting, three shutter tiles
6. **Founder** (`#founder`) — portrait, bio, CTA
7. **Put us to work** (`#services`) — two cards: Show&Tell, Dream&Do
8. **Work sampler + testimonial** — projector-treatment line swap, Maddi Cook quote
9. **Joyride** — word swap (Khara ⇄ Kaka)
10. **Pitch / footer** (`#pitch`) — newsletter capture, link block, legal row

Six page-level interactive systems sit on top: **accent cycle**, **analogue/digital mode drift**, **wake splash**, **cursor residue**, **scroll progress rail**, **viewport-triggered counters**.

Fidelity is specified as **high** — the tokens, timings and easings in the handoff are exact and are to be reproduced, not approximated.

### What the handoff does *not* cover — and we will need

These are gaps between "one designed homepage" and "a website the business can run on":

- **No mobile header design.** Three nav links, a mode dial and a CTA pill in one flex row is not viable at 390px. No hamburger, drawer or alternative is specified. See [Mobile Risks R1](./06-responsive-and-mobile-risks.md).
- **No enquiry page or form.** Job 3 has no surface.
- **No Show&Tell drop mechanism.** The business releases ~7 dated drops a year with limited availability. A static card saying "From £35" does not express that.
- **No legal pages.** Privacy Policy and T&Cs are linked but point at `#pitch`. A UK business capturing email addresses **needs a real privacy policy** — this is a GDPR obligation, not a nice-to-have.
- **No 404, no thank-you/confirmation state, no error states.**
- **No migration plan.** This is a replatform: `nikkostudio.co` is live on Squarespace, and the legacy domain `imnadiaamer.com` is live too, carrying eight years of SEO equity — and the Google Workspace mail records. See [15](./15-migration-and-cutover.md). *(The footer copy spells it `irnnadiaamer.com` — an `rn`/`m` typo that would ship as written.)*

None of these block the homepage build. All of them shape the architecture, which is why we design the content and routing model to accommodate them from day one rather than retrofitting. See [Roadmap](./12-roadmap.md).

## 5. Constraints we are designing against

From the founder, restated as engineering constraints:

| # | Constraint | Where it is handled |
|---|---|---|
| C1 | Highly interactive, animated, micro-interaction rich | [Motion & Interaction](./05-motion-and-interaction.md) |
| C2 | Fully responsive; mobile always tested; flag design that cannot work on mobile | [Responsive & Mobile Risks](./06-responsive-and-mobile-risks.md) |
| C3 | Works on major browsers; flag what is not possible | [Browser Support](./07-browser-support.md) |
| C4 | Performant | [Performance](./08-performance.md) |
| C5 | SEO friendly, especially technical SEO | [SEO & LLM](./09-seo-and-llm-discoverability.md) |
| C6 | LLM-friendly for indexing in LLM search | [SEO & LLM](./09-seo-and-llm-discoverability.md) |
| C7 | Founder can change text and images cheaply, without a full rebuild; file-based now, CMS-swappable later | [Content Architecture](./04-content-architecture.md) |
| C8 | Simple, cheap hosting: code → GitHub → build → deploy | [Hosting, Domains & Ops](./10-hosting-domains-and-ops.md) |
| C9 | Founder can manage domains | [Hosting, Domains & Ops](./10-hosting-domains-and-ops.md) |

A tenth constraint is implied by the business and we are adopting it explicitly:

| C10 | The site must be maintainable by *someone who is not us* — a future contractor, or Nadia with an AI assistant | [Engineering Principles](./02-engineering-principles.md) |

The business is described as "founder-led, not founder-limited". The website should be built the same way: **built by us, not dependent on us.**

## 6. What "done" looks like for phase 1

The homepage is done when:

- It is visually and behaviourally faithful to the handoff at 1440px, with every deviation logged.
- It is **excellent** — not merely functional — at 390px.
- It passes the [performance budgets](./08-performance.md) on a throttled mobile connection.
- Nadia can change any headline, paragraph, price, image or link by editing a plain text file, and see it live within minutes without engineering help.
- The newsletter form captures real subscribers into the real ESP.
- It scores clean on the [quality gates](./11-quality-gates.md): types, lint, a11y, Lighthouse, cross-browser Playwright.
- Every open question in [13](./13-open-questions.md) is either answered or explicitly deferred with an owner.

---

**Next:** [02 — Engineering Principles](./02-engineering-principles.md) — the doctrine that governs how we build it.
