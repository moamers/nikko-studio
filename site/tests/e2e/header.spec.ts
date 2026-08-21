import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * §1 — the header, the mode dial and the mobile menu.
 *
 * Three risks are being held down here, and each test names the one it owns:
 *
 *   R1  the header has no mobile design. Below 1024px the row either wraps
 *       (no script) or collapses to a menu button (script). Both are tested,
 *       because the second one is the only one most people will ever see and
 *       the first one is the only one that always works.
 *   R9  every interactive target is at least 44x44 to a finger, WITHOUT the
 *       visual growing. That is why the assertions probe hit areas with
 *       `elementFromPoint` rather than measuring bounding boxes — a bounding
 *       box would report the 28px dial and miss the 44px overlay entirely.
 *   R10 `position: sticky` detaches the moment an ancestor becomes a scroll
 *       container. It is a one-line regression, so it is a four-viewport test.
 */

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
] as const;

/** Widths where the header collapses to logo + menu button. */
const NARROW = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
] as const;

/**
 * The header is chrome-gated: the opening sequence owns the screen for the
 * first 320vh and hides it. Everything below is about the header AFTER the
 * handoff, so every test starts by scrolling out of the runway.
 */
async function pastTheRunway(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3.6));
  await expect(page.locator('.nk-shell')).toHaveAttribute('data-nkhero-live', '1');
  await expect(page.locator('header')).toBeVisible();
  // The chrome gate reveals over `--nk-dur-chrome` (420ms) by translating the
  // bar back to 0. Measuring geometry mid-transition reads a header that is
  // three pixels short of pinned, which is the transition, not a bug.
  await page.waitForTimeout(600);
}

/**
 * True when the point lands on the element or on something inside it — which
 * is what "44px to a finger" actually means. A `::after` overlay reports its
 * originating element, so an invisible hit area passes and a small one does
 * not.
 */
async function hitAreaCovers(page: Page, selector: string, radius: number): Promise<boolean> {
  return page.evaluate(
    ({ selector: sel, radius: r }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const points: [number, number][] = [
        [cx - r, cy],
        [cx + r, cy],
        [cx, cy - r],
        [cx, cy + r],
      ];
      return points.every(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return !!hit && (hit === el || el.contains(hit));
      });
    },
    { selector, radius },
  );
}

/* ── The designed header, 1024px and up ─────────────────────────────────── */

test.describe('the header at the designed width', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('carries the logo, the nav, the dial and the CTA — and no menu button', async ({ page }) => {
    await page.goto('/');
    await pastTheRunway(page);

    await expect(page.locator('.nk-header .nk-logo')).toBeVisible();
    await expect(page.locator('.nk-header__link')).toHaveCount(3);
    await expect(page.locator('.nk-header__link').first()).toBeVisible();
    await expect(page.locator('.nk-header__dial .nk-dial')).toBeVisible();
    await expect(page.locator('.nk-header__cta')).toBeVisible();
    await expect(page.locator('.nk-header__menu')).toBeHidden();

    await page.screenshot({ path: 'test-results/header-1440.png', clip: { x: 0, y: 0, width: 1440, height: 140 } });
  });

  test('the skip link is outside the chrome gate, so it works during the sequence', async ({ page }) => {
    await page.goto('/');
    // Still inside the runway: the header itself is hidden here.
    await expect(page.locator('header')).toBeHidden();

    const skip = page.locator('.nk-skip');
    await skip.focus();
    await expect(skip).toBeVisible();
    await expect(skip).toHaveAttribute('href', '#main');
  });
});

/* ── The mode dial ──────────────────────────────────────────────────────── */

test.describe('the mode dial', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('pins the mode to localStorage and mirrors it in aria-pressed', async ({ page }) => {
    await page.goto('/');
    await pastTheRunway(page);

    const dial = page.locator('.nk-header__dial .nk-dial');
    await expect(dial).toHaveAttribute('aria-pressed', /true|false/);
    await expect(page.locator('html')).toHaveAttribute('data-mode', /analogue|digital/);

    const before = await page.locator('html').getAttribute('data-mode');
    await dial.click();

    const after = await page.locator('html').getAttribute('data-mode');
    expect(after).not.toBe(before);
    expect(await page.evaluate(() => localStorage.getItem('nk-mode'))).toBe(after);
    await expect(dial).toHaveAttribute('aria-pressed', String(after === 'analogue'));

    // Pinned: the dimmed "Auto" tell goes, and the title says so.
    await expect(dial.locator('[data-nk-mode-state]')).toHaveText('');
    expect(await dial.getAttribute('title')).toMatch(/pinned/i);
  });

  test('survives a localStorage that throws — Safari private mode [P3]', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('denied');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await pastTheRunway(page);
    await page.locator('.nk-header__dial .nk-dial').click();

    await expect(page.locator('html')).toHaveAttribute('data-mode', /analogue|digital/);
    expect(errors).toEqual([]);
  });
});

/* ── R1: the mobile header ──────────────────────────────────────────────── */

test.describe('R1 — the collapsed header', () => {
  for (const vp of NARROW) {
    test(`at ${vp.name}px the row is logo + menu button only`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      await pastTheRunway(page);

      await expect(page.locator('.nk-header .nk-logo')).toBeVisible();
      await expect(page.locator('.nk-header__menu')).toBeVisible();
      await expect(page.locator('.nk-header__nav')).toBeHidden();
      await expect(page.locator('.nk-header__cta')).toBeHidden();
      await expect(page.locator('.nk-header__dial')).toBeHidden();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('the menu opens, traps focus, closes on Esc and hands focus back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);

    const trigger = page.locator('[data-nk-menu-open]');
    const menu = page.locator('.nk-menu');

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();

    await trigger.click();
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nk-menu__link')).toHaveCount(3);
    await expect(page.locator('.nk-menu__dial .nk-dial')).toBeVisible();

    // The panel fades in over `--nk-dur-card`; screenshotting on `toBeVisible`
    // catches it half-way and reads as a transparent panel.
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/header-390-menu-open.png' });

    // `showModal()` puts focus inside and keeps it there. Tabbing off the last
    // control hands focus to the browser's own UI — `document.body` from the
    // page's point of view — and then back into the panel. What must never
    // happen is focus landing on the inert page behind it, so that is the
    // assertion: twelve tabs, more than a full cycle of the panel's controls,
    // and not one of them reaches the header underneath.
    expect(
      await page.evaluate(() => document.querySelector('.nk-menu')?.contains(document.activeElement)),
    ).toBe(true);

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return 'body';
        return document.querySelector('.nk-menu')?.contains(active) ? 'menu' : 'behind';
      });
      expect(where, `tab ${i + 1}`).not.toBe('behind');
    }
    expect(
      await page.evaluate(() => document.querySelector('.nk-menu')?.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('the close button has an accessible name and closes the panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);

    await page.locator('[data-nk-menu-open]').click();
    const close = page.locator('[data-nk-menu-close]');
    expect((await close.textContent())?.trim()).toBeTruthy();
    await close.click();
    await expect(page.locator('.nk-menu')).toBeHidden();
    await expect(page.locator('[data-nk-menu-open]')).toBeFocused();
  });

  test('the page behind the panel does not scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);

    await page.locator('[data-nk-menu-open]').click();
    await expect(page.locator('html')).toHaveClass(/nk-scroll-locked/);
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');

    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/nk-scroll-locked/);
  });

  test('opens and closes with no transition under prefers-reduced-motion', async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto('/');
    // Reduced motion collapses the runway to a single static frame, so the
    // sequence never runs and `data-nkhero-live` is never written. One screen
    // of scrolling is enough to reach the header.
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.4, behavior: 'instant' }));
    await expect(page.locator('header')).toBeVisible();

    await page.locator('[data-nk-menu-open]').click();
    await expect(page.locator('.nk-menu')).toBeVisible();
    await expect(page.locator('.nk-menu')).toHaveCSS('opacity', '1');
    await expect(page.locator('.nk-menu')).toHaveCSS('transition-property', 'none');

    await page.keyboard.press('Escape');
    await expect(page.locator('.nk-menu')).toBeHidden();
    await ctx.close();
  });

  test('following a same-page link closes the panel behind you', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);

    await page.locator('[data-nk-menu-open]').click();
    await page.locator('.nk-menu__link').first().click();
    await expect(page.locator('.nk-menu')).toBeHidden();
  });
});

/* ── R1 again: the same header with no script at all ────────────────────── */

test.describe('R1 — navigation works with JavaScript disabled [P1, P3]', () => {
  test.use({ javaScriptEnabled: false });

  for (const vp of VIEWPORTS) {
    test(`every nav link is on screen and reachable at ${vp.name}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');

      const links = page.locator('.nk-header__link');
      await expect(links).toHaveCount(3);
      for (let i = 0; i < 3; i += 1) {
        await expect(links.nth(i)).toBeVisible();
        await expect(links.nth(i)).toHaveAttribute('href', /^#/);
      }
      await expect(page.locator('.nk-header__cta')).toBeVisible();

      // The menu button and the dial are the two things that need a script.
      await expect(page.locator('.nk-header__menu')).toBeHidden();
      await expect(page.locator('.nk-header__dial')).toBeHidden();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('the wrapped row is what a 390px phone gets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-nk-js', '');

    // With no script the runway collapses to one screen and the header sits
    // below it, so it has to be scrolled to before it can be photographed.
    const box = await page.locator('header').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(60); // two rows, not one
    // `behavior: 'instant'` beats the stylesheet's `scroll-behavior: smooth`,
    // and `addStyleTag` is not available with scripting off.
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      (box?.y ?? 0) + 8,
    );
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'test-results/header-390-nojs.png',
      clip: { x: 0, y: 0, width: 390, height: 180 },
    });
  });
});

/* ── R10: the sticky header ─────────────────────────────────────────────── */

test.describe('R10 — the header stays pinned during scroll', () => {
  for (const vp of VIEWPORTS) {
    test(`pinned to the top at ${vp.name}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      await pastTheRunway(page);

      for (const depth of [4, 5.5]) {
        await page.evaluate((d) => window.scrollTo(0, window.innerHeight * d), depth);
        await page.waitForTimeout(120);
        const box = await page.locator('header').boundingBox();
        expect(box?.y ?? -1).toBeCloseTo(0, 0);
      }

      await page.screenshot({
        path: `test-results/header-${vp.name}.png`,
        clip: { x: 0, y: 0, width: vp.width, height: Math.min(200, vp.height) },
      });
    });
  }
});

/* ── R9: touch targets ──────────────────────────────────────────────────── */

test.describe('R9 — every target is 44x44 to a finger', () => {
  test('in the header row at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await pastTheRunway(page);

    for (const selector of [
      '.nk-header .nk-logo',
      '.nk-header__link:nth-of-type(1)',
      '.nk-header__link:nth-of-type(3)',
      '.nk-header__dial .nk-dial',
      '.nk-header__cta',
    ]) {
      expect(await hitAreaCovers(page, selector, 21), `${selector} hit area`).toBe(true);
    }
  });

  test('in the collapsed row and in the open menu at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);

    expect(await hitAreaCovers(page, '.nk-header .nk-logo', 21)).toBe(true);
    expect(await hitAreaCovers(page, '[data-nk-menu-open]', 21)).toBe(true);

    await page.locator('[data-nk-menu-open]').click();
    for (const selector of ['[data-nk-menu-close]', '.nk-menu__link', '.nk-menu__dial .nk-dial']) {
      expect(await hitAreaCovers(page, selector, 21), `${selector} hit area`).toBe(true);
    }
  });
});

/* ── axe-core ───────────────────────────────────────────────────────────── */

test.describe('axe-core', () => {
  test('the header is clean at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await pastTheRunway(page);

    const results = await new AxeBuilder({ page })
      .include('header')
      .include('.nk-skip')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the collapsed header and the open menu are clean at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pastTheRunway(page);
    await page.locator('[data-nk-menu-open]').click();
    await expect(page.locator('.nk-menu')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('header')
      .include('.nk-menu')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
