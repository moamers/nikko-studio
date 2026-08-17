# 09 — Technical SEO & LLM Discoverability

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P5](./02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) · [P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability)

Answers constraints **C5** and **C6**. These are treated as one problem because they have one solution: **complete, semantic, factual HTML delivered without JavaScript.** Everything else is refinement.

---

## Part 1 — Technical SEO

### What the static architecture gives us for free

Because the site is statically generated ([P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order)), a crawler receives the finished document on first request. No render queue, no hydration wait, no JS-dependent content. That single decision eliminates the majority of technical SEO problems that marketing sites have.

### The checklist

| Item | Implementation |
|---|---|
| **Semantic HTML** | One `<h1>` per page, unbroken heading order, real `<nav>`/`<main>`/`<section>`/`<article>`/`<blockquote>`/`<figure>` |
| **`<title>`** | Per page, from content, ≤ 60 chars. Homepage: *"Nikko Studio \| Story-led Marketing for Memorability"* (from the design source) |
| **Meta description** | Per page, from content, 140–160 chars |
| **Canonical** | Absolute, self-referencing, on every page |
| **`robots.txt`** | Generated; explicit AI-crawler policy — see [Part 2](#part-2--llm-discoverability) |
| **`sitemap.xml`** | Auto-generated at build (`@astrojs/sitemap`), with `lastmod` |
| **Open Graph** | `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:type`, `og:locale` |
| **Twitter Card** | `summary_large_image` |
| **Structured data** | JSON-LD — see [below](#structured-data) |
| **`alt` text** | Content images described; decorative `alt=""` + `aria-hidden` |
| **`lang`** | `<html lang="en-GB">`; Arabic passages `lang="ar" dir="rtl"` |
| **Favicons** | Full set + `site.webmanifest`. Note the direction doc's 20 px legibility constraint on the mark |
| **404** | Real styled page, `noindex`, useful links |
| **Redirects** | `_redirects` file, 301s, no chains |
| **HTTPS** | Enforced, HSTS, single canonical host (www **or** apex, redirect the other) |
| **Trailing slash** | One convention, enforced at the edge |
| **Core Web Vitals** | [Budgeted](./08-performance.md) — a confirmed ranking input |

### Structured data

JSON-LD, generated from the same content files that render the page — so the markup cannot drift from what a visitor sees. That property matters: mismatched structured data is a penalty risk, and hand-maintained JSON-LD always drifts eventually.

**Phase 1 (homepage):**

- **`Organization`** — legal name, `alternateName` ("Nikko"), URL, logo, `foundingDate`, `founder` → `Person`, `areaServed` (GB, AE), `sameAs` (Threads, Substack)
- **`ProfessionalService`** — the studio as a bookable service, with `priceRange`
- **`Person`** — Nadia Amer, `jobTitle` "Founder & Creative Director", `worksFor`
- **`WebSite`** — name, URL, publisher
- **`Service` × 2** — Show&Tell and Dream&Do, each with an `Offer` carrying the real price (`£35`, `£5,000`) and `priceCurrency: GBP`
- **`Review`** — the Maddi Cook testimonial, correctly attributed

**Later phases:** `Event` for each Show&Tell drop (with `eventAttendanceMode`, `startDate`, `offers`, and `eventStatus` for sold-out/past — a very strong fit for the drop model, and eligible for rich results); `BreadcrumbList` once there is a hierarchy; `FAQPage` if an FAQ appears; `Article` for journal posts.

Validated in CI against Schema.org and Google's Rich Results Test.

### The information architecture problem

The handoff specifies **one URL** with anchor navigation. That is right for a launch — the page is a single argument and should be read in order — but it is a real ceiling:

- One URL can rank for **one primary intent**. "Story-led marketing agency London", "brand messaging workshop", "copywriting workshop UK" and "brand positioning consultant" are four intents competing for one page.
- Anchors (`#services`) are not separate results. Google may show them as jump links, but they do not rank independently.
- There is nowhere for a case study, a workshop listing or a journal post to live — and those are the pages that earn links.

**Recommended route plan**, introduced as content exists to fill it (never before — a thin page is worse than no page):

| Route | Phase | Primary intent |
|---|---|---|
| `/` | 1 | Brand, "Nikko Studio", the argument |
| `/privacy`, `/terms` | 1 | Compliance ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)) |
| `/pitch` | 1–2 | **Enquiry — the missing conversion surface** ([Q2](./13-open-questions.md)) |
| `/show-and-tell` | 2 | Workshops, talks, drops |
| `/dream-and-do` | 2 | Project work, positioning, messaging |
| `/work` | 2–3 | Case studies index |
| `/work/[slug]` | 3 | Individual cases — the strongest link-earning asset |
| `/founder` | 3 | "Nadia Amer" — a real navigational term with eight years of history behind it |
| `/journal/[slug]` | 3 | Newsletter archive; compounding long-tail |

The homepage keeps its anchors. New routes are additive, and each existing anchor section becomes the summary that links to its deeper page.

### Migration: this is a replatform, not a launch

`nikkostudio.co` is **live today on Squarespace**, and the new build replaces it on the same domain. That is a lower-risk migration than a domain change — but it is not a no-risk one.

What the live site actually has:

| | |
|---|---|
| URLs | **4** — `/home`, `/privacy-policy`, `/terms-and-conditions`, `/contact` |
| Canonical | `www`, with apex 301ing to it |
| Redirects needed | **One** — `/home` → `/`. Keep the other three slugs exactly |

Keeping the existing slugs is the whole SEO strategy here: no redirect chains, no lost equity, nothing to reindex except the homepage's content. Do **not** rename `/contact` to `/pitch` — the CTA copy can say "Pitch your project" while the URL stays the term both humans and machines already understand.

Before and after cutover: verify the property in Search Console, export the current URL and query baseline for comparison, submit the new sitemap, and watch coverage for two weeks. Full sequence: [15 — Migration & Cutover](./15-migration-and-cutover.md).

### The legacy domain: `imnadiaamer.com`

The footer copy refers to *"the full relaunch of what used to be irnnadiaamer.com"* — which is a typo. The domain is **`imnadiaamer.com`** (`rn` misread as `m`), it is still live on Squarespace, and it carries eight years of history and inbound links.

**Recommended:** retire the site and 301 the whole domain to `nikkostudio.co`, consolidating the link equity rather than splitting it across two live properties. Verify both in Search Console and file a change of address. Add a `sameAs` link in the `Organization` and `Person` structured data so the entity relationship is explicit.

**Do not let it lapse** — and note it also carries the Google Workspace mail records, which is a separate and more urgent concern ([15](./15-migration-and-cutover.md#the-critical-finding-cancelling-squarespace-would-break-nadias-email)).

### One inherited default to reverse

Squarespace's stock `robots.txt` **blocks every AI crawler** — `GPTBot`, `ClaudeBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `Applebot-Extended`, `PerplexityBot` and others. The site is currently invisible to LLM search. Constraint C6 therefore requires actively reversing a block nobody chose. See [Q6](./13-open-questions.md).

---

## Part 2 — LLM Discoverability

> *"if possible, the website should be LLM friendly for indexing on LLM searches"*

Increasingly, "become the go-to" includes being the studio a language model names when a founder asks for a story-led marketing agency. This is a real and growing referral channel, and it rewards a specific kind of page.

### What models actually need

Language models — whether crawling for training, indexing for retrieval, or fetching live during a search — consume **text**. They do not execute the accent cycle, hover a word, wait 3800 ms for the sampler, or click "Pull another". What is in the HTML is what exists.

This produces four concrete rules:

#### 1. Every fact ships in the initial HTML

This is the operative constraint, and the design violates it in three places if built naively:

| Content | Prototype behaviour | Required |
|---|---|---|
| **8 sampler fragments** | One rendered from a JS array; 7 invisible | **All 8 in the HTML**, one visible, seven inert |
| **Word swap (Khara / Kaka)** | One state rendered | **Both states in the HTML** |
| **Service card bodies** | In `renderVals()` | **Rendered statically** from content files |

Those eight fragments are the site's only proof of work — *"A mural on a gym wall people queued to photograph"*, *"Membership journeys for a talent agency — 215,000 members deep"*. Leaving seven of them out of the HTML would hide the strongest evidence on the page from every machine reader. Enforced by a CI check that greps the built output for each fragment.

#### 2. Facts are stated once, plainly, and never contradicted

Models penalise ambiguity. The page should state without hedging: what Nikko is, who runs it, where it operates, what the two services are, what they cost, and how to get in touch. The README's business facts and the page copy must agree exactly — the [content architecture](./04-content-architecture.md) helps here, since prices and service names come from a single content file.

#### 3. Structure carries meaning

Correct heading hierarchy, real `<blockquote>` for the testimonial, `<figure>`/`<figcaption>` for captioned images, definition-like structures for pricing. Models use structure to decide what is a claim, what is a quote, and what is attribution. This is the same work as [Part 1](#part-1--technical-seo) — semantic HTML pays twice.

#### 4. Provide a machine-oriented entry point

**`/llms.txt`** — an emerging convention: a Markdown file at the root giving a model a clean, high-signal summary of the site with links to fuller content. Cheap to generate from the same content files, and it costs nothing if the convention does not take hold.

```markdown
# Nikko Studio

> A founder-led story studio in London and the UAE. We market for
> memorability: know the customer, market for memorability, become the go-to.

Founded by Nadia Amer, writer, strategist and creative director.

## Services
- [Show&Tell](/show-and-tell): Live workshops and talks for founders,
  creatives and copywriters. Limited drops, delivered live, replay for
  attendees. From £35 public; from £500 for private team sessions.
- [Dream&Do](/dream-and-do): Founder-led project work — positioning,
  messaging, brand language, launch and growth strategy, newsletters,
  customer journeys. Scoped per project, not retained. From £5,000.

## Contact
- [Pitch a project](/pitch)
- [Newsletter](/#pitch)
```

Also worth shipping: **Markdown mirrors** of key pages (`/show-and-tell.md`), which some retrieval systems prefer, and an **RSS feed** once the journal exists — a well-established, well-parsed format.

### The `robots.txt` decision

This is a **business decision, not a technical one**, and it needs an explicit answer ([Q6](./13-open-questions.md)).

| Crawler | Purpose | Allowing it means |
|---|---|---|
| `GPTBot` | OpenAI training | Content may inform future models |
| `OAI-SearchBot` | ChatGPT search | **Citable in ChatGPT search results** |
| `ClaudeBot` | Anthropic | Content may inform models |
| `PerplexityBot` | Perplexity | Citable in Perplexity answers |
| `Google-Extended` | Gemini / AI Overviews | Content usable in AI Overviews |
| `Applebot-Extended` | Apple Intelligence | Content usable by Apple |

**The trade-off, honestly stated.** Allowing them is how the site becomes discoverable through LLM search — which is what C6 asks for. It also means Nikko's distinctive writing becomes training data, uncompensated. For a studio whose product *is* distinctive language, that is a genuine tension worth a deliberate answer rather than a default.

**Our recommendation:** allow **search/retrieval** crawlers (`OAI-SearchBot`, `PerplexityBot`, `Google-Extended`), which cite and link back, and decide separately on **training** crawlers (`GPTBot`, `ClaudeBot`, `Applebot-Extended`), which generally do not. This gets the discoverability benefit while retaining a position on training use. Nadia's call.

Whatever is chosen is written explicitly in `robots.txt` — including the choice to allow everything. A silent default is not a decision.

### What we are *not* doing

- No cloaking or serving different content to bots. It violates every search engine's guidelines and would be trivially detected.
- No keyword stuffing. The copy is the product.
- No AI-generated filler pages. Thin content is a liability under Google's helpful-content systems, and this business sells the opposite of filler.

---

## Measurement

| Signal | Tool | Cadence |
|---|---|---|
| Index coverage, queries, CWV field data | Google Search Console | Weekly after launch |
| Bing/Copilot indexing | Bing Webmaster Tools | Monthly |
| Structured data validity | Rich Results Test + CI | Every PR |
| AI crawler hits | Cloudflare bot analytics | Monthly |
| Brand mention in LLM answers | Manual spot-check across ChatGPT / Claude / Perplexity / Gemini | Monthly |
| Referral traffic from AI surfaces | Cloudflare Web Analytics referrers | Monthly |

That last row is worth setting up early — AI-referred traffic is measurable and currently under-tracked by most sites, so a simple baseline is genuinely informative.

---

**Next:** [10 — Hosting, Domains & Ops](./10-hosting-domains-and-ops.md)
