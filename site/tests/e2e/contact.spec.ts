import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * /contact — the eight defects the founder reported, each pinned by the
 * assertion that would have caught it.
 *
 * These are regression tests, not coverage. Every one of them failed on the
 * build before the fix, and each names the specific mistake rather than the
 * symptom, because the symptoms were all "it looks wrong" and the causes
 * were all different:
 *
 *   D1  the intro block stated no container, so it ran flush to the viewport
 *       edge while the rest of the page was inset.
 *   D2  the pronoun group could not be selected at all: a click handler read
 *       `radio.checked` as the PRE-click state, which it never is, and
 *       unchecked every radio the instant it was chosen.
 *   D3  the design's cobalt underbar was an OUTER shadow, so it sat in the
 *       gap the coral focus ring's `outline-offset` opens and read as a
 *       second blue ring.
 *   D4  the ruled textarea's top padding was not a whole multiple of its own
 *       rule pitch, so text crossed its rules.
 *   D6  a rendered <legend> is outside its fieldset's flex layout, so the
 *       fieldset's `gap` never applied and a card's hover lift covered the
 *       label above it.
 *   D7  the rail's live selection summary was missing.
 *   D8  answers survived a refresh, from a localStorage draft and from the
 *       browser's own form-state restoration.
 *
 * D5 — the 18px cut corner drawn on the wrong diagonal — is a paint-only
 * defect with no property to assert against, so it is verified by eye
 * against the design instead. See docs/19.
 */

const RULE_PITCH = 28;

async function fillEnough(page: Page): Promise<void> {
  await page.locator('#f-business').fill('Dunder Mifflin Paper Company');
  await page.locator('#f-name').fill('Michael Scott');
  await page.locator('.nk-c-cards label').first().click();
  await page.locator('.nk-c-outputs label').first().click();
}

test.describe('the enquiry form', () => {
  test('a pronoun can be picked, cleared and picked again [D2]', async ({ page }) => {
    await page.goto('/contact');
    const chip = page.locator('.nk-c-chip-wrap').nth(1);
    const radio = page.locator('input[name="pronouns"]').nth(1);

    await chip.click();
    await expect(radio).toBeChecked();

    await chip.click();
    await expect(radio).not.toBeChecked();

    await chip.click();
    await expect(radio).toBeChecked();
  });

  test('arrow keys move the pronoun selection and never empty it [D2]', async ({ page }) => {
    await page.goto('/contact');
    const radios = page.locator('input[name="pronouns"]');
    await radios.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(1)).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(2)).toBeChecked();
    await expect(radios.nth(1)).not.toBeChecked();
  });

  test('focus is one ring on every kind of control [D3]', async ({ page }) => {
    await page.goto('/contact');
    const controls = [
      '#f-business',
      '#f-why',
      'input[name="pronouns"]',
      '.nk-c-outputs input',
      '.nk-c-cards input',
      '.nk-c-budgets input',
    ];

    for (const selector of controls) {
      const el = page.locator(selector).first();
      await el.focus();
      // The ring is the outline. Anything else drawn on focus must not be an
      // outer shadow, or it reads as a second ring in the outline's offset.
      const ring = await el.evaluate((node) => {
        const styles = getComputedStyle(node as Element);
        const target = (node as Element).classList.contains('nk-vh-input')
          ? ((node as Element).nextElementSibling as Element)
          : (node as Element);
        const paint = getComputedStyle(target);
        return {
          focusVisible: (node as Element).matches(':focus-visible'),
          width: parseFloat(paint.outlineWidth || styles.outlineWidth),
          style: paint.outlineStyle,
          shadow: paint.boxShadow,
        };
      });
      expect(ring.focusVisible, `${selector} :focus-visible`).toBe(true);
      expect(ring.width, `${selector} outline width`).toBeGreaterThanOrEqual(3);
      expect(ring.style, `${selector} outline style`).not.toBe('none');
      expect(ring.shadow, `${selector} must not add an outer shadow`).not.toMatch(/^rgb.*\)\s+0px\s+3px\s+0px\s+0px$/);
    }
  });

  test("a ruled textarea's rules land on its own line grid [D4]", async ({ page }) => {
    await page.goto('/contact');
    const geometry = await page.locator('#f-why').evaluate((node) => {
      const styles = getComputedStyle(node as Element);
      return {
        lineHeight: parseFloat(styles.lineHeight),
        paddingTop: parseFloat(styles.paddingTop),
        originY: parseFloat(styles.backgroundPositionY),
        image: styles.backgroundImage,
      };
    });
    expect(geometry.image).toContain('repeating-linear-gradient');

    // Two things have to hold, and only two. The gradient's period must equal
    // the line-height, or text drifts across its own rules as it wraps; and
    // the grid must START where the text starts, or the first line sits on
    // the wrong rule. An earlier version of this test demanded the padding be
    // a whole multiple of the pitch — which does align, but only by pushing
    // the first line onto rule two and leaving rule one empty, which is the
    // bug the founder reported. The padding itself is free.
    expect(geometry.lineHeight).toBe(RULE_PITCH);
    expect(geometry.originY).toBe(geometry.paddingTop);
  });

  test('a hovered card cannot reach the label above it [D6]', async ({ page }) => {
    await page.goto('/contact');
    const gaps = await page.evaluate(() => {
      const out: number[] = [];
      for (const fieldset of document.querySelectorAll('.nk-c-fieldset')) {
        const legend = fieldset.querySelector('.nk-c-legend');
        const controls = fieldset.querySelector(
          '.nk-c-chiprow, .nk-c-cards, .nk-c-outputs, .nk-c-budgets, .nk-c-timing',
        );
        if (!legend || !controls) continue;
        out.push(controls.getBoundingClientRect().top - legend.getBoundingClientRect().bottom);
      }
      return out;
    });
    expect(gaps.length).toBeGreaterThan(3);
    // The largest lift on the page is 4px. Anything at or under it overlaps.
    for (const gap of gaps) expect(gap).toBeGreaterThan(4);
  });

  test('the rail summarises the picks, live and in the design colours [D7]', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');

    const region = page.locator('[data-rail-frags]');
    await expect(region).toBeHidden();

    await fillEnough(page);
    await expect(page.locator('[data-rail-frag-count]')).toHaveText('04');
    await expect(page.locator('[data-rail-frag-list] .nk-c-frag--cobalt')).toHaveCount(1);
    await expect(page.locator('[data-rail-frag-list] .nk-c-frag--yellow')).toHaveCount(1);

    // Live: clearing an answer takes its chip with it.
    await page.locator('#f-name').fill('');
    await expect(page.locator('[data-rail-frag-count]')).toHaveText('03');
  });

  test('nothing survives a reload [D8]', async ({ page }) => {
    await page.goto('/contact');
    await fillEnough(page);
    await page.locator('#f-why').fill('Something worth remembering, if anything were.');

    await page.reload();

    await expect(page.locator('#f-business')).toHaveValue('');
    await expect(page.locator('#f-why')).toHaveValue('');
    await expect(page.locator('[data-rail-frags]')).toBeHidden();
    const state = await page.evaluate(() => ({
      checked: [...document.querySelectorAll('input[type="radio"], input[type="checkbox"]')].filter(
        (input) => (input as HTMLInputElement).checked,
      ).length,
      keys: Object.keys(localStorage).filter((key) => key.includes('brief')),
    }));
    expect(state.checked).toBe(0);
    expect(state.keys).toEqual([]);
  });
});

test.describe('the contact page shell', () => {
  test('the intro sits in the same container as everything else [D1]', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');
    // `#top` qualifies it: the receipt state ships in the same document and
    // carries its own `.nk-c-h1`.
    const intro = await page.locator('#top .nk-c-h1').boundingBox();
    const rail = await page.locator('.nk-c-rail').boundingBox();
    expect(intro).not.toBeNull();
    expect(rail).not.toBeNull();
    expect(Math.abs((intro?.x ?? 0) - (rail?.x ?? 0))).toBeLessThanOrEqual(1);
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`no horizontal overflow at ${width}px [P2]`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/contact');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('axe-core is clean, before and after the form is filled in [P10]', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');

    const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
    const before = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(before.violations).toEqual([]);

    await fillEnough(page);
    // Let the rail chips finish stamping in. A fade-in is transiently
    // low-contrast by definition, and axe reports the frame it samples —
    // what is being asserted here is the page at rest.
    await page.waitForTimeout(600);
    const after = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(after.violations).toEqual([]);
  });
});
