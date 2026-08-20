/**
 * The site's one client entry point.
 *
 * Four small modules, each independently optional, each returning a lifecycle
 * that owns its own timers and listeners. Nothing here coordinates anything:
 * the accent cycle does not know the header exists, and the mode drift does
 * not know what reads `data-mode`. They each write one attribute and stop.
 *
 * `initOpeningSequence()` is NOT called from here — it ships with its own
 * component so the sequence stays self-contained (see `OpeningSequence.astro`).
 *
 * Section-level modules (`sampler.ts`, `counters.ts`, `wordswap.ts`) belong to
 * the sections that need them and should mount from their own components, so
 * a page without that section does not pay for the code.
 */
import { initAccentCycle } from './accent';
import { initCursor } from './cursor';
import { initMode } from './mode';
import { initReveal } from './reveal';

export function initSite(): void {
  initReveal();
  initAccentCycle();
  initMode();
  initCursor();
}
