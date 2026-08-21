/**
 * HTML escaping for notification email bodies.
 *
 * SERVER ONLY - see ./README.md.
 *
 * A form field is untrusted input, and an HTML email is HTML [P15]. Every value
 * that reaches an email template goes through `esc()` first; there is no "this
 * one is fine" exception, because the one exception is always the one that ships.
 */

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '=': '&#61;',
};

/** Escapes a value for use in HTML text *or* inside a quoted attribute. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"'`=]/g, (c) => HTML_ENTITIES[c] ?? c);
}

/** Escapes, then turns newlines into `<br>` - for the prose answers. */
export function escMultiline(value: unknown): string {
  return esc(value).replace(/\r\n|\r|\n/g, '<br>\n');
}

/**
 * Strips anything that could split a mail header (CR, LF, NUL, other C0/C1
 * controls) and collapses the rest to a single line.
 *
 * The validator already strips control characters from single-line fields; this
 * is the second layer, applied at the point of use, because header injection is
 * cheap to prevent and expensive to discover.
 */
export function headerSafe(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
