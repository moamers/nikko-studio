# Architecture Decision Records

> **Related:** [Docs index](../README.md) · [Engineering Principles](../02-engineering-principles.md)

An ADR captures **one significant decision**: what was decided, what else was considered, why, and what it costs us. They are written when the decision is made and are **never edited afterwards** — if a decision changes, a new ADR supersedes the old one, and the old one is marked `Superseded by ADR-NNNN`.

The point is that a year from now, someone (possibly us) can find out *why* something is the way it is without having to reconstruct the reasoning or, worse, assume there wasn't any.

## When to write one

Write an ADR when a decision:

- is hard or expensive to reverse
- affects more than one part of the system
- rejects an option a reasonable person would have chosen
- will be questioned later ("why aren't we using React?")

Do **not** write one for routine choices with an obvious answer.

## Index

| # | Decision | Status | Principles |
|---|---|---|---|
| [0001](./0001-static-site-generator.md) | Astro as the static site generator | Proposed | [P3](../02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) [P5](../02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) [P7](../02-engineering-principles.md#p7--content-is-data-code-is-presentation) |
| [0002](./0002-content-source-abstraction.md) | Content source abstraction via schema + loader | Proposed | [P7](../02-engineering-principles.md#p7--content-is-data-code-is-presentation) [P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit) |
| [0003](./0003-motion-strategy.md) | CSS-first motion with capability-gated layers | Proposed | [P1](../02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it) [P3](../02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) |
| [0004](./0004-styling-approach.md) | Plain CSS with custom-property tokens, not Tailwind | Proposed | [P11](../02-engineering-principles.md#p11--one-source-of-truth-per-fact) [P12](../02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) |
| [0005](./0005-hosting-and-domain-management.md) | Cloudflare Pages + Cloudflare Registrar | Proposed | [P8](../02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure) [P9](../02-engineering-principles.md#p9--own-the-front-door) [P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit) |

**Status values:** `Proposed` → `Accepted` → `Superseded` / `Deprecated`.

All five are currently **Proposed** — they become `Accepted` when the architecture is signed off.

## Template

```markdown
# ADR-NNNN: <Title>

**Status:** Proposed | Accepted | Superseded by ADR-NNNN
**Date:** YYYY-MM-DD
**Principles:** P<n>, P<n>

## Context
What is the situation? What forces are at play?

## Decision
What we are doing. Stated plainly.

## Alternatives considered
| Option | Pros | Cons | Verdict |

## Consequences
### Good
### Bad / accepted costs
### Neutral

## Reversal
What would it take to undo this?
```
