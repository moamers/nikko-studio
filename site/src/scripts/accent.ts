/**
 * The accent cycle.
 *
 * Three states rotate on a timer — Horizon, Last light, Offshore — driving the
 * page ground, the logo stripe, every button's slot bar, the header veil, the
 * language panel and the footer logo.
 *
 * ZERO RE-RENDERS. The prototype threads the accent through twenty-odd inline
 * styles and re-renders the whole page every twelve seconds. Here it is ONE
 * attribute write on <html>. `tokens.css` maps that attribute to the four live
 * properties — `--nk-accent`, `--nk-ground`, `--nk-veil`, `--nk-on-accent` —
 * and every consumer declares its own `transition`, so the 2600ms crossfade
 * costs nothing and is never coordinated in JavaScript. (docs/05 § 1.)
 *
 * Why an attribute rather than four `setProperty` calls: the hex values and
 * the ink/paper pairing that goes with each state are design tokens. Copying
 * them into this file would be a second source of truth for six colours, which
 * P11 forbids outright — *"Duplicating a token into a JS config and a
 * stylesheet"*. The attribute is the whole state; the stylesheet owns what it
 * means. Changing an accent hex is a one-line edit in `tokens.css` and this
 * file never learns about it.
 */
import { createLifecycle, prefersReducedMotion, readDuration, type Lifecycle } from './lifecycle';

/** The rotation order. Each name has a matching rule in `tokens.css`. */
const STATES = ['horizon', 'last-light', 'offshore'] as const;

export type AccentState = (typeof STATES)[number];

/**
 * Start the cycle. Returns the lifecycle so a caller can tear it down, or
 * `null` when the cycle deliberately did not start.
 *
 * Under `prefers-reduced-motion` the ground is held at base paper permanently
 * — the direction document's explicit instruction — and no timer is created.
 */
export function initAccentCycle(): Lifecycle | null {
  const root = document.documentElement;

  if (prefersReducedMotion()) {
    root.setAttribute('data-accent', 'held');
    return null;
  }

  // The hold is a taste knob the prototype exposes as a prop, so it lives in
  // `tokens.css` as `--nk-accent-cycle-hold` and is read, never typed. Tests
  // shorten it by overriding that one property.
  const holdMs = readDuration('--nk-accent-cycle-hold', 12_000);

  let index = 0;
  root.setAttribute('data-accent', STATES[0] as AccentState);

  const life = createLifecycle();
  life.every(holdMs, () => {
    index = (index + 1) % STATES.length;
    root.setAttribute('data-accent', STATES[index] as AccentState);
  });
  life.add(() => root.removeAttribute('data-accent'));

  return life;
}
