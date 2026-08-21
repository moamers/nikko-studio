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
 *       gap the focus ring's `outline-offset` opens and read as a second
 *       ring. The ring itself is cobalt on this page — the contact design
 *       source says `3px solid #2B45F0` where the homepage source says
 *       `#EE5439`, so `.nk-contact` overrides `--nk-focus-colour` rather
 *       than the token moving under the homepage's feet. docs/14 § C9.
 *   D4  the ruled textarea's top padding was not a whole multiple of its own
 *       rule pitch, so text crossed its rules.
 *   D6  a rendered <legend> is outside its fieldset's flex layout, so the
 *       fieldset's `gap` never applied and a card's hover lift covered the
 *       label above it.
 *   D7  the rail's live selection summary was missing.
 *   D8  answers survived a refresh, from a localStorage draft and from the
 *       browser's own form-state restoration — silently, with nothing on
 *       the page to say so and nothing to turn it off. The autosave was
 *       later restored under a visible switch, so what D8 pins now is not
 *       "nothing is remembered" but "nothing is remembered without the
 *       visitor's say-so": on by default and honest about it, off on
 *       request, and off means the stored copy is gone.
 *
 * D5 — the 18px cut corner drawn on the wrong diagonal — is a paint-only
 * defect with no property to assert against, so it is verified by eye
 * against the design instead. See docs/19.
 */

const RULE_PITCH = 28;

/** `--nk-cobalt`. The focus ring on THIS page only — see D3 and docs/19. */
const COBALT = 'rgb(43, 69, 240)';
/** `--nk-coral`. The active section's mark in the rail and the chip bar. */
const CORAL = 'rgb(238, 84, 57)';

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
      '#f-autosave',
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
          colour: paint.outlineColor,
          shadow: paint.boxShadow,
        };
      });
      expect(ring.focusVisible, `${selector} :focus-visible`).toBe(true);
      expect(ring.width, `${selector} outline width`).toBeGreaterThanOrEqual(3);
      expect(ring.style, `${selector} outline style`).not.toBe('none');
      // Cobalt, not the site-wide coral: the two design sources disagree and
      // `.nk-contact` overrides `--nk-focus-colour` for this page alone. If
      // this ever reads coral, either the override was dropped or the global
      // token was changed — and changing the token would take the homepage
      // with it. docs/14 § C9, docs/19.
      expect(ring.colour, `${selector} outline colour`).toBe(COBALT);
      expect(ring.shadow, `${selector} must not add an outer shadow`).not.toMatch(/^rgb.*\)\s+0px\s+3px\s+0px\s+0px$/);
    }
  });

  test('the cobalt ring is scoped to this page — the homepage keeps coral [D3]', async ({
    page,
  }) => {
    // The cheap fix for D3 was to repoint `--nk-focus-colour` in tokens.css.
    // That would have recoloured every ring on the site from one line, which
    // is exactly why it is the wrong fix: the homepage design asks for coral
    // in as many words. This test is the guard on that.
    await page.goto('/');
    const ring = await page.evaluate(() => {
      const el = document.querySelector('main a, main button') as HTMLElement | null;
      el?.focus();
      return el ? getComputedStyle(el).outlineColor : '';
    });
    expect(ring).toBe(CORAL);
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

  /* ── Autosave, and the switch that owns it [D8] ─────────────────────
   *
   * The original D8 asserted that nothing survived a reload. That was the
   * right assertion for a build with no control on the page, and it is the
   * wrong one now: the autosave is back and a visitor can see it, so what
   * has to hold is that BOTH answers are true on demand — remembered when
   * the switch is on, forgotten the instant it goes off. Deleting the test
   * would have thrown away the coverage that caught the original defect. */

  const DRAFT_KEY = 'nk-brief-draft';

  const storedDraft = (page: Page) =>
    page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY);

  test('autosave is on for a first-time visitor, and says so [D8]', async ({ page }) => {
    await page.goto('/contact');

    const toggle = page.locator('#f-autosave');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
    // A switch, not a checkbox with a picture on it: the state has to reach
    // a screen reader as state, and the name must not carry it a second
    // time. [P10]
    await expect(toggle).toHaveRole('switch');
    await expect(toggle).toHaveAccessibleName('Autosave');
    await expect(page.locator('[data-autosave-state]')).toHaveText('on');
  });

  test('with autosave on, a draft survives a reload [D8]', async ({ page }) => {
    await page.goto('/contact');
    await fillEnough(page);
    await page.locator('#f-why').fill('Something worth remembering, and now it is.');
    expect(await storedDraft(page)).toContain('Dunder Mifflin');

    await page.reload();

    // Everything, not only the card choices: the point of saving the whole
    // FormData is that a four-minute form comes back whole.
    await expect(page.locator('#f-business')).toHaveValue('Dunder Mifflin Paper Company');
    await expect(page.locator('#f-name')).toHaveValue('Michael Scott');
    await expect(page.locator('#f-why')).toHaveValue('Something worth remembering, and now it is.');
    const checked = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-contact-form] input[type="radio"], [data-contact-form] input[type="checkbox"]')].filter(
          (input) => (input as HTMLInputElement).checked,
        ).length,
    );
    expect(checked).toBe(2);
    await expect(page.locator('[data-rail-frags]')).toBeVisible();

    // And the page volunteers why the answers are there. Silence about it
    // is the defect the original removal was reacting to.
    const note = page.locator('[data-autosave-note]');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/autosave/i);
  });

  test('turning autosave off clears the stored draft on the spot [D8]', async ({ page }) => {
    await page.goto('/contact');
    await fillEnough(page);
    await page.locator('#f-why').fill('This should not outlive the switch.');
    expect(await storedDraft(page)).not.toBeNull();

    await page.locator('.nk-c-autosave-switch').click();

    await expect(page.locator('#f-autosave')).not.toBeChecked();
    await expect(page.locator('[data-autosave-state]')).toHaveText('off');
    // Immediately — not on the next load. Leaving the copy behind after
    // someone opts out is the behaviour this is here to prevent.
    expect(await storedDraft(page)).toBeNull();
    await expect(page.locator('[data-autosave-note]')).toContainText(/deleted/i);

    // Off stops the writer too: typing after the switch flips writes nothing.
    await page.locator('#f-business').fill('Something typed after opting out');
    expect(await storedDraft(page)).toBeNull();

    // And what was already typed is still on screen. "Off" is about storage,
    // not about wiping the form out from under the visitor.
    await expect(page.locator('#f-why')).toHaveValue('This should not outlive the switch.');
  });

  test('the off choice survives a reload, and nothing comes back with it [D8]', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('.nk-c-autosave-switch').click();
    await fillEnough(page);
    await page.locator('#f-why').fill('Typed while autosave was off.');

    await page.reload();

    // The preference outlives the draft it controls — a separate key, or
    // clearing the draft would clear the decision to clear the draft.
    await expect(page.locator('#f-autosave')).not.toBeChecked();
    await expect(page.locator('[data-autosave-state]')).toHaveText('off');
    await expect(page.locator('#f-business')).toHaveValue('');
    await expect(page.locator('#f-why')).toHaveValue('');
    await expect(page.locator('[data-rail-frags]')).toBeHidden();
    expect(await storedDraft(page)).toBeNull();

    // Turning it back on starts saving from what is on screen now, rather
    // than waiting for the next keystroke to make the switch true.
    await page.locator('#f-business').fill('Vance Refrigeration');
    await page.locator('.nk-c-autosave-switch').click();
    await expect(page.locator('#f-autosave')).toBeChecked();
    expect(await storedDraft(page)).toContain('Vance Refrigeration');
  });

  test('the autosave switch works from the keyboard alone [P10]', async ({ page }) => {
    await page.goto('/contact');
    await fillEnough(page);

    const toggle = page.locator('#f-autosave');
    await toggle.focus();
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Space');
    await expect(toggle).not.toBeChecked();
    expect(await storedDraft(page)).toBeNull();

    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
    expect(await storedDraft(page)).not.toBeNull();
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

/**
 * With JavaScript off, autosave cannot exist: `localStorage` is not
 * reachable from markup. The switch therefore ships `hidden` and
 * `contact-form.ts` is the only thing that unhides it — a visible switch is
 * a promise that flipping it does something, and here there would be
 * nothing behind it. [P3]
 *
 * This is a live trap, not a formality. `.nk-c-autosave { display: flex }`
 * is an author declaration and outranks the UA stylesheet's
 * `[hidden] { display: none }`, so the switch rendered on every no-JS load
 * until an explicit `[hidden]` guard was added next to it. The same mistake
 * is one `display` declaration away at any time.
 */
test.describe('the contact page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the autosave switch does not render, and the form still does [P3]', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('#f-autosave')).toBeHidden();
    await expect(page.locator('.nk-c-autosave-switch')).toBeHidden();
    await expect(page.locator('[data-autosave-note]')).toBeHidden();

    // The form is untouched by any of it and still posts the plain way.
    await expect(page.locator('[data-contact-form]')).toBeVisible();
    await expect(page.locator('[data-contact-form]')).toHaveAttribute('action', /enquiry/);
    await expect(page.locator('#f-business')).toBeVisible();
    await expect(page.locator('.nk-c-required-note')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
