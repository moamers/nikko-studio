/**
 * THE SWAP POINT.
 *
 * This is the only file that changes when the content *source* changes.
 * Today the loaders read YAML from `src/content/`. Tomorrow they can read a
 * CMS API. The schemas below — and every template — stay exactly as they are.
 * (docs/04-content-architecture.md, ADR-0002, P7)
 *
 * Two rules keep that promise honest:
 *   1. Templates never import `astro:content` directly. They import the typed
 *      façade in `src/lib/content/`.
 *   2. No field exists here because a particular CMS happens to produce it.
 *
 * STATUS: foundations only. `hero` and `settings` are worked examples that
 * prove the pipeline end to end. The remaining homepage sections — marquee,
 * attention, language, founder, services, sampler, testimonials, joyride,
 * pitch — get their schemas added here by the agents that build them. The
 * entity list and field inventory are in docs/04-content-architecture.md
 * § "Content entities".
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** A link that is rendered as a button or pill. */
const ctaSchema = z.object({
  label: z.string().min(1).max(40),
  href: z.string().min(1),
});

/** An image referenced by filename from `src/assets/images/`. */
const imageSchema = z.object({
  /** Filename only, e.g. "collage-hero.png". Resolved by the content API. */
  image: z.string().min(1),
  /** Empty string means decorative — hidden from assistive technology. [P5] */
  alt: z.string(),
});

const navItemSchema = z.object({
  label: z.string().min(1).max(30),
  href: z.string().min(1),
});

/** §1 — site-wide settings and the header/footer navigation. */
const settingsSchema = z.object({
  title: z.string().min(1).max(70),
  tagline: z.string().min(1).max(120),
  description: z.string().min(1).max(160),
  locale: z.string().default('en-GB'),
  nav: z.array(navItemSchema).min(1).max(6),
  cta: ctaSchema,
  logo: z.object({
    /** The word beside the mark. The mark itself is CSS, never an image. */
    wordmark: z.string().min(1).max(12),
    /** Accessible name for the whole lockup link. */
    homeLabel: z.string().min(1).max(60),
    /** Anchor target — the top of the opening sequence, not the hero. */
    homeHref: z.string().min(1).default('#top'),
  }),
});

/** §2 — the hero. The worked example for every other section file. */
const heroSchema = z.object({
  ticket: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        /** Exactly one cell is filled with the live accent colour. */
        highlight: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(3),
  heading: z.string().min(1).max(200),
  lead: z.string().min(1).max(400),
  subLead: z.string().max(400).optional(),
  cta: ctaSchema,
  collage: imageSchema,
});

export const collections = {
  settings: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/settings' }),
    schema: settingsSchema,
  }),
  // One collection per homepage section, all reading from the same
  // founder-facing directory, so each section keeps its own schema while
  // `src/content/homepage/` stays a flat, obvious list of files to edit.
  hero: defineCollection({
    loader: glob({ pattern: 'hero.yaml', base: './src/content/homepage' }),
    schema: heroSchema,
  }),
};
