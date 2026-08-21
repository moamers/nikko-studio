/**
 * Server-side validation for the enquiry form.
 *
 * This is the only validation that counts. The page validates too, but that is
 * UX — a form POST can come from anywhere, so every rule is re-checked here
 * against the option codes in `form.yaml`. [P15]
 *
 * The rules mirror `design-handoff/contact/CLAUDE_CODE_PROMPT.md`
 * ("Behaviour to preserve"): business, name, email, intent, ≥1 output,
 * why ≥12 chars, goals ≥8 chars, timing and budget are required; social,
 * pronouns and access are not.
 */
import {
  BUDGETS,
  FLEXIBLE_LABEL,
  FLEXIBLE_YEAR,
  INTENTS,
  MONTHS,
  OUTPUTS,
  PRONOUNS,
  YEARS_AHEAD,
  type EnquiryOption,
} from './options.generated.ts';

/* ── The wire contract ────────────────────────────────────────────────────── */

/**
 * The field names the page must POST. Changing one of these is a breaking
 * change to the form markup, so they are listed once, here, and nowhere else.
 */
export const FIELDS = [
  'business',
  'name',
  'email',
  'social',
  'pronouns',
  'access',
  'intent',
  'outputs',
  'why',
  'goals',
  'month',
  'year',
  'budget',
] as const;

/**
 * Length caps. Deliberately generous for prose and tight for identity fields;
 * over-length input is rejected rather than silently truncated, because a
 * truncated answer is a lie about what someone said.
 */
export const MAX_LENGTH = {
  business: 120,
  name: 120,
  email: 254,
  social: 300,
  access: 1_000,
  why: 4_000,
  goals: 4_000,
} as const;

/** Minimum useful lengths, from the handoff. */
export const MIN_LENGTH = { why: 12, goals: 8 } as const;

/**
 * The honeypot input. Real people never see it; bots fill everything.
 * `nk_hp` is canonical; the aliases cost nothing and mean a rename in the
 * markup degrades to "less spam caught", never to "the form broke".
 */
export const HONEYPOT_FIELD = 'nk_hp';
const HONEYPOT_ALIASES = [HONEYPOT_FIELD, 'hp', 'honeypot', 'website_url', 'leave_blank'];

/* ── Result shapes ────────────────────────────────────────────────────────── */

export interface FieldError {
  /** One of `FIELDS` — the page uses it to focus the offending input. */
  readonly field: string;
  readonly message: string;
}

/** A submission that passed every rule. Every value here is safe to store. */
export interface ValidEnquiry {
  business: string;
  name: string;
  email: string;
  social: string | null;
  pronouns: string | null;
  access: string | null;
  intent: string;
  outputs: string[];
  why: string;
  goals: string;
  /** `null` when the year is flexible. Otherwise a canonical month name. */
  month: string | null;
  /** A four-digit year, or `flexible`. */
  year: string;
  budget: string;
}

export type ValidationResult =
  | { ok: true; value: ValidEnquiry }
  | { ok: false; errors: FieldError[] };

/** Anything that behaves like `FormData` or `URLSearchParams`. */
export interface FieldSource {
  get(name: string): string | null;
  getAll(name: string): string[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const codes = (list: readonly EnquiryOption[]) => list.map((o) => o.value);

/** Collapses the whitespace a paste or a soft keyboard leaves behind. */
function clean(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  // Strip control characters (including CR/LF injection attempts in headers)
  // from single-line values happens in `oneLine`; here we only trim.
  return raw.trim();
}

function oneLine(raw: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  return clean(raw).replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();
}

/**
 * Counts characters the way a person would, not the way UTF-16 does, so an
 * answer full of emoji is not rejected for being "too long".
 */
export function charLength(value: string): number {
  return [...value].length;
}

const EMAIL = /^[^\s@,;:<>"'\\]+@[^\s@.,;:<>"'\\]+(\.[^\s@.,;:<>"'\\]+)+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_LENGTH.email && EMAIL.test(value);
}

/**
 * The year chips the page is currently offering: this year plus `yearsAhead`.
 * Derived, never stored — a hardcoded list starts offering a past year.
 *
 * The previous year is also accepted. A form opened at 23:58 on 31 December
 * and submitted at 00:01 would otherwise be rejected for picking a year that
 * was valid when it was rendered.
 */
export function allowedYears(now: Date = new Date()): string[] {
  const thisYear = now.getFullYear();
  const years: string[] = [String(thisYear - 1)];
  for (let i = 0; i <= YEARS_AHEAD; i += 1) years.push(String(thisYear + i));
  return years;
}

/**
 * Accepts a month name as printed in `form.yaml` (case-insensitively) or a
 * 1–12 index, and returns the canonical name. `null` if it is neither.
 */
export function canonicalMonth(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^(0?[1-9]|1[0-2])$/.test(value)) return MONTHS[Number(value) - 1] ?? null;

  const lower = value.toLowerCase();
  return MONTHS.find((m) => m.toLowerCase() === lower) ?? null;
}

/** True if the honeypot input carries anything at all. */
export function isHoneypotFilled(source: FieldSource): boolean {
  return HONEYPOT_ALIASES.some((field) => clean(source.get(field)).length > 0);
}

/* ── The rules ────────────────────────────────────────────────────────────── */

export function validateEnquiry(source: FieldSource, now: Date = new Date()): ValidationResult {
  const errors: FieldError[] = [];
  const fail = (field: string, message: string) => {
    errors.push({ field, message });
  };

  /** Required free text with a floor and a ceiling. */
  const text = (
    field: keyof typeof MAX_LENGTH,
    label: string,
    { min = 1, multiline = false }: { min?: number; multiline?: boolean } = {},
  ): string => {
    const value = multiline ? clean(source.get(field)) : oneLine(source.get(field));
    if (charLength(value) === 0) fail(field, `${label} is required.`);
    else if (charLength(value) < min)
      fail(field, `${label} needs at least ${min} characters — a sentence is plenty.`);
    else if (charLength(value) > MAX_LENGTH[field])
      fail(field, `${label} is too long (limit ${MAX_LENGTH[field]} characters).`);
    return value;
  };

  /** Optional free text: only a ceiling. */
  const optionalText = (
    field: keyof typeof MAX_LENGTH,
    label: string,
    { multiline = false }: { multiline?: boolean } = {},
  ): string | null => {
    const value = multiline ? clean(source.get(field)) : oneLine(source.get(field));
    if (charLength(value) === 0) return null;
    if (charLength(value) > MAX_LENGTH[field]) {
      fail(field, `${label} is too long (limit ${MAX_LENGTH[field]} characters).`);
      return null;
    }
    return value;
  };

  /* 01 — About you */
  const business = text('business', 'Business name');
  const name = text('name', 'Your name');

  const email = oneLine(source.get('email')).toLowerCase();
  if (email.length === 0) fail('email', 'Email is required.');
  else if (!isValidEmail(email)) fail('email', 'That does not look like an email address.');

  const social = optionalText('social', 'Social or website');
  const access = optionalText('access', 'Access requirements', { multiline: true });

  const pronounsRaw = oneLine(source.get('pronouns'));
  let pronouns: string | null = null;
  if (pronounsRaw.length > 0) {
    if (!codes(PRONOUNS).includes(pronounsRaw)) fail('pronouns', 'Unknown pronoun option.');
    else pronouns = pronounsRaw;
  }

  /* 02 — The project */
  const intent = oneLine(source.get('intent'));
  if (intent.length === 0) fail('intent', 'Pick what kind of project this is.');
  else if (!codes(INTENTS).includes(intent)) fail('intent', 'Unknown project type.');

  /* 03 — The work */
  const outputCodes = codes(OUTPUTS);
  const submittedOutputs = source
    .getAll('outputs')
    // A single field carrying a comma-joined list is accepted too, so a
    // hidden input works as well as repeated checkboxes.
    .flatMap((v) => (v.includes(',') ? v.split(',') : [v]))
    .map((v) => oneLine(v))
    .filter((v) => v.length > 0);
  const outputs = [...new Set(submittedOutputs)];

  if (outputs.length === 0) fail('outputs', 'Pick at least one thing you need.');
  else if (outputs.length > outputCodes.length) fail('outputs', 'Too many options selected.');
  else if (!outputs.every((v) => outputCodes.includes(v))) fail('outputs', 'Unknown option.');

  /* 04 — The reason */
  const why = text('why', 'This answer', { min: MIN_LENGTH.why, multiline: true });

  /* 05 — The finish line */
  const goals = text('goals', 'This answer', { min: MIN_LENGTH.goals, multiline: true });

  const yearRaw = oneLine(source.get('year'));
  const isFlexible =
    yearRaw.toLowerCase() === FLEXIBLE_YEAR || yearRaw.toLowerCase() === FLEXIBLE_LABEL.toLowerCase();
  let year = '';
  if (yearRaw.length === 0) fail('year', 'Pick a target year, or Flexible.');
  else if (isFlexible) year = FLEXIBLE_YEAR;
  else if (!allowedYears(now).includes(yearRaw)) fail('year', 'That year is not on offer.');
  else year = yearRaw;

  let month: string | null = null;
  const monthRaw = oneLine(source.get('month'));
  if (isFlexible) {
    // Flexible timing means the month grid is disabled — anything sent for it
    // is discarded rather than stored, so the record cannot contradict itself.
    month = null;
  } else if (monthRaw.length === 0) {
    if (year.length > 0) fail('month', 'Pick a month, or choose Flexible.');
  } else {
    month = canonicalMonth(monthRaw);
    if (month === null) fail('month', 'Unknown month.');
  }

  const budget = oneLine(source.get('budget'));
  if (budget.length === 0) fail('budget', 'Pick a ballpark budget.');
  else if (!codes(BUDGETS).includes(budget)) fail('budget', 'Unknown budget band.');

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      business,
      name,
      email,
      social,
      pronouns,
      access,
      intent,
      outputs,
      why,
      goals,
      month,
      year,
      budget,
    },
  };
}

/** Looks a code up for display. Falls back to the code so nothing renders blank. */
export function labelFor(list: readonly EnquiryOption[], value: string | null): string {
  if (!value) return '';
  return list.find((o) => o.value === value)?.label ?? value;
}
