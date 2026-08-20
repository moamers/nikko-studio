/**
 * §0 — the opening sequence scroll driver.
 *
 * A direct port of the client-supplied script in
 * `design-handoff/homepage/Nikko Homepage.dc.html` (lines 726–770). The six
 * property formulas, the easing and the beat thresholds are byte-identical to
 * the source; only the language, the chrome-gate polarity and the
 * reduced-motion bail-out differ. See `opening-sequence.css` for the full
 * rationale.
 *
 * It writes CSS custom properties and never touches layout, so the whole
 * sequence costs one rAF-throttled, passive scroll listener. [P4]
 */

/** Clamp to the 0–1 unit interval. Verbatim from the source. */
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/** `ease(v) = 1 - (1 - v)³`, clamped. Verbatim from the source. */
const ease = (value: number): number => 1 - Math.pow(1 - clamp(value), 3);

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Wire the stage to the scroll position.
 *
 * Returns a teardown function, or `null` when the sequence did not start —
 * because the stage is absent, or because the reader asked for reduced motion
 * and the stylesheet has already composed the single static frame.
 *
 * FAIL-SAFE: every bail-out below leaves the page untouched. Because the
 * chrome gate is inverted (chrome visible by default, hidden only once this
 * script explicitly claims the screen), a failure here can never strand the
 * reader on a page with no navigation. [P1, P3]
 */
export function initOpeningSequence(root: ParentNode = document): (() => void) | null {
  const stage = root.querySelector<HTMLElement>('.nkhero-stage');
  const shell = stage?.parentElement ?? null;
  if (!stage || !shell) return null;

  // The stylesheet collapses the stage to 100vh and forces the mark, title
  // and resolution visible. Driving it from scroll would fight that.
  if (prefersReducedMotion()) return null;

  let frame = 0;

  const update = (): void => {
    frame = 0;
    const rect = stage.getBoundingClientRect();
    const distance = Math.max(1, stage.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / distance);

    const opening = ease(progress / 0.29);
    const resolve = ease((progress - 0.19) / 0.34);
    const handoff = ease((progress - 0.6) / 0.25);
    const exit = ease((progress - 0.86) / 0.14);
    const signal = clamp(1 - Math.abs(progress - 0.54) / 0.095);
    const band = 0.002 + opening * (1 - handoff) * 0.31 + handoff * 0.048;

    stage.style.setProperty('--nkhero-opening', opening.toFixed(4));
    stage.style.setProperty('--nkhero-resolve', resolve.toFixed(4));
    stage.style.setProperty('--nkhero-handoff', handoff.toFixed(4));
    stage.style.setProperty('--nkhero-exit', exit.toFixed(4));
    stage.style.setProperty('--nkhero-signal', signal.toFixed(4));
    stage.style.setProperty('--nkhero-band', band.toFixed(4));
    stage.style.setProperty('--nkhero-image-shift', `${(1 - progress) * 8 - 4}%`);

    // Mirrored onto the DOM for anything downstream (mode drift, analytics).
    stage.dataset['nkheroProgress'] = progress.toFixed(4);
    stage.dataset['nkheroComplete'] = progress >= 0.995 ? 'true' : 'false';

    // "1" hands the screen back to the site; "0" holds the chrome out of the
    // way while the sequence owns it. Inverted from the source — see the CSS.
    shell.setAttribute('data-nkhero-live', exit > 0.02 ? '1' : '0');
  };

  const tick = (): void => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // Apply the first state, flush it, and only then arm the 420ms chrome
  // transition — otherwise booting the sequence fades the header out in front
  // of the reader instead of it simply not being there yet.
  update();
  void stage.offsetHeight;
  shell.setAttribute('data-nkhero-armed', '');

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick, { passive: true });

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', tick);
    window.removeEventListener('resize', tick);
    shell.removeAttribute('data-nkhero-live');
    shell.removeAttribute('data-nkhero-armed');
  };
}
