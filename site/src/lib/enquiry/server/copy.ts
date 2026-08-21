/**
 * The words in the two notification emails.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * Separated from the templates so Nadia (or an engineer acting on one sentence
 * from her) can change the wording without going near the escaping, the
 * headers or the send. Nothing here is interpolated as HTML — the templates
 * escape every runtime value, and these constants are static text.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * TODO(nadia) — THE CONFIRMATION EMAIL COPY IS A PLACEHOLDER.
 *
 * Two things are outstanding, both from docs/16-forms-and-data-capture.md
 * "Open questions":
 *
 *   Q3. What should the confirmation say about WHEN they will hear back?
 *   Q2. Which address do notifications go to — Nadia's, or a shared hello@?
 *
 * The copy below deliberately makes **no promise about timing**. Nikko's voice
 * is a real asset and an invented "we'll be in touch within 48 hours" is both
 * off-brand and a commitment the studio has not made. When Nadia gives us the
 * promise, set RESPONSE_TIME_PROMISE and it appears in both the HTML and the
 * plain-text bodies automatically; leave it null and no timing claim is made.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * One sentence, in her words, about when someone hears back.
 * e.g. `'You will hear back from Nadia within two working days.'`
 *
 * TODO(nadia): supply this. Until then the email says what happens, not when.
 */
export const RESPONSE_TIME_PROMISE: string | null = null;

/** The enquirer's confirmation email. TODO(nadia): approve or rewrite. */
export const ENQUIRER_EMAIL = {
  subject: 'Your enquiry has landed — Nikko Studio',

  /** `{name}` is replaced with the enquirer's first name, escaped. */
  greeting: 'Thank you, {name}.',

  /** Each entry is one paragraph. */
  paragraphs: [
    'Your brief has arrived, and a real person is going to read it — not a filter, not an autoresponder deciding whether you are worth a reply.',
    'Nadia reads every enquiry herself. She will come back to you with either a conversation or an honest no, and if it is a no you will get the reason.',
    'Nothing is needed from you in the meantime. If you have thought of something you left out, reply to this email and it joins your brief.',
  ],

  /** Shown above the reference. */
  referenceLabel: 'Your reference',

  signoff: 'Nikko Studio',
} as const;

/** The studio-side notification. Not customer-facing; clarity beats voice. */
export const NADIA_EMAIL = {
  /** `{business}` and `{budget}` are replaced, escaped, at send time. */
  subjectTemplate: 'New enquiry — {business} — {budget}',
  intro: 'A new project enquiry came in through the website.',
  replyHint: 'Reply to this email and it goes straight to them.',
} as const;

/**
 * What the visitor is told when the endpoint cannot record their enquiry at
 * all — no D1, no mail. It tells the truth and hands them a working route out.
 * `{email}` is replaced with `ENQUIRY_FALLBACK_EMAIL`, or dropped if unset.
 */
export const UNRECORDED_MESSAGE =
  'Something went wrong at our end and we could not record your enquiry. ' +
  'Nothing you wrote has reached us, so please do not assume we have it.';

export const UNRECORDED_MESSAGE_WITH_EMAIL =
  `${UNRECORDED_MESSAGE} Please email {email} directly — we would rather hear from you twice than not at all.`;
