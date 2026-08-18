# 11 — Quality Gates

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Principles](./02-engineering-principles.md) · [Performance](./08-performance.md)

A principle that is not verified is a wish. This document is how each one becomes a gate.

## What runs today

Almost everything in this document describes gates for **code that does not exist yet**. Until the Astro site is scaffolded ([roadmap 0.6](./12-roadmap.md)), the repository is documentation-only and there is exactly one automated check:

```bash
python3 scripts/check-docs-links.py
```

It validates **every relative Markdown link and heading anchor** across `docs/` and the root README This matters because the documentation is deliberately cross-linked ([conventions](./README.md#documentation-conventions)), so renaming a heading silently breaks navigation somewhere else. It has already caught three real breakages during authoring.

It reproduces GitHub's own anchor-slug algorithm, including the quirk that runs of whitespace are *not* collapsed — so `## P1 — Motion serves the story` becomes `#p1--motion-serves-the-story` with a double hyphen. Naive slugifiers get this wrong and report false failures.

Exit code 0 = clean, 1 = broken links listed. Suitable for CI as-is.

### Session startup

`.claude/hooks/session-start.sh` runs at the start of each Claude Code on the web session. Today it is nearly a no-op — there are no dependencies to install. It is written ahead of the build so that the moment `site/package.json` exists, `npm install` runs automatically with no further setup. It is idempotent and only runs in the remote environment.

---

## Gate summary

| Gate | Enforces | Blocks merge | Runs |
|---|---|---|---|
| TypeScript `strict` | [P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation), [P14](./02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it) | ✅ | Every PR |
| Content schema validation | [P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation) | ✅ | Every build |
| ESLint | [P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation), [P14](./02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it) | ✅ | Every PR |
| Stylelint (no raw colours) | [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact) | ✅ | Every PR |
| Prettier | [P14](./02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it) | ✅ | Every PR |
| `axe-core` a11y, 4 viewports | [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement) | ✅ | Every PR |
| No-JS content check | [P1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it), [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) | ✅ | Every PR |
| Reduced-motion check | [P1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it), [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement) | ✅ | Every PR |
| No horizontal overflow, 4 viewports | [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation) | ✅ | Every PR |
| Sticky-header assertion | [R10](./06-responsive-and-mobile-risks.md) | ✅ | Every PR |
| Tap-target size check | [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation), [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement) | ✅ | Every PR |
| Cross-browser Playwright | [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order) | ✅ | Every PR |
| Lighthouse CI budgets | [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) | ✅ | Every PR |
| Bundle & image size budgets | [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) | ✅ | Every PR |
| LLM-visibility check | [P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability) | ✅ | Every PR |
| Structured-data validation | [P5](./02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) | ✅ | Every PR |
| Link & sitemap check | [P5](./02-engineering-principles.md#p5--the-document-is-the-product-technical-seo) | ✅ | Every PR |
| Secret scanning | [P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure), [P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary) | ✅ | Every PR |
| Visual regression | [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) | ⚠️ Review | Every PR |
| Real-device review | [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation), [P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) | Manual | Every release |

---

## The distinctive checks

Most of the above is standard. Four are specific to this project's principles and are worth spelling out, because they are what stop the doctrine eroding.

### 1. The no-JS content check ([P1](./02-engineering-principles.md#p1--motion-serves-the-story-it-never-blocks-it), [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order))

Loads the page with JavaScript disabled and asserts that every heading, every paragraph, every price, every CTA and every form field is **present and visible**.

```ts
test('all content is visible without JavaScript', async ({ browser }) => {
  const ctx  = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('From £35')).toBeVisible();
  await expect(page.getByText('From £5,000+')).toBeVisible();
  await expect(page.getByRole('button', { name: /get inside/i })).toBeVisible();

  // no element is stranded at opacity:0 by a reveal animation
  const hidden = await page.locator('[class*="reveal"]').evaluateAll(
    els => els.filter(el => +getComputedStyle(el).opacity === 0).length
  );
  expect(hidden).toBe(0);
});
```

That last assertion is the important one. It is the automated form of *"content starts visible; motion is added, never removed"* — the rule that keeps this design from ever shipping a blank page.

### 2. The LLM-visibility check ([P6](./02-engineering-principles.md#p6--machine-readable-by-default-llm-discoverability))

Greps the **built HTML** for every fact that a naive implementation would leave in a JavaScript array.

```ts
test('all sampler fragments ship in the HTML', async () => {
  const html = await readFile('dist/index.html', 'utf-8');
  const fragments = await loadContent('fragments');   // all 8, from the content files

  for (const f of fragments) {
    expect(html).toContain(f.text);      // not just the visible one
  }
  expect(html).toContain('Khara');       // both word-swap states
  expect(html).toContain('Kaka');
});
```

Without this, the first "small refactor" that moves the sampler to client-side rendering silently removes the site's only proof of work from every crawler and model, and nobody notices for months.

### 3. Stylelint: no raw colours outside `tokens.css` ([P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact))

```js
// .stylelintrc
{
  rules: {
    'color-no-hex': true,                 // use var(--nk-*)
    'declaration-property-value-disallowed-list': {
      '/^animation/': [/\d+ms/, /\d+s/],  // durations come from tokens
    },
  },
  overrides: [
    { files: ['**/tokens.css'], rules: { 'color-no-hex': null } },
  ],
}
```

The accent cycle mutates six surfaces from one state. If those read from six copies of a hex value they will drift, and the drift will be subtle enough to survive review.

### 4. The overflow check ([P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation))

```ts
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
```

With a full-bleed collage at negative offsets, hover scraps in absolutely positioned lanes, and several `min-width` values that exceed the mobile viewport ([R13](./06-responsive-and-mobile-risks.md)), horizontal overflow is the single most likely regression on this design. It is also invisible in a desktop review.

---

## Lighthouse budgets as config

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance":   ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 1.0  }],
        "categories:seo":           ["error", { "minScore": 1.0  }],
        "categories:best-practices":["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift":  ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time":      ["error", { "maxNumericValue": 150  }],
        "resource-summary:script:size":     ["error", { "maxNumericValue": 20480  }],
        "resource-summary:font:size":       ["error", { "maxNumericValue": 122880 }],
        "resource-summary:stylesheet:size": ["error", { "maxNumericValue": 30720  }],
        "unused-javascript":  ["error", { "maxLength": 0 }],
        "modern-image-formats":["error", { "maxLength": 0 }],
        "uses-responsive-images": ["error", { "maxLength": 0 }]
      }
    }
  }
}
```

Mobile and desktop, three runs, median. Rationale for each number: [08 — Performance](./08-performance.md).

---

## CI pipeline

```yaml
# .github/workflows/ci.yml (shape, not final)
jobs:
  verify:
    steps:
      - typecheck            # tsc --noEmit
      - lint                 # eslint + stylelint + prettier --check
      - build                # includes content schema validation
      - test:e2e             # Playwright: chromium, firefox, webkit × 4 viewports
      - test:a11y            # axe-core at each viewport
      - test:no-js           # content visible without JS
      - test:reduced-motion  # no animation in flight
      - test:llm             # all facts present in built HTML
      - test:seo             # structured data, links, sitemap
      - lighthouse           # budgets
      - size-check           # bundle + image budgets
      - secret-scan
```

Target: **under 6 minutes**. A slow pipeline gets bypassed, and a bypassed gate is not a gate.

---

## Manual review — the part CI cannot do

Automated checks catch regressions. They do not catch *"this is janky"* or *"this looks wrong"*. Before each release:

| Check | Why it cannot be automated |
|---|---|
| Real iPhone (Safari) | Emulation does not reproduce `backdrop-filter` cost, momentum scroll, or compositing behaviour |
| Real mid-range Android (Chrome) | Where jank actually appears. Run a DevTools trace during a full scroll |
| DevTools performance trace | Dropped frames and long tasks are a judgement call |
| Side-by-side vs the standalone prototype at 1440 | Fidelity ([P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged)) — the accent cycle, wake and mode drift do not read from a screenshot |
| Keyboard-only pass | Tab order and focus visibility need a human |
| Screen-reader pass (VoiceOver / NVDA) | Whether the experience makes *sense* is not an axe rule |
| Copy proofread | Especially the Arabic, which needs native sign-off ([Q8](./13-open-questions.md)) |

---

## Definition of done, per section

A section is not complete until:

- [ ] Renders correctly at 390 / 768 / 1024 / 1440
- [ ] Content comes from a content file, not the template ([P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation))
- [ ] All tokens referenced via custom properties, no raw values ([P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact))
- [ ] Fully visible and functional with JS disabled ([P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order))
- [ ] Correct under `prefers-reduced-motion`
- [ ] Keyboard-operable with visible focus
- [ ] `axe-core` clean
- [ ] Verified in Chromium, Firefox and WebKit
- [ ] Any deviation from the handoff logged in [06](./06-responsive-and-mobile-risks.md#deviations-log) ([P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged))
- [ ] Within performance budget

---

**Next:** [12 — Roadmap](./12-roadmap.md)
