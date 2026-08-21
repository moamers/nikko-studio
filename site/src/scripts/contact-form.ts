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
 *   - a draft autosave to `localStorage['nk-brief-draft']`, restored on
 *     load and cleared on a successful submit;
 *   - a live word count on "the reason", a deselectable pronoun chip, and a
 *     cosmetic grey-out of the month grid when "Flexible" is chosen (purely
 *     visual — the server already discards `month` whenever `year` is
 *     flexible, so there is nothing load-bearing here).
 *
 * None of this runs, or needs to run, for the form to be submittable. [P1]
 */

const DRAFT_KEY = 'nk-brief-draft';
const FORM_SELECTOR = '[data-contact-form]';

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

  wireDraft(form);
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

/* ── Draft autosave ──────────────────────────────────────────────────────── */

function wireDraft(form: HTMLFormElement): void {
  restoreDraft(form);
  form.addEventListener('input', () => saveDraft(form));
  form.addEventListener('change', () => saveDraft(form));
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

function restoreDraft(form: HTMLFormElement): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let draft: Record<string, string | string[]>;
  try {
    draft = JSON.parse(raw);
  } catch {
    return;
  }

  for (const [key, value] of Object.entries(draft)) {
    const values = Array.isArray(value) ? value : [value];
    const fields = form.elements.namedItem(key);
    if (!fields) continue;

    if (fields instanceof RadioNodeList) {
      for (const node of Array.from(fields)) {
        if (node instanceof HTMLInputElement && values.includes(node.value)) node.checked = true;
      }
    } else if (fields instanceof HTMLInputElement) {
      if (fields.type === 'checkbox' || fields.type === 'radio') {
        fields.checked = values.includes(fields.value);
      } else {
        fields.value = values[0] ?? '';
      }
    } else if (fields instanceof HTMLTextAreaElement) {
      fields.value = values[0] ?? '';
    }
  }

  updateWordCount(form);
  updateTimingGate(form);
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

function wirePronounToggle(form: HTMLFormElement): void {
  const radios = form.querySelectorAll<HTMLInputElement>('input[name="pronouns"]');
  radios.forEach((radio) => {
    radio.addEventListener('click', () => {
      // `checked` still reflects the PRE-click state here: click listeners
      // run before the browser applies the native activation behaviour, so
      // "already checked" means "this is the one the visitor just clicked
      // again" — deselect it. A different, unchecked radio is unaffected
      // and selects normally.
      if (radio.checked) {
        // Deferred one tick so the native check-then-uncheck sequence
        // settles before we intervene, keeping this robust across engines.
        requestAnimationFrame(() => {
          radio.checked = false;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
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
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
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
