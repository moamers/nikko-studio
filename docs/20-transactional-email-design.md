# 20 — Transactional Email Design

> **Status:** Implemented · **Owner:** Engineering · **Last updated:** 2026-08-21
> **Related:** [Docs index](./README.md) · [16 — Forms & Data Capture](./16-forms-and-data-capture.md) · [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess) · [P7](./02-engineering-principles.md#p7--content-is-data) · [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact) · [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) · [P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary)

The two enquiry emails — the notification to Nadia and the confirmation to the enquirer — now ship to the approved design: **"Direction 01 — restrained editorial receipt"**, handed off as two HTML documents plus `email-copy.yaml` and a 13-point integration spec (`HANDOFF.md`). This is the integration record: what was wired up, what the handoff's own data contract didn't match, and — per the standing instruction to flag rather than silently absorb — the specific points that needed a call before the approved design could be reproduced correctly.

## What was integrated

Only the two bounded HTML documents (`NIKKO_EMAIL_TEMPLATE_START:customer_confirmation` / `owner_notification`) were built into the live send path. The handoff's preview page, iframe wrapper and site chrome were explicitly out of scope and were not touched.

| Handoff instruction | How it was met |
|---|---|
| 1 — load `email-copy.yaml` server-side, don't duplicate wording in code | `src/content/email/copy.yaml` → `email-copy.build.mjs` → `server/email-copy.generated.ts`, mirroring the existing `options.build.mjs` pattern. A drift test fails the build if the generated module and the YAML disagree |
| 2, 3 — every value from the submitted form, not sample data | `emailSections()` in `server/email.ts` builds both templates' field tables straight from `EnquiryRecord` (the stored submission), through `labelFor()` to turn a stored code into display text |
| 4 — `submitted_at` in the business timezone, `year` at send time | `formatSubmittedAt()` uses `Intl.DateTimeFormat` with `timeZone: 'Europe/London'`, so BST/GMT resolve correctly with no manual DST table |
| 5 — logo at a stable public HTTPS URL | `public/email/nikko-mark.png`, served at `{SITE_URL}/email/nikko-mark.png`. See **Logo**, below |
| 6 — compile server-side, escape every dynamic value | Built with plain TypeScript template functions (the project's existing pattern — there is no general template engine in this codebase) through `esc()` / `escMultiline()` from `server/html.ts`. No raw interpolation anywhere in the two builders |
| 7 — correct recipients, reply-to | `buildEnquirerEmail` → `record.email`; `buildNadiaEmail` → the configured admin address, `replyTo: record.email` |
| 8 — subjects | Customer: `copy.customer.subject`. Owner: `` `${copy.owner.subject_prefix} ${record.business}` `` |
| 9 — omit empty optional rows | Social / Pronouns / Access rows are only pushed onto the row list when the record has a value — never rendered blank |
| 10 — preserve the approved CSS/table structure, no JS/webfonts/SVG | HTML builders are a line-for-line transcription of the two source templates' inline styles and table structure |
| 11 — masthead separator | **Corrected — see below** |
| 12 — no arrow icons, exact website label | Enforced by a unit test that walks the whole `EMAIL_COPY` object for arrow glyphs |
| 13 — plain-text alternative, existing send flow | `sectionsToText()` + per-email text builders; sent through the existing `sendEmail()` → Resend call, itself unchanged |

## What was flagged rather than guessed at

### The masthead separator was wrong in the handoff

The handoff's own `email-copy.yaml` and `HANDOFF.md` instruction 11 both specify `NIKKO STUDIO // LONDON // DUBAI` — a double forward slash — and instruction 11 explicitly warns not to substitute a backslash.

The site's own opening sequence — the one place this exact "name / place / place" construction already exists, and the thing the founder recalled writing — uses a **single** slash with one space either side:

```
src/components/OpeningSequence.astro:36
"A story studio / London / UAE"
```

There is no `//` anywhere else in the codebase's copy. Per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess), the site's own verbatim, already-approved copy outranks the newer ChatGPT-authored artifact. `email-copy.yaml` was corrected to `NIKKO STUDIO / LONDON / UAE` with a comment citing `OpeningSequence.astro` as the source, and a unit test (`enquiry-email-copy.test.ts`) pins the single-slash form so it can't regress. (The city name in that corner note was later changed from "Dubai" to "UAE" by the founder — the fix here was always about the separator, not the place, so the masthead tracks whatever `OpeningSequence.astro` says.)

### The handoff's logo was wrong

`assets/nikko-email-mark.png` (the ChatGPT-supplied mark) did not match the real Nikko Studio mark — the founder flagged this directly. The site's actual mark is drawn in CSS (`src/components/Logo.astro`), never a raster image, so there was nothing to "correct" against — email clients need a raster, so one had to be generated, not swapped.

`public/favicon.svg` is the site's canonical *static* representation of the mark (ink ellipse `#111110`, paper stripe `#F2ECDF`, Horizon-yellow accent stripe `#FFD400` — already a documented [P11] exception for the same reason email needs one: neither an `<img>` nor a browser favicon can read a CSS custom property). That SVG was rendered via headless Chromium at 240×240 with a transparent background and optimized down to `public/email/nikko-mark.png` (3.7 KB) — a pixel-accurate raster of the real mark, not a hand-recreated approximation.

### A bug in the handoff's own templates

Both source HTML documents hardcoded two field labels as literal text — `What we're making` and `What's changing` — instead of using `{{copy.fields.outputs}}` / `{{copy.fields.why}}`, which are defined in the templates' own YAML. That's a direct violation of the handoff's own instruction 1 ("do not duplicate this static wording inside application code"). Fixed by using `EMAIL_COPY.fields.outputs` / `EMAIL_COPY.fields.why` throughout, so both labels are genuinely single-sourced from the YAML like every other label.

### The confirmation now makes a timing promise — this supersedes an earlier decision

[16 §Open questions Q3](./16-forms-and-data-capture.md) previously recorded a deliberate choice: the confirmation email made *no* promise about response time (`RESPONSE_TIME_PROMISE` was `null` in the old `server/copy.ts`, with a unit test asserting no such promise had crept in). Nadia's approved `email-copy.yaml` now reads, in `customer.intro`:

> "…thanks for taking the time to tell us what you're working on. We'll read through it properly and get back to you **within two working days**."

Since this is Nadia's own supplied wording and the instruction was explicit — *"keep all static wording in the supplied YAML"* — it has been shipped as-is. This is flagged here rather than silently absorbed: it is a real, substantive change from the previous documented position, now recorded as the resolution to Q3 rather than a pending question. If "two working days" isn't a commitment the studio can reliably keep, the fix is a one-line edit to `src/content/email/copy.yaml` — nothing else in the pipeline needs to change, and the drift test guarantees the sent copy matches whatever the YAML says.

### The data contract didn't match the real system — expected, and handled as instructed

`render-context.example.json` used field names (`movement`, `target`, `outputs_display`, `first_name`) and human-readable sample values that don't exist anywhere in the real system. The actual submission is validated and stored as an `EnquiryRecord` (`src/lib/enquiry/server/store.ts`) using option **codes** — `intent: 'launch'`, `budget: '10k-20k'`, `outputs: ['website', 'messaging']` — not labels. Per the handoff's own instruction ("if any of these differ from this contract, adapt the mapping layer rather than altering the email design or silently dropping data"), `emailSections()` in `server/email.ts` is exactly that mapping layer: it converts every stored code to its display label via the existing `labelFor()` helper, so the design and the copy are untouched and no submitted answer is dropped.

### Arrow icons

None were present in the source templates or `email-copy.yaml`, and none were introduced. `enquiry-email-copy.test.ts` recursively walks the generated `EMAIL_COPY` object for arrow glyphs (`→ ➔ ➺ ➜ ➡ ⇒ ▶ ►`) as a standing guard.

### The owner email now carries the enquiry reference

Neither approved HTML template shows the internal `NKO-XXXXXX` reference anywhere — reasonably, it's not something a founder needs to *see* in the visual receipt. But the plain-text alternative isn't part of the visual design (the handoff only specifies the two HTML documents; instruction 13 asks us to *generate* the text part), and without the reference somewhere in Nadia's copy she has no way to correlate a notification email back to the D1 record if she ever needs to (e.g. investigating a lost reply thread). It was added as a line in the owner email's plain-text tail only — the approved HTML is untouched.

## Still blocking a real send

Unchanged from [17 — Action Tracker](./17-action-tracker.md#-email-notifications--form-submissions): `RESEND_API_KEY`, `ENQUIRY_NOTIFY_TO` and the D1 binding are all still unset in the deployed environment. `readConfig()` (`server/env.ts`) degrades gracefully when any of them is missing — nothing throws, but no email actually goes out until they're configured. `SITE_URL` is optional and defaults to `https://nikkostudio.co`; set it explicitly if the logo and website-footer link should point somewhere else during staging.

## Verification

- `enquiry-email-copy.test.ts` (4 tests): generated module matches the YAML exactly; masthead is single-slash; no arrow icons anywhere in `EMAIL_COPY`; the website label is exactly `NIKKOSTUDIO.CO`.
- `enquiry-endpoint.test.ts` "email escaping" suite: script-tag and header-injection payloads across every field are HTML-escaped in both bodies; `Reply-To` is always the bare enquirer address; the timing promise and greeting are asserted against `EMAIL_COPY`, not a hardcoded string, so they can't silently drift from the YAML.
- Rendered both emails with long-answer, long-name, all-optional-fields-populated data and screenshotted at 320px and 640px viewports (Playwright, headless Chromium) — no layout breakage, reply button wraps cleanly under a long name, optional rows render correctly when present.
- `npm run build` (options + email-copy generation, `astro check`, `astro build`) and the full unit suite (60/60) both pass.

---

**Next:** [16 — Forms & Data Capture](./16-forms-and-data-capture.md) · [17 — Action Tracker](./17-action-tracker.md)
