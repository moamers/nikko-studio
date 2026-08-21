/**
 * The two notification emails, and the Resend call that sends them.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * **Every runtime value in this file is escaped.** A form field is untrusted
 * input and an HTML email is HTML: this is the single most likely injection
 * vector in the project [P15]. The rule is enforced structurally — the
 * templates never interpolate a raw string, only the output of `esc()` /
 * `escMultiline()` from `./html.ts`, and the field table below is the only way
 * a submitted value reaches a body.
 */
import {
  BUDGETS,
  FLEXIBLE_LABEL,
  FLEXIBLE_YEAR,
  INTENTS,
  OUTPUTS,
  PRONOUNS,
} from '../options.generated.ts';
import { labelFor } from '../validate.ts';
import { ENQUIRER_EMAIL, NADIA_EMAIL, RESPONSE_TIME_PROMISE } from './copy.ts';
import { esc, escMultiline, headerSafe } from './html.ts';
import type { EnquiryRecord } from './store.ts';

/* ── Presentation ─────────────────────────────────────────────────────────── */

const PAPER = '#F2ECDF';
const FIELD_PAPER = '#F7F3E8';
const INK = '#111110';
const MUTED = '#4A463C';
const COBALT = '#2B45F0';

interface Row {
  readonly label: string;
  readonly value: string;
  /** Prose answers keep their line breaks and get a little more room. */
  readonly prose?: boolean;
}

/** Renders the target timing the way a person says it. */
function timing(record: EnquiryRecord): string {
  if (record.year === FLEXIBLE_YEAR) return FLEXIBLE_LABEL;
  return record.month ? `${record.month} ${record.year}` : record.year;
}

export function budgetLabel(record: EnquiryRecord): string {
  return labelFor(BUDGETS, record.budget);
}

/**
 * The one place a submitted value becomes display text. Ordered the way the
 * form asks, so the email reads like the conversation the person just had.
 */
export function summaryRows(record: EnquiryRecord): Row[] {
  const rows: Row[] = [
    { label: 'Business', value: record.business },
    { label: 'Name', value: record.name },
    { label: 'Email', value: record.email },
  ];

  if (record.social) rows.push({ label: 'Social / website', value: record.social });
  if (record.pronouns) {
    rows.push({ label: 'Pronouns', value: labelFor(PRONOUNS, record.pronouns) });
  }
  if (record.access) {
    rows.push({ label: 'Access requirements', value: record.access, prose: true });
  }

  rows.push(
    { label: 'The project', value: labelFor(INTENTS, record.intent) },
    {
      label: 'The work',
      value: record.outputs.map((code) => labelFor(OUTPUTS, code)).join(', '),
    },
    { label: 'What is broken, missing or holding things back', value: record.why, prose: true },
    { label: 'What "this worked" looks like', value: record.goals, prose: true },
    { label: 'Target timing', value: timing(record) },
    { label: 'Ballpark budget', value: budgetLabel(record) },
  );

  return rows;
}

function rowsToHtml(rows: readonly Row[]): string {
  return rows
    .map(
      (row) => `
      <tr>
        <td style="padding:14px 0 0;border-top:1px solid rgba(17,17,16,0.12);">
          <div style="font-family:'DM Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};padding-bottom:5px;">${esc(row.label)}</div>
          <div style="font-family:Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:${INK};padding-bottom:14px;">${row.prose ? escMultiline(row.value) : esc(row.value)}</div>
        </td>
      </tr>`,
    )
    .join('');
}

function rowsToText(rows: readonly Row[]): string {
  return rows
    .map((row) => `${row.label.toUpperCase()}\n${row.value}`)
    .join('\n\n');
}

function shell(title: string, inner: string): string {
  // Inline styles and a single centred table: the lowest common denominator
  // that survives Gmail, Outlook and iOS Mail. Max-width 600 so it is readable
  // on a phone without pinching, which is where Nadia will actually read it.
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${FIELD_PAPER};border:2px solid ${INK};">
<tr><td style="padding:24px 20px;">
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/* ── To Nadia ─────────────────────────────────────────────────────────────── */

export interface BuiltEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
}

export function buildNadiaEmail(record: EnquiryRecord): BuiltEmail {
  const rows = summaryRows(record);

  const subject = headerSafe(
    NADIA_EMAIL.subjectTemplate.replace('{business}', record.business).replace(
      '{budget}',
      budgetLabel(record),
    ),
  ).slice(0, 200);

  const html = shell(
    subject,
    `<div style="font-family:'DM Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${esc(record.reference)} &middot; ${esc(record.receivedAt)}</div>
<h1 style="font-family:Archivo,Helvetica,Arial,sans-serif;font-weight:900;letter-spacing:-0.035em;font-size:26px;line-height:1.1;color:${INK};margin:10px 0 6px;">${esc(record.business)}</h1>
<p style="font-family:Archivo,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:${MUTED};margin:0 0 20px;">${esc(NADIA_EMAIL.intro)} ${esc(NADIA_EMAIL.replyHint)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsToHtml(rows)}</table>
<p style="font-family:'DM Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};border-top:2px solid ${COBALT};padding-top:12px;margin:8px 0 0;">Stored as ${esc(record.reference)}</p>`,
  );

  const text = [
    `${record.reference}  ${record.receivedAt}`,
    '',
    subject,
    '',
    NADIA_EMAIL.intro,
    NADIA_EMAIL.replyHint,
    '',
    rowsToText(rows),
    '',
    `Stored as ${record.reference}`,
  ].join('\n');

  // The bare address, never `"Name" <addr>`: a display name is submitted text,
  // and submitted text does not belong in a structured mail header.
  return { subject, html, text, replyTo: record.email };
}

/* ── To the enquirer ──────────────────────────────────────────────────────── */

/** First name only, for the greeting. Falls back to the whole string. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

export function buildEnquirerEmail(record: EnquiryRecord): BuiltEmail {
  const greeting = ENQUIRER_EMAIL.greeting.replace('{name}', firstName(record.name));
  const paragraphs: string[] = [...ENQUIRER_EMAIL.paragraphs];
  if (RESPONSE_TIME_PROMISE) paragraphs.push(RESPONSE_TIME_PROMISE);

  const subject = headerSafe(ENQUIRER_EMAIL.subject).slice(0, 200);

  const html = shell(
    subject,
    `<h1 style="font-family:Archivo,Helvetica,Arial,sans-serif;font-weight:900;letter-spacing:-0.035em;font-size:26px;line-height:1.1;color:${INK};margin:0 0 16px;">${esc(greeting)}</h1>
${paragraphs
  .map(
    (p) =>
      `<p style="font-family:Archivo,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:${INK};margin:0 0 14px;">${esc(p)}</p>`,
  )
  .join('\n')}
<div style="border-top:2px solid ${COBALT};margin-top:18px;padding-top:12px;">
  <div style="font-family:'DM Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${esc(ENQUIRER_EMAIL.referenceLabel)}</div>
  <div style="font-family:'DM Mono',ui-monospace,monospace;font-size:18px;letter-spacing:0.08em;color:${INK};padding-top:4px;">${esc(record.reference)}</div>
</div>
<p style="font-family:Archivo,Helvetica,Arial,sans-serif;font-size:15px;color:${MUTED};margin:22px 0 0;">${esc(ENQUIRER_EMAIL.signoff)}</p>`,
  );

  const text = [
    greeting,
    '',
    ...paragraphs.flatMap((p) => [p, '']),
    `${ENQUIRER_EMAIL.referenceLabel}: ${record.reference}`,
    '',
    ENQUIRER_EMAIL.signoff,
  ].join('\n');

  return { subject, html, text };
}

/* ── Sending ──────────────────────────────────────────────────────────────── */

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 8_000;

export type SendOutcome =
  | { readonly status: 'sent'; readonly id: string | null }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'failed'; readonly detail: string };

export interface SendArgs {
  readonly apiKey: string | null;
  readonly from: string;
  readonly to: string | null;
  readonly email: BuiltEmail;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Posts one email to Resend. Never throws, and never fails the request: by the
 * time this runs the enquiry is either stored or explicitly known not to be,
 * and the caller decides what that combination means.
 */
export async function sendEmail(args: SendArgs): Promise<SendOutcome> {
  if (!args.apiKey) return { status: 'skipped', reason: 'no-api-key' };
  if (!args.to) return { status: 'skipped', reason: 'no-recipient' };

  const fetchImpl = args.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${args.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: args.from,
        to: [args.to],
        subject: args.email.subject,
        html: args.email.html,
        text: args.email.text,
        ...(args.email.replyTo ? { reply_to: args.email.replyTo } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Resend's error body is small and non-sensitive; capping it keeps a
      // pathological response out of the log.
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      return { status: 'failed', detail: `HTTP ${response.status} ${detail}`.trim() };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { status: 'sent', id: data?.id ?? null };
  } catch (error) {
    return {
      status: 'failed',
      detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
