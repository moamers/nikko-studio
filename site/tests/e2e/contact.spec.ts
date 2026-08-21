import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

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
 *       ring. The ring's own colour is `--nk-focus-colour`, ruled cobalt
 *       site-wide (docs/14 § C9) — asserted here as "whatever the token
 *       resolves to", never as a hex.
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
 *   D9  a selected budget box and a selected timing chip did not read as
 *       chosen next to the groups that carry colour. The fills existed —
 *       ink and cobalt, exactly as the design source draws them — but ink
 *       reads as chrome and cobalt was already the intent cards' colour.
 *       Budget now fills coral and timing yellow, both with ink labels.
 *
 *  D10  the section rail's current-section mark was missing altogether, in
 *       both the desktop rail and the mobile chip bar. It is an
 *       `IntersectionObserver` and an `aria-current` attribute the CSS
 *       selects on, so the announcement and the colour cannot drift apart.
 *
 * D5 — the 18px cut corner drawn on the wrong diagonal — is a paint-only
 * defect with no property to assert against, so it is verified by eye
 * against the design instead. See docs/19.
 */

const RULE_PITCH = 28;

/** `--nk-coral`. The selected budget box, and the active section's mark. */
const CORAL = 'rgb(238, 84, 57)';
/** `--nk-yellow`. The selected deliverable boxes, and the timing chips. */
const YELLOW = 'rgb(255, 212, 0)';
/** `--nk-ink`. The text on every one of those fills. */
const INK = 'rgb(17, 17, 16)';

/**
 * A custom property's value, resolved exactly as the page resolves it —
 * inside `.nk-contact`, through whatever `var()` and `color-mix()` chain it
 * is built from — rather than restated here as a literal.
 *
 * Two of the colours these tests care about cannot be written down honestly
 * any other way. `--nk-focus-colour` has already changed once (coral →
 * cobalt, docs/14 § C9) and a test that hardcodes it turns a design ruling
 * into a test failure. `--nk-coral-deep` is a `color-mix()`, which Chromium
 * reports as `color(srgb …)`, not `rgb()`. What must hold is that the page
 * paints THE token, not that the token holds any particular value.
 */
async function tokenColour(page: Page, property: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    (document.querySelector('.nk-contact') ?? document.body).append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, property);
}

/**
 * WCAG 2.x relative luminance and contrast, computed from the two colours
 * the browser actually painted rather than from the hexes we hoped it would
 * paint. The intent card's note shipped at 3.17:1 precisely because the
 * ratio was reasoned about rather than measured. [P10]
 */
function contrast(a: string, b: string): number {
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = (colour: string) => {
    const parts = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    // Chromium reports a `color-mix()` result as `color(srgb 0.65 0.23 …)`,
    // already 0–1, and everything else as `rgb(166, 59, …)`, 0–255. Dividing
    // the first form by 255 is how a real ratio silently becomes 1.0:1.
    const [r, g, b_] = colour.startsWith('color(') ? parts : parts.map((v) => v / 255);
    return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b_ ?? 0);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Everything the eye uses to tell a chosen chip from an unchosen one. */
async function chipState(chip: Locator) {
  return chip.evaluate((node) => {
    const styles = getComputedStyle(node as Element);
    return {
      fill: styles.backgroundColor,
      text: styles.color,
      border: styles.borderColor,
      keyline: styles.boxShadow,
    };
  });
}

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
    const expected = await tokenColour(page, '--nk-focus-colour');
    expect(expected, 'the focus token resolves to a real colour').toMatch(/^rgb/);

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
      // The ring is the token, whatever the token currently is. This fails
      // if a rule ever hardcodes a colour of its own, or paints no ring at
      // all — and passes through a re-ruling of C9 without an edit.
      expect(ring.colour, `${selector} outline colour`).toBe(expected);
      expect(ring.shadow, `${selector} must not add an outer shadow`).not.toMatch(/^rgb.*\)\s+0px\s+3px\s+0px\s+0px$/);
    }
  });

  /* ── The selected-chip fills [D9] ─────────────────────────────────────
   *
   * D9: a selected chip in "ballpark budget" and in the timing group did
   * not read as chosen beside the groups that carry colour. The fills were
   * there — the design source fills budget with flat ink and month with
   * cobalt, and so did this build — but ink reads as chrome, and cobalt was
   * the intent cards' colour said twice. Budget now fills coral; timing
   * reuses the deliverables' yellow rather than spending turquoise, which
   * the direction board reserves and the founder has reaffirmed as
   * reserved. docs/14 § C1, docs/19.
   *
   * What is asserted is the part that can rot silently: the contrast of the
   * label against the fill it was actually painted on, and the presence of
   * a cue that is not hue — which matters most on yellow, where the fill
   * itself is barely a luminance move.
   */
  test('a selected budget or timing chip fills, legibly and not by hue alone [D9]', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/contact');

    const groups = [
      { name: 'budget', selector: '.nk-c-budget', fill: CORAL },
      { name: 'year', selector: '.nk-c-year-chip', fill: YELLOW },
      { name: 'month', selector: '.nk-c-month-chip', fill: YELLOW },
    ];

    for (const group of groups) {
      const chip = page.locator(group.selector).first();
      const before = await chipState(chip);

      await chip.click();
      // The fill crossfades on --nk-dur-colour; sample it at rest.
      await page.waitForTimeout(400);
      const after = await chipState(chip);

      expect(after.fill, `${group.name} selected fill`).toBe(group.fill);
      expect(after.text, `${group.name} selected label`).toBe(INK);
      expect(
        contrast(after.fill, after.text),
        `${group.name} label on its own fill`,
      ).toBeGreaterThanOrEqual(4.5);

      // Not hue alone. The keyline is a shape that was not there before and
      // the border goes solid; on coral the fill's luminance carries it too,
      // but on yellow — a light fill — these are the whole signal.
      expect(after.keyline, `${group.name} keyline`).toContain('inset');
      expect(before.keyline, `${group.name} unselected keyline`).not.toContain('inset');
      expect(after.border, `${group.name} selected border`).toBe(INK);
      expect(before.border, `${group.name} unselected border`).not.toBe(INK);
    }
  });

  test("the rail chips speak the controls' colours [D9]", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/contact');

    await page.locator('.nk-c-budget').first().click();
    await page.locator('.nk-c-year-chip').first().click();
    await expect(page.locator('[data-rail-frag-list] .nk-c-frag--coral')).toHaveCount(1);
    // Timing's chip is yellow, the same class the deliverables use — so with
    // a deliverable also picked there would be two. Here there is one.
    await expect(page.locator('[data-rail-frag-list] .nk-c-frag--yellow')).toHaveCount(1);

    for (const tone of ['coral', 'yellow']) {
      const chip = await chipState(page.locator(`[data-rail-frag-list] .nk-c-frag--${tone}`));
      expect(contrast(chip.fill, chip.text), `${tone} rail chip`).toBeGreaterThanOrEqual(4.5);
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

/* ── The current-section mark [D10] ───────────────────────────────────────
 *
 * D10: the design highlights the section being read, in the rail and in the
 * mobile chip bar, and the highlight was missing entirely — the five links
 * never changed whatever the visitor did.
 *
 * These tests scroll with `behavior: 'instant'` on purpose. `base.css` sets
 * `scroll-behavior: smooth` on the root, so a plain `window.scrollTo` glides
 * for hundreds of milliseconds and any assertion made straight afterwards is
 * measuring a page in mid-flight. That cost an afternoon; it is written down
 * here so it does not cost a second one.
 */
const SECTION_IDS = ['about', 'project', 'work', 'reason', 'finish'];

/** The href of whichever link in `group` currently carries the mark. */
async function markedSection(page: Page, group: string): Promise<string | null> {
  return page.evaluate((selector) => {
    const marked = document.querySelectorAll(`${selector}[aria-current]`);
    // Exactly one, always: two marks is a bug this returns as a failure.
    if (marked.length !== 1) return `${marked.length} marked`;
    return marked[0]?.getAttribute('href') ?? null;
  }, group);
}

async function scrollToSection(page: Page, id: string): Promise<void> {
  await page.evaluate((sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    // Put the section's top just inside the observer's band (140px down).
    window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - 100, behavior: 'instant' });
  }, id);
  await page.waitForTimeout(250);
}

test.describe('the section rail follows the reader [D10]', () => {
  for (const [label, width] of [
    ['the desktop rail', 1440],
    ['the mobile chip bar', 390],
  ] as const) {
    const group = width >= 1080 ? '.nk-c-rail-link' : '.nk-c-railbar-chip';

    test(`${label} marks the section in view, scrolling down and back up [D10]`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/contact');
      await page.waitForTimeout(300);

      // Something is marked before a single scroll — the first section.
      expect(await markedSection(page, group)).toBe('#about');

      for (const id of SECTION_IDS) {
        await scrollToSection(page, id);
        expect(await markedSection(page, group), `scrolling down to #${id}`).toBe(`#${id}`);
      }

      for (const id of [...SECTION_IDS].reverse()) {
        await scrollToSection(page, id);
        expect(await markedSection(page, group), `scrolling back up to #${id}`).toBe(`#${id}`);
      }

      // Past the end of the form, the last answer stands rather than
      // blinking out — a mark that disappears reads as broken.
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
      );
      await page.waitForTimeout(250);
      expect(await markedSection(page, group)).toBe('#finish');
    });
  }

  test('the mark is `aria-current`, and it moves — not just a colour [D10]', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');
    await page.waitForTimeout(300);

    const about = page.locator('.nk-c-rail-link[href="#about"]');
    const work = page.locator('.nk-c-rail-link[href="#work"]');
    await expect(about).toHaveAttribute('aria-current', 'true');
    await expect(work).not.toHaveAttribute('aria-current', /.*/);

    await scrollToSection(page, 'work');
    await expect(work).toHaveAttribute('aria-current', 'true');
    // The old mark is REMOVED, not merely restyled.
    await expect(about).not.toHaveAttribute('aria-current', /.*/);

    // And the paint follows the attribute, in the page's deep coral — the
    // darker derivation, because 10px of flat coral on the tinted ground is
    // 3.03:1 and axe-core fails the page for it.
    const coralDeep = await tokenColour(page, '--nk-coral-deep');
    const marked = await work.evaluate((node) => {
      const styles = getComputedStyle(node);
      const num = node.querySelector('.nk-c-rail-num');
      const title = node.querySelector('.nk-c-rail-title');
      return {
        bar: styles.boxShadow,
        num: num ? getComputedStyle(num).color : '',
        weight: title ? getComputedStyle(title).fontWeight : '',
      };
    });
    expect(marked.bar).toContain('inset');
    expect(marked.bar).toBe(`${coralDeep} 3px 0px 0px 0px inset`);
    expect(marked.num).toBe(coralDeep);
    // 10px mono, so the 4.5:1 threshold is the one that applies. The ground
    // is read from `--nk-ground` because it is painted above <body>, which
    // is itself transparent.
    const ground = await tokenColour(page, '--nk-ground');
    expect(
      contrast(marked.num, ground),
      'the mark on the accent-tinted ground',
    ).toBeGreaterThanOrEqual(4.5);
    // Not colour alone: the title's weight moves with it.
    expect(marked.weight).toBe('600');
  });

  test('the mobile bar scrolls the marked chip into view, and never the page [D10]', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact');
    await page.waitForTimeout(300);

    const track = page.locator('.nk-c-railbar-track');
    expect(await track.evaluate((node) => node.scrollLeft)).toBe(0);

    // #finish's chip is the last of five in a row 390px wide: it starts out
    // of sight, which is the whole point of this behaviour.
    await scrollToSection(page, 'finish');
    const pageY = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(700); // the smooth track scroll

    expect(await track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    const visible = await page.locator('.nk-c-railbar-chip[aria-current]').evaluate((node) => {
      const chip = node.getBoundingClientRect();
      const bar = (node.parentElement as HTMLElement).getBoundingClientRect();
      return chip.left >= bar.left - 1 && chip.right <= bar.right + 1;
    });
    expect(visible, 'the marked chip is inside the bar').toBe(true);

    // The page did not move underneath the visitor to achieve it.
    expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  });

  test('the marked chip fills coral, with a label that reads on it [D10]', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact');
    await scrollToSection(page, 'work');

    const chip = await chipState(page.locator('.nk-c-railbar-chip[aria-current]'));
    expect(chip.fill).toBe(CORAL);
    expect(chip.text).toBe(INK);
    // 10px mono on a coral fill: this is the pairing that has to be right.
    expect(contrast(chip.fill, chip.text)).toBeGreaterThanOrEqual(4.5);
    expect(chip.border).toBe(INK);
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

  /*
   * The pass above runs at the top of an empty page, and two of this page's
   * contrast bugs have hidden from exactly that: the intent card's note only
   * exists once a card is chosen, and the rail's current-section number only
   * exists once a section is current. A scan of the resting state is a scan
   * of the state nobody stays in.
   */
  test('axe-core is clean with chips selected and a section marked [P10]', async ({ page }) => {
    const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/contact');
      await fillEnough(page);
      await page.locator('.nk-c-budget').first().click();
      await page.locator('.nk-c-year-chip').first().click();
      await page.locator('.nk-c-month-chip').nth(2).click();
      await page.locator('.nk-c-chip').first().click();
      // Mid-page, so the mark is on a section rather than on the default.
      await scrollToSection(page, 'work');
      await page.waitForTimeout(700);

      const result = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(result.violations, `axe at ${width}px, filled and mid-scroll`).toEqual([]);
    }
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

  test('the section rail has no mark, and its links still work [D10, P3]', async ({ page }) => {
    // Narrow, so the chip bar is the visible half of the pair.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/contact');

    // No mark at all, rather than a mark stuck on the first section — the
    // attribute is written by script and there is no script.
    await expect(page.locator('.nk-c-rail-link[aria-current]')).toHaveCount(0);
    await expect(page.locator('.nk-c-railbar-chip[aria-current]')).toHaveCount(0);

    // Five links that navigate, which is what they were before any of this.
    const links = page.locator('.nk-c-railbar-chip');
    await expect(links).toHaveCount(5);
    await links.nth(2).click();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator('#work')).toBeInViewport();
  });
});
