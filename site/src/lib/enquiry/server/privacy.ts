/**
 * What we keep about the sender, and what we deliberately do not.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * The endpoint needs *something* per-sender to rate limit and to investigate a
 * flood. It does not need the IP address, so it does not store one. [P13]
 */

/** The hash scheme recorded alongside every stored hash, so it can be rotated. */
export type IpHashAlgorithm = 'sha256-salted/v1' | 'sha256-unsalted/v1';

export interface HashedIp {
  /** Hex SHA-256, or `null` when Cloudflare gave us no address at all. */
  readonly hash: string | null;
  readonly algorithm: IpHashAlgorithm;
}

/**
 * Hashes the client IP with `ENQUIRY_IP_SALT`.
 *
 * Without a salt this is obfuscation, not anonymisation: the entire IPv4 space
 * hashes in seconds on a laptop. We still hash — a bare address in a table is
 * worse — but the algorithm string records the weaker scheme honestly rather
 * than letting a future reader assume the data is anonymous.
 */
export async function hashIp(ip: string | null, salt: string | undefined): Promise<HashedIp> {
  const clean = typeof salt === 'string' ? salt.trim() : '';
  const algorithm: IpHashAlgorithm =
    clean.length > 0 ? 'sha256-salted/v1' : 'sha256-unsalted/v1';

  if (!ip) return { hash: null, algorithm };

  const bytes = new TextEncoder().encode(`nk-enquiry:${clean}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  const hash = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, algorithm };
}

/**
 * The client address, from Cloudflare's own header. `CF-Connecting-IP` is set by
 * the edge and cannot be spoofed by the client; `X-Forwarded-For` can be, so it
 * is only a local-development fallback and its first entry is taken as-is.
 */
export function clientIp(request: Request): string | null {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first && first.trim().length > 0) return first.trim();
  }

  return null;
}

/** User agent, capped. Useful for spotting a bot pattern; not identity. */
export function userAgent(request: Request): string | null {
  const value = request.headers.get('user-agent');
  if (!value) return null;
  return value.slice(0, 400);
}
