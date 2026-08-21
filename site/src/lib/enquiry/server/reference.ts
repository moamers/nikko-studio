/**
 * The reference a person sees on the receipt and in their confirmation email.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * The design's receipt card shows `NKO—######`. The reference is generated
 * **here**, not in the browser, because it has to match the row in D1 and the
 * subject line in Nadia's inbox; a client-generated one matches nothing.
 * (`design-handoff/contact/CLAUDE_CODE_PROMPT.md` — "Return the reference id
 * from the server and render it in the receipt".)
 *
 * Stored and transmitted with an ASCII hyphen so it survives a Gmail search, a
 * URL and a spreadsheet cell. The page is free to render the em dash.
 */

export const REFERENCE_PREFIX = 'NKO-';

/** `NKO-482913`. Six digits: random, not sequential — the count is not public. */
export function newReference(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const digits = ((buffer[0] ?? 0) % 1_000_000).toString().padStart(6, '0');
  return `${REFERENCE_PREFIX}${digits}`;
}

/** A v4 UUID for the primary key. Separate from the reference, which is public. */
export function newId(): string {
  return crypto.randomUUID();
}
