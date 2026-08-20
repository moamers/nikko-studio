import { test, expect, type Page } from '@playwright/test';

/**
 * The foundations' load-bearing guarantees. These are not smoke tests — each
 * one is a principle that was expensive to get right and would be cheap to
 * break by accident.
 */

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
] as const;

async function scrollToBottom(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
}

test.describe('page shell', () => {
  for (const vp of VIEWPORTS) {
    test(`no horizontal scroll at ${vp.name}px [P2]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('every id is unique — the source shipped two #top elements', async ({ page }) => {
    await page.goto('/');
    const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('top');
  });

  test('the #top anchor resolves to the opening sequence, not the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#top')).toHaveClass(/nkhero-stage/);
  });

  test('the document declares en-GB', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });
});

test.describe('the chrome gate is inverted [P1, P3]', () => {
  test.use({ javaScriptEnabled: false });

  test('with JavaScript disabled the header is present and usable', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('opacity', '1');
    await expect(header).toHaveCSS('visibility', 'visible');
    // Scoped to the header on purpose. The same CTA now also appears in the
    // hero, founder and services sections, so an unscoped locator resolves to
    // four elements and trips strict mode. The assertion here is about the
    // HEADER's nav surviving with JS off, not about the CTA existing at all.
    await expect(header.getByRole('link', { name: /pitch your project/i })).toBeVisible();

    // The nav links must be reachable too — without JS the mobile menu cannot
    // open, so they have to be in the flow rather than behind a dialog. [P3]
    for (const label of [/the work/i, /put us to work/i, /founder/i]) {
      await expect(header.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('with JavaScript disabled the runway collapses to one screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const stage = await page.locator('.nkhero-stage').boundingBox();
    // 320vh of runway with no driver would be three screens of nothing.
    expect(stage?.height).toBeLessThanOrEqual(900);
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('the opening sequence', () => {
  test('drives a 320vh runway and hands off to the header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const stage = page.locator('.nkhero-stage');
    expect((await stage.boundingBox())?.height).toBeCloseTo(900 * 3.2, 0);

    // The sequence owns the screen at the top of the runway...
    await expect(page.locator('.nk-shell')).toHaveAttribute('data-nkhero-live', '0');
    await expect(page.locator('header')).toBeHidden();

    // ...and hands it back at the end.
    await scrollToBottom(page);
    await expect(page.locator('.nk-shell')).toHaveAttribute('data-nkhero-live', '1');
    await expect(page.locator('header')).toBeVisible();
    await expect(stage).toHaveAttribute('data-nkhero-complete', 'true');
  });

  test('collapses to a single static frame under prefers-reduced-motion', async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto('/');
    expect((await page.locator('.nkhero-stage').boundingBox())?.height).toBeLessThanOrEqual(900);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('.nkhero-title')).toHaveCSS('opacity', '1');
    await ctx.close();
  });

  test('logs no console or page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/');
    await scrollToBottom(page);
    expect(errors).toEqual([]);
  });
});
