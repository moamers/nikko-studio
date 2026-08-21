/**
 * Small, pure helpers for classifying and resolving an `href` string. Kept in
 * one place so a rule like "prefix a bare anchor when we're not on the page
 * that owns it" or "this link leaves the site" is written once and imported
 * everywhere it applies, rather than re-derived — slightly differently — at
 * each call site. [P14]
 */

/**
 * The header nav, the mobile menu and the logo all carry bare in-page
 * anchors (`#work`, `#services`, `#founder`, `#top`) because that is what
 * they are on the page that owns those ids — the homepage. On every other
 * route (`/contact`, `/privacy-policy`, `/terms-and-conditions`, …) the same
 * anchor targets an id that does not exist on that page, so the link does
 * nothing.
 *
 * `resolveNavHref` turns a bare anchor into `/#work` when the current page
 * is not the homepage, so the browser navigates home and then jumps. On the
 * homepage itself the anchor is returned unchanged: the browser's native
 * same-page scroll is instant, and prefixing it with `/` would force a full
 * navigation for no reason.
 *
 * Anything that is not a bare anchor — already `/`-rooted, or an absolute
 * `http…` URL — is returned unchanged; there is nothing for this rule to do.
 */
export function resolveNavHref(href: string, pathname: string): string {
  if (!href.startsWith('#')) return href;
  return pathname === '/' ? href : `/${href}`;
}

/**
 * True for any absolute `http(s)` URL — the signal that a link leaves the
 * site. Used to decide whether an `<a>` needs `target="_blank"` and
 * `rel="noopener noreferrer"` (see `Pill.astro` and the footer's link list
 * in `Pitch.astro`) without a schema flag a content edit could forget to
 * set — the safety follows from the URL shape, not from anyone remembering
 * it.
 */
export function isExternalHref(href: string | undefined): boolean {
  return href?.startsWith('http') ?? false;
}
