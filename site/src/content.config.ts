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
 * One collection per homepage section, all reading from the same
 * founder-facing directory, so each section keeps its own schema while
 * `src/content/homepage/` stays a flat, obvious list of files to edit.
 *
 * A schema is a promise to the founder as much as to the compiler: the
 * `.max()` on a heading is the width the layout can actually take, so an
 * over-long edit fails the build with the file and the field named instead of
 * quietly breaking a page.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* ── Shared shapes ───────────────────────────────────────────────────────── */

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

/** An image that carries a caption, so its `alt` must be a real description. */
const figureSchema = imageSchema.extend({
  alt: z.string().min(1),
  caption: z.string().min(1).max(80),
});

/**
 * A number that counts up when it scrolls into view.
 *
 * The VALUE is the content; the animation is not. It ships in the HTML and is
 * what a reader sees with no JavaScript, under reduced motion, or in a
 * language model's view of the page. [P6]
 */
const counterSchema = z.object({
  /** Stable key for the counter script, e.g. "phone". */
  key: z.string().min(1).max(20),
  value: z.number().int().positive(),
  /** Rendered straight after the number, e.g. "+". */
  suffix: z.string().max(4).default(''),
});

const navItemSchema = z.object({
  label: z.string().min(1).max(30),
  href: z.string().min(1),
});

/* ── §1 — site-wide settings, navigation and header chrome ───────────────── */

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
  /** Microcopy for the header's own controls. */
  header: z.object({
    /** Skips the opening sequence and the header for keyboard readers. [P10] */
    skipLink: z.string().min(1).max(40),
    /** Accessible name for the header's navigation landmark. */
    navLabel: z.string().min(1).max(30),
    menuOpen: z.string().min(1).max(20),
    menuClose: z.string().min(1).max(20),
    /** Accessible name for the mobile menu dialogue. */
    menuLabel: z.string().min(1).max(40),
  }),
  /**
   * The mode dial's four labels and four note fragments. `mode.ts` reads them
   * off the button as `data-*` attributes and joins a note from one prefix
   * plus one suffix, exactly as the source does.
   */
  modeDial: z.object({
    analogue: z.string().min(1).max(20),
    digital: z.string().min(1).max(20),
    auto: z.string().min(1).max(10),
    noteAnalogue: z.string().min(1).max(60),
    noteDigital: z.string().min(1).max(60),
    noteAuto: z.string().min(1).max(80),
    notePinned: z.string().min(1).max(80),
  }),
  /** The footer's three link columns. An item with no `href` is plain text. */
  footerColumns: z
    .array(
      z.object({
        title: z.string().min(1).max(20),
        items: z
          .array(
            z.object({
              label: z.string().min(1).max(40),
              href: z.string().optional(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(4),
});

/* ── §2 — hero ───────────────────────────────────────────────────────────── */

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

/* ── §3 — marquee ────────────────────────────────────────────────────────── */

const marqueeSchema = z.object({
  /**
   * Rendered twice, side by side, and slid by -50% — that is what makes the
   * loop seamless. Keep the trailing separator so the join is invisible.
   */
  text: z.string().min(1).max(240),
});

/* ── §4 — attention (#work) ──────────────────────────────────────────────── */

const attentionSchema = z.object({
  heading: z.object({
    /**
     * `{1}` … `{4}` are replaced by the four hover words below, in order.
     * `\n` is a deliberate line break in the display setting.
     */
    template: z.string().min(1).max(160),
    words: z
      .array(
        z.object({
          label: z.string().min(1).max(30),
          /** Three image filenames dealt out when the word is hovered. */
          scraps: z.array(z.string().min(1)).length(3),
        }),
      )
      .length(4),
  }),
  lead: z.string().min(1).max(400),
  counter: counterSchema,
  counterLabel: z.string().min(1).max(60),
  body: z.string().min(1).max(400),
  figure: figureSchema,
  pullQuote: z.string().min(1).max(200),
  subheading: z.string().min(1).max(300),
  closing: z.string().min(1).max(300),
  /** Phrases inside `closing` that carry the yellow highlight. */
  highlights: z.array(z.string().min(1)).max(4).default([]),
});

/* ── §5 — language (turquoise) ───────────────────────────────────────────── */

const languageSchema = z.object({
  heading: z.string().min(1).max(120),
  editorial: z.string().min(1).max(60),
  /** Always rendered `dir="rtl" lang="ar"` in Noto Kufi. Never the Latin face. */
  arabic: z.string().min(1).max(60),
  panel: z.object({
    before: z.string().min(1).max(200),
    counter: counterSchema,
    after: z.string().min(1).max(300),
  }),
  steps: z
    .array(
      imageSchema.extend({
        alt: z.string().min(1),
        label: z.string().min(1).max(12),
        headline: z.string().min(1).max(90),
        /** Ink pattern behind the shutter copy. */
        pattern: z.enum(['dots', 'crosshatch', 'hatch']),
      }),
    )
    .length(3),
});

/* ── §6 — founder ────────────────────────────────────────────────────────── */

const founderSchema = z.object({
  eyebrow: z.string().min(1).max(40),
  heading: z.string().min(1).max(200),
  body: z.array(z.string().min(1).max(400)).min(1).max(3),
  cta: ctaSchema,
  portrait: figureSchema,
});

/* ── §7 — services (#services) ───────────────────────────────────────────── */

const servicesSchema = z.object({
  heading: z.string().min(1).max(40),
  kicker: z.string().min(1).max(40),
  investmentLabel: z.string().min(1).max(30),
  items: z
    .array(
      z.object({
        /** The giant numeral: "01", "02". */
        n: z.string().min(1).max(4),
        /** Which of the two card colours the numeral and stamp take. */
        colour: z.enum(['coral', 'cobalt']),
        title: z.string().min(1).max(60),
        stamp: z.string().min(1).max(30),
        lead: z.string().min(1).max(300),
        body: z.string().min(1).max(500),
        body2: z.string().min(1).max(500),
        kicker: z.string().min(1).max(60),
        price: z.string().min(1).max(30),
        priceNote: z.string().min(1).max(200),
        cta: ctaSchema,
        /** Archive serial, e.g. "SER. NKO—01—STL". */
        serial: z.string().min(1).max(30),
        figure: figureSchema,
      }),
    )
    .length(2),
});

/* ── §8 — work sampler + testimonial ─────────────────────────────────────── */

const samplerSchema = z.object({
  heading: z.string().min(1).max(80),
  /** `{n}` is replaced by the current fragment's two-digit number. */
  status: z.string().min(1).max(80),
  pullLabel: z.string().min(1).max(30),
  /**
   * ALL EIGHT SHIP IN THE HTML — one visible, seven inert. Rendering one at a
   * time from a JavaScript array would hide seven pieces of proof from
   * crawlers and language models. [P6]
   */
  fragments: z
    .array(
      z.object({
        tag: z.string().min(1).max(30),
        text: z.string().min(1).max(160),
      }),
    )
    .length(8),
  note: z.string().min(1).max(200),
  figure: figureSchema,
  testimonial: z.object({
    eyebrow: z.string().min(1).max(80),
    pullQuote: z.string().min(1).max(200),
    body: z.array(z.string().min(1).max(600)).min(1).max(3),
    authorName: z.string().min(1).max(40),
    authorRole: z.string().min(1).max(60),
  }),
});

/* ── §9 — joyride / word swap ────────────────────────────────────────────── */

const joyrideSchema = z.object({
  heading: z.object({
    /** `{1}` … `{3}` are replaced by the emphasised phrases below, in order. */
    template: z.string().min(1).max(300),
    emphasis: z
      .array(
        z.object({
          text: z.string().min(1).max(40),
          /** The last one is set in coral. */
          accent: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(4),
  }),
  lead: z.string().min(1).max(80),
  body: z.array(z.string().min(1).max(500)).min(1).max(3),
  swap: z.object({
    intro: z.string().min(1).max(80),
    /** Accessible name for the swap control — it is a button, not decoration. */
    ariaLabel: z.string().min(1).max(40),
    /** BOTH STATES SHIP IN THE HTML, for the same reason as the sampler. [P6] */
    states: z
      .array(
        z.object({
          latin: z.string().min(1).max(20),
          /** Empty for the state that has no Arabic setting. */
          arabic: z.string().max(20),
          colour: z.enum(['coral', 'cobalt']),
          hint: z.string().min(1).max(40),
          note: z.string().min(1).max(300),
        }),
      )
      .length(2),
  }),
  link: ctaSchema,
});

/* ── §10 — pitch / footer (#pitch) ───────────────────────────────────────── */

const pitchSchema = z.object({
  heading: z.string().min(1).max(120),
  body: z.array(z.string().min(1).max(500)).min(1).max(3),
  newsletter: z.object({
    fields: z
      .array(
        z.object({
          /** Becomes the input's `name`, and with a prefix its `id`. */
          name: z.string().min(1).max(20),
          label: z.string().min(1).max(40),
          placeholder: z.string().max(40).default(''),
          type: z.enum(['text', 'email']),
          required: z.boolean().default(true),
        }),
      )
      .min(1)
      .max(4),
    submit: z.string().min(1).max(30),
    consent: z.string().min(1).max(300),
  }),
  /** The paragraph beside the inverted footer logo. */
  positioning: z.string().min(1).max(500),
  legal: z.object({
    teaser: z.string().min(1).max(300),
    copyright: z.string().min(1).max(60),
  }),
});

/* ── Collections ─────────────────────────────────────────────────────────── */

/** Every homepage section is one YAML file in the same founder-facing folder. */
const homepageFile = (filename: string) =>
  glob({ pattern: filename, base: './src/content/homepage' });

export const collections = {
  settings: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/settings' }),
    schema: settingsSchema,
  }),
  hero: defineCollection({ loader: homepageFile('hero.yaml'), schema: heroSchema }),
  marquee: defineCollection({ loader: homepageFile('marquee.yaml'), schema: marqueeSchema }),
  attention: defineCollection({ loader: homepageFile('attention.yaml'), schema: attentionSchema }),
  language: defineCollection({ loader: homepageFile('language.yaml'), schema: languageSchema }),
  founder: defineCollection({ loader: homepageFile('founder.yaml'), schema: founderSchema }),
  services: defineCollection({ loader: homepageFile('services.yaml'), schema: servicesSchema }),
  sampler: defineCollection({ loader: homepageFile('sampler.yaml'), schema: samplerSchema }),
  joyride: defineCollection({ loader: homepageFile('joyride.yaml'), schema: joyrideSchema }),
  pitch: defineCollection({ loader: homepageFile('pitch.yaml'), schema: pitchSchema }),
};
