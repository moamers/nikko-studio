/**
 * The cursor residue trail.
 *
 * A wide blurred aperture trails the pointer, dropping a faint "slot mark" —
 * the logo's slot, not a dot — every 110ms, which fades and contracts over
 * 820ms. (handoff § Cursor, docs/05 § 4.)
 *
 * TWO DEPARTURES FROM THE PROTOTYPE, both deliberate:
 *
 * 1. A FIXED RECYCLED POOL. The prototype calls `createElement` and `remove()`
 *    every 110ms — roughly nine nodes a second, for the life of the page, with
 *    a `setTimeout` each. Here ten nodes are created once and cycled by index,
 *    restarting the animation on reuse. Identical visual result, bounded
 *    memory, no GC churn. P4 names this one explicitly.
 *
 * 2. NO COLOUR IN THIS FILE. Both gradients, both blend modes and both residue
 *    colours live in `cursor.css`, keyed off `data-mode`. This script writes
 *    only geometry and opacity. [P11]
 *
 * Gated off entirely unless ALL of: motion is allowed, the pointer is fine,
 * and the viewport is at least 1024px. It is decoration for a mouse. [P2]
 */
import { createLifecycle, prefersReducedMotion, readDuration, readNumber, type Lifecycle } from './lifecycle';

function allowed(): boolean {
  if (prefersReducedMotion()) return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches;
}

export function initCursor(): Lifecycle | null {
  if (!allowed()) return null;

  const life = createLifecycle();

  const layer = document.createElement('div');
  layer.className = 'nk-cursor';
  layer.setAttribute('aria-hidden', 'true');
  // Opts into the opening sequence's chrome gate, like the header.
  layer.setAttribute('data-nk-chrome', 'true');

  const lens = document.createElement('span');
  lens.className = 'nk-cursor__lens';
  layer.append(lens);

  const poolSize = Math.max(1, Math.round(readNumber('--nk-residue-pool', 10)));
  const marks: HTMLSpanElement[] = [];
  for (let i = 0; i < poolSize; i += 1) {
    const mark = document.createElement('span');
    mark.className = 'nk-cursor__mark';
    marks.push(mark);
    layer.append(mark);
  }

  document.body.append(layer);
  life.add(() => layer.remove());

  const dropEveryMs = readDuration('--nk-interval-residue', 110);
  const idleMs = readDuration('--nk-cursor-idle', 900);
  const lerp = readNumber('--nk-cursor-lerp', 0.12);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let targetX = x;
  let targetY = y;
  let lastDrop = 0;
  let idleTimer = 0;
  let cursor = 0;

  life.loop(() => {
    x += (targetX - x) * lerp;
    y += (targetY - y) * lerp;
    lens.style.transform = `translate(${x}px, ${y}px)`;
  });

  const dropMark = (px: number, py: number): void => {
    const mark = marks[cursor];
    cursor = (cursor + 1) % marks.length;
    if (!mark) return;

    const width = 16 + Math.random() * 10;
    const tilt = (Math.random() * 5 - 2.5).toFixed(1);
    mark.style.width = `${width}px`;
    mark.style.transform = `translate(${px - width / 2}px, ${py - 1}px) rotate(${tilt}deg)`;

    // Restart the CSS animation on a node that is very likely still running
    // it. Removing the attribute, forcing a reflow and setting it again is the
    // cheapest reliable restart, and keeps the timing in the stylesheet.
    mark.removeAttribute('data-live');
    void mark.offsetWidth;
    mark.setAttribute('data-live', 'true');
  };

  life.on(
    window,
    'pointermove',
    (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      lens.style.opacity = '1';

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        lens.style.opacity = '0.45';
      }, idleMs);

      const now = performance.now();
      if (now - lastDrop < dropEveryMs) return;
      lastDrop = now;
      dropMark(event.clientX, event.clientY);
    },
    { passive: true },
  );

  life.on(document, 'pointerleave', () => {
    lens.style.opacity = '0';
  });

  life.add(() => window.clearTimeout(idleTimer));

  return life;
}
