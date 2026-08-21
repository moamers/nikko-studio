/**
 * The Worker entry point — the whole site's front door.
 *
 * SERVER ONLY — see `./lib/enquiry/server/README.md`.
 *
 * This project deploys as a **Cloudflare Worker with static assets**, not as a
 * Cloudflare Pages project. The distinction is invisible in the built output —
 * both serve the same `dist/` — but it changes where server code lives:
 *
 * | | Pages | Workers *(what we use)* |
 * |---|---|---|
 * | Server routes | a magic `functions/` directory | this file, dispatching by path |
 * | Static files | served implicitly | the `ASSETS` binding (`wrangler.toml`) |
 * | Deploy | `wrangler pages deploy` | `wrangler deploy` |
 *
 * Cloudflare now creates Workers by default, and the deploy token it injects
 * into a Worker build has no permission to touch the Pages API — so a Pages
 * layout in a Worker project fails at the very last step with an opaque
 * `Authentication error`. See `docs/18-staging-and-deployment.md`.
 *
 * **Routing.** Cloudflare matches static assets *before* invoking this Worker,
 * so an ordinary page request never reaches this code. Only paths with no
 * matching file do — `/api/enquiry`, and genuine 404s. That ordering is what
 * keeps a static site static: no Worker invocation, no cold start, no cost, on
 * the requests that are just HTML.
 */
import type { EnquiryEnv } from './lib/enquiry/server/env.ts';
import { handleEnquiry, handleNonPost } from './lib/enquiry/server/handler.ts';

/**
 * The static-asset binding, declared as `[assets] binding = "ASSETS"` in
 * `wrangler.toml`. Hand-written rather than pulled from
 * `@cloudflare/workers-types` for the same reason as the D1 types in `env.ts`:
 * we use exactly one method, and a dependency for one method is a dependency
 * to upgrade, audit and explain. [P8]
 */
interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerEnv extends EnquiryEnv {
  readonly ASSETS: AssetsBinding;
}

/** The one server-rendered path. Everything else is a file on disk. */
const ENQUIRY_PATH = '/api/enquiry';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === ENQUIRY_PATH) {
      // `handleNonPost` answers every other verb — 405 to a JSON caller, a 303
      // back to the form for a browser — so there is no verb this falls
      // through on.
      return request.method === 'POST'
        ? handleEnquiry(request, env)
        : handleNonPost(request, env);
    }

    // Not our route. Hand it back to the asset server, which owns both the
    // real files and the 404 for anything that is not one.
    return env.ASSETS.fetch(request);
  },
};
