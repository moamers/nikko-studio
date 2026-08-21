# 17 — Action Tracker

> **The single checklist.** Everything that must not be forgotten, with an owner.
> **Last updated:** 2026-08-17 · [Docs index](./README.md) · [Roadmap](./12-roadmap.md)

Living document — tick things off as they're done. If it isn't here, it will get forgotten.

**Status:** ⬜ not started · 🟡 in progress · ✅ done · ⏸️ waiting on something else

---

## 🎨 Nadia — design tasks (with Claude Design)

| | Task | Why it's needed | Blocks | Status |
|---|---|---|---|---|
| D1 | **Updated homepage handoff** | The version in the repo is superseded | Phase 1 build | 🟡 In progress |
| D2 | **Enquiry form redesign** (`/contact`) | Current form is hardcoded HTML on a hacky Apps Script. Needs to match the new design | [Task 1.15](./12-roadmap.md) | ⬜ |
| D3 | **Cookie consent banner** | Required once Google Tag Manager loads — see [A7](#-analytics--tracking) | GTM going live | ⬜ |

**Notes for D2 — keep the substance.** The current form's fields are good and do real qualification work. Whatever changes visually, keep: business name, contact name, social/website, **budget**, deadline, project type, "what are we doing", "why are we doing this", goals, accessibility requirements, pronouns. And keep the honeypot field. Detail: [16](./16-forms-and-data-capture.md#part-2--enquiry-form).

**Notes for D3 — what the banner has to do.** Not just a notice; it has to actually gate the tracking:
- Appears before any GTM/GA4 script loads
- Real Accept **and** Reject buttons, equally prominent (UK GDPR — a reject must be as easy as an accept)
- Remembers the choice
- The site works fully for people who decline
- Links to the Privacy Policy
- Should not cover the newsletter form or the primary CTA on mobile

---

## 📧 Kit — newsletter integration

| | Task | Detail | Phase | Status |
|---|---|---|---|---|
| K1 | **Build the signup form to Kit's API** | Our designed form → Cloudflare Function → Kit API. **Not** Kit's JS embed — that would load a third-party script and set cookies | 1 | ⬜ |
| K2 | Get the Kit API key into Cloudflare env vars | Never in the browser | 1 | ⬜ |
| K3 | Decide which Kit form/tag site subscribers land in | So the website's contribution to the list is measurable | 1 | ⬜ **Nadia** |
| K4 | Add source tagging (`site-footer`, later `site-showandtell`) | Attribution | 1 | ⬜ |
| K5 | Test end-to-end — real signup → Kit double opt-in → welcome sequence | Before launch | 1 | ⬜ |
| K6 | Add Kit to SPF/DKIM so newsletter mail authenticates from the domain | Deliverability | 0 | ⬜ |

Kit keeps doing everything it does today — list, double opt-in, confirmation email, sequences, broadcasts. We replace only the widget. [16](./16-forms-and-data-capture.md#part-1--newsletter--kit)

---

## 📬 Email notifications — form submissions

| | Task | Detail | Phase | Status |
|---|---|---|---|---|
| E1 | **Set up Resend** + verify the sending domain (DNS records) | Sends both form emails — `RESEND_API_KEY` is still unset, so sends are currently skipped, not failed | 1 | ⬜ |
| E2 | **Notification email to Nadia** on every enquiry | Built to the approved Direction 01 design. All fields, readable on a phone, `Reply-To` = the enquirer. Blocked on E1 + E4 to actually send | 1 | ✅ |
| E3 | **Confirmation email to the enquirer** | Built to the approved Direction 01 design. Says what happens next and when. Blocked on E1 to actually send | 1 | ✅ |
| E4 | Decide where notifications go | Nadia's Workspace address, or a shared `hello@`? — `ENQUIRY_NOTIFY_TO` is still unset | 1 | ⬜ **Nadia** |
| E5 | Write the confirmation email copy | **Done, 2026-08-21.** Nadia's Direction 01 copy commits to "within two working days" — see [20](./20-transactional-email-design.md) | 1 | ✅ |
| E6 | Test both emails end-to-end, including spam-folder check | Before launch — needs E1 + E4 first | 1 | ⬜ |

**Why this matters:** today a form submission that fails silently is simply lost. The new flow saves the submission **first**, then notifies — so a bounced email costs you a notification, not a £5,000 lead.

---

## 💾 Enquiry form — storage

| | Task | Detail | Phase | Status |
|---|---|---|---|---|
| F1 | **Cloudflare D1 table** for submissions — the durable record | Free, no server to run | 1 | ⬜ |
| F2 | Server-side validation, honeypot, Turnstile, rate limiting | [P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary) | 1 | ⬜ |
| F3 | Decide: keep the Google Sheet as a working view? | Best-effort mirror, not the record | 2 | ⬜ **Nadia** |
| F4 | Decide: retention period (suggested 24 months) | GDPR | 1 | ⬜ **Nadia** |
| F5 | Document the erasure procedure | GDPR right to erasure | 1 | ⬜ |

---

## 📊 Analytics & tracking

| | Task | Detail | Phase | Status |
|---|---|---|---|---|
| A1 | **Cloudflare Web Analytics** — always on, cookieless | Baseline that works for everyone, including people who decline consent. Free | 1 | ⬜ |
| A2 | **Google Tag Manager container** | Requested by Nadia. Free | 1 | ⬜ |
| A3 | **GA4 property**, configured through GTM | Free | 1 | ⬜ **Nadia to create / share access** |
| A4 | **Consent gating** — GTM loads *only* after accept | Legally required, and it's why D3 exists | 1 | ⬜ |
| A5 | Conversion events: `newsletter_subscribe`, `enquiry_submit` (+ budget band) | The only two numbers that map to revenue | 1 | ⬜ |
| A6 | Adjust the Content-Security-Policy to allow GTM | Otherwise the script is blocked | 1 | ⬜ |
| A7 | ⚠️ **Accept the trade-offs of GTM** — see below | Decision | 1 | 🟡 **Nadia — noted, proceeding** |

### A7 — the honest trade-off on GTM

You've asked for GTM, and you've already anticipated the consequence by asking for a cookie banner — so this is coherent. But writing it down so nobody's surprised later:

| Cost | Detail |
|---|---|
| **A cookie banner becomes mandatory** | GTM/GA4 set cookies. UK GDPR requires consent first |
| **Roughly 45–90 KB of extra JavaScript** | Against a ~5 KB budget for our own code. It will be the largest script on the site by a wide margin |
| **Some performance headroom** | It'll still be fast, but the [budgets](./08-performance.md) get tighter |
| **You lose data from people who decline** | Typically 20–50% of visitors reject |
| **Third-party data flow** | Must be listed in the Privacy Policy |

**Recommended mitigation — run both:**
- **Cloudflare Web Analytics** always on. Cookieless, no consent needed, so it sees **100%** of traffic and reports real-user speed data.
- **GTM/GA4** after consent, for the deeper analysis — funnels, campaigns, attribution.

That way the consent banner costs you detail, not your baseline numbers. This is why [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism) has been amended rather than quietly broken.

---

## 🔧 Build backlog — deferred from foundations

Raised during the foundations build (2026-08-20), reviewed, and **deliberately deferred by Nadia** so the full build could proceed. Each carries its proposed fix so none of this needs re-deriving later.

| | Item | Proposed fix | Size | Status |
|---|---|---|---|---|
| B1 | `.nkhero-frame` uses `height: 100vh`, not `100svh` — [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation) bans `100vh` for full-height regions. On iOS the collapsing URL bar shifts the composition mid-scroll | Change to `100svh` with a `100vh` fallback. One character. Log as a [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) deviation since the block is marked "reproduce verbatim" | XS | ⬜ |
| B2 | At 390×844 the resolution line (`bottom: 7vh`) collides with the bottom corner note (`bottom: 1.25rem`) | Raise the resolution line, or fade the corner note out earlier, below ~500px height | S | ⬜ |
| B3 | **Mobile runway is ~2.7 swipes before any content**, with no scrollbar affordance — costly for the referral traffic [P2](./02-engineering-principles.md#p2--mobile-is-the-design-target-not-an-adaptation) identifies as commercially valuable | **Session-scoped skip** — the sequence is already stateless and replayable, so this is cheap. Alternative: shorten the mobile runway below 270vh | S | ⬜ **Needs Nadia** |
| B4 | **The static frame is not composed.** Every reduced-motion and no-JS visitor sees only this one frame, and with mark/title/resolution all forced visible the origin ring sits behind a title that is still offset | Design ruling — compose a deliberate static frame, or accept as-is. It is exactly what the spec prescribes | S | ⬜ **Needs design** |
| B5 | **Font budget breach: ~181 KB against the 120 KB budget** ([P4](./02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration)). Newsreader variable is 64 KB, Noto Kufi Arabic 44 KB | Two changes reach ~106 KB: static `@fontsource/newsreader` 400-italic instead of the variable package (−35 KB), and **build-time** subsetting of Kufi (−40 KB). Must be a build step, not a committed subset — the Arabic is founder-editable content and a hand-subset font breaks silently if she edits it | M | ⬜ Before launch |
| B6 | No `robots.txt` yet | Write it once [Q6](./13-open-questions.md) (AI-crawler policy) is answered. Deliberately not pre-empted | XS | ⏸️ Blocked on Q6 |

---

## 🚀 Staging — so Nadia can review on a phone

**Needs no DNS change** and is fully decoupled from the migration. Detail: [18](./18-staging-and-deployment.md).

| | Task | Detail | Status |
|---|---|---|---|
| S1 | **Create the Cloudflare account** — Nadia's email, 2FA on | It will later hold DNS for both domains, so it must be hers ([P9](./02-engineering-principles.md#p9--own-the-front-door)) | ⬜ **Nadia** |
| S2 | Connect the repo to Cloudflare Pages | Root directory `site`, build `npm run build`, output `dist` | ⬜ |
| S3 | Decide: put staging behind Cloudflare Access? | Free to 50 users. The site describes unreleased pricing and positioning | ⬜ **Nadia** |
| S4 | ✅ `PUBLIC_ALLOW_INDEXING` fail-safe | Builds are noindex unless explicitly opted in. Verified both ways | ✅ Done |

---

## 🔴 Infrastructure — do first

| | Task | Detail | Status |
|---|---|---|---|
| I1 | 🔴 **Migrate DNS off Squarespace to Cloudflare** | Both domains. **Preserve the Google Workspace MX records** | ⬜ **Urgent** |
| I2 | Confirm Google business email is on `@imnadiaamer.com` | The DNS says so — needs confirming | ⬜ **Nadia** |
| I3 | Add **SPF**, **DKIM**, **DMARC** | Currently missing. Anyone can spoof the domain today | ⬜ |
| I4 | Confirm GoDaddy auto-renew is on, card current, both domains | The one asset that can't be rebuilt | ⬜ **Nadia** |
| I5 | Create the Cloudflare account **in Nadia's name** | [P9](./02-engineering-principles.md#p9--own-the-front-door) | ⬜ **Nadia** |
| I6 | Verify email still flows after the nameserver change | Send a real test message | ⬜ |
| I7 | **Cancel Squarespace** — only after cutover is verified | Saves ~£10–20/month | ⏸️ After I1–I6 + launch |

Full sequence and rollback: [15 — Migration & Cutover](./15-migration-and-cutover.md).

---

## ⚖️ Legal & content

| | Task | Detail | Status |
|---|---|---|---|
| L1 | Migrate Privacy Policy from the live site | Already exists | ⬜ |
| L2 | **Update it** for the new processors — Cloudflare, Resend, Kit, Google, GA4 | Required before either form ships | ⬜ |
| L3 | Add a cookies section covering GTM/GA4 | Required | ⬜ |
| L4 | Migrate Terms & Conditions | Already exists | ⬜ |
| L5 | Fix the `irnnadiaamer.com` → `imnadiaamer.com` typo in the footer copy | `rn` misread as `m` | ⬜ |
| L6 | Confirm which social links are current | Live site has 5; design footer shows 2 | ⬜ **Nadia** |
| L7 | Replace the corrupt `chips-pattern.png` (2 bytes) | Referenced twice in the design | ⬜ **Nadia** |
| L8 | Arabic native sign-off — two strings | Flagged twice in the direction doc | ⬜ **Nadia** |
| L9 | Decide the AI-crawler policy | Currently blocked by a Squarespace default | ⬜ **Nadia** ([Q6](./13-open-questions.md)) |

---

## Summary — what's waiting on Nadia

| | Item | Where |
|---|---|---|
| 1 | Updated handoff, form redesign, cookie banner design | [D1–D3](#-nadia--design-tasks-with-claude-design) |
| 2 | Confirm email is on `@imnadiaamer.com`; don't cancel Squarespace yet | [I2, I7](#-infrastructure--do-first) |
| 3 | GoDaddy auto-renew check; create the Cloudflare account | [I4, I5](#-infrastructure--do-first) |
| 4 | Where enquiry notifications go, and what the confirmation promises | [E4, E5](#-email-notifications--form-submissions) |
| 5 | Which Kit form/tag; GA4 property access | [K3](#-kit--newsletter-integration), [A3](#-analytics--tracking) |
| 6 | AI-crawler policy; Google Sheet keep-or-drop; retention period | [L9](#-legal--content), [F3, F4](#-enquiry-form--storage) |
| 7 | Social links, Arabic sign-off, replacement image | [L6–L8](#-legal--content) |
