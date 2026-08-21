/**
 * Rate limiting by IP hash.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * Two backends, chosen by what is bound:
 *
 * | Backend | When | Strength |
 * |---|---|---|
 * | D1 | `DB` is bound | Correct — one counter shared by every edge location |
 * | Memory | otherwise | Best-effort — per isolate, so a determined flood gets through |
 *
 * The memory backend exists so the endpoint is not *unlimited* before D1 is
 * provisioned. It is explicitly not a substitute: Cloudflare spins up isolates
 * per colo and recycles them freely, so the real ceiling is "5 per hour times
 * however many isolates you happen to hit". That is fine as a speed bump and
 * useless as a defence, which is why it is logged as degraded rather than
 * quietly treated as working.
 */
import type { D1Database } from './env.ts';
import { describe } from './store.ts';

export const WINDOW_MS = 60 * 60 * 1000;

export interface RateVerdict {
  readonly allowed: boolean;
  readonly hits: number;
  readonly backend: 'd1' | 'memory';
  /** Seconds until the current window rolls over — for `Retry-After`. */
  readonly retryAfter: number;
}

/* ── Memory backend ───────────────────────────────────────────────────────── */

const counters = new Map<string, { window: number; hits: number }>();

function memoryHit(key: string, window: number): number {
  // Cheap prune: any entry from a previous window is dead weight.
  if (counters.size > 5_000) {
    for (const [k, v] of counters) if (v.window !== window) counters.delete(k);
  }

  const current = counters.get(key);
  if (!current || current.window !== window) {
    counters.set(key, { window, hits: 1 });
    return 1;
  }

  current.hits += 1;
  return current.hits;
}

/** Test seam. The map is module state; a test that leaks into the next one lies. */
export function resetMemoryLimiter(): void {
  counters.clear();
}

/* ── D1 backend ───────────────────────────────────────────────────────────── */

const UPSERT = `
INSERT INTO enquiry_rate_limit (ip_hash, window_start, hits)
VALUES (?1, ?2, 1)
ON CONFLICT (ip_hash, window_start) DO UPDATE SET hits = hits + 1
RETURNING hits`;

/* ── The check ────────────────────────────────────────────────────────────── */

/**
 * Counts this request against the sender's hourly allowance.
 *
 * A D1 failure falls through to the memory counter rather than failing the
 * request: a broken rate limiter must not become a broken enquiry form.
 */
export async function checkRateLimit(
  db: D1Database | undefined,
  ipHash: string | null,
  limit: number,
  now: number = Date.now(),
): Promise<RateVerdict> {
  const window = Math.floor(now / WINDOW_MS);
  const retryAfter = Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - now) / 1000));

  // No address means no key. Cloudflare always supplies one in production; a
  // request without it is not worth failing over.
  const key = ipHash ?? 'anonymous';

  if (db && typeof db.prepare === 'function') {
    try {
      const row = await db.prepare(UPSERT).bind(key, window).first<{ hits: number }>();
      const hits = typeof row?.hits === 'number' ? row.hits : 1;
      return { allowed: hits <= limit, hits, backend: 'd1', retryAfter };
    } catch (error) {
      // Fall through to memory, but say so.
      console.warn(
        JSON.stringify({
          log: 'nk.enquiry',
          level: 'warn',
          event: 'rate_limit_d1_failed',
          detail: describe(error),
        }),
      );
    }
  }

  const hits = memoryHit(key, window);
  return { allowed: hits <= limit, hits, backend: 'memory', retryAfter };
}
