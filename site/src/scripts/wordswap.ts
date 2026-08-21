/**
 * The Joyride word swap.
 *
 * A real `<button>`, so it is keyboard-operable with zero extra code — Enter
 * and Space already activate it natively.
 *
 * BOTH states ship in the markup: "Khara" lives in the live, always-rendered
 * button; "Kaka" lives in a `hidden` list right beside it, in plain text —
 * present for every crawler and language model, never assembled from a
 * string in this file. [P6, P7] This module reads both records off the DOM
 * once, on init, and from then on only ever writes one of those two records
 * back onto the live node — never a third, invented value.
 *
 * Because the live node is the SAME element every time, `latin`'s
 * `color`/`data-colour` change is a genuine CSS transition, not a DOM swap —
 * which is what makes the 320ms colour crossfade in the design possible.
 * Reduced motion drops the transition automatically (`base.css`'s blanket
 * rule); the control itself keeps working. [P1]
 *
 * The prototype's `swapWord` also wrote a `localStorage` "mark" through
 * `addMark()` for a residue rail that has no UI anywhere in this build.
 * Deliberately not reproduced — a dead write with no reader is worse than no
 * write at all. [P13]
 */
import { createLifecycle, type Lifecycle } from './lifecycle';

interface WordState {
  colour: string;
  latin: string;
  arabic: string;
  hint: string;
  note: string;
}

/** Trimmed so incidental whitespace from how the markup happens to be
 * indented never becomes part of the copy — "" must stay "", not "\n  ". */
function text(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function readField(scope: ParentNode, name: string): string {
  return text(scope.querySelector(`[data-field="${name}"]`));
}

export function initWordSwap(): Lifecycle | null {
  const root = document.querySelector<HTMLElement>('.nk-joyride__swap');
  if (!root) return null;

  const button = root.querySelector<HTMLButtonElement>('[data-swap-button]');
  const latinEl = root.querySelector<HTMLElement>('[data-swap-latin]');
  const arabicEl = root.querySelector<HTMLElement>('[data-swap-arabic]');
  const hintEl = root.querySelector<HTMLElement>('[data-swap-hint]');
  const noteEl = root.querySelector<HTMLElement>('[data-swap-note]');
  const logoEl = root.querySelector<HTMLElement>('[data-swap-logo]');
  const altItem = root.querySelector<HTMLElement>('[data-swap-alt] li');

  if (!button || !latinEl || !arabicEl || !hintEl || !noteEl || !altItem) return null;

  const primary: WordState = {
    colour: latinEl.dataset.colour ?? '',
    latin: text(latinEl),
    arabic: text(arabicEl),
    hint: text(hintEl),
    note: text(noteEl),
  };

  const alternate: WordState = {
    colour: altItem.dataset.colour ?? '',
    latin: readField(altItem, 'latin'),
    arabic: readField(altItem, 'arabic'),
    hint: readField(altItem, 'hint'),
    note: readField(altItem, 'note'),
  };

  const states: [WordState, WordState] = [primary, alternate];
  let index: 0 | 1 = 0;

  const apply = (state: WordState): void => {
    latinEl.textContent = state.latin;
    latinEl.dataset.colour = state.colour;
    arabicEl.textContent = state.arabic;
    hintEl.textContent = state.hint;
    noteEl.textContent = state.note;
    if (logoEl) logoEl.dataset.colour = state.colour;
  };

  const life = createLifecycle();

  life.on(button, 'click', () => {
    index = index === 0 ? 1 : 0;
    apply(states[index]);
  });

  return life;
}
