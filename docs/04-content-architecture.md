# 04 — Content Architecture

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation) · [ADR-0002](./adr/0002-content-source-abstraction.md)

This document answers constraint **C7**:

> *"it should be designed in a way where me/founder can change content easily and cheaply i.e. without requiring a full build (text, images) … the system should be built in a way that could read that content from static files (b) or some CMS (a) in case in the future we wanted to swap options."*

## The shape of the answer

Three things are kept strictly separate, and only the middle one is ever hard to change:

```
   CONTENT SOURCE              CONTENT CONTRACT            PRESENTATION
   (swappable, cheap)          (stable, deliberate)        (engineering)

   YAML / Markdown files  ──→  Zod schema  ──→  Content API  ──→  .astro templates
   or a CMS's API         ──↗   = the types
```

The **contract** — the schema — is the architecture. As long as a source can produce objects matching the schema, the templates neither know nor care where the content came from. Moving from files to a CMS means writing a new loader and pointing the collection at it. **No template changes. No schema changes. Typically a day of work, not a rebuild.**

That is the whole design. Everything below is detail.

---

## Phase 1: files (start here)

### Format: YAML for structure, Markdown for prose

Chosen over JSON deliberately. For a non-technical editor, JSON is a minefield — one missing comma or stray quote breaks the build, and the error points at a line number rather than a mistake.

```yaml
# src/content/homepage/hero.yaml
# ─────────────────────────────────────────────────────────────
#  THE HERO — the first thing anyone sees.
#  Edit the text between the quotes. Keep the labels on the left.
# ─────────────────────────────────────────────────────────────

ticket:
  - label: "London"
  - label: "UAE"
  - label: "Creative design studio"
    highlight: true          # this one is filled with the live accent colour

heading: >
  Like family albums, plastic straws on the ocean floor, and a Nokia 3310
  thrown from a fast-moving car, stories endure.

lead: >
  Nikko is a story studio. We market for memorability, so when it's time to
  buy, book, recommend or return, you're the only one on their mind.

subLead: >
  For outliers, category-of-one creatives and the ones building brands that
  make necks crack as people swivel back for one more look before the light
  turns green.

cta:
  label: "Pitch your project"
  href: "/pitch"

collage:
  image: "collage-hero.png"
  alt: ""                    # empty = decorative, hidden from screen readers
```

YAML earns its place here: **comments** (so the file can explain itself), **multi-line strings** without escaping (`>` folds, `|` preserves line breaks), no brackets or commas to balance, and apostrophes that just work.

Long-form prose — Privacy Policy, Terms, future case studies — is **Markdown**, where an editor can write naturally with headings, links and emphasis.

### Every file is validated at build time

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const ctaSchema = z.object({
  label: z.string().min(1).max(40),
  href:  z.string().min(1),
});

const heroSchema = z.object({
  ticket:  z.array(z.object({
    label:     z.string().max(30),
    highlight: z.boolean().default(false),
  })).min(1).max(3),
  heading: z.string().min(1).max(200),
  lead:    z.string().min(1).max(400),
  subLead: z.string().max(400).optional(),
  cta:     ctaSchema,
  collage: z.object({
    image: z.string(),
    alt:   z.string(),
  }),
});

export const collections = {
  homepage: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/homepage' }),
    schema: heroSchema,       // ← per-file schemas in practice; simplified here
  }),
};
```

This does real work for a non-technical editor. A typo in a field name, a missing required field, a heading over the length the layout can take — all of it fails the build **with the file and field named**, before anything reaches production. And Cloudflare Pages keeps the last good deploy live when a build fails, so **a bad edit cannot take the site down.** That safety net is what makes direct file editing viable.

The schema also generates TypeScript types, so a template referencing `hero.subhead` when the field is `subLead` fails to compile.

### Content entities

Drawn from the homepage design source and the direction document. Phase-1 entities are what the homepage needs; the rest are modelled now so the structure does not need reworking later.

| Entity | Source | Fields | Phase |
|---|---|---|---|
| **Site settings** | Both | title, tagline, description, OG image, social links, legal name, contact email, copyright year | 1 |
| **Navigation** | Homepage §1 | label, href, order — header and footer | 1 |
| **Homepage sections** | Homepage §2–10 | one file per section: hero, marquee, attention, language, founder, services intro, sampler, testimonial, joyride, pitch | 1 |
| **Services** | Homepage §7 | n, title, stamp, lead, body, body2, kicker, price, priceNote, cta, serial, figure, image, alt, accentColour | 1 |
| **Work fragments** | Homepage §8 | tag, text — the eight sampler lines | 1 |
| **Testimonials** | Homepage §8 | pullQuote, body[], authorName, authorRole | 1 |
| **Language steps** | Homepage §5 | step, headline, image, alt, pattern — the three shutter tiles | 1 |
| **Scrap sets** | Homepage §4 | word, images[3] — the hover deals | 1 |
| **Counters** | Homepage §4, §5 | key, target, suffix, label | 1 |
| **Word swap** | Homepage §9 | latin, arabic, colour, hint, note — two states | 1 |
| **Motion config** | Homepage | accentCycle, cycleSeconds, tintDepth, accent states | 1 |
| **Legal pages** | Gap | Markdown body, title, slug, updated | 1 |
| **Drops** (Show&Tell editions) | Direction | number, title, oneLiner, date, status (`live`/`gone`/`sold-out`), seats, price, serial, bookingUrl | 2 |
| **Case studies** | Direction | case number, market, headline, body, figures[], outcome, serial | 2–3 |
| **Figures** | Direction | image, alt, caption ("Fig. 04a"), serial — the universal image treatment | 2 |
| **Journal / newsletter archive** | Business model | title, date, excerpt, body, slug | 3 |

Note the direction document's stated ambition for founder tooling: *"Founder tooling is four fields: upload, caption, back-note, tone."* That is a good north star for how simple editing should feel, and it argues for the phase-2 CMS UI.

### How the founder edits, day one

**No CMS, no install, no cost:**

1. Open the file on github.com — e.g. `site/src/content/homepage/hero.yaml`
2. Click the pencil icon
3. Change the words
4. "Commit changes"
5. Cloudflare Pages builds and deploys automatically — **live in about 90 seconds**

Images: drag a new file into `site/src/assets/images/` on GitHub and update the filename in the YAML. Optimisation happens at build.

This works from a phone browser. It costs nothing. It has full version history and one-click revert. For a founder changing a headline or a price a few times a month, it may honestly be enough — and if it is, we have spent nothing to find out.

**A note on "without requiring a full build":** every text change does trigger a rebuild, but the rebuild is automatic and takes ~1–2 minutes, and the founder never touches a build tool. The thing being avoided — *needing an engineer* — is fully avoided. A truly build-free path (content fetched at runtime) would cost us the static HTML that [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration), [P5](./02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) and [P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability) all depend on. If sub-second publishing ever becomes a real requirement, Astro's on-demand rendering can be enabled for specific routes only — but it should not be paid for speculatively.

---

## Phase 2: a Git-based CMS (recommended next step)

When editing YAML directly gets tiresome — most likely once Show&Tell drops need regular updating — add a **Git-based CMS**. These give a proper admin UI at `/admin` that commits to the same files. No database, no hosting cost, no lock-in, no new source of truth.

**Recommendation: [Sveltia CMS](https://github.com/sveltia/sveltia-cms).** A modern, actively maintained, drop-in-compatible successor to Decap/Netlify CMS. It is a single file added to the site, plus a config listing the fields — which we generate from the Zod schemas we already have.

What it gives Nadia:
- Log in with GitHub
- Rich text editing with live preview
- **Drag-and-drop image upload** with a media library — solving the awkward part of file editing
- Field validation matching the schemas
- Every save is still a Git commit, still versioned, still revertible

| Option | Cost | Notes |
|---|---|---|
| **Sveltia CMS** ✅ | £0 | Recommended. Actively maintained, fast, good media handling |
| Decap CMS | £0 | The older standard; maintenance has been slower |
| TinaCMS | £0–, paid tiers | Nice visual editing; heavier and more opinionated |

Because the content stays in the same files, **this is additive and reversible** — remove it and direct file editing still works.

## Phase 3: a hosted CMS (only if a real trigger appears)

Move to a hosted CMS only when one of these is actually true:

- Multiple non-technical people edit concurrently
- Content needs scheduled publishing or draft workflows
- The content set grows past ~50 entries and needs real relational structure
- The founder wants a genuinely app-like editor with mobile publishing

| Option | Free tier | Fit |
|---|---|---|
| **Sanity** | Generous | Best fit. Portable content lake, strong Astro loader, real structured content |
| **Storyblok** | Yes | Excellent visual editing; heavier |
| **Payload** | Self-host free | Full control, but reintroduces a database and an ops burden ([P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure)) |
| **Contentful** | Limited | Mature but pricing escalates sharply |

**Migration cost when the time comes:** export files → import to CMS → write a loader → change one line per collection. The [schemas](#every-file-is-validated-at-build-time) and every template are untouched. Estimated **1–2 days**, and reversible.

---

## The swap point, precisely

This is the only file that changes when the content source changes:

```ts
// src/content.config.ts

// ── Phase 1 & 2: files in the repo ──────────────────────────
export const collections = {
  services: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/services' }),
    schema: serviceSchema,
  }),
};

// ── Phase 3: hosted CMS ─────────────────────────────────────
// export const collections = {
//   services: defineCollection({
//     loader: sanityLoader({ query: '*[_type == "service"]' }),
//     schema: serviceSchema,          // ← identical
//   }),
// };
```

To keep that promise honest, two rules are enforced:

1. **Templates never import from `astro:content` directly.** They import from `src/lib/content/`, a thin typed façade. If a source needs a field remapped, it happens there, in one place.
2. **The schema is source-agnostic.** No field exists because a particular CMS produces it.

---

## Images

| | Founder-facing | Build-time |
|---|---|---|
| Where | `site/src/assets/images/` | — |
| How referenced | filename string in YAML | resolved and validated |
| Format in | PNG, JPG, WebP | — |
| Format out | — | AVIF + WebP + fallback |
| Sizing | — | responsive `srcset`, `width`/`height` emitted |
| Loading | — | `loading="lazy"` except LCP; `fetchpriority="high"` on the hero |

Rules for the founder, documented in a `site/src/content/README.md` next to the files:
- Upload the **largest version you have** — never pre-shrink. The build makes small versions; it cannot invent detail.
- Always fill in `alt`. If the image is purely decorative, leave it as `""`.
- Filenames: lowercase, hyphens, descriptive. `nadia-portrait.png`, not `IMG_4821.PNG`.

**Outstanding:** `homepage-1-handoff/assets/chips-pattern.png` is a **2-byte file** — corrupt or a stub — and is referenced twice in the design source. It needs replacing before those two hover-scrap sets are complete. All ten assets are described in the handoff as *"placeholders/working images from the studio's archive — expect final art to be swapped in."* See [Q7](./13-open-questions.md).

---

## What is deliberately *not* content

Kept in code, because exposing it would create more risk than value:

- Design tokens (colours, type scale, radii, motion timings) — these are [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact) tokens; editing them by hand would break the system
- Layout, section order, component structure
- Animation keyframes and easings
- Structured-data templates

The exceptions are the three motion knobs the prototype already exposes as props — `accentCycle`, `cycleSeconds` (4–24 s), `tintDepth` (0–1.6) — which are genuinely a taste decision and belong in a settings file.

---

**Next:** [05 — Motion & Interaction](./05-motion-and-interaction.md)
