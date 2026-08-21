/**
 * POST /api/enquiry — the project enquiry endpoint.
 *
 * A Cloudflare Pages Function. Deliberately thin: everything it does lives in
 * `src/lib/enquiry/server/handler.ts`, which takes a plain `Request` and a
 * plain env object and can therefore be unit-tested without a Worker runtime
 * (`tests/unit/enquiry-endpoint.test.ts`).
 *
 * Content-negotiated, so the form works with JavaScript disabled [P3]:
 *
 * | Request | Response |
 * |---|---|
 * | Normal form POST | `303` to the thank-you page with `?ref=NKO-######` |
 * | `fetch` with `Accept: application/json` | `201` JSON carrying the reference |
 *
 * Configuration — all from the environment, never from code [P15]:
 *
 * | Name | Kind | Absent means |
 * |---|---|---|
 * | `DB` | D1 binding | No durable record; email becomes the only copy |
 * | `RESEND_API_KEY` | secret | No email is sent |
 * | `ENQUIRY_NOTIFY_TO` | variable | Nobody is notified |
 * | `TURNSTILE_SECRET` | secret | Spam check skipped (honeypot still runs) |
 * | `ENQUIRY_IP_SALT` | secret | IP hash is unsalted, and says so |
 *
 * With none of them set the endpoint still builds, still deploys and still
 * behaves sanely — see docs/16-forms-and-data-capture.md, "Deploying it
 * unconfigured". No variable here is `PUBLIC_`-prefixed, so none of it can
 * reach the browser.
 */
import { handleEnquiry, handleNonPost } from '../../src/lib/enquiry/server/handler.ts';
import type { EnquiryEnv } from '../../src/lib/enquiry/server/env.ts';

/**
 * The slice of Cloudflare's `EventContext` we actually use. Hand-written rather
 * than pulled from `@cloudflare/workers-types` — see the note in `env.ts`.
 */
interface RequestContext {
  readonly request: Request;
  readonly env: EnquiryEnv;
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  return handleEnquiry(context.request, context.env);
}

export function onRequestGet(context: RequestContext): Response {
  return handleNonPost(context.request, context.env);
}

// No `onRequest` catch-all: with only the two method handlers exported,
// Cloudflare answers every other verb with 405 itself, which is the correct
// answer and one less thing to keep right.
