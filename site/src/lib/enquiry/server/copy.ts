/**
 * The words the endpoint says when it is NOT sending an email.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * The two notification emails' wording lives in
 * `src/content/email/copy.yaml` (compiled to `./email-copy.generated.ts`) —
 * see `docs/20-transactional-email-design.md`. This file is only what
 * remains outside that: the message shown *in the browser* when the
 * endpoint could not record an enquiry at all, which is not an email and
 * has no design handoff of its own.
 */

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
