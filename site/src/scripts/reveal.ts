/**
 * The scroll-reveal fallback — and nothing else.
 *
 * Read `src/styles/reveal.css` first: it carries the reasoning. The short
 * version is that `.nk-reveal` is ALREADY in its final state in the
 * stylesheet, the native `animation-timeline: view()` path is preferred, and
 * this script exists only for browsers that do not have it.
 *
 * THE ORDER MATTERS AND IS NOT NEGOTIABLE:
 *
 *   1. Confirm the native feature is ABSENT.
 *   2. Only then add `.is-armed`, which is the only rule in the whole site
 *      that can make revealed content invisible.
 *   3. Reveal each element as it arrives.
 *
 * Because step 2 is unreachable unless this script is running, and this script
 * only ever runs alongside step 3, content can never be stranded invisible —
 * not with JavaScript off, not with a thrown error before step 2, not in a
 * browser that has the native path. [P1, P3]
 */
import { createLifecycle, prefersReducedMotion, type Lifecycle } from './lifecycle';

const SELECTOR = '.nk-reveal';

function hasNativeScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
}

export function initReveal(): Lifecycle | null {
  // Reduced motion: the stylesheet already shows everything, and arming would
  // be the one way to break that. Bail before touching the DOM.
  if (prefersReducedMotion()) return null;
  if (hasNativeScrollTimeline()) return null;
  if (typeof IntersectionObserver !== 'function') return null;

  const targets = document.querySelectorAll<HTMLElement>(SELECTOR);
  if (!targets.length) return null;

  const life = createLifecycle();
  const root = document.documentElement;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0 },
  );

  // Arm first, observe immediately after: anything already on screen is
  // reported by the observer on its first callback, so the top of the page
  // reveals at once rather than waiting for a scroll.
  root.classList.add('is-armed');
  for (const target of targets) observer.observe(target);

  life.add(() => {
    observer.disconnect();
    root.classList.remove('is-armed');
    for (const target of targets) target.classList.remove('is-visible');
  });

  return life;
}
