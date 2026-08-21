# 16 — Forms & Data Capture

> **Status:** Part 2 implemented, transactional email design approved and wired · **Owner:** Engineering · **Last updated:** 2026-08-21
> **Related:** [Docs index](./README.md) · [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism) · [P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary) · [Plain English](./00-start-here.md#5-what-happens-to-the-forms)

The site has exactly two places where a visitor hands over data, and they are the two most commercially important interactions on it. They have **different requirements and different architectures**, and conflating them would be a mistake.

| | **Newsletter** | **Enquiry** |
|---|---|---|
| Volume | High | Low |
| Value per submission | Compounding | £5,000+ |
| Data | Name, email | Business, contact, project, budget, deadline |
| Consent basis | Marketing opt-in | Legitimate interest / pre-contract |
| Who stores it | **Kit** | **Us** |
| Who confirms to the user | **Kit** (double opt-in) | **Us** |
| Failure mode | A subscriber is lost — annoying | **A five-figure lead vanishes** |

That last row drives most of what follows.

---

## Part 1 — Newsletter → Kit

Kit (ConvertKit) is already in use on the live site. It stays. The list, tags, sequences, broadcasts and double opt-in are unchanged.

### Recommendation: our form, Kit's API — not Kit's embed

Kit offers a JavaScript embed. It is the easy path and we recommend against it.

| | **Kit JS embed** | **Our form → Kit API** ✅ |
|---|---|---|
| Third-party script | ~30–50 KB, render-blocking risk | **None** |
| Cookies | Sets them → the form itself becomes **consent-gated** | **None** → the form works for everyone, including people who decline tracking ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)) |
| Styling | Kit's markup, limited overrides | **Fully ours** — the design's paper inputs, pill button, accent slot bar |
| CSP | Needs loosening for a third-party origin | Stays tight ([P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary)) |
| Error/success states | Kit's | **Ours** — designed, on-brand |
| Works without JS | No | **Yes** — progressive enhancement ([P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order)) |
| Kit still handles list, opt-in, sequences | Yes | **Yes — identical** |

**Note:** the site now carries a cookie banner regardless, because [GTM and GA4 are in scope](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm). That does *not* weaken the case here — it strengthens it. If the newsletter form set its own cookies, it would have to sit behind the consent banner too, meaning **anyone who declines tracking could not subscribe at all**. Our cookieless form keeps the site's highest-value interaction available to 100% of visitors.

The important point: **going through Kit's API loses nothing.** Adding a subscriber to a Kit form via the API triggers the same double opt-in, the same confirmation email, the same welcome sequence and the same tagging as the embed. Kit remains the system of record for the list. We only replace the *widget*, not the *service*.

### Flow

```
<form action="/api/subscribe" method="POST">     ← works with JS disabled
        │
        ▼
Cloudflare Pages Function
   ├─ validate (email format, required fields)
   ├─ honeypot check
   ├─ rate limit by IP
   ├─ POST → Kit API v4  (API key from env, never in the browser)
   └─ respond 200 / 4xx
        │
        ▼
Kit: double opt-in email → confirmation → welcome sequence → tagged
```

Enhanced with JS: inline validation, an in-place success state, no page reload. Without JS: a normal form POST and a redirect to `/subscribed`. Both work.

**Tagging:** subscribers should carry a source tag (`site-footer`, and later `site-showandtell` etc.) so Nadia can see what the website actually contributes to the list.

---

## Part 2 — Enquiry form

### What exists today

A hardcoded HTML form at `/contact` posting to a Google Apps Script, which writes to a Google Sheet. The **field design is genuinely good** and should be preserved — it already asks the qualifying questions that matter:

> Business name · Your name · Social / website · Pronouns · Best way to reach you · Accessibility requirements · Project type · What are we doing? · Why are we doing this? · Goals · Deadline · **Budget**

A **budget** field on a service with a £5,000 floor is exactly the right qualification, and the accessibility and pronouns fields are a genuine reflection of how the business describes itself. Whatever the redesign does visually, keep this substance.

There is also already a honeypot field ("Leave this field blank") — good instinct.

### The problem with the current setup

It is not the Google Sheet — a Sheet is a perfectly good CRM for low-volume, high-value enquiries, and Nadia already lives in Google Workspace. **The problem is that the Apps Script is the only thing standing between a five-figure enquiry and oblivion.** If it errors, hits a quota, or the notification lands in spam, the submission is gone with no record and no way to know it happened.

### Recommended architecture

```
                    <form action="/api/enquiry" method="POST">
                                    │
                                    ▼
                    Cloudflare Pages Function
                      ├─ 1. validate server-side
                      ├─ 2. honeypot + Turnstile (invisible)
                      ├─ 3. rate limit by IP
                      │
                      ├─ 4. WRITE TO STORE ──────────► Cloudflare D1
                      │      (must succeed)             durable record
                      │
                      ├─ 5. EMAIL NADIA ─────────────► Resend
                      │      reply-to = enquirer
                      │
                      ├─ 6. EMAIL THE ENQUIRER ──────► Resend
                      │      confirmation + next steps
                      │
                      └─ 7. optional: append ────────► Google Sheet
                             (best-effort, non-blocking)
```

**Step 4 is the one that must succeed.** Steps 5–7 are notifications; if any of them fails, the submission still exists and can be recovered. The current setup has this exactly backwards — the notification *is* the record.

### The pieces

| Piece | Choice | Why | Cost |
|---|---|---|---|
| **Storage** | **Cloudflare D1** | Free, durable, already in the stack, queryable, backed up | £0 (5 GB free) |
| **Transactional email** | **Resend** | Purpose-built for this, excellent deliverability, simple API | £0 (3,000/mo, 100/day) |
| **Spam** | Honeypot + **Cloudflare Turnstile** | Invisible, no puzzles, free, no Google dependency | £0 |
| **Working view** *(optional)* | Google Sheet | Nadia's existing workflow; sorting, notes, status columns | £0 |

**On the database and [P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure).** The doctrine says no database unless genuinely needed, and that deserves an honest answer rather than a quiet exception. It is needed here: an email-only pipeline means one spam filter between the business and a lost £5,000+ lead. D1 is serverless SQLite with no instance to run, patch or pay for — it adds a table, not an ops burden. That is a justified exception, recorded rather than assumed.

### Notifications

**To Nadia — immediately on submission:**
- Subject carries the signal: `New enquiry — {business} — {budget band}`
- Body: every field, formatted, readable on a phone
- **`Reply-To` set to the enquirer's address**, so replying just works
- Sent to a Google Workspace address; SPF/DKIM aligned so it lands in the inbox, not spam

**To the enquirer — immediately:**
- Confirms receipt in Nikko's voice, not a system message
- Says **what happens next and when** — this is where a studio wins trust, and it is the thing the current setup can't do at all
- Sent from the domain with proper authentication so it doesn't look like phishing

Both go through **Resend**, not Kit. Transactional mail must not run through a marketing ESP: it conflates consent (a project enquiry is not a newsletter opt-in), and it risks the marketing sending reputation. Kit and Resend do different jobs.

### If the Google Sheet stays

Worth keeping if Nadia wants it — it is a decent lightweight CRM and it's already her habit. Done properly this time: a Cloudflare Function → Google Sheets API with a service account, treated as a **best-effort mirror**. If it fails, it's logged and the D1 record is still authoritative. No Apps Script in the path.

**Question for Nadia:** keep the Sheet, or is an email plus a monthly export enough? ([Q13](./13-open-questions.md))

---

---

## As built — `/api/enquiry`

> Added 2026-08-21. The architecture above was the decision; this section records
> what implementing it settled that the decision did not.

| Piece | Where |
|---|---|
| The endpoint | `site/functions/api/enquiry.ts` — a thin Pages Function adapter |
| The pipeline | `site/src/lib/enquiry/server/handler.ts` |
| Validation (shared with the page) | `site/src/lib/enquiry/validate.ts` |
| The accept-list | `site/src/lib/enquiry/options.generated.ts`, compiled from `form.yaml` |
| The schema | `site/migrations/0001_enquiries.sql` |
| Tests | `site/tests/unit/enquiry-*.test.ts` — `npm run test:unit` |

Nothing under `src/lib/enquiry/server/` may be imported by a page or a client
script; it reads secrets. The two shared modules (`validate.ts`,
`options.generated.ts`) hold neither secrets nor I/O.

### The accept-list cannot drift from the YAML

`src/content/contact/form.yaml` is Nadia's ([P7](./02-engineering-principles.md#p7--content-is-data-code-is-presentation)),
but the validator runs in a Worker that cannot read YAML at request time. So
`npm run build` regenerates `options.generated.ts` from the YAML *before* Astro
runs, and `enquiry-options.test.ts` fails if the committed output has drifted.

The consequence worth stating plainly: **an option code the UI does not offer is
rejected by the server.** Nadia adding a budget band and rebuilding is all that
is needed; nobody has to remember to update a second list, because there isn't one.

### Deploying it unconfigured

D1 is not provisioned, Resend has no account, and the notification address is
undecided ([Q2](#open-questions)). The endpoint ships anyway and degrades in a
defined order rather than an accidental one:

| D1 bound | Nadia's email sent | Visitor sees | Why |
|---|---|---|---|
| ✅ | ✅ | Success | Normal |
| ✅ | ❌ | **Success** | The record exists. An email failure is not the visitor's problem — this is the bug the whole design fixes |
| ❌ | ✅ | **Success**, `stored: false` | The inbox is the only copy. Logged as degraded |
| ❌ | ❌ | **503**, and an address to write to | Nothing recorded it. Saying "thank you" would be a lie |

The 503 branch writes the entire submission to the Worker log as a single JSON
line (`event: "submission_unrecorded"`), so it is recoverable by a human running
`wrangler pages deployment tail`. That is not a system of record and is not
treated as one — it is the floor under the floor. Every request also logs
`event: "unconfigured"` listing exactly what is missing, so the degraded state is
never silent.

`stored` is returned in the JSON response on purpose. A `false` in production is
the alarm that D1 needs binding.

### Turning it on

All configuration is environment-only; no variable is `PUBLIC_`-prefixed, so
none of it can reach the browser ([P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary)).

| Name | Kind | Absent means |
|---|---|---|
| `DB` | **D1 binding** | No durable record — email becomes the only copy |
| `RESEND_API_KEY` | secret | No email is sent at all |
| `ENQUIRY_NOTIFY_TO` | variable | Nobody is notified |
| `ENQUIRY_FROM` | variable | Falls back to `Nikko Studio <hello@nikkostudio.co>` — must be a Resend-verified domain |
| `TURNSTILE_SECRET` | secret | Spam check skipped; the honeypot still runs |
| `ENQUIRY_IP_SALT` | secret | The IP hash is unsalted, and the row says so |
| `ENQUIRY_FALLBACK_EMAIL` | variable | Defaults to `ENQUIRY_NOTIFY_TO`; shown only on the 503 page |
| `ENQUIRY_RATE_LIMIT` | variable | 5 submissions per IP per hour |
| `ENQUIRY_THANK_YOU_PATH` | variable | `/contact/thank-you` |
| `ENQUIRY_FORM_PATH` | variable | `/contact` |

Setup, in the order it can be done:

1. **D1.** `npx wrangler d1 create nikko-enquiries`, then
   `npx wrangler d1 migrations apply nikko-enquiries --remote` from `site/`.
   Bind it as **`DB`** under Pages project → Settings → Functions → D1 bindings.
   (There is deliberately no `wrangler.toml`: [18 — Staging & Deployment](./18-staging-and-deployment.md)
   configures this project from the dashboard, and a `wrangler.toml` would
   silently supersede those settings.)
2. **Resend.** Create the account, verify the sending domain (SPF + DKIM on
   `nikkostudio.co`), then set `RESEND_API_KEY` as an *encrypted* variable and
   `ENQUIRY_FROM` to an address on that domain.
3. **`ENQUIRY_NOTIFY_TO`** — pending [Q2](#open-questions).
4. **`ENQUIRY_IP_SALT`** — any long random string, encrypted. Set it before the
   first real submission; changing it later orphans earlier hashes.
5. **Turnstile.** Create an invisible/managed widget, set `TURNSTILE_SECRET`
   (encrypted) and give the page the site key.

Nothing here blocks anything else. Each variable improves the endpoint the
moment it appears, with no code change.

### Turnstile vs. "no CAPTCHA"

The design handoff says *no CAPTCHA*; this doc says Turnstile. They only conflict
if Turnstile is read as a puzzle. It is configured invisible/managed — no images
of traffic lights, nothing for a real visitor to do — and it is **optional**: with
no secret set, the check is skipped and logged. If Cloudflare's `siteverify` is
unreachable the submission is **allowed through**, because an outage at the spam
checker must not take the enquiry form down. Spam is recoverable; a lost lead is not.

### Works without JavaScript ([P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order))

One endpoint, content-negotiated on `Accept` (with `Sec-Fetch-Mode` as the
fallback signal for a `fetch` that sends no `Accept`):

| Request | Success | Validation failure |
|---|---|---|
| Normal form POST | `303` → `/contact/thank-you?ref=NKO-482913` | `303` → `/contact?enquiry=invalid&fields=budget,email#enquiry` |
| `Accept: application/json` | `201` with `{ ok, reference, stored, notified }` | `422` with `{ ok: false, error: "invalid", errors: [{ field, message }] }` |

Other no-JS redirect states: `?enquiry=rate-limited`, `?enquiry=spam-check`,
`?enquiry=error`. Only field names from `FIELDS` ever reach the URL, and the
redirect paths are validated as same-origin relative paths so a mistyped env var
cannot become an open redirect.

**This is a contract with the contact page**, and two parts of it are not built
yet by this work:

- `/contact/thank-you` must exist, and should read `?ref=`.
- `/contact` should render a message for each `?enquiry=` state and mark the
  fields named in `?fields=`.

Until the thank-you route exists, a no-JS success redirects to a 404 — visible
and fixable, which is the failure mode to prefer over a silent one.

### The reference

The server generates `NKO-######` and returns it; the receipt renders what it is
given rather than inventing its own, so the number on screen, the number in the
enquirer's email and the row in D1 are the same number. Stored with an ASCII
hyphen so it survives a Gmail search, a URL and a spreadsheet cell — the design
is free to render the em dash.

### Schema decisions

- **`status`** is Nadia's workflow marker, defaulting to `new`. Deliberately
  **not** constrained by a `CHECK`: a column that rejects a status she invents is
  a column she stops using. Suggested vocabulary is in the migration's comments.
  A free-text `notes` column sits beside it, never written by the endpoint.
- **`outputs`** is a JSON array of codes, queryable with `json_each`.
- **`ip_hash` + `ip_hash_alg`.** The address itself is never stored ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)).
  The algorithm column exists so a salt rotation is legible, and so an unsalted
  hash is honestly labelled rather than mistaken for anonymised data.
- **`notify_state`** records which emails went out. `SELECT * FROM enquiries
  WHERE notify_state NOT LIKE '%"nadia":"sent"%'` is the "who was I never told
  about" query, and is the reason the column exists.
- **Rate limiting lives in its own table.** A blocked attempt is not an enquiry
  and must not pollute the record table.

### A tripped honeypot is quarantined, not deleted

A honeypot trip returns a success to the sender — telling a bot otherwise only
teaches it which field to leave alone. But the submission is still **written to
D1 with `status = 'spam'`**, and no email is sent.

The reason is narrow and worth stating: browsers do autofill hidden inputs. A
false positive that silently deleted a real enquiry would be the exact failure
this endpoint exists to prevent, dressed up as a spam filter.
`SELECT * FROM enquiries WHERE status = 'spam'` recovers it. The cost of being
wrong in this direction is some rows; the cost of being wrong in the other
direction is a lost £5,000+ lead.

The honeypot check runs *after* validation and rate limiting, so a flood of
well-formed spam is capped and a flood of garbage never reaches the table.

### Rate limiting is only as good as its backend

Five submissions per IP hash per hour. With `DB` bound the counter is in D1 and
is correct across every edge location. Without it there is an in-isolate memory
counter — a speed bump, not a defence, since Cloudflare runs many short-lived
isolates. It is logged as degraded rather than quietly treated as working. **This
gets materially better the moment D1 is bound**, which is one more reason to do
that first.

### Retention

The migration ships no scheduled deletion. Retention is a manual, documented
procedure until Nadia confirms the period ([Q4](#open-questions)) — a cron job
that deletes a five-figure lead on an unconfirmed policy is the wrong kind of
automatic.

## Privacy & compliance ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism))

UK GDPR applies to both forms.

| Requirement | How |
|---|---|
| Lawful basis | Newsletter: consent (Kit double opt-in). Enquiry: legitimate interest / pre-contract |
| Privacy notice | Linked at the point of collection on **both** forms. **Must be live before either form ships** |
| Data minimisation | Only fields that change how Nadia responds. Pronouns and accessibility are optional |
| Retention | Define and document — suggested: enquiries 24 months, then deleted or anonymised |
| Right to erasure | A documented procedure: delete from D1, Sheet, Resend logs and Kit |
| Processors | Cloudflare, Resend, Kit, Google — all listed in the Privacy Policy |
| No cookies | Neither form sets any → **no consent banner** |
| Transfers | Note US processors and their transfer mechanism |

The existing Privacy Policy predates this architecture and will need reviewing against the new processor list before launch.

## Security ([P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary))

- **All validation repeated server-side** — client validation is UX only
- **Honeypot** — kept from the current form
- **Turnstile** — invisible to real users
- **Rate limiting** by IP
- **No secrets in the browser** — Kit, Resend, Google and D1 credentials are Cloudflare environment variables
- **Escape everything** in notification emails — a form field is untrusted input, including in HTML email
- **Field length caps**, enforced by schema
- **CSP `form-action 'self'`** — forms can only post to our own origin

## Accessibility ([P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement))

Real `<form>`, real `<label>` for every field (the design currently has none for the newsletter), `autocomplete` attributes, errors linked with `aria-describedby`, success and failure announced via `aria-live`, focus moved to the first error on failed submit, inputs at **16px** so iOS doesn't zoom, and full keyboard operation. The design's `3px` input radius and paper fill are preserved.

## Measurement

Both submissions fire a conversion event. These are the only two numbers on the site that map directly to revenue, and neither is currently tracked:

| Event | Why |
|---|---|
| `newsletter_subscribe` | The compounding asset |
| `enquiry_submit` (+ budget band) | The revenue event — and which traffic sources produce qualified enquiries |

---

## Open questions

| # | Question | Status |
|---|---|---|
| 1 | Keep the Google Sheet as a working view, or email + periodic export? | **Open.** Step 7 is not built. D1 is authoritative either way, so this is additive whenever it is answered |
| 2 | Where should enquiry notifications go — Nadia's Workspace address, or a shared `hello@`? | **Open, and blocking the notification email.** It is one env var (`ENQUIRY_NOTIFY_TO`), no code change |
| 3 | What should the enquirer's confirmation email say about **when** they'll hear back? | **Answered, 2026-08-21.** Nadia's approved `email-copy.yaml` (Direction 01) commits to "within two working days" in `customer.intro`. This supersedes the earlier no-promise stance — the wording now lives in `src/content/email/copy.yaml`, not code, and a drift test (`enquiry-email-copy.test.ts`) fails if the generated module and the YAML disagree. See [20 — Transactional Email Design](./20-transactional-email-design.md) |
| 4 | Retention period for enquiry data? | **Open.** No automatic deletion until it is answered |
| 5 | Should the redesigned form keep all current fields, or is it being reworked? | **Answered** by the contact handoff. The fields are those in `src/content/contact/form.yaml`, and the server validates exactly them |
| 6 | *(new)* Does Nadia want the whole confirmation email rewritten? | **Answered, 2026-08-21.** Direction 01 is the approved design for both emails — see [20](./20-transactional-email-design.md) |
| 7 | *(new)* Who owns `/contact/thank-you`? | The no-JS success redirect targets it. It does not exist yet |

---

**Next:** [15 — Migration & Cutover](./15-migration-and-cutover.md) · [10 — Hosting, Domains & Ops](./10-hosting-domains-and-ops.md)
