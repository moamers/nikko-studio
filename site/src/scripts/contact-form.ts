/**
 * Progressive enhancement for the enquiry form.
 *
 * The `<form action="/api/enquiry" method="POST">` in `EnquiryForm.astro`
 * already works with JavaScript off: every field ships in one document, the
 * browser posts it, and whatever `/api/enquiry` does with that is that
 * endpoint's business, not this file's. [P3]
 *
 * Everything below is additive:
 *   - inline validation that mirrors `src/lib/enquiry/validate.ts`'s rules,
 *     so a mistake is caught before a round trip, with focus moved to the
 *     first invalid field and an `aria-live` summary near the button;
 *   - an AJAX submit that swaps the form for a receipt without a page
 *     reload, tolerant of `functions/api/enquiry.ts`'s actual JSON shape
 *     (`{ ok: true, reference }` / `{ ok: false, errors: [{field,message}] }`)
 *     or nothing at all — a network error or an unexpected response falls
 *     back to a status message rather than losing the visitor's answers;
 *   - reading the query string a no-JS submit round-trips through
 *     (`?enquiry=invalid&fields=business,email#enquiry`, per the same
 *     endpoint's redirect contract) and rendering it the same way a client
 *     validation failure would, so a visitor without JavaScript still gets
 *     inline errors and a scroll-to-first-mistake, just one page load later;
 *   - an autosave of every answer to `localStorage['nk-brief-draft']`,
 *     restored on load, behind a switch the visitor owns and can see;
 *   - a live summary of the visitor's answers in the left rail, stamped one
 *     chip per value as the form fills in;
 *   - a live word count on "the reason", a deselectable pronoun chip, and a
 *     cosmetic grey-out of the month grid when "Flexible" is chosen (purely
 *     visual — the server already discards `month` whenever `year` is
 *     flexible, so there is nothing load-bearing here).
 *
 * None of this runs, or needs to run, for the form to be submittable. [P1]
 */

const DRAFT_KEY = 'nk-brief-draft';
/** The switch's own state. Absent means "never touched it", which is ON. */
const AUTOSAVE_KEY = 'nk-brief-autosave';
const PROBE_KEY = 'nk-storage-probe';
const FORM_SELECTOR = '[data-contact-form]';

const NOTE_RESTORED =
  'Picked up where you left off — autosave is keeping this on your device only. Switch it off to clear it.';
const NOTE_ON = 'Autosave on. Answers are kept on this device until you send them.';
const NOTE_OFF = 'Autosave off. The saved copy has been deleted from this device.';

interface FieldError {
  field: string;
  message: string;
}

interface OptionGroups {
  [group: string]: Record<string, string>;
}

/** Mirrors `MIN_LENGTH` / `FIELDS` in `src/lib/enquiry/validate.ts`. */
const TEXT_RULES: Array<{ name: string; label: string; min?: number }> = [
  { name: 'business', label: 'Business name' },
  { name: 'name', label: 'Your name' },
  { name: 'why', label: "What's broken, missing or holding things back", min: 12 },
  { name: 'goals', label: 'What "this worked" looks like', min: 8 },
];

const GROUP_RULES: Array<{ name: string; label: string; multiple?: boolean }> = [
  { name: 'intent', label: 'What needs to move' },
  { name: 'outputs', label: 'What you need', multiple: true },
  { name: 'year', label: 'Target timing' },
  { name: 'budget', label: 'Ballpark budget' },
];

/** A generic "X is required" message for the no-JS redirect path, which only
 * carries field names back (`?fields=business,email`), never messages. */
const FIELD_LABELS: Record<string, string> = {
  business: 'Business name',
  name: 'Your name',
  email: 'Email',
  intent: 'What needs to move',
  outputs: 'What you need',
  why: "What's broken, missing or holding things back",
  goals: 'What "this worked" looks like',
  year: 'Target timing',
  month: 'Target timing',
  budget: 'Ballpark budget',
};

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>(FORM_SELECTOR);
  if (!form) return;

  const success = document.querySelector<HTMLElement>('[data-contact-success]');
  const status = document.querySelector<HTMLElement>('[data-contact-status]');
  const summary = document.querySelector<HTMLElement>('#form-error-summary');
  const reopen = document.querySelector<HTMLButtonElement>('[data-contact-reopen]');
  const options = readOptions();

  wireAutosave(form);
  wireRailSummary(form, options);
  wireWordCount(form);
  wirePronounToggle(form);
  wireTimingGate(form);
  applyServerRedirectState(form, summary, status);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors(form);

    const errors = validate(form);
    if (errors.length > 0) {
      applyErrors(form, errors, summary);
      return;
    }

    if (summary) summary.textContent = '';
    void submit(form, options, success, status);
  });

  reopen?.addEventListener('click', () => {
    if (!success || !form) return;
    success.hidden = true;
    form.closest('[data-contact-root]')?.removeAttribute('data-sent');
    form.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
    form.querySelector<HTMLElement>('input, textarea')?.focus();
  });
}

/* ── Draft autosave, under a switch the visitor owns ──────────────────────
 *
 * History, because the comment that used to sit here said the opposite.
 *
 * This file autosaved the whole form to `localStorage['nk-brief-draft']` and
 * restored it on load. That was removed in 9889221 for a real reason: a hard
 * refresh is the one gesture a visitor has for "start again", and a form that
 * silently repopulated itself had taken that away — with nothing on the page
 * to say it had happened or to stop it.
 *
 * The fix for that was never to delete the feature; it was to stop it being
 * silent. A four-minute form that quietly loses everything to a closed tab is
 * its own kind of hostile. So autosave is back, and the invisible half is
 * what is gone: there is a switch at the top of the page, it says whether
 * autosave is on, and the visitor decides.
 *
 * The rules it keeps:
 *   - ON by default, for a visitor who has never expressed a view;
 *   - the switch's own state persists under its own key, so someone who
 *     turns it off stays off on their next visit — the preference is not
 *     part of the draft it controls, and must outlive it;
 *   - turning it OFF deletes the stored draft in the same tick. Stopping the
 *     writer but keeping the file is not what "off" means to anyone, and
 *     leaving a copy of someone's answers behind after they opted out is the
 *     wrong behaviour whatever the intent;
 *   - turning it ON starts saving from that moment, with what is on screen;
 *   - when a draft IS restored, the page says so, quietly, and says how to
 *     get rid of it. Answers reappearing with no explanation is the original
 *     complaint, and it is not fixed by a switch the visitor never read.
 *
 * Every storage call stays inside try/catch: Safari's private mode throws on
 * `setItem`, and a form that cannot be filled in because saving it failed
 * would be a far worse bug than not saving it. If storage is unavailable at
 * all, the switch never unhides — see `wireAutosave`. [P3]
 *
 * `EnquiryForm.astro` keeps `autocomplete="off"` on the <form>. That is a
 * different mechanism and still unwanted: the BROWSER's form-state
 * restoration is untitled, unexplained and uncontrollable from here, which
 * is exactly what this replaces it with the opposite of.
 */

/**
 * Whether `localStorage` can actually be written. Reading alone is not
 * enough of a test — Safari's private mode hands back a working-looking
 * object that throws only on `setItem`, so the probe has to write. [P3]
 */
function storageAvailable(): boolean {
  try {
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function autosaveEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOSAVE_KEY) !== 'off';
  } catch {
    return false;
  }
}

function wireAutosave(form: HTMLFormElement): void {
  const panel = document.querySelector<HTMLElement>('[data-autosave]');
  const toggle = document.querySelector<HTMLInputElement>('[data-autosave-toggle]');
  const state = document.querySelector<HTMLElement>('[data-autosave-state]');
  const note = document.querySelector<HTMLElement>('[data-autosave-note]');
  if (!panel || !toggle) return;

  // No storage, no feature, and therefore no control. The markup ships the
  // switch `hidden`; not unhiding it here is the whole of the no-JS and
  // no-storage story. A visible switch on this page is a promise that
  // flipping it does something. [P3]
  if (!storageAvailable()) return;

  let on = autosaveEnabled();
  toggle.checked = on;
  if (state) state.textContent = on ? 'on' : 'off';
  panel.hidden = false;

  if (on) {
    if (restoreDraft(form)) setNote(note, NOTE_RESTORED);
  } else {
    // Belt and braces for a draft written by an older build, or left by a
    // tab that was open when the switch was turned off somewhere else.
    clearStoredDraft();
  }

  const save = () => {
    if (on) saveDraft(form);
  };
  form.addEventListener('input', save);
  form.addEventListener('change', save);

  // The switch lives in the intro, outside the <form>, so this listener and
  // the two above can never see each other's events.
  toggle.addEventListener('change', () => {
    on = toggle.checked;
    if (state) state.textContent = on ? 'on' : 'off';
    try {
      localStorage.setItem(AUTOSAVE_KEY, on ? 'on' : 'off');
    } catch {
      // Storage worked a moment ago (the probe passed) and has stopped. The
      // switch still reflects what this page will do for the rest of the
      // session, which is the honest thing to show.
    }
    if (on) {
      saveDraft(form);
      setNote(note, NOTE_ON);
    } else {
      clearStoredDraft();
      setNote(note, NOTE_OFF);
    }
  });
}

/** Unhide first, then write: a `role="status"` region that was `hidden` at
 * the moment of the change is not announced by every screen reader. */
function setNote(note: HTMLElement | null, text: string): void {
  if (!note) return;
  note.hidden = false;
  note.textContent = text;
}

function saveDraft(form: HTMLFormElement): void {
  try {
    const data = new FormData(form);
    data.delete('nk_hp');
    const draft: Record<string, string | string[]> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value !== 'string') continue;
      if (key in draft) {
        const existing = draft[key];
        draft[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
      } else {
        draft[key] = value;
      }
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private browsing / storage disabled — the form still works without it.
  }
}

/** Returns whether anything was actually put back, so the caller knows
 * whether there is something to explain to the visitor. */
function restoreDraft(form: HTMLFormElement): boolean {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  let draft: Record<string, string | string[]>;
  try {
    draft = JSON.parse(raw);
  } catch {
    return false;
  }

  let applied = false;
  for (const [key, value] of Object.entries(draft)) {
    const values = Array.isArray(value) ? value : [value];
    const fields = form.elements.namedItem(key);
    if (!fields) continue;

    if (fields instanceof RadioNodeList) {
      for (const node of Array.from(fields)) {
        if (node instanceof HTMLInputElement && values.includes(node.value)) {
          node.checked = true;
          applied = true;
        }
      }
    } else if (fields instanceof HTMLInputElement) {
      if (fields.type === 'checkbox' || fields.type === 'radio') {
        fields.checked = values.includes(fields.value);
        if (fields.checked) applied = true;
      } else {
        fields.value = values[0] ?? '';
        if (fields.value) applied = true;
      }
    } else if (fields instanceof HTMLTextAreaElement) {
      fields.value = values[0] ?? '';
      if (fields.value) applied = true;
    }
  }

  updateWordCount(form);
  updateTimingGate(form);
  return applied;
}

function clearStoredDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private browsing / storage disabled — nothing to clear, nothing to do.
  }
}

/* ── Rail selection summary ("gathered fragments") ─────────────────────── */

interface Fragment {
  /** Stable identity, so a chip that hasn't changed is never re-stamped. */
  key: string;
  label: string;
  tone: 'ink' | 'cobalt' | 'yellow' | 'turquoise' | 'coral';
}

const FRAG_MAX = 17;

/**
 * The left rail's live summary of what the visitor has picked so far — the
 * design's "gathered fragments", one stamped chip per answered value.
 *
 * Tones carry the same meaning they do on the controls themselves: cobalt
 * for the single-select intent, yellow for the multi-select deliverables,
 * turquoise for the timing chips, coral for the budget box, outline for
 * typed-in text. One colour language, said twice — in the control and in
 * the rail — so a glance at the rail is a glance at the form. Values are read straight out of the form on
 * every input and change, so the summary cannot drift from the fields, and
 * option codes resolve to their founder-authored labels through the same
 * `#nk-contact-options` map the receipt uses — never a second hand-typed
 * copy of the labels. [P7]
 *
 * The rail markup ships empty and `hidden`. Nothing here runs without
 * JavaScript, and without it the rail is still the five-line navigation aid
 * it has always been rather than an empty box. [P3]
 */
function wireRailSummary(form: HTMLFormElement, options: OptionGroups): void {
  const region = document.querySelector<HTMLElement>('[data-rail-frags]');
  const list = document.querySelector<HTMLElement>('[data-rail-frag-list]');
  const count = document.querySelector<HTMLElement>('[data-rail-frag-count]');
  if (!region || !list) return;

  const render = () => renderRailSummary(form, options, region, list, count);
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
}

function collectFragments(form: HTMLFormElement, options: OptionGroups): Fragment[] {
  const data = new FormData(form);
  const get = (name: string) => String(data.get(name) ?? '').trim();
  const frags: Fragment[] = [];

  const push = (key: string, label: string, tone: Fragment['tone']) => {
    const text = label.trim();
    if (!text) return;
    frags.push({
      key,
      label: text.length > FRAG_MAX ? `${text.slice(0, FRAG_MAX - 1)}…` : text,
      tone,
    });
  };

  push('business', get('business'), 'ink');
  push('name', get('name'), 'ink');
  if (get('intent')) push('intent', labelFor(options, 'intent', get('intent')), 'cobalt');
  for (const value of data.getAll('outputs')) {
    push(`outputs:${String(value)}`, labelFor(options, 'outputs', String(value)), 'yellow');
  }

  const year = get('year');
  if (year) {
    const month = get('month');
    const label = year === 'flexible' ? 'Flexible' : [month, year].filter(Boolean).join(' ');
    push('timing', label, 'turquoise');
  }

  if (get('budget')) push('budget', labelFor(options, 'budget', get('budget')), 'coral');

  return frags;
}

function renderRailSummary(
  form: HTMLFormElement,
  options: OptionGroups,
  region: HTMLElement,
  list: HTMLElement,
  count: HTMLElement | null,
): void {
  const frags = collectFragments(form, options);
  region.hidden = frags.length === 0;
  if (count) count.textContent = String(frags.length).padStart(2, '0');

  // Reconcile rather than rebuild: a chip whose key and text are unchanged
  // keeps its DOM node, so the stamp-in animation plays for a genuinely new
  // answer instead of replaying across the whole rail on every keystroke.
  const existing = Array.from(list.children) as HTMLElement[];
  frags.forEach((frag, index) => {
    const node = existing[index] ?? document.createElement('span');
    if (node.dataset['fragKey'] !== frag.key || node.textContent !== frag.label) {
      node.dataset['fragKey'] = frag.key;
      node.textContent = frag.label;
      node.className = frag.tone === 'ink' ? 'nk-c-frag' : `nk-c-frag nk-c-frag--${frag.tone}`;
    }
    if (!node.isConnected) list.append(node);
  });
  existing.slice(frags.length).forEach((node) => node.remove());
}

/* ── Word count ("the reason") ──────────────────────────────────────────── */

function wireWordCount(form: HTMLFormElement): void {
  const why = form.querySelector<HTMLTextAreaElement>('#f-why');
  why?.addEventListener('input', () => updateWordCount(form));
  updateWordCount(form);
}

function updateWordCount(form: HTMLFormElement): void {
  const why = form.querySelector<HTMLTextAreaElement>('#f-why');
  const count = form.querySelector<HTMLElement>('#count-why');
  if (!why || !count) return;
  const chars = [...why.value].length;
  count.textContent = chars > 0 ? `${chars} characters` : '';
}

/* ── Deselectable pronoun chips ────────────────────────────────────────── */

/**
 * Pronouns is optional, so a visitor has to be able to clear it again — a
 * plain radio group can't be un-checked once one is picked.
 *
 * The previous version of this read `radio.checked` inside the click
 * listener and treated `true` as "was already selected, so deselect it".
 * That premise is backwards. HTML's activation behaviour for a radio runs
 * its PRE-click steps — which set checkedness — before the click event is
 * dispatched, so `checked` is always `true` by the time a click listener
 * sees it. Every click therefore matched the "clicked the current one"
 * branch and immediately unchecked it: pronouns could not be selected at
 * all, from any input method. This is the functional bug that made the
 * whole group look dead.
 *
 * The pre-click state is not recoverable from the event, so it is
 * remembered instead: `selected` tracks the last radio the browser told us
 * was chosen, via `change` (which fires for every route into a selection —
 * pointer, arrow keys, space — and always AFTER click).
 *
 * Deselection is restricted to genuine pointer activations, marked by a
 * `pointerdown` on the chip immediately before the click. The obvious test
 * — `event.detail > 0` — is wrong here: the input is visually hidden, so
 * every real click lands on the <label> and arrives at the input as a
 * forwarded click with `detail === 0`, indistinguishable from a keyboard
 * one. Arrow-key navigation through the group must never silently clear
 * it. [P10]
 */
function wirePronounToggle(form: HTMLFormElement): void {
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="pronouns"]'));
  let selected: HTMLInputElement | null = radios.find((radio) => radio.checked) ?? null;
  let pointerOn: HTMLInputElement | null = null;

  radios.forEach((radio) => {
    // On the label, not the input: the input is 1px and clipped, so a
    // pointer never touches it directly.
    radio.closest('label')?.addEventListener('pointerdown', () => {
      pointerOn = radio;
    });

    radio.addEventListener('change', () => {
      if (radio.checked) selected = radio;
    });

    radio.addEventListener('click', () => {
      const byPointer = pointerOn === radio;
      pointerOn = null;
      if (!byPointer || selected !== radio) return;
      radio.checked = false;
      selected = null;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

/* ── Month grid grey-out when Flexible is chosen ─────────────────────────── */

function wireTimingGate(form: HTMLFormElement): void {
  const years = form.querySelectorAll<HTMLInputElement>('input[data-year-input]');
  years.forEach((year) => year.addEventListener('change', () => updateTimingGate(form)));
  updateTimingGate(form);
}

function updateTimingGate(form: HTMLFormElement): void {
  const flexible = form.querySelector<HTMLInputElement>('input[data-flexible]');
  const grid = form.querySelector<HTMLElement>('[data-month-grid]');
  const note = form.querySelector<HTMLElement>('[data-timing-note]');
  if (!grid) return;

  const isFlexible = Boolean(flexible?.checked);
  grid.dataset.disabled = String(isFlexible);
  grid.querySelectorAll<HTMLInputElement>('input[name="month"]').forEach((month) => {
    month.disabled = isFlexible;
    if (isFlexible) month.checked = false;
  });
  if (note) {
    note.textContent = isFlexible
      ? "No rush — we'll find the right moment together."
      : 'Pick a year, then a month — or choose Flexible.';
  }
}

/* ── The no-JS round trip ─────────────────────────────────────────────────
 *
 * `functions/api/enquiry.ts` redirects a failed plain-HTML submit back to
 * this same page with `?enquiry=<reason>` and, for a validation failure,
 * `&fields=business,email`. This runs on every load, JS-enabled or not —
 * it only ever does anything when those params are present, which they
 * only are right after that redirect. */

function applyServerRedirectState(
  form: HTMLFormElement,
  summary: HTMLElement | null,
  status: HTMLElement | null,
): void {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('enquiry');
  if (!reason) return;

  if (reason === 'invalid') {
    const fields = (params.get('fields') ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const errors: FieldError[] = fields.map((field) => ({
      field,
      message: `${FIELD_LABELS[field] ?? field} needs another look.`,
    }));
    if (errors.length > 0) applyErrors(form, errors, summary);
  } else if (status) {
    status.dataset.state = 'error';
    status.textContent =
      reason === 'rate-limited'
        ? "That's a lot of enquiries in a short time — please try again shortly."
        : reason === 'spam-check'
          ? 'We could not verify that submission. Please try again.'
          : 'Something went wrong sending that. Please try again.';
  }

  // Leaves the visible URL clean and stops a refresh from reapplying the
  // same error state to a form the visitor has since fixed.
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.history.replaceState(window.history.state, '', url);
}

/* ── Client-side validation (UX only — the server is the real gate) ─────── */

function validate(form: HTMLFormElement): FieldError[] {
  const errors: FieldError[] = [];

  for (const rule of TEXT_RULES) {
    const field = form.elements.namedItem(rule.name);
    const value =
      field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement ? field.value.trim() : '';
    if (value.length === 0) errors.push({ field: rule.name, message: `${rule.label} is required.` });
    else if (rule.min && [...value].length < rule.min)
      errors.push({ field: rule.name, message: `${rule.label} needs at least ${rule.min} characters.` });
  }

  const email = form.elements.namedItem('email');
  const emailValue = email instanceof HTMLInputElement ? email.value.trim() : '';
  if (emailValue.length === 0) errors.push({ field: 'email', message: 'Email is required.' });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue))
    errors.push({ field: 'email', message: 'That does not look like an email address.' });

  const data = new FormData(form);
  for (const rule of GROUP_RULES) {
    if (data.getAll(rule.name).length === 0)
      errors.push({ field: rule.name, message: `${rule.label} is required.` });
  }

  // "Target timing" needs a month too, unless Flexible was chosen.
  const year = String(data.get('year') ?? '');
  const month = String(data.get('month') ?? '');
  if (year.length > 0 && year !== 'flexible' && month.length === 0) {
    errors.push({ field: 'month', message: 'Pick a month, or choose Flexible.' });
  }

  return errors;
}

/* ── Error display, focus and scroll ─────────────────────────────────────── */

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('.nk-c-error').forEach((el) => {
    el.textContent = '';
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
  form.querySelectorAll('[data-invalid="true"]').forEach((el) => el.removeAttribute('data-invalid'));
}

/** For a group error (intent/outputs/year/month/budget), the message renders
 * against the group's shared error span rather than a single input, and the
 * group's fieldset gets `data-invalid` for a visible outline. */
const GROUP_ERROR_ID: Record<string, string> = {
  intent: 'err-intent',
  outputs: 'err-outputs',
  year: 'err-year',
  month: 'err-year',
  budget: 'err-budget',
};

function applyErrors(form: HTMLFormElement, errors: FieldError[], summary: HTMLElement | null): void {
  let first: HTMLElement | null = null;

  for (const error of errors) {
    const errorId = GROUP_ERROR_ID[error.field] ?? `err-${error.field}`;
    const errorEl = form.querySelector<HTMLElement>(`#${errorId}`);
    if (errorEl && !errorEl.textContent) errorEl.textContent = error.message;

    const field =
      form.elements.namedItem(error.field) instanceof RadioNodeList
        ? (form.elements.namedItem(error.field) as RadioNodeList)[0]
        : form.elements.namedItem(error.field);

    if (field instanceof HTMLElement) {
      field.setAttribute('aria-invalid', 'true');
      const fieldset = field.closest('fieldset');
      fieldset?.setAttribute('data-invalid', 'true');
      if (!first) first = fieldset ?? field;
    }
  }

  if (summary) {
    const noun = errors.length === 1 ? 'thing needs' : 'things need';
    summary.textContent = `${errors.length} ${noun} a look before this can send.`;
  }

  if (first) {
    const top = first.getBoundingClientRect().top + window.scrollY - 150;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    const focusable = first.matches('input, textarea, button')
      ? first
      : first.querySelector<HTMLElement>('input, textarea, button');
    focusable?.focus();
  }
}

/* ── Submit ───────────────────────────────────────────────────────────────── */

async function submit(
  form: HTMLFormElement,
  options: OptionGroups,
  success: HTMLElement | null,
  status: HTMLElement | null,
): Promise<void> {
  const data = new FormData(form);
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch(form.action, {
      method: form.method || 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    });

    let json: { ok?: boolean; reference?: string; errors?: FieldError[] } | null = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (response.ok && json?.ok !== false) {
      renderReceipt(form, data, options, json?.reference, success);
      // Sent is the one unambiguous "done with this draft" — whether or not
      // autosave is on, there is nothing left for it to be a draft OF.
      clearStoredDraft();
      return;
    }

    if (json?.ok === false && Array.isArray(json.errors) && json.errors.length > 0) {
      applyErrors(form, json.errors, document.querySelector('#form-error-summary'));
      return;
    }

    if (status) {
      status.dataset.state = 'error';
      status.textContent = 'Something went wrong sending that. Please try again in a moment.';
    }
  } catch {
    if (status) {
      status.dataset.state = 'error';
      status.textContent = 'Something went wrong sending that. Please try again in a moment.';
    }
  } finally {
    submitButton?.removeAttribute('aria-busy');
  }
}

/* ── Receipt ──────────────────────────────────────────────────────────────── */

function readOptions(): OptionGroups {
  const script = document.querySelector<HTMLScriptElement>('#nk-contact-options');
  if (!script?.textContent) return {};
  try {
    return JSON.parse(script.textContent) as OptionGroups;
  } catch {
    return {};
  }
}

function labelFor(options: OptionGroups, group: string, value: string): string {
  return options[group]?.[value] ?? value;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function renderReceipt(
  form: HTMLFormElement,
  data: FormData,
  options: OptionGroups,
  ref: string | undefined,
  success: HTMLElement | null,
): void {
  if (!success) return;

  const get = (name: string) => String(data.get(name) ?? '').trim();
  const outputs = data.getAll('outputs').map((v) => labelFor(options, 'outputs', String(v)));
  const year = get('year');
  const month = get('month');
  const timing = year === 'flexible' ? 'Flexible' : [month, year].filter(Boolean).join(' ');

  const allRows: Array<[string, string]> = [
    ['Business', get('business')],
    ['Name', get('name')],
    ['Email', get('email')],
    ['Social', get('social')],
    ['Pronouns', get('pronouns') ? labelFor(options, 'pronouns', get('pronouns')) : ''],
    ['Project', labelFor(options, 'intent', get('intent'))],
    ['Deliverables', outputs.join(', ')],
    ['The reason', get('why')],
    ['Success looks like', get('goals')],
    ['Timing', timing],
    ['Budget', labelFor(options, 'budget', get('budget'))],
  ];
  const rows = allRows.filter((row): row is [string, string] => row[1].length > 0);

  const nameEl = success.querySelector('[data-receipt-name]');
  if (nameEl) nameEl.textContent = firstName(get('name'));

  const refEl = success.querySelector('[data-receipt-ref]');
  if (refEl) refEl.textContent = ref ?? '';
  refEl?.toggleAttribute('hidden', !ref);

  const list = success.querySelector('[data-receipt-list]');
  if (list) {
    list.textContent = '';
    for (const [key, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }
  }

  form.hidden = true;
  success.hidden = false;
  form.closest('[data-contact-root]')?.setAttribute('data-sent', 'true');
  success.querySelector<HTMLElement>('h1')?.focus();
  window.scrollTo({ top: 0, behavior: 'auto' });
}
