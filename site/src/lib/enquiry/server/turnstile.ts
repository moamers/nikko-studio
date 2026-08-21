/**
 * Cloudflare Turnstile verification.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * Turnstile is invisible to a real visitor: no puzzle, no images of traffic
 * lights. That matters, because the design handoff says "no CAPTCHA" and
 * docs/16 says Turnstile — they only conflict if you read Turnstile as a
 * CAPTCHA. It is configured in managed/invisible mode, and it is **optional**:
 * with no `TURNSTILE_SECRET` the check is skipped and logged, so the form works
 * from the first deploy and gets stricter when the key arrives.
 *
 * The honeypot is unconditional and does the everyday work regardless.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** The field name Turnstile's widget posts under. Fixed by Cloudflare. */
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export type TurnstileOutcome =
  | { readonly status: 'skipped'; readonly reason: 'no-secret' }
  | { readonly status: 'passed' }
  | { readonly status: 'failed'; readonly codes: string[] }
  | { readonly status: 'unavailable'; readonly detail: string };

interface SiteVerifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

/**
 * @returns `unavailable` when Cloudflare itself cannot be reached. The caller
 * treats that as a pass: an outage at the spam checker must not take the
 * enquiry form down with it. Spam is recoverable; a lost lead is not.
 */
export async function verifyTurnstile(
  secret: string | undefined,
  token: string | null,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileOutcome> {
  const key = typeof secret === 'string' ? secret.trim() : '';
  if (key.length === 0) return { status: 'skipped', reason: 'no-secret' };

  if (!token || token.trim().length === 0) {
    return { status: 'failed', codes: ['missing-input-response'] };
  }

  const body = new URLSearchParams({ secret: key, response: token.trim() });
  if (ip) body.set('remoteip', ip);

  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return { status: 'unavailable', detail: `siteverify HTTP ${response.status}` };
    }

    const data = (await response.json()) as SiteVerifyResponse;
    if (data.success === true) return { status: 'passed' };

    return { status: 'failed', codes: data['error-codes'] ?? ['unknown'] };
  } catch (error) {
    return {
      status: 'unavailable',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
