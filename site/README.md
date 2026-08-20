# site/ — the Nikko Studio website

Astro 5, static output, TypeScript strict, plain CSS driven by custom-property
tokens, zero UI-framework runtime. The reasoning is in
[`docs/03-tech-stack.md`](../docs/03-tech-stack.md); the guardrails are in
[`docs/02-engineering-principles.md`](../docs/02-engineering-principles.md).

## Running it

```bash
cd site
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check (`astro check`) then build to `dist/` |
| `npm run build:fast` | Build without the type-check |
| `npm run preview` | Serve `dist/` — this is what the tests run against |
| `npm run test:e2e` | Playwright. Needs `npx playwright install chromium` once |

`npm run build` produces a plain static `dist/` directory. Cloudflare Pages
serves it directly; no adapter is involved.

## Where things live

```
src/
├── content.config.ts   Zod schemas + loaders  ← THE SWAP POINT (files → CMS)
├── content/            ← THE FOUNDER EDITS HERE. See src/content/README.md
├── lib/content/        the typed façade templates import from
├── styles/
│   ├── global.css      the one stylesheet Base.astro imports
│   ├── reset.css       + the cascade-layer order declaration
│   ├── tokens.css      ← EVERY design token, defined once
│   ├── base.css        element defaults, all expressed in tokens
│   ├── fonts.css       self-hosted @fontsource faces
│   └── opening-sequence.css   §0 — client-supplied, verbatim, own palette
├── components/         Logo, SiteHeader, OpeningSequence
├── sections/           the ten homepage sections (built separately)
├── scripts/            vanilla-TS islands
├── layouts/Base.astro  html/head/body, meta, the page shell
├── pages/index.astro   the homepage
└── assets/images/      source images; astro:assets optimises at build
```

## Three rules that are easy to break by accident

**1. No hex colour outside `src/styles/tokens.css`.** Every colour, radius,
duration and easing has a `--nk-*` name. Three documented exceptions are listed
at the top of that file. If you need a value that does not exist yet, add it to
`tokens.css` with a source reference — do not inline it. [P11]

**2. The opening sequence is verbatim and is not tokenised.** `§0` arrived from
the client as its own scoped stylesheet with its own `--nkhero-*` palette and
its own typeface. The seam between it and the site is intentional. Do not fold
it into the token system. Do not retime the beats. Read the header comment in
`src/styles/opening-sequence.css` before touching it.

**3. Content starts visible; motion is added, never removed.** Nothing may
begin at `opacity: 0` in the stylesheet and wait for JavaScript. The site
chrome is visible by default and the opening sequence *hides* it while it owns
the screen — the inverse of what the design source shipped, because a JS
failure must never leave the page without navigation. `tests/e2e` enforces
this. [P1, P3]

## Templates never import `astro:content`

They import from `src/lib/content`. That single indirection is what makes
moving to a CMS a change to `content.config.ts` and `src/lib/content/`, with no
template edits at all. [P7, ADR-0002]

```astro
---
import { getHero, resolveImage } from '../lib/content';
const hero = await getHero();
const collage = await resolveImage(hero.collage.image);
---
```
