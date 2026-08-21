/**
 * Writing the enquiry to D1.
 *
 * SERVER ONLY — see `./README.md`.
 *
 * This is step 4, and step 4 is the one that must succeed
 * (docs/16-forms-and-data-capture.md). Everything else in the pipeline is a
 * notification. The schema lives in `migrations/0001_enquiries.sql`.
 */
import type { D1Database } from './env.ts';
import type { ValidEnquiry } from '../validate.ts';
import type { IpHashAlgorithm } from './privacy.ts';

/** A validated submission plus everything the server knows about it. */
export interface EnquiryRecord extends ValidEnquiry {
  readonly id: string;
  readonly reference: string;
  readonly receivedAt: string;
  readonly ipHash: string | null;
  readonly ipHashAlgorithm: IpHashAlgorithm;
  readonly userAgent: string | null;
  readonly source: string | null;
}

/**
 * `spam` is written for a submission that tripped the honeypot. It is stored
 * rather than dropped because a browser can autofill a hidden input, and a
 * false positive that silently deletes a five-figure enquiry is precisely the
 * failure this whole design exists to prevent. Nadia never sees these unless
 * she looks; they are recoverable, which is the point.
 */
export type EnquiryStatus = 'new' | 'spam';

export type StoreOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'unbound' | 'error'; readonly detail?: string };

const INSERT = `
INSERT INTO enquiries (
  id, reference, received_at, status,
  business, name, email, social, pronouns, access,
  intent, outputs, why, goals, target_month, target_year, budget,
  ip_hash, ip_hash_alg, user_agent, source
) VALUES (
  ?1, ?2, ?3, ?21,
  ?4, ?5, ?6, ?7, ?8, ?9,
  ?10, ?11, ?12, ?13, ?14, ?15, ?16,
  ?17, ?18, ?19, ?20
)`;

/**
 * Writes the record. Never throws — the caller decides what a failure means,
 * and at this point in the request the one unacceptable outcome is an
 * unhandled exception that loses the payload before it can be logged.
 */
export async function storeEnquiry(
  db: D1Database | undefined,
  record: EnquiryRecord,
  status: EnquiryStatus = 'new',
): Promise<StoreOutcome> {
  if (!db || typeof db.prepare !== 'function') {
    return { ok: false, reason: 'unbound' };
  }

  try {
    await db
      .prepare(INSERT)
      .bind(
        record.id,
        record.reference,
        record.receivedAt,
        record.business,
        record.name,
        record.email,
        record.social,
        record.pronouns,
        record.access,
        record.intent,
        JSON.stringify(record.outputs),
        record.why,
        record.goals,
        record.month,
        record.year,
        record.budget,
        record.ipHash,
        record.ipHashAlgorithm,
        record.userAgent,
        record.source,
        status,
      )
      .run();

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'error', detail: describe(error) };
  }
}

/**
 * Records which notifications actually went out, so a later query can find the
 * enquiries nobody was told about. Best-effort by definition: if this fails the
 * enquiry is already safely stored, which is the part that matters.
 */
export async function recordNotifyState(
  db: D1Database | undefined,
  id: string,
  state: Record<string, string>,
): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;

  try {
    await db
      .prepare('UPDATE enquiries SET notify_state = ?2 WHERE id = ?1')
      .bind(id, JSON.stringify(state))
      .run();
  } catch {
    // Swallowed deliberately — see the doc comment. The caller has already
    // logged the notification outcomes it is trying to persist here.
  }
}

export function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
