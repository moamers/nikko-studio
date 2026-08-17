# 15 — Migration & Cutover Runbook

> **Status:** Draft for review · ⚠️ **Contains a critical email risk** · **Owner:** Engineering + Nadia
> **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Hosting & Domains](./10-hosting-domains-and-ops.md) · [SEO](./09-seo-and-llm-discoverability.md) · [P9](./02-engineering-principles.md#p9--own-the-front-door)

This is not a greenfield launch. **`nikkostudio.co` is a live Squarespace site** that the new build replaces, and the surrounding infrastructure has a dependency that is easy to miss and expensive to get wrong.

---

## The critical finding: cancelling Squarespace would break Nadia's email

**Do not cancel the Squarespace subscription until DNS has been moved and verified.**

Here is what a public DNS inspection shows today:

| Domain | Registrar | **Nameservers** | Mail |
|---|---|---|---|
| `nikkostudio.co` | GoDaddy | **Squarespace** (`ns0X.squarespacedns.com` / NS1) | **No MX records at all** |
| `imnadiaamer.com` | *(to confirm)* | **Squarespace** (same) | **Google Workspace MX — live** |

Two things follow, and both were surprising:

### 1. GoDaddy is the registrar, but Squarespace holds the DNS

The domain is *registered* at GoDaddy, but GoDaddy's nameservers are not in use — the zone is delegated to Squarespace. **Squarespace, not GoDaddy, is currently answering every DNS query for both domains.**

So "we use GoDaddy for the domain" is true of the registration and not of the DNS. Cancelling Squarespace removes the DNS zone, and everything that depends on it stops resolving — the website *and* anything else in that zone.

### 2. Google Workspace email lives on `imnadiaamer.com`, and its MX records are in the Squarespace zone

`imnadiaamer.com` has live Google MX records (`aspmx.l.google.com` and the four `alt` servers). `nikkostudio.co` has **none**.

**Cancelling Squarespace before migrating that zone would stop mail delivery to the Google Workspace mailboxes.** Inbound email would bounce. This is the single highest-consequence step in the whole project, and nothing about "replacing the website" makes it obvious.

> **Please confirm:** is the Google business email on `@imnadiaamer.com`? If there is a third domain carrying mail, we need to know before touching any nameservers.

### 3. `nikkostudio.co` has no MX, no SPF and no DMARC

The only TXT record is a `google-site-verification` string. That means:

- **Nothing receives mail at `@nikkostudio.co`** — if you believe you have a mailbox there, you do not.
- **No SPF and no DMARC** means anyone can send email that appears to come from `@nikkostudio.co` with nothing to stop it. For a business whose primary channel is email, that is worth fixing on its own merits, independent of this project.

---

## What else the live site told us

Inspecting `nikkostudio.co` answered several [open questions](./13-open-questions.md) outright.

| Finding | Consequence |
|---|---|
| **Only 4 URLs exist**: `/home`, `/privacy-policy`, `/terms-and-conditions`, `/contact` | The redirect map is trivial. This is about as low-risk an SEO migration as they come |
| **Kit (ConvertKit) is already the ESP** — the homepage loads `app.kit.com` / `f.convertkit.com` | **[Q1](./13-open-questions.md) answered.** Kit was our top recommendation; it has an excellent API for the [newsletter proxy](./10-hosting-domains-and-ops.md#the-one-serverless-function) |
| **A detailed enquiry form already exists** at `/contact`, posting to a Google Apps Script endpoint | **[Q2](./13-open-questions.md) largely answered.** Fields include business name, project type, goals, deadline and **budget** — exactly the qualification we recommended. This should be preserved, not reinvented |
| **Privacy Policy and T&Cs already exist** | Closes the legal-pages gap from [01](./01-project-brief.md#what-the-handoff-does-not-cover--and-we-will-need). Content migrates; needs a review for the new form and any new processors |
| **Squarespace's default `robots.txt` blocks every AI crawler** — `GPTBot`, `ClaudeBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `Applebot-Extended`, `PerplexityBot` and more | The site is currently **invisible to LLMs**. Constraint C6 requires actively reversing a default that was never a deliberate choice — see [Q6](./13-open-questions.md) |
| **`www` is canonical**; apex 301s to `www` | Keep it. Changing canonical host during a replatform adds risk for no gain |
| **The legacy domain is `imnadiaamer.com`** — and it is still live on Squarespace, serving 200 | Not yet redirected. Needs a decision — see [below](#the-imnadiaamercom-question) |
| **The design footer copy says `irnnadiaamer.com`** | A typo — `rn` for `m`. It would ship as written. Flagging for the copy pass |
| **`nikkostudio.com` is owned by a domain investor** (NameBright/parking nameservers) | Not a blocker. A typo-leak and brand consideration; likely purchasable at a premium price if it ever matters |

Social profiles found on the live site — Instagram, Threads, Substack, Facebook, X — are broader than the design footer's two (Threads, Substack). Worth confirming which are current before launch.

---

## Migration plan

Four stages, strictly ordered. **Stage 1 must complete and be verified before Stage 4 is even considered.**

### Stage 1 — Move DNS off Squarespace *(do this first, independent of the build)*

This is decoupled from the website work and can happen immediately. It removes the email risk and is reversible within minutes.

1. **Record everything.** In Squarespace DNS, export or screenshot **every record** for **both** `nikkostudio.co` and `imnadiaamer.com`: A, AAAA, CNAME, MX, TXT, SRV, CAA. Do not rely on memory or on an auto-importer.
2. **Add both zones to Cloudflare.** Cloudflare's onboarding scans and imports existing records — treat that as a starting point, not the truth. **Diff the imported set against your export, record by record.** Auto-import can miss records, and MX is the one that must not be missed.
3. **Verify before switching.** Query Cloudflare's nameservers directly (`dig @<cf-ns> imnadiaamer.com MX`) and confirm the answers match production exactly.
4. **Lower TTLs** at Squarespace to 300s a day ahead, if the UI allows it, so a rollback is fast.
5. **Change nameservers at GoDaddy** from Squarespace's to Cloudflare's.
6. **Verify after propagation** (up to 24–48h): the sites still resolve, and — critically — **send a real test email to a Google Workspace mailbox and confirm it arrives.**
7. **Add the missing mail-security records** while you are in there:
   - **SPF** for `nikkostudio.co` and `imnadiaamer.com`, including Google Workspace and Kit
   - **DKIM** for Google Workspace and for Kit
   - **DMARC**, starting at `p=none` to observe, tightening to `quarantine` then `reject`
   - **CAA** restricting who may issue certificates

**Rollback:** point the nameservers back at Squarespace. Minutes, not hours.

> **Registration stays at GoDaddy for now.** Transferring the registrar during a live migration adds a 60-day transfer lock and a second moving part for no benefit. Revisit at renewal — Cloudflare Registrar sells at cost and `.co` renewals at GoDaddy are typically 3× that, so there is real money in it, but it is a separate, later, low-risk task. *(Verify Cloudflare Registrar supports `.co` before planning on it.)*

### Stage 2 — Build and stage

Normal [roadmap](./12-roadmap.md) work. The new site deploys to Cloudflare Pages on its `*.pages.dev` preview URL — `noindex`, password-protected if preferred — while `www.nikkostudio.co` continues serving Squarespace, untouched.

### Stage 3 — Pre-cutover checks

- [ ] All [quality gates](./11-quality-gates.md) green
- [ ] Reviewed on a real phone
- [ ] Redirect map in place (below)
- [ ] Privacy Policy and T&Cs migrated and reviewed against the new form and processors
- [ ] Enquiry form tested end-to-end — a real submission arrives where Nadia will see it
- [ ] Kit newsletter subscription tested end-to-end — a real subscriber lands in the right Kit form/tag
- [ ] `robots.txt` and `llms.txt` reflect the [decided](./13-open-questions.md) AI-crawler policy
- [ ] Search Console verified for the new property; current URL inventory and query baseline exported for comparison
- [ ] Analytics in place so before/after is measurable

### Stage 4 — Cutover

1. Point `www.nikkostudio.co` at Cloudflare Pages (a DNS record change — seconds, and reversible).
2. Confirm apex still 301s to `www`.
3. Verify HTTPS, the redirect map, both forms, and Core Web Vitals on the live domain.
4. Submit the new sitemap in Search Console.
5. **Watch for 1–2 weeks** — Search Console coverage, 404s, form submissions, analytics.
6. **Only then cancel Squarespace.** Confirm one final time that DNS has moved and email is flowing.

**Rollback at any point:** repoint the DNS record at Squarespace. Because the Squarespace site stays paid-for and intact until step 6, rollback is genuinely available throughout — which is why cancelling early is the one irreversible mistake here.

---

## Redirect map

Only four URLs, and Squarespace serves the homepage at both `/` and `/home`.

| Old URL | New URL | Type |
|---|---|---|
| `/` | `/` | — |
| `/home` | `/` | **301** |
| `/privacy-policy` | `/privacy-policy` | Keep the URL |
| `/terms-and-conditions` | `/terms-and-conditions` | Keep the URL |
| `/contact` | `/contact` | Keep the URL |

**Recommendation: keep the three existing slugs exactly.** They are sensible, they are indexed, and preserving them means the only redirect needed is `/home`. Do not rename `/contact` to `/pitch` — the design's CTA wording can say "Pitch your project" while the URL stays `/contact`, which is also the better-understood term for machines and humans alike.

Implemented in `public/_redirects`. Also worth adding: catch-all 301s for any Squarespace system paths that show up in Search Console after cutover.

## The `imnadiaamer.com` question

It is still live, still on Squarespace, and it carries the Google Workspace MX records and eight years of history.

Three decisions needed:

1. **Its DNS must move to Cloudflare regardless** — that is Stage 1 and is not optional, because of the MX records.
2. **Does the site itself get retired?** If so, 301 the whole domain to `nikkostudio.co` — this consolidates the link equity rather than splitting it across two properties. Recommended.
3. **Does email move to `@nikkostudio.co`?** Optional and separate. If yes, it is a Google Workspace domain change with its own MX/SPF/DKIM work, and it should not be bundled into the website cutover. One risky change at a time.

The new site's footer copy references this domain, so whatever is decided needs to match the copy — which also needs the `irn` → `imn` typo fixed.

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| **Squarespace cancelled before DNS moves → email outage** | 🔴 **Critical** | Stage 1 first; cancel only at Stage 4 step 6. This document exists mainly for this line |
| MX records mis-transcribed during the move | 🔴 High | Manual record-by-record diff; test email before and after; keep TTLs low |
| Squarespace cancelled before cutover verified → site outage | 🟠 | Keep Squarespace paid until 1–2 weeks post-cutover |
| Losing `/contact` rankings or form submissions | 🟠 | Keep the slug; test the form end-to-end before and after |
| AI-crawler policy silently inherited | 🟡 | Explicit `robots.txt` — a [decision](./13-open-questions.md), not a default |
| Nameserver change propagation confusion | 🟡 | Lower TTLs in advance; expect 24–48h; do not cut over mid-propagation |
| `.co` renewal lapses at GoDaddy | 🟡 | Confirm auto-renew is on and the card is current, today |

---

**Next:** [10 — Hosting, Domains & Ops](./10-hosting-domains-and-ops.md)
