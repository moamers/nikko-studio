# ADR-0004: Plain CSS with custom-property tokens, not Tailwind

**Status:** Proposed
**Date:** 2026-08-17
**Principles:** [P11](../02-engineering-principles.md#p11--one-source-of-truth-per-fact), [P12](../02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged), [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration), [P14](../02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it)

## Context

The design is specified at high fidelity, with exact values throughout: elliptical radii, `clamp()` type scales, `mask-image` perforations, blend modes, elliptical dot fields, six keyframe families and a live accent system that mutates six surfaces from one state.

Two things constrain the choice:

1. **[P11](../02-engineering-principles.md#p11--one-source-of-truth-per-fact) requires one definition per token.** The accent cycle updates the logo stripe, every button's slot bar, the page ground, the header veil, the language panel and the footer logo simultaneously. If those read from six copies of a value, they will drift.
2. **The accent system requires CSS custom properties on `:root` regardless of what else we choose.** There is no way to do a live, transitioning, page-wide colour system without them.

That second point does most of the work in this decision.

## Decision

**Plain CSS, organised with native cascade layers, driven by custom-property tokens, scoped per component via Astro's `<style>` blocks.**

```css
@layer reset, tokens, base, layout, components, utilities, overrides;
```

```css
/* tokens.css — the only file where a raw value may appear */
:root {
  /* Colour — static */
  --nk-ink:          #111110;
  --nk-paper:        #F2ECDF;
  --nk-ink-muted:    #4A463C;
  --nk-paper-muted:  #B5AC98;   /* ON INK ONLY — fails contrast on paper */
  --nk-coral:        #EE5439;
  --nk-cobalt:       #2B45F0;
  --nk-turquoise:    #00B2A9;

  /* Colour — live, set by accent.ts */
  --nk-accent:       #FFD400;
  --nk-ground:       #F7EED0;
  --nk-veil:         rgba(247,238,208,.74);
  --nk-accent-on:    var(--nk-ink);

  /* Motion */
  --nk-dur-step:     120ms;
  --nk-dur-hover:    200ms;
  --nk-dur-card:     220ms;
  --nk-dur-accent:   2600ms;
  --nk-dur-ground:   3400ms;
  --nk-ease-accent:  cubic-bezier(.4,0,.2,1);
  --nk-ease-snap:    cubic-bezier(.3,1.3,.5,1);

  /* Shape — the R2 rule: 0 or 50%, never a plain rounded corner */
  --nk-arch:         50% 50% 8px 8px / 24% 24% 8px 8px;
  --nk-oval:         50%;
  --nk-lid:          34px 34px 8px 8px;
}
```

Enforced by Stylelint: **no hex value may appear outside `tokens.css`.**

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Plain CSS + custom-property tokens** ✅ | Zero runtime; maps 1:1 to the design spec; native custom properties are already required for the accent system; scoped styles prevent leakage | Requires naming discipline; no utility-class velocity | **Chosen** |
| **Tailwind CSS** | Fast on conventional layouts; constrained scale; large talent pool; good tree-shaking | Nearly every value here is bespoke, so it degrades into arbitrary values: `rounded-[50%_50%_8px_8px/26%_26%_8px_8px]` — less readable, less searchable, harder to change than the CSS it replaces. And a Tailwind config would be a *second* token system alongside the custom properties the accent system already needs — a direct [P11](../02-engineering-principles.md#p11--one-source-of-truth-per-fact) violation | Rejected |
| CSS Modules | Scoped; plain CSS | Astro's scoped `<style>` already does this, with less ceremony | Rejected — redundant |
| Sass/SCSS | Nesting, mixins, functions | Native CSS now has nesting and custom properties; a preprocessor step for diminishing returns | Rejected |
| CSS-in-JS (styled-components, Emotion) | Colocation, dynamic styles | Runtime cost, needs a UI framework, defeats [ADR-0001](./0001-static-site-generator.md) | Rejected |
| Open Props / a token library | Ready-made scales | The design has its own complete scale; a generic one would be dead weight | Rejected |

## The Tailwind question, addressed directly

Tailwind is a good default and the rejection deserves a proper answer rather than a preference.

**Tailwind's value proposition is speed on conventional layouts using a constrained scale.** This design inverts both halves: the layouts are bespoke, and the scale is the design's own and specified to the unit. Under those conditions Tailwind's benefits shrink and its costs grow.

Compare, for the design's signature shape:

```html
<!-- Tailwind -->
<div class="rounded-[50%_50%_8px_8px/26%_26%_8px_8px] overflow-hidden border-2 border-[#111110]">

<!-- Ours -->
<div class="arch-frame">
```
```css
.arch-frame { border-radius: var(--nk-arch); overflow: hidden; border: 2px solid var(--nk-ink); }
```

The second is more readable, greppable, changeable in one place, and self-documenting. Repeat that comparison for `mask-image` perforations, `animation-timeline` ranges, the six keyframe families and the `clamp()` scales, and the case is consistent.

**What we keep from Tailwind's philosophy:** a constrained scale, no magic numbers, no ad-hoc values. We get it from the token layer plus a Stylelint rule — which is arguably stricter, since Tailwind's arbitrary-value syntax provides an escape hatch that gets used.

**The one real cost** is that a future contractor is more likely to know Tailwind than our conventions. Mitigated by: the conventions being ordinary CSS with cascade layers (a standard, documented pattern), a single well-commented token file, and this ADR.

## Consequences

### Good

- **The design spec maps directly to the code.** A value in the handoff becomes a token with the same name. Fidelity checking is reading two columns.
- **The accent system is trivial.** One `setProperty`, six surfaces update, transitions handled by CSS ([ADR-0003](./0003-motion-strategy.md)).
- **Zero styling runtime**, and only the CSS that is used ships.
- **`@layer` eliminates specificity fights** — no `!important` outside the reduced-motion backstop.
- **Design tokens are inspectable in DevTools**, live, including the accent as it cycles. Genuinely useful when reviewing fidelity.
- **`color-mix()` lets CSS do the accent lerp** the prototype does in JavaScript ([07](../07-browser-support.md#a-note-on-property-and-color-mix)).

### Bad / accepted costs

- **Naming discipline is required.** Without it, plain CSS rots. Mitigated by layers, scoped styles and the Stylelint rule.
- **Slower for conventional layout work** than utility classes — a real cost on the ~20% of this design that is conventional.
- **Less familiar to a Tailwind-first contractor.** Addressed above.
- **No automatic dead-CSS detection.** Astro scopes styles per component, which bounds the problem; a periodic coverage check can catch the rest.

### Neutral

- The token file becomes the design system's canonical form and should be reviewed against the handoff whenever the design changes.

## Reversal

**Cost: high, and deliberately so.** Converting to Tailwind would mean touching every component. This is a decision to make once, at the start.

That said, the two are not mutually exclusive: Tailwind could be added later for *new* conventional sections while bespoke sections keep hand-written CSS. Not recommended — mixed idioms are their own tax — but it means the decision is not a trap.
