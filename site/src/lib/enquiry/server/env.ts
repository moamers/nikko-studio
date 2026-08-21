/**
 * The environment the enquiry endpoint runs in, and an honest report of what is
 * missing from it.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * Two things are load-bearing here.
 *
 * 1. **Every secret is read from `env`, never from a module constant and never
 *    from a `PUBLIC_`-prefixed variable.** Astro inlines `PUBLIC_*` into the
 *    browser bundle; a secret with that prefix is a published secret. [P15]
 *
 * 2. **Nothing in this file throws when a binding is absent.** At the time of
 *    writing, D1 is not provisioned, Resend has no account and the notification
 *    address is undecided. The endpoint has to build, deploy and behave sanely
 *    in exactly that state, and get better — without a code change — as each
 *    piece arrives.
 */

/* ── Minimal structural types for the Cloudflare bindings we use ──────────────
 *
 * Deliberately hand-written rather than pulled from `@cloudflare/workers-types`.
 * We touch four methods; a dependency for four methods is a dependency to
 * upgrade, audit and explain [P8]. These are structural, so the real D1 types
 * satisfy them if the package is ever added.
 */

export interface D1Meta {
  readonly changes?: number;
  readonly last_row_id?: number;
}

export interface D1Result<T = unknown> {
  readonly results?: T[];
  readonly success: boolean;
  readonly meta?: D1Meta;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/* ── The environment ──────────────────────────────────────────────────────── */

export interface EnquiryEnv {
  /**
   * The D1 binding. **This is the record.** Bound in the Cloudflare dashboard
   * (Pages project → Settings → Functions → D1 database bindings) as `DB`.
   */
  DB?: D1Database;

  /** Resend API key. Secret. Encrypted environment variable, never in code. */
  RESEND_API_KEY?: string;

  /** Where Nadia's notification goes. Plain variable, but still env-only. */
  ENQUIRY_NOTIFY_TO?: string;

  /**
   * The `From:` on both emails. Must be an address on a domain verified in
   * Resend, or Resend rejects the send. Falls back to {@link DEFAULT_FROM}.
   */
  ENQUIRY_FROM?: string;

  /** Cloudflare Turnstile secret. Secret. Absent → the check is skipped. */
  TURNSTILE_SECRET?: string;

  /**
   * Salt for the stored IP hash. Secret. Without it, hashing an IPv4 address is
   * only obfuscation — the whole space is brute-forceable in seconds — so the
   * algorithm recorded alongside the hash says so plainly. [P13]
   */
  ENQUIRY_IP_SALT?: string;

  /** Where a no-JS submit lands on success. Default {@link DEFAULT_THANK_YOU_PATH}. */
  ENQUIRY_THANK_YOU_PATH?: string;

  /** Where a no-JS submit lands on failure. Default {@link DEFAULT_FORM_PATH}. */
  ENQUIRY_FORM_PATH?: string;

  /** Submissions allowed per IP per hour. Default {@link DEFAULT_RATE_LIMIT}. */
  ENQUIRY_RATE_LIMIT?: string;

  /**
   * The address a visitor is told to write to if the endpoint cannot record
   * their enquiry at all. Falls back to `ENQUIRY_NOTIFY_TO`.
   */
  ENQUIRY_FALLBACK_EMAIL?: string;

  /**
   * The public site, no trailing slash. Used to build the two absolute HTTPS
   * URLs an email needs — the logo and the footer link — because an email
   * client fetches images from the open internet, not from this repo.
   * Falls back to {@link DEFAULT_SITE_URL}, which matches `astro.config.mjs`'s
   * `site`. Override this on a staging deployment so its emails (if any are
   * ever sent from staging) don't point ordinary web-standing links at the
   * production domain.
   */
  SITE_URL?: string;
}

/**
 * TODO(nadia): confirm the sending address once the Resend domain is verified.
 * `hello@nikkostudio.co` is a placeholder chosen to be obviously wrong if it
 * ever ships unconfigured — Resend will reject an unverified domain, which is
 * the loud failure we want rather than a silent one.
 */
export const DEFAULT_FROM = 'Nikko Studio <hello@nikkostudio.co>';

/**
 * The no-JS success page. The contact page owns this route; if it is not built
 * yet the redirect 404s, which is visible and fixable — unlike a silent drop.
 */
export const DEFAULT_THANK_YOU_PATH = '/contact/thank-you';
export const DEFAULT_FORM_PATH = '/contact';

export const DEFAULT_RATE_LIMIT = 5;

/** Matches `site` in `astro.config.mjs`. Kept as a literal, not an import —
 * this file is bundled into a Cloudflare Function, a different build target
 * from the Astro site, and the two should not share a module graph. */
export const DEFAULT_SITE_URL = 'https://nikkostudio.co';

/** Where the generated mark lives — see `docs/20-transactional-email-design.md`. */
export const LOGO_PATH = '/email/nikko-mark.png';

/** How the endpoint reads its own configuration, once per request. */
export interface EnquiryConfig {
  readonly hasStore: boolean;
  readonly hasResend: boolean;
  readonly hasNotifyTo: boolean;
  readonly hasTurnstile: boolean;
  readonly hasIpSalt: boolean;
  readonly from: string;
  readonly notifyTo: string | null;
  readonly fallbackEmail: string | null;
  readonly thankYouPath: string;
  readonly formPath: string;
  readonly rateLimitPerHour: number;
  readonly siteUrl: string;
  readonly logoUrl: string;
  /** Human-readable names of everything that is not wired up yet. */
  readonly missing: readonly string[];
}

function trimmed(value: string | undefined): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return v.length > 0 ? v : null;
}

/** Strips a trailing slash so `${siteUrl}${path}` never doubles one up. */
function siteUrlOf(value: string | undefined): string {
  const v = trimmed(value) ?? DEFAULT_SITE_URL;
  return v.endsWith('/') ? v.slice(0, -1) : v;
}

/**
 * Only relative, same-origin paths are accepted for the redirect targets. An
 * env var is not attacker-controlled, but a typo that turns the success
 * redirect into an open redirect is not the kind of mistake worth leaving room
 * for. [P15]
 */
function safePath(value: string | undefined, fallback: string): string {
  const v = trimmed(value);
  if (v === null) return fallback;
  if (!v.startsWith('/') || v.startsWith('//')) return fallback;
  return v;
}

export function readConfig(env: EnquiryEnv): EnquiryConfig {
  const notifyTo = trimmed(env.ENQUIRY_NOTIFY_TO);
  const resendKey = trimmed(env.RESEND_API_KEY);
  const hasStore = Boolean(env.DB && typeof env.DB.prepare === 'function');
  const siteUrl = siteUrlOf(env.SITE_URL);

  const missing: string[] = [];
  if (!hasStore) missing.push('D1 binding "DB" (the durable record)');
  if (!resendKey) missing.push('RESEND_API_KEY (no email can be sent)');
  if (!notifyTo) missing.push('ENQUIRY_NOTIFY_TO (nobody is notified)');
  if (!trimmed(env.TURNSTILE_SECRET)) missing.push('TURNSTILE_SECRET (spam check skipped)');
  if (!trimmed(env.ENQUIRY_IP_SALT)) missing.push('ENQUIRY_IP_SALT (IP hash is unsalted)');

  const parsedLimit = Number.parseInt(env.ENQUIRY_RATE_LIMIT ?? '', 10);

  return {
    hasStore,
    hasResend: resendKey !== null,
    hasNotifyTo: notifyTo !== null,
    hasTurnstile: trimmed(env.TURNSTILE_SECRET) !== null,
    hasIpSalt: trimmed(env.ENQUIRY_IP_SALT) !== null,
    from: trimmed(env.ENQUIRY_FROM) ?? DEFAULT_FROM,
    notifyTo,
    fallbackEmail: trimmed(env.ENQUIRY_FALLBACK_EMAIL) ?? notifyTo,
    thankYouPath: safePath(env.ENQUIRY_THANK_YOU_PATH, DEFAULT_THANK_YOU_PATH),
    formPath: safePath(env.ENQUIRY_FORM_PATH, DEFAULT_FORM_PATH),
    rateLimitPerHour:
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_RATE_LIMIT,
    siteUrl,
    logoUrl: `${siteUrl}${LOGO_PATH}`,
    missing,
  };
}
