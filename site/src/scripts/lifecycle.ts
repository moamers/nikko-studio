/**
 * One place that owns every timer, listener and animation frame.
 *
 * docs/05 § "Performance rules for motion": *"Every timer and listener is
 * registered through one lifecycle helper so nothing leaks and everything can
 * be torn down in one call"* — and *"Nothing animates off-screen … everything
 * pauses on `visibilitychange`."*
 *
 * A module that uses this helper gets both properties for free:
 *
 *   - `destroy()` removes everything it registered, in one call.
 *   - While the tab is hidden its intervals are cleared and its rAF loops are
 *     cancelled; both resume when the tab comes back. No work is done for a
 *     tab nobody is looking at. [P4]
 *
 * Deliberately tiny. It is not an animation framework and it is not a
 * scheduler — it is a bag of teardowns with a visibility switch. [P14]
 */

type Cleanup = () => void;

export interface Lifecycle {
  /** `addEventListener`, removed on `destroy()`. */
  on<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  on<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;

  /** A repeating timer that stops while the tab is hidden. */
  every(intervalMs: number, run: () => void): void;

  /** A `requestAnimationFrame` loop that stops while the tab is hidden. */
  loop(frame: () => void): void;

  /** Anything else that needs undoing — an observer, a DOM node, a class. */
  add(cleanup: Cleanup): void;

  /** True while the tab is visible and the loops are running. */
  readonly running: boolean;

  /** Tear everything down. Safe to call twice. */
  destroy(): void;
}

interface Repeater {
  intervalMs: number;
  run: () => void;
  id: number;
}

interface Loop {
  frame: () => void;
  id: number;
}

export function createLifecycle(): Lifecycle {
  const cleanups: Cleanup[] = [];
  const repeaters: Repeater[] = [];
  const loops: Loop[] = [];
  let destroyed = false;
  let running = true;

  const startRepeater = (repeater: Repeater): void => {
    if (repeater.id) return;
    repeater.id = window.setInterval(repeater.run, repeater.intervalMs);
  };

  const stopRepeater = (repeater: Repeater): void => {
    if (!repeater.id) return;
    window.clearInterval(repeater.id);
    repeater.id = 0;
  };

  const startLoop = (loop: Loop): void => {
    if (loop.id) return;
    const step = (): void => {
      loop.id = requestAnimationFrame(step);
      loop.frame();
    };
    loop.id = requestAnimationFrame(step);
  };

  const stopLoop = (loop: Loop): void => {
    if (!loop.id) return;
    cancelAnimationFrame(loop.id);
    loop.id = 0;
  };

  const onVisibilityChange = (): void => {
    if (destroyed) return;
    const visible = document.visibilityState !== 'hidden';
    if (visible === running) return;
    running = visible;
    if (visible) {
      repeaters.forEach(startRepeater);
      loops.forEach(startLoop);
    } else {
      repeaters.forEach(stopRepeater);
      loops.forEach(stopLoop);
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    on(
      target: EventTarget,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions,
    ): void {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    },

    every(intervalMs: number, run: () => void): void {
      const repeater: Repeater = { intervalMs, run, id: 0 };
      repeaters.push(repeater);
      if (running) startRepeater(repeater);
      cleanups.push(() => stopRepeater(repeater));
    },

    loop(frame: () => void): void {
      const loop: Loop = { frame, id: 0 };
      loops.push(loop);
      if (running) startLoop(loop);
      cleanups.push(() => stopLoop(loop));
    },

    add(cleanup: Cleanup): void {
      cleanups.push(cleanup);
    },

    get running(): boolean {
      return running;
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      while (cleanups.length) cleanups.pop()?.();
    },
  } as Lifecycle;
}

/** `true` when the reader has asked for less movement. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Read a duration token off `<html>` and return it in milliseconds.
 *
 * Values flow one direction: CSS custom properties are the source, JavaScript
 * reads them. A duration typed into a `.ts` file would be a second copy of a
 * number that already exists in `tokens.css`. [P11]
 */
export function readDuration(property: string, fallbackMs: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  if (!raw) return fallbackMs;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallbackMs;
  return raw.endsWith('ms') ? value : value * 1000;
}

/** Read a unitless number token off `<html>`. */
export function readNumber(property: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}
