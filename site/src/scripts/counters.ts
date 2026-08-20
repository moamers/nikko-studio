/**
 * Animated counters — the coral "80" in Attention and the paper-panel "12+"
 * in Language.
 *
 * THE VALUE IS CONTENT, THE ANIMATION IS NOT. [P1, P3, P6] The number a
 * template renders — `{counter.value}{counter.suffix}` — is already correct
 * with no JavaScript, under `prefers-reduced-motion`, and to a crawler or a
 * language model reading the HTML. This module's only job, when motion is
 * allowed, is to hide that number for one paint, reset it to zero, and count
 * it back up to the value the DOM already told it. It never invents the
 * target: `data-count-target` on the element is read from the attribute the
 * template wrote, so the number is never duplicated as a literal here. [P7,
 * P11]
 *
 * Any element with `[data-count]` is a target — both the Attention "80" and
 * the Language "12+" match the same selector, so one call from either
 * section's mount script covers both. The `data-counters-armed` guard on
 * `<html>` makes a second call (the other section also mounts this module) a
 * no-op rather than a duplicate `IntersectionObserver`.
 */
import { createLifecycle, prefersReducedMotion, readDuration, type Lifecycle } from './lifecycle';

const SELECTOR = '[data-count]';
const THRESHOLD = 0.4;
const ARMED_ATTR = 'data-counters-armed';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function animateCounter(el: HTMLElement, life: Lifecycle, durationMs: number): void {
  const target = Number.parseInt(el.dataset.countTarget ?? '', 10);
  if (!Number.isFinite(target)) return; // Malformed markup: leave the shipped final value alone.
  const suffix = el.dataset.countSuffix ?? '';

  const start = performance.now();
  let rafId = 0;

  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / durationMs);
    const value = Math.round(target * easeOutCubic(t));
    el.textContent = `${value}${suffix}`;
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    }
  };

  el.textContent = `0${suffix}`;
  rafId = requestAnimationFrame(tick);
  life.add(() => cancelAnimationFrame(rafId));
}

/**
 * Arm the counters. Returns the lifecycle so a caller could tear it down, or
 * `null` when the module deliberately did nothing — reduced motion, no
 * `IntersectionObserver`, no counters on the page, or already armed by the
 * other section's mount script.
 */
export function initCounters(): Lifecycle | null {
  // Reduced motion: the shipped number is already right; resetting it to 0
  // and counting up would be the one way to make it briefly wrong. [P1, P3]
  if (prefersReducedMotion()) return null;
  if (typeof IntersectionObserver !== 'function') return null;

  const root = document.documentElement;
  if (root.hasAttribute(ARMED_ATTR)) return null;

  const elements = document.querySelectorAll<HTMLElement>(SELECTOR);
  if (!elements.length) return null;

  root.setAttribute(ARMED_ATTR, '');

  const durationMs = readDuration('--nk-dur-counter', 1100);
  const life = createLifecycle();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        animateCounter(entry.target as HTMLElement, life, durationMs);
      }
    },
    { threshold: THRESHOLD },
  );

  for (const el of elements) observer.observe(el);
  life.add(() => observer.disconnect());

  return life;
}
