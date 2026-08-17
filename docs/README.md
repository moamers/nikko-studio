# Nikko Studio — Engineering Documentation

> Technical architecture, principles and delivery plan for the Nikko Studio website.
> **Status:** Architecture proposal, awaiting review. **No code written yet.**
> **Last updated:** 2026-08-17

For **business context** — what Nikko Studio is, who it serves, how it makes money — see the [root README](../README.md). That file is the source of truth for business meaning; this set is the source of truth for how we build.

---

## Start here

| If you want to know… | Read |
|---|---|
| What we're building and why | [01 — Project Brief](./01-project-brief.md) |
| The rules we build by | [02 — Engineering Principles](./02-engineering-principles.md) ⭐ |
| What we're building it with | [03 — Tech Stack](./03-tech-stack.md) ⭐ |
| How the founder edits content | [04 — Content Architecture](./04-content-architecture.md) |
| What's broken on mobile | [06 — Mobile Risks](./06-responsive-and-mobile-risks.md) ⚠️ |
| Where the design docs disagree | [14 — Design Source Conflicts](./14-design-source-conflicts.md) ⚠️ |
| What we need answered | [13 — Open Questions](./13-open-questions.md) ⚠️ |

⭐ = the core of the proposal · ⚠️ = needs a decision from outside engineering

---

## Full contents

### Context

| # | Document | What it covers |
|---|---|---|
| **01** | [Project Brief](./01-project-brief.md) | The business read as an engineering problem; the four jobs the site must do; what the handoff covers and what it doesn't |

### The doctrine

| # | Document | What it covers |
|---|---|---|
| **02** | [Engineering Principles](./02-engineering-principles.md) | **The guardrails.** 17 principles, each with what it forbids and how it's verified |
| **03** | [Tech Stack](./03-tech-stack.md) | Astro, TypeScript, plain CSS, vanilla islands, Cloudflare — with the reasoning and the rejected alternatives |

### How each constraint is met

| # | Document | Constraint |
|---|---|---|
| **04** | [Content Architecture](./04-content-architecture.md) | C7 — founder-editable content, files now, CMS-swappable later |
| **05** | [Motion & Interaction](./05-motion-and-interaction.md) | C1 — interactivity, animation, micro-interactions |
| **06** | [Responsive & Mobile Risks](./06-responsive-and-mobile-risks.md) | C2 — responsive, mobile-tested, with a **16-item risk register** |
| **07** | [Browser Support](./07-browser-support.md) | C3 — cross-browser, with a feature-by-feature risk table |
| **08** | [Performance](./08-performance.md) | C4 — budgets enforced in CI |
| **09** | [SEO & LLM Discoverability](./09-seo-and-llm-discoverability.md) | C5, C6 — technical SEO and machine-readability |
| **10** | [Hosting, Domains & Ops](./10-hosting-domains-and-ops.md) | C8, C9 — deployment pipeline and domain ownership |

### Delivery

| # | Document | What it covers |
|---|---|---|
| **11** | [Quality Gates](./11-quality-gates.md) | How every principle becomes a CI check |
| **12** | [Roadmap](./12-roadmap.md) | Phased plan, sequencing rationale, delivery risks |
| **13** | [Open Questions](./13-open-questions.md) | 12 questions needing answers, each with a default if unanswered |
| **14** | [Design Source Conflicts](./14-design-source-conflicts.md) | Where the two design documents contradict each other |

### Decisions

| # | ADR | Decision |
|---|---|---|
| — | [ADR index](./adr/README.md) | What an ADR is, when to write one, the template |
| 0001 | [Static site generator](./adr/0001-static-site-generator.md) | Astro, not Next.js / SvelteKit / Eleventy / Webflow |
| 0002 | [Content source abstraction](./adr/0002-content-source-abstraction.md) | Schema + loader, so files→CMS is a one-file change |
| 0003 | [Motion strategy](./adr/0003-motion-strategy.md) | CSS-first, capability-gated, no animation library |
| 0004 | [Styling approach](./adr/0004-styling-approach.md) | Plain CSS with custom-property tokens, not Tailwind |
| 0005 | [Hosting & domains](./adr/0005-hosting-and-domain-management.md) | Cloudflare Pages + Cloudflare Registrar |

---

## The design handoff

Design lives in [`homepage-1-handoff/`](../homepage-1-handoff/). It is **reference material** — the production build never imports from it.

| File | What it is |
|---|---|
| [`README.md`](../homepage-1-handoff/README.md) | The homepage spec: tokens, ten sections, interactions, state, a11y notes |
| `Nikko Homepage.dc.html` | The design source — template + logic class. Exact values and copy |
| `Nikko Homepage (standalone).html` | Runnable prototype (~20 MB). Open it to see the motion |
| `Nikko Direction v2.dc.html` | Art direction v1.1 — 18 plates of system-level rules |
| `assets/` | 10 placeholder images (⚠️ `chips-pattern.png` is a 2-byte corrupt file) |
| `CLAUDE_CODE_PROMPT.md` | The handoff's own suggested build prompt |

**⚠️ The two design documents contradict each other** on turquoise usage, motion grammar, radii, type scale and muted colour values. See [14](./14-design-source-conflicts.md). Per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess), the homepage handoff governs the homepage build and every conflict is logged for a ruling.

---

## Source-of-truth precedence

When documents disagree ([P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess)):

1. Active task instructions from the founder
2. [`/README.md`](../README.md) — business meaning, pricing, positioning
3. `homepage-1-handoff/` — the homepage build
4. `Nikko Direction v2.dc.html` — system-level direction beyond the homepage
5. Engineering judgement, recorded as an [ADR](./adr/README.md)

---

## Documentation conventions

- **Numbered files**, read in order; each ends with a pointer to the next
- **Every document cross-links** to the principles it serves and the documents it depends on
- **ADRs are immutable** — superseded, never edited
- **Registers are living**: [mobile risks](./06-responsive-and-mobile-risks.md), [conflicts](./14-design-source-conflicts.md) and [open questions](./13-open-questions.md) are updated as things are resolved, with a log at the bottom of each
- Every doc carries a **status** and an **owner**

## Current status

| Item | State |
|---|---|
| Business context | ✅ Documented ([root README](../README.md)) |
| Design handoff | ✅ Received, ⚠️ internally inconsistent ([14](./14-design-source-conflicts.md)) |
| Architecture & doctrine | 🟡 **Proposed — awaiting review** |
| Open questions | 🔴 12 open, 3 blocking ([13](./13-open-questions.md)) |
| Mobile design decisions | 🔴 4 hard breaks need design input ([06](./06-responsive-and-mobile-risks.md)) |
| Code | ⬜ **Not started — by design** |
