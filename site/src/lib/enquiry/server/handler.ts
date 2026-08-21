/**
 * The enquiry pipeline. All of it.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * `functions/api/enquiry.ts` is a four-line adapter around `handleEnquiry` so
 * that the behaviour here can be unit-tested with a plain `Request` and a fake
 * env, with no Cloudflare runtime involved.
 *
 * ```
 * POST /api/enquiry
 *   1. validate server-side          <- client validation is UX only [P15]
 *   2. honeypot + Turnstile
 *   3. rate limit by IP hash
 *   4. WRITE TO D1                   <- this is the record
 *   5. email Nadia    (Resend, Reply-To = enquirer)
 *   6. email enquirer (Resend, confirmation)
 *   7. respond
 * ```
 *
 * **Step 4 is the one that must succeed.** Steps 5 and 6 are notifications: if
 * a mail provider hiccups the submission still exists and is recoverable, so
 * the visitor is told it worked, because it did. The failure the whole design
 * exists to prevent is a five-figure enquiry disappearing because an email
 * bounced (docs/16-forms-and-data-capture.md).
 *
 * The one case where the visitor is *not* told it worked is when D1 is unbound
 * **and** no notification was accepted — nothing recorded it anywhere, so
 * saying "thank you" would be a lie. That path returns 503, logs the entire
 * payload, and points the person at an address that works.
 */
import { FIELDS, HONEYPOT_FIELD, isHoneypotFilled, validateEnquiry } from '../validate.ts';
import type { FieldError, FieldSource } from '../validate.ts';
import { UNRECORDED_MESSAGE, UNRECORDED_MESSAGE_WITH_EMAIL } from './copy.ts';
import { buildEnquirerEmail, buildNadiaEmail, sendEmail } from './email.ts';
import type { SendOutcome } from './email.ts';
import { readConfig } from './env.ts';
import type { EnquiryEnv } from './env.ts';
import { esc } from './html.ts';
import { log, logLostSubmission } from './log.ts';
import { clientIp, hashIp, userAgent } from './privacy.ts';
import { checkRateLimit } from './rate-limit.ts';
import { newId, newReference } from './reference.ts';
import { recordNotifyState, storeEnquiry } from './store.ts';
import type { EnquiryRecord } from './store.ts';
import { TURNSTILE_FIELD, verifyTurnstile } from './turnstile.ts';

/** Anything larger than this is not a project brief. 64 KB is ~10x the cap sum. */
const MAX_BODY_BYTES = 64 * 1024;

/* ── Reading the request ──────────────────────────────────────────────────── */

/** Adapts `FormData` (files discarded) or a JSON object to `FieldSource`. */
class Fields implements FieldSource {
  private readonly map: Map<string, string[]>;

  constructor(entries: Iterable<[string, string]>) {
    this.map = new Map();
    for (const [key, value] of entries) {
      const list = this.map.get(key);
      if (list) list.push(value);
      else this.map.set(key, [value]);
    }
  }

  get(name: string): string | null {
    return this.map.get(name)?.[0] ?? null;
  }

  getAll(name: string): string[] {
    return this.map.get(name) ?? [];
  }
}

async function readFields(request: Request): Promise<Fields | null> {
  const declared = Number.parseInt(request.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;

  const type = (request.headers.get('content-type') ?? '').toLowerCase();

  if (type.includes('application/json')) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return null;

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const entries: [string, string][] = [];
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && item !== undefined) entries.push([key, String(item)]);
        }
      } else if (value !== null && value !== undefined) {
        entries.push([key, String(value)]);
      }
    }
    return new Fields(entries);
  }

  // urlencoded and multipart. `File` entries are dropped: the form has no file
  // input, so anything that arrives as one is not something we asked for.
  const form = await request.formData();
  const entries: [string, string][] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') entries.push([key, value]);
  }
  return new Fields(entries);
}

/** True when the caller asked for JSON rather than a page. */
export function wantsJson(request: Request): boolean {
  const accept = (request.headers.get('accept') ?? '').toLowerCase();
  if (accept.includes('application/json')) return true;

  // A `fetch()` with no Accept header still identifies itself.
  const mode = (request.headers.get('sec-fetch-mode') ?? '').toLowerCase();
  if (mode === 'cors' || mode === 'same-origin') return true;

  if ((request.headers.get('x-requested-with') ?? '').toLowerCase() === 'fetch') return true;

  return false;
}

/** The page that posted, if it was one of ours. Never a foreign URL. */
function sourcePath(request: Request): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const here = new URL(request.url);
    if (url.origin !== here.origin) return null;
    return url.pathname.slice(0, 200);
  } catch {
    return null;
  }
}

/* ── Responses ────────────────────────────────────────────────────────────── */

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function redirect(path: string, params: Record<string, string>, hash = ''): Response {
  const query = new URLSearchParams(params).toString();
  const location = `${path}${query ? `?${query}` : ''}${hash}`;
  // 303: the browser must follow with GET, so a refresh on the thank-you page
  // does not re-post the form.
  return new Response(null, {
    status: 303,
    headers: { location, 'cache-control': 'no-store' },
  });
}

/**
 * A real, self-contained HTML page for the no-JS failure that has nowhere good
 * to redirect to. Deliberately unstyled beyond the essentials — it is an error
 * page for a state that should never happen, and it must not depend on a
 * stylesheet, a font or a route existing.
 */
function htmlFailure(message: string, status: number, formPath: string): Response {
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Your enquiry was not sent</title>
</head>
<body style="margin:0;background:#F2ECDF;color:#111110;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<main style="max-width:34rem;margin:0 auto;padding:3rem 1.25rem;">
<h1 style="font-size:1.6rem;line-height:1.15;margin:0 0 1rem;">Your enquiry was not sent.</h1>
<p style="margin:0 0 1rem;">${esc(message)}</p>
<p style="margin:0;"><a href="${esc(formPath)}" style="color:#2B45F0;">Go back to the form</a></p>
</main>
</body></html>`;

  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Only field names we ourselves defined ever reach a URL. */
function errorFieldList(errors: readonly FieldError[]): string {
  const known = new Set<string>(FIELDS);
  return [...new Set(errors.map((e) => e.field).filter((f) => known.has(f)))].join(',');
}

/* ── The pipeline ─────────────────────────────────────────────────────────── */

export interface HandleOptions {
  /** Injected in tests. Production uses the global. */
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
}

export async function handleEnquiry(
  request: Request,
  env: EnquiryEnv,
  options: HandleOptions = {},
): Promise<Response> {
  const config = readConfig(env);
  const asJson = wantsJson(request);
  const now = options.now ?? new Date();

  if (config.missing.length > 0) {
    // Every request, not once at boot: a Worker isolate is short-lived and a
    // "logged once" warning is a warning nobody sees. It is one line.
    log('warn', 'unconfigured', { missing: config.missing });
  }

  /* 1 — read and validate ------------------------------------------------- */

  let fields: Fields | null;
  try {
    fields = await readFields(request);
  } catch (error) {
    log('warn', 'unreadable_body', {
      detail: error instanceof Error ? error.message : String(error),
    });
    fields = null;
  }

  if (fields === null) {
    return asJson
      ? json({ ok: false, error: 'bad_request' }, 400)
      : redirect(config.formPath, { enquiry: 'error' }, '#enquiry');
  }

  const result = validateEnquiry(fields, now);

  if (!result.ok) {
    log('info', 'validation_failed', { fields: result.errors.map((e) => e.field) });
    return asJson
      ? json({ ok: false, error: 'invalid', errors: result.errors }, 422)
      : redirect(
          config.formPath,
          { enquiry: 'invalid', fields: errorFieldList(result.errors) },
          '#enquiry',
        );
  }

  const enquiry = result.value;

  /* 3 — rate limit ---------------------------------------------------------
   *
   * After validation on purpose: a person who mistypes their email six times
   * should not be locked out of enquiring, and garbage is already cheap to
   * reject. The limit is there to stop a flood of *well-formed* submissions,
   * which is the kind that costs us a D1 write and two emails.
   */

  const ip = clientIp(request);
  const { hash: ipHash, algorithm: ipHashAlgorithm } = await hashIp(ip, env.ENQUIRY_IP_SALT);

  const verdict = await checkRateLimit(env.DB, ipHash, config.rateLimitPerHour, now.getTime());

  if (!verdict.allowed) {
    log('warn', 'rate_limited', {
      hits: verdict.hits,
      limit: config.rateLimitPerHour,
      backend: verdict.backend,
    });
    return asJson
      ? json({ ok: false, error: 'rate_limited', retryAfter: verdict.retryAfter }, 429, {
          'retry-after': String(verdict.retryAfter),
        })
      : redirect(config.formPath, { enquiry: 'rate-limited' }, '#enquiry');
  }

  const ipContext = {
    ipHash,
    ipHashAlgorithm,
    userAgent: userAgent(request),
    source: sourcePath(request),
  };

  /* 2 — honeypot -----------------------------------------------------------
   *
   * A bot is told it succeeded: telling it otherwise only teaches it which
   * field to leave alone next time.
   *
   * But the submission is still **written to D1 with `status = 'spam'`** when
   * a store is available, because browsers do autofill hidden inputs, and a
   * false positive here would silently delete exactly the kind of enquiry this
   * endpoint exists to protect. Nadia never sees these unless she looks —
   * `SELECT * FROM enquiries WHERE status = 'spam'` — and that is the point.
   * No email is sent either way, so a real flood costs nothing but rows.
   */
  if (isHoneypotFilled(fields)) {
    const quarantined: EnquiryRecord = {
      ...enquiry,
      id: newId(),
      reference: newReference(),
      receivedAt: now.toISOString(),
      ...ipContext,
    };

    const kept = await storeEnquiry(env.DB, quarantined, 'spam');
    log('warn', 'honeypot_tripped', {
      field: HONEYPOT_FIELD,
      reference: quarantined.reference,
      quarantined: kept.ok,
      recovery: kept.ok
        ? "Recoverable: SELECT * FROM enquiries WHERE status = 'spam'"
        : 'Not stored — no D1 binding. A false positive here is unrecoverable.',
    });

    return asJson
      ? json({ ok: true, reference: quarantined.reference, stored: kept.ok }, 202)
      : redirect(config.thankYouPath, { ref: quarantined.reference });
  }

  /* 2b — Turnstile (after the cheap checks, before any write) -------------- */

  const turnstile = await verifyTurnstile(
    env.TURNSTILE_SECRET,
    fields.get(TURNSTILE_FIELD),
    ip,
    options.fetchImpl,
  );

  if (turnstile.status === 'failed') {
    log('warn', 'turnstile_failed', { codes: turnstile.codes });
    return asJson
      ? json(
          {
            ok: false,
            error: 'spam_check_failed',
            errors: [
              { field: 'form', message: 'We could not verify this submission. Please try again.' },
            ],
          },
          422,
        )
      : redirect(config.formPath, { enquiry: 'spam-check' }, '#enquiry');
  }

  if (turnstile.status !== 'passed') {
    // Skipped (no secret yet) or unavailable (Cloudflare unreachable). Both let
    // the enquiry through: an outage at the spam checker must not take the form
    // down. Logged so "skipped" never becomes invisible-normal.
    log('warn', 'turnstile_not_enforced', turnstile);
  }

  /* 4 — the record --------------------------------------------------------- */

  const record: EnquiryRecord = {
    ...enquiry,
    id: newId(),
    reference: newReference(),
    receivedAt: now.toISOString(),
    ...ipContext,
  };

  const stored = await storeEnquiry(env.DB, record);

  if (stored.ok) {
    log('info', 'stored', { reference: record.reference, budget: record.budget });
  } else {
    log('error', 'store_failed', {
      reference: record.reference,
      reason: stored.reason,
      detail: stored.detail,
      consequence:
        stored.reason === 'unbound'
          ? 'D1 binding "DB" is not configured — the notification email is the only copy.'
          : 'The D1 write failed — the notification email is the only copy.',
    });
  }

  /* 5 & 6 — notifications -------------------------------------------------- */

  const apiKey = config.hasResend ? (env.RESEND_API_KEY ?? '').trim() : null;

  const [toNadia, toEnquirer] = await Promise.all([
    sendEmail({
      apiKey,
      from: config.from,
      to: config.notifyTo,
      email: buildNadiaEmail(record, config),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    }),
    sendEmail({
      apiKey,
      from: config.from,
      to: record.email,
      email: buildEnquirerEmail(record, config),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    }),
  ]);

  const notifyState = {
    nadia: describeOutcome(toNadia),
    enquirer: describeOutcome(toEnquirer),
  };

  log(toNadia.status === 'sent' ? 'info' : 'warn', 'notified', {
    reference: record.reference,
    ...notifyState,
  });

  if (stored.ok) await recordNotifyState(env.DB, record.id, notifyState);

  /* 7 — respond ------------------------------------------------------------ */

  // The enquiry exists somewhere a human can find it if either the store took
  // it, or Nadia's inbox did. Anything less is not a success.
  const recorded = stored.ok || toNadia.status === 'sent';

  if (!recorded) {
    logLostSubmission(record.reference, redactForRecovery(record), [
      `store:${stored.ok ? 'ok' : stored.reason}`,
      `nadia-email:${describeOutcome(toNadia)}`,
    ]);

    const message = config.fallbackEmail
      ? UNRECORDED_MESSAGE_WITH_EMAIL.replace('{email}', config.fallbackEmail)
      : UNRECORDED_MESSAGE;

    return asJson
      ? json({ ok: false, error: 'unrecorded', message }, 503)
      : htmlFailure(message, 503, config.formPath);
  }

  return asJson
    ? json(
        {
          ok: true,
          reference: record.reference,
          stored: stored.ok,
          // Deliberately exposed: the receipt is honest about durability, and a
          // `false` here in production is the alarm that D1 needs binding.
          notified: toNadia.status === 'sent',
        },
        201,
      )
    : redirect(config.thankYouPath, { ref: record.reference });
}

function describeOutcome(outcome: SendOutcome): string {
  if (outcome.status === 'sent') return 'sent';
  if (outcome.status === 'skipped') return `skipped:${outcome.reason}`;
  return `failed:${outcome.detail}`;
}

/**
 * What goes in the last-resort log line. Everything the person typed, because
 * this is the only copy — but the IP hash and user agent are dropped, since
 * recovering the enquiry needs the brief, not the provenance [P13].
 */
function redactForRecovery(record: EnquiryRecord): Record<string, unknown> {
  const { ipHash: _ipHash, ipHashAlgorithm: _alg, userAgent: _ua, ...rest } = record;
  return rest;
}

/** `GET /api/enquiry` — a person or a crawler poking at the URL. */
export function handleNonPost(request: Request, env: EnquiryEnv): Response {
  const config = readConfig(env);
  return wantsJson(request)
    ? json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST' })
    : new Response(null, {
        status: 303,
        headers: { location: config.formPath, allow: 'POST', 'cache-control': 'no-store' },
      });
}
