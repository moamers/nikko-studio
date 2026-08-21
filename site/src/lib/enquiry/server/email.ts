/**
 * The two notification emails, and the Resend call that sends them.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * The visual design is "Direction 01 — restrained editorial receipt"
 * (`design-handoff/email/`, approved by Nadia 2026-08-21). This file
 * reproduces its approved inline CSS and table structure exactly — see
 * `docs/20-transactional-email-design.md` for the full integration record,
 * including what was corrected and what was flagged rather than guessed at.
 *
 * **Every runtime value in this file is escaped.** A form field is untrusted
 * input and an HTML email is HTML: this is the single most likely injection
 * vector in the project [P15]. The rule is enforced structurally — the
 * templates never interpolate a raw string, only the output of `esc()` /
 * `escMultiline()` from `./html.ts`, and `summaryRows()` is the only place a
 * submitted value reaches a body.
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
import { EMAIL_COPY } from './email-copy.generated.ts';
import { esc, escMultiline, headerSafe } from './html.ts';
import type { EnquiryRecord } from './store.ts';

/* ── Presentation tokens — Direction 01's own palette, not the site's ───────
 *
 * The approved design deliberately does not use `src/styles/tokens.css`: an
 * email client cannot read a CSS custom property, and every value here has
 * to be a literal for the same reason the design's own fonts are Arial/
 * Courier New rather than Archivo/DM Mono — no @font-face, no external
 * loading, universal fallbacks only. This is a documented [P11] exception,
 * exactly like `public/favicon.svg`'s note in `tokens.css`. */
const INK = '#111110';
const PAPER = '#F2ECDF';
const FIELD_PAPER = '#FAF6EC';
const CORAL = '#EE5439';
const MUTED = '#756E61';
const RULE = '#C8BFAF';

const FONT_MONO = "'Courier New',Courier,monospace";
const FONT_DISPLAY = 'Arial Black,Arial,Helvetica,sans-serif';
const FONT_BODY = 'Arial,Helvetica,sans-serif';

/* ── Field values: the one place a submitted code becomes display text ──── */

/** Renders the target timing the way a person says it. */
function timing(record: EnquiryRecord): string {
  if (record.year === FLEXIBLE_YEAR) return FLEXIBLE_LABEL;
  return record.month ? `${record.month} ${record.year}` : record.year;
}

export function budgetLabel(record: EnquiryRecord): string {
  return labelFor(BUDGETS, record.budget);
}

/** First name only, for the greeting. Falls back to the whole string. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

interface Row {
  readonly label: string;
  readonly value: string;
  /** Prose answers keep their line breaks and get a little more room. */
  readonly prose?: boolean;
}

interface Section {
  readonly number: string;
  readonly title: string;
  readonly rows: readonly Row[];
}

/**
 * The submission, grouped exactly as Direction 01's four numbered sections.
 * Optional answers (social, pronouns, accessibility) are omitted as whole
 * rows — not rendered blank — when the enquirer left them empty, per the
 * handoff's instruction 9. Ordered the way the form asks, so the email reads
 * like the conversation the person just had.
 */
export function emailSections(record: EnquiryRecord): readonly Section[] {
  const aboutYou: Row[] = [
    { label: EMAIL_COPY.fields.business, value: record.business },
    { label: EMAIL_COPY.fields.name, value: record.name },
    { label: EMAIL_COPY.fields.email, value: record.email },
  ];
  if (record.social) aboutYou.push({ label: EMAIL_COPY.fields.social, value: record.social });
  if (record.pronouns) {
    aboutYou.push({ label: EMAIL_COPY.fields.pronouns, value: labelFor(PRONOUNS, record.pronouns) });
  }
  if (record.access) {
    aboutYou.push({ label: EMAIL_COPY.fields.accessibility, value: record.access, prose: true });
  }

  return [
    { number: '01', title: EMAIL_COPY.sections.about_you, rows: aboutYou },
    {
      number: '02',
      title: EMAIL_COPY.sections.project,
      rows: [
        { label: EMAIL_COPY.fields.movement, value: labelFor(INTENTS, record.intent) },
        {
          label: EMAIL_COPY.fields.outputs,
          // The handoff's instruction 3 is explicit about the separator:
          // "join the selected outputs with ' · '".
          value: record.outputs.map((code) => labelFor(OUTPUTS, code)).join(' · '),
        },
      ],
    },
    {
      number: '03',
      title: EMAIL_COPY.sections.reason,
      rows: [{ label: EMAIL_COPY.fields.why, value: record.why, prose: true }],
    },
    {
      number: '04',
      title: EMAIL_COPY.sections.finish_line,
      rows: [
        { label: EMAIL_COPY.fields.goals, value: record.goals, prose: true },
        { label: EMAIL_COPY.fields.target_timing, value: timing(record) },
        { label: EMAIL_COPY.fields.budget, value: budgetLabel(record) },
      ],
    },
  ];
}

/**
 * `meta.submitted_at`, built server-side in the studio's own timezone —
 * handoff instruction 4. `Intl` resolves the BST/GMT abbreviation correctly
 * either side of the clock change; there is no daylight-saving table to
 * maintain by hand.
 */
export function formatSubmittedAt(receivedAtIso: string): string {
  const date = new Date(receivedAtIso);
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/London',
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type === 'hour' || part.type === 'minute') return acc + part.value + (part.type === 'hour' ? ':' : '');
      if (part.type === 'timeZoneName') return `${acc} ${part.value}`;
      return acc;
    }, '');
  return `${datePart} · ${timePart}`;
}

/* ── HTML building blocks — transcribed verbatim from Direction 01 ───────── */

function sectionHeaderHtml(section: Section): string {
  return `
    <tr>
      <td colspan="2" style="padding:31px 0 7px;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;color:${INK};"><span style="color:${CORAL};">${esc(section.number)}</span>&nbsp;&nbsp;${esc(section.title)}</td>
    </tr>`;
}

function rowHtml(row: Row): string {
  return `
    <tr>
      <td style="padding:15px 0;border-bottom:1px solid ${RULE};vertical-align:top;width:34%;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};">${esc(row.label)}</td>
      <td style="padding:13px 0 15px 18px;border-bottom:1px solid ${RULE};vertical-align:top;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${INK};">${row.prose ? escMultiline(row.value) : esc(row.value)}</td>
    </tr>`;
}

function sectionsToHtml(sections: readonly Section[]): string {
  return sections.map((s) => sectionHeaderHtml(s) + s.rows.map(rowHtml).join('')).join('');
}

function sectionsToText(sections: readonly Section[]): string {
  return sections
    .map(
      (s) =>
        `${s.number}  ${s.title.toUpperCase()}\n\n` +
        s.rows.map((r) => `${r.label.toUpperCase()}\n${r.value}`).join('\n\n'),
    )
    .join('\n\n');
}

function mastheadRowHtml(logoUrl: string): string {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                <tr>
                  <td style="font-family:${FONT_MONO};font-size:8px;line-height:1.5;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;color:${INK};">${esc(EMAIL_COPY.brand.masthead)}</td>
                  <td align="right" width="52" style="width:52px;padding-left:16px;"><img src="${esc(logoUrl)}" width="52" height="52" alt="Nikko Studio" style="display:block;width:52px;height:52px;border:0;"></td>
                </tr>
              </table>`;
}

function footerRowHtml(year: string, websiteUrl: string): string {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${RULE};">
                <tr>
                  <td style="padding-top:18px;font-family:${FONT_MONO};font-size:9px;line-height:1.8;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">© ${esc(year)} ${esc(EMAIL_COPY.brand.masthead)}<br><a href="${esc(websiteUrl)}" style="color:${INK};text-decoration:underline;">${esc(EMAIL_COPY.brand.website_label)}</a></td>
                </tr>
              </table>`;
}

/**
 * The lowest common denominator that survives Gmail, Outlook and iOS Mail: a
 * single centred table, no external assets but the one logo image, no
 * webfonts, no JS. `width="620"` with a `max-width` fluid rule is what makes
 * this reflow correctly down to a 320px viewport (handoff acceptance check).
 */
function shell(title: string, preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${INK};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:${PAPER};border-top:6px solid ${CORAL};">
${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── To Nadia ─────────────────────────────────────────────────────────────── */

export interface BuiltEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
}

/** Where the two absolute URLs an email needs come from. See `./env.ts`. */
export interface EmailAssets {
  readonly siteUrl: string;
  readonly logoUrl: string;
}

export function buildNadiaEmail(record: EnquiryRecord, assets: EmailAssets): BuiltEmail {
  const sections = emailSections(record);
  const submittedAt = formatSubmittedAt(record.receivedAt);
  const year = String(new Date(record.receivedAt).getFullYear());

  const subject = headerSafe(
    `${EMAIL_COPY.owner.subject_prefix} ${record.business}`,
  ).slice(0, 200);
  const preheader = `${record.business} ${EMAIL_COPY.owner.preheader_suffix}`;

  const receiptCell = (label: string, value: string, opts: { border?: 'bottom' | 'left+bottom' | 'left' } = {}) => {
    const border =
      opts.border === 'bottom'
        ? `border-bottom:1px solid ${INK};`
        : opts.border === 'left+bottom'
          ? `border-left:1px solid ${INK};border-bottom:1px solid ${INK};`
          : opts.border === 'left'
            ? `border-left:1px solid ${INK};`
            : '';
    return `<td style="padding:18px 20px;${border}font-family:${FONT_MONO};font-size:9px;line-height:1.4;letter-spacing:1.1px;text-transform:uppercase;color:${MUTED};">${esc(label)}<br><strong style="display:block;margin-top:5px;font-family:${FONT_BODY};font-size:16px;letter-spacing:0;text-transform:none;color:${INK};">${esc(value)}</strong></td>`;
  };

  const body = `
          <tr><td style="padding:24px 34px 0;">${mastheadRowHtml(assets.logoUrl)}</td></tr>
          <tr>
            <td style="padding:46px 34px 24px;">
              <p style="margin:0 0 15px;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;color:${CORAL};">${esc(EMAIL_COPY.owner.status)} · ${esc(submittedAt)}</p>
              <h1 style="margin:0;font-family:${FONT_DISPLAY};font-size:42px;line-height:0.98;letter-spacing:-2px;text-transform:uppercase;color:${INK};">${esc(EMAIL_COPY.owner.headline_line_1)}<br>${esc(EMAIL_COPY.owner.headline_line_2)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:5px 34px 25px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${FIELD_PAPER};border:1px solid ${INK};">
                <tr>
                  ${receiptCell(EMAIL_COPY.fields.business, record.business, { border: 'bottom' })}
                  ${receiptCell(EMAIL_COPY.fields.budget_short, budgetLabel(record), { border: 'left+bottom' })}
                </tr>
                <tr>
                  ${receiptCell(EMAIL_COPY.fields.intent, labelFor(INTENTS, record.intent))}
                  ${receiptCell(EMAIL_COPY.fields.target_short, timing(record), { border: 'left' })}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 34px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:${INK};border-bottom:4px solid ${CORAL};">
                    <a href="mailto:${esc(record.email)}" style="display:inline-block;padding:14px 22px;font-family:${FONT_MONO};font-size:10px;line-height:1.2;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;color:${PAPER};">${esc(EMAIL_COPY.owner.reply_label)} ${esc(record.name)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 34px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">${sectionsToHtml(sections)}
              </table>
            </td>
          </tr>
          <tr><td style="padding:28px 34px 34px;">${footerRowHtml(year, assets.siteUrl)}</td></tr>`;

  const html = shell(subject, preheader, body);

  const text = [
    subject,
    `${EMAIL_COPY.owner.status} · ${submittedAt}`,
    '',
    `${EMAIL_COPY.fields.business}: ${record.business}`,
    `${EMAIL_COPY.fields.budget_short}: ${budgetLabel(record)}`,
    `${EMAIL_COPY.fields.intent}: ${labelFor(INTENTS, record.intent)}`,
    `${EMAIL_COPY.fields.target_short}: ${timing(record)}`,
    '',
    `${EMAIL_COPY.owner.reply_label} ${record.name}: ${record.email}`,
    `Reference: ${record.reference}`,
    '',
    sectionsToText(sections),
    '',
    `© ${year} ${EMAIL_COPY.brand.masthead}`,
    `${EMAIL_COPY.brand.website_label} — ${assets.siteUrl}`,
  ].join('\n');

  // The bare address, never `"Name" <addr>`: a display name is submitted text,
  // and submitted text does not belong in a structured mail header.
  return { subject, html, text, replyTo: record.email };
}

/* ── To the enquirer ──────────────────────────────────────────────────────── */

export function buildEnquirerEmail(record: EnquiryRecord, assets: EmailAssets): BuiltEmail {
  const sections = emailSections(record);
  const year = String(new Date(record.receivedAt).getFullYear());
  const first = firstName(record.name);

  const subject = headerSafe(EMAIL_COPY.customer.subject).slice(0, 200);
  const preheader = `${EMAIL_COPY.customer.preheader_prefix} ${first} ${EMAIL_COPY.customer.preheader_suffix}`;

  const body = `
          <tr><td style="padding:24px 34px 0;">${mastheadRowHtml(assets.logoUrl)}</td></tr>
          <tr>
            <td style="padding:52px 34px 22px;">
              <p style="margin:0 0 15px;font-family:${FONT_MONO};font-size:10px;line-height:1.4;letter-spacing:1.4px;text-transform:uppercase;color:${CORAL};">${esc(EMAIL_COPY.customer.status)}</p>
              <h1 style="margin:0;font-family:${FONT_DISPLAY};font-size:42px;line-height:0.98;letter-spacing:-2px;text-transform:uppercase;color:${INK};">${esc(EMAIL_COPY.customer.headline_line_1)}<br>${esc(EMAIL_COPY.customer.headline_line_2)}</h1>
              <p style="margin:25px 0 0;font-family:${FONT_BODY};font-size:16px;line-height:1.65;color:${INK};">${esc(EMAIL_COPY.customer.greeting)} ${esc(first)}, ${esc(EMAIL_COPY.customer.intro)}</p>
              <p style="margin:11px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${MUTED};">${esc(EMAIL_COPY.customer.support)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:9px 34px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">${sectionsToHtml(sections)}
              </table>
            </td>
          </tr>
          <tr><td style="padding:28px 34px 34px;">${footerRowHtml(year, assets.siteUrl)}</td></tr>`;

  const html = shell(subject, preheader, body);

  const text = [
    subject,
    '',
    `${EMAIL_COPY.customer.greeting} ${first}, ${EMAIL_COPY.customer.intro}`,
    EMAIL_COPY.customer.support,
    '',
    sectionsToText(sections),
    '',
    `Your reference: ${record.reference}`,
    '',
    `© ${year} ${EMAIL_COPY.brand.masthead}`,
    `${EMAIL_COPY.brand.website_label} — ${assets.siteUrl}`,
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
