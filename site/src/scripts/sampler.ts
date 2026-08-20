/**
 * The work sampler's projector swap.
 *
 * All eight fragments are already in the markup — one visible, seven carrying
 * the `hidden` attribute, which is what keeps every one of them in the static
 * HTML for crawlers and language models while removing the other seven from
 * layout and the accessibility tree at the same time. [P6, P10]
 *
 * This module never invents copy: it reads the tag and text off whichever
 * fragment it is revealing, straight from the DOM Astro already rendered from
 * `sampler.yaml`. There is no second copy of the eight lines living in a
 * JavaScript array. [P7]
 *
 * Auto-advance pauses off-screen and on `visibilitychange` — both are
 * necessary; the `IntersectionObserver` alone would keep ticking in a
 * background tab that happens to still have the section scrolled into place.
 * A manual pull is announced through a visually-hidden live region; the
 * automatic tick is not, so assistive tech is not narrated at every 3.8s.
 */
import { createLifecycle, readDuration, type Lifecycle } from './lifecycle';

const ROOT_SELECTOR = '.nk-sampler';
const FRAG_SELECTOR = '[data-sampler-frag]';
const PULL_SELECTOR = '[data-sampler-pull]';
const NUMBER_SELECTOR = '[data-sampler-no]';
const LIVE_SELECTOR = '[data-sampler-live]';

export function initSampler(): Lifecycle | null {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return null;

  const frags = Array.from(root.querySelectorAll<HTMLElement>(FRAG_SELECTOR));
  const pullButton = root.querySelector<HTMLButtonElement>(PULL_SELECTOR);
  const numberEl = root.querySelector<HTMLElement>(NUMBER_SELECTOR);
  const liveEl = root.querySelector<HTMLElement>(LIVE_SELECTOR);
  if (frags.length < 2 || !pullButton) return null;

  const life = createLifecycle();
  const intervalMs = readDuration('--nk-interval-sampler', 3800);

  let current = Math.max(
    0,
    frags.findIndex((frag) => !frag.hidden),
  );
  let parity: 'a' | 'b' = 'b'; // flips to 'a' on the very first swap

  const show = (index: number, announce: boolean): void => {
    const next = frags[index];
    const prev = frags[current];
    if (!next || next === prev) return;

    parity = parity === 'a' ? 'b' : 'a';
    prev?.setAttribute('hidden', '');
    next.hidden = false;
    next.dataset.parity = parity;
    current = index;

    if (numberEl) numberEl.textContent = String(index + 1).padStart(2, '0');

    if (liveEl && announce) {
      const tag = next.querySelector('[data-sampler-tag]')?.textContent?.trim() ?? '';
      const text = next.querySelector('[data-sampler-text]')?.textContent?.trim() ?? '';
      liveEl.textContent = [tag, text].filter(Boolean).join(' — ');
    }
  };

  const advance = (manual: boolean): void => {
    show((current + 1) % frags.length, manual);
  };

  let timerId = 0;
  const stop = (): void => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = 0;
  };
  const start = (): void => {
    if (timerId) return;
    timerId = window.setInterval(() => advance(false), intervalMs);
  };
  life.add(stop);

  // Reduced motion still lets the sampler advance — only the projector
  // flourish is dropped, and that drop happens in CSS, not here. [P1]
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) start();
        else stop();
      }
    },
    { threshold: 0.2 },
  );
  io.observe(root);
  life.add(() => io.disconnect());

  life.on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stop();
      return;
    }
    const rect = root.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < window.innerHeight;
    if (inView) start();
  });

  life.on(pullButton, 'click', () => {
    stop();
    advance(true);
    start();
  });

  return life;
}
