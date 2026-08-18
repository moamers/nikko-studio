# 16 — Forms & Data Capture

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
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

| # | Question |
|---|---|
| 1 | Keep the Google Sheet as a working view, or email + periodic export? |
| 2 | Where should enquiry notifications go — Nadia's Workspace address, or a shared `hello@`? |
| 3 | What should the enquirer's confirmation email say about **when** they'll hear back? |
| 4 | Retention period for enquiry data? |
| 5 | Should the redesigned form keep all current fields, or is it being reworked? *(Coming in the updated handoff.)* |

---

**Next:** [15 — Migration & Cutover](./15-migration-and-cutover.md) · [10 — Hosting, Domains & Ops](./10-hosting-domains-and-ops.md)
