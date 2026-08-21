# `src/lib/enquiry/server/`

**Nothing in this directory may be imported from a `.astro` page, a component, or
a client script.** These modules read environment secrets (`RESEND_API_KEY`,
`TURNSTILE_SECRET`, `ENQUIRY_IP_SALT`) and talk to D1. They exist under `src/`
only so they sit beside the validator they share and so `astro check` type-checks
them; they are bundled by Cloudflare's Pages Functions build, not by Astro.

The two modules that **are** safe on both sides:

| Module | Why it is shared |
|---|---|
| `../validate.ts` | The same rules run client-side for UX and server-side for safety ([P15](../../../../../docs/02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary)). No secrets, no I/O. |
| `../options.generated.ts` | The accept-list, compiled from `src/content/contact/form.yaml`. No secrets. |

The Pages Function itself is `functions/api/enquiry.ts`. It is a thin adapter:
all the behaviour lives in `handler.ts` here, so it can be unit-tested without a
Cloudflare runtime.
