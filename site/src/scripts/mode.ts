/**
 * Analogue / digital mode.
 *
 * Unpinned, it drifts with scroll depth: analogue above 52% of the scrollable
 * height, digital below. Clicking the dial pins the choice. (handoff
 * § "Analogue / digital mode", docs/05 § 2.)
 *
 * ONE ATTRIBUTE on <html>; CSS does everything else. `tokens.css` maps
 * `data-mode` to `--nk-grain`, `--nk-img-filter` and `--nk-misreg`, so no
 * consumer of the mode needs to know this file exists.
 *
 * ANALOGUE IS THE RESTING STATE. With no JavaScript there is no `data-mode`
 * attribute at all, and `:root` already carries the analogue values — so the
 * page a crawler or a locked-down browser sees is the one the design opens
 * with, not an unstyled third thing. [P1, P3]
 *
 * Every user-facing string on the dial comes off the element as a `data-*`
 * attribute, put there from `settings/site.yaml`. No label is typed here. [P7]
 */
import { createLifecycle, readNumber, type Lifecycle } from './lifecycle';

export type Mode = 'analogue' | 'digital';

const STORAGE_KEY = 'nk-mode';

/**
 * `localStorage` throws in Safari private mode and in some in-app webviews.
 * Both accessors swallow it: mode pinning degrades to auto-drift, which is
 * the correct failure. (docs/07 § "Things … not possible as specified", 7.)
 */
function readPinned(): Mode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'analogue' || value === 'digital' ? value : null;
  } catch {
    return null;
  }
}

function writePinned(mode: Mode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Pinning is a nicety. Losing it is not worth an error. */
  }
}

/**
 * The header mounts this itself, because the dial is useless without it and
 * the header is the only thing on the page that renders a dial. `site.ts`
 * mounts it too, for pages that have no header. Whichever runs first wins and
 * the other gets an inert lifecycle — two sets of click handlers on one dial
 * would toggle the mode twice per press and look like a dead button. [P14]
 */
let mounted: Lifecycle | null = null;

export function initMode(): Lifecycle {
  if (mounted) return mounted;

  const root = document.documentElement;
  const life = createLifecycle();
  mounted = life;
  life.add(() => {
    mounted = null;
  });

  let pinned: Mode | null = readPinned();
  let auto: Mode = 'analogue';
  let applied: Mode | null = null;

  const dials = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-nk-mode-dial]'));

  const apply = (): void => {
    const mode = pinned ?? auto;

    // Write only on an actual state change — this runs off a scroll listener.
    if (mode !== applied) {
      applied = mode;
      root.setAttribute('data-mode', mode);
    }

    const analogue = mode === 'analogue';
    for (const dial of dials) {
      const data = dial.dataset;
      dial.setAttribute('aria-pressed', String(analogue));
      dial.title =
        (pinned ? (data['notePinned'] ?? '') : (data['noteAuto'] ?? '')) +
        (analogue ? (data['noteAnalogue'] ?? '') : (data['noteDigital'] ?? ''));

      const label = dial.querySelector<HTMLElement>('[data-nk-mode-label]');
      if (label) label.textContent = analogue ? (data['labelAnalogue'] ?? '') : (data['labelDigital'] ?? '');

      // The "Auto" tell disappears once the reader has pinned a choice.
      const state = dial.querySelector<HTMLElement>('[data-nk-mode-state]');
      if (state) state.textContent = pinned ? '' : (dial.dataset['labelAuto'] ?? '');
    }
  };

  // ── Drift ────────────────────────────────────────────────────────────────
  // The 52% threshold is the handoff's; it lives in `tokens.css` so it is not
  // a magic number in a script. [P11, P14]
  const threshold = readNumber('--nk-mode-flip', 0.52);
  let frame = 0;

  const measure = (): void => {
    frame = 0;
    if (pinned) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const depth = max > 0 ? window.scrollY / max : 0;
    const next: Mode = depth > threshold ? 'digital' : 'analogue';
    if (next === auto) return;
    auto = next;
    apply();
  };

  const onScroll = (): void => {
    if (!frame) frame = requestAnimationFrame(measure);
  };

  life.on(window, 'scroll', onScroll, { passive: true });
  life.on(window, 'resize', onScroll, { passive: true });
  life.add(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  // ── The dial ─────────────────────────────────────────────────────────────
  for (const dial of dials) {
    life.on(dial, 'click', () => {
      pinned = (pinned ?? auto) === 'analogue' ? 'digital' : 'analogue';
      writePinned(pinned);
      apply();
    });
  }

  apply();
  measure();

  return life;
}
