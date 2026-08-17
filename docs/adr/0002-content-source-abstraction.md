# ADR-0002: Content source abstraction via schema + loader

**Status:** Proposed
**Date:** 2026-08-17
**Principles:** [P7](../02-engineering-principles.md#p7--content-is-data-code-is-presentation), [P14](../02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it), [P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)

## Context

Constraint C7, in the founder's words:

> *"it should be designed in a way where me/founder can change content easily and cheaply i.e. without requiring a full build (text, images). we can either use some suitable content system - either a ready made CMS (depending on cost) or to begin with b) you put a specific format (that you generate and can map to your layout) in some file that i can edit text or image names/path… the system should be built in a way that could read that content from static files (b) or some CMS (a) in case in the future we wanted to swap options."*

Two requirements, and the second is the harder one:

1. **Now:** content in editable files, cheap, no CMS cost.
2. **Later:** swap to a CMS **without rebuilding the site**.

Requirement 2 is where most projects fail. The usual pattern — content in files, read directly by templates — makes a later CMS migration a rewrite of every template, because CMS data has a different shape, different field names and different image handling. The migration then gets deferred indefinitely, and the "we can always move later" promise quietly becomes false.

Choosing a CMS *now* to avoid that is the opposite error: it spends money and adds a dependency before we know whether file editing is sufficient.

## Decision

**Separate the content *source* from the content *contract*, and make the contract the stable thing.**

```
   SOURCE (swappable)          CONTRACT (stable)         CONSUMER
   ──────────────────          ─────────────────         ────────
   YAML / Markdown files ──┐
                           ├──→ Zod schema ──→ content API ──→ templates
   CMS API              ───┘    = the types      (typed façade)
```

Concretely:

1. **Content lives in schema-validated YAML and Markdown** under `site/src/content/`, read through Astro's Content Layer.
2. **Every collection has a Zod schema.** The schema is the contract, and it generates the TypeScript types.
3. **Templates never import `astro:content` directly.** They import from `src/lib/content/`, a thin typed façade — the single place any source-specific remapping can live.
4. **The schema is source-agnostic.** No field exists because a particular CMS produces it.

Swapping the source means changing the `loader` on each collection:

```ts
// Phase 1 & 2 — files
services: defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/services' }),
  schema: serviceSchema,
}),

// Phase 3 — hosted CMS
services: defineCollection({
  loader: sanityLoader({ query: '*[_type == "service"]' }),
  schema: serviceSchema,          // ← identical
}),
```

**Schemas unchanged. Templates unchanged. Estimated migration: 1–2 days.**

### Format: YAML, not JSON

For a non-technical editor, JSON is hostile — one missing comma breaks the build, apostrophes need escaping, and there is nowhere to write a note. YAML gives comments, multi-line strings without escaping (`>` and `|`), no brackets to balance, and apostrophes that just work. Long prose is Markdown.

### The phased path

| Phase | Source | Editing | Cost |
|---|---|---|---|
| **1** | YAML/MD in the repo | github.com web editor — works from a phone | £0 |
| **2** | Same files | Sveltia CMS at `/admin` — real UI, drag-and-drop images | £0 |
| **3** | Hosted CMS | Sanity or similar | £0 on free tiers |

Phase 2 is **additive**: the CMS writes to the same files, so it can be removed at any time and direct editing still works. That is what makes it a low-risk step rather than a commitment.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Schema + loader abstraction** ✅ | Genuinely swappable; validation catches editor mistakes at build; types flow to templates | A little more structure up front | **Chosen** |
| Content in components, refactor later | Fastest to start | Fails C7 immediately; "later" never comes; every template rewritten at migration | Rejected |
| Direct file reads, no schema | Simple | A typo becomes a runtime error or silently-missing content; no types; no migration path | Rejected |
| Headless CMS from day one | Best editing UX immediately | Cost and a dependency before we know it is needed; slower iteration during the build; still needs the abstraction to stay portable | Rejected — deferred to phase 3 |
| Git-based CMS from day one | Good UX, still free, still files | Adds a moving part before we know which fields actually get edited | Rejected — deferred to phase 2, which is cheap |

## Consequences

### Good

- **The founder can edit content on day one**, from a browser, on a phone, at zero cost.
- **A bad edit cannot break the site.** Schema validation fails the build, naming the file and field; Cloudflare Pages keeps the last good deploy live. This safety net is what makes direct file editing responsible rather than reckless.
- **Full version history and one-click revert** for content, because content is Git.
- **Types flow through.** A template referencing a field that does not exist fails to compile.
- **The CMS decision stays cheap and reversible** ([P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)) — which is the whole point.
- **Content is portable.** YAML and Markdown are readable in any editor, forever, with no vendor involved.

### Bad / accepted costs

- **Every content change triggers a rebuild** (~1–2 minutes, automatic). Not literally "without a build" as the constraint's wording suggests — but the thing being avoided, *needing an engineer*, is fully avoided. Truly build-free content would mean runtime fetching, which costs the static HTML that [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration), [P5](../02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) and [P6](../02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability) all depend on. Not a trade worth making speculatively.
- **YAML has sharp edges** — indentation matters, and a bare `:` or `#` in an unquoted string can surprise. Mitigated by schema validation, generous inline comments in the files, and the phase-2 CMS.
- **Some ceremony up front** — schemas, a façade layer, an editor guide.
- **Image editing is the clumsiest part** in phase 1: upload to a folder, then reference the filename. Phase 2's media library fixes exactly this, which is a good reason not to defer it too long.

### Neutral

- Content and code share a repository. Good for atomicity and review; means content edits appear in code history.

## Reversal

**Cost: low, by construction.** The abstraction exists precisely so this decision can be revisited. Moving to a CMS is a loader swap. Moving *back* from a CMS means exporting to YAML and swapping the loader again.

The only genuinely hard-to-reverse element is the **schema shape** — but that is driven by the design, not by any vendor, so it would only change if the design did.
