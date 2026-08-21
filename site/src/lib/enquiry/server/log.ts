/**
 * Structured logging for the enquiry endpoint.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * Every line is a single JSON object on `console` so that Cloudflare's
 * `wrangler pages deployment tail` and Logpush stay greppable. The prefix
 * `nk.enquiry` is the thing to search for.
 *
 * One rule: **the log never carries the answers unless the data had nowhere
 * else to go.** Reference, timing and outcome are operational; a person's
 * project brief is not, and Cloudflare's log retention is not a data store
 * [P13]. `logLostSubmission` is the single, deliberate exception — at that
 * point the log is the only copy left, and losing it is strictly worse.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  readonly [key: string]: unknown;
}

export function log(level: LogLevel, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    log: 'nk.enquiry',
    level,
    event,
    ...fields,
  });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Last resort. Called only when the submission could not be written to D1 *and*
 * no notification email was accepted — i.e. the request is about to fail. The
 * full payload goes to the log so the enquiry is recoverable by a human reading
 * `wrangler pages deployment tail`, which is not a system of record but is
 * better than oblivion.
 */
export function logLostSubmission(reference: string, payload: unknown, reasons: string[]): void {
  log('error', 'submission_unrecorded', {
    reference,
    reasons,
    recovery:
      'This enquiry reached no store and no inbox. The payload below is the only copy. ' +
      'Wire up the D1 binding "DB" and RESEND_API_KEY — see docs/16-forms-and-data-capture.md.',
    payload,
  });
}
