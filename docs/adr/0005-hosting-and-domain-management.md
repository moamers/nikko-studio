# ADR-0005: Cloudflare Pages for hosting, Cloudflare for DNS, registrar unchanged

**Status:** Proposed *(amended 2026-08-17 — see [Amendment](#amendment-2026-08-17))*
**Date:** 2026-08-17
**Principles:** [P8](../02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure), [P9](../02-engineering-principles.md#p9--own-the-front-door), [P13](../02-engineering-principles.md#p13--privacy-and-data-minimalism), [P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)

## Context

Two constraints:

- **C8** — *"simple hosting nothing major/costly (code → github → build/compile → deploy)"*
- **C9** — *"when we host i need to be able to manage domains"*

The site is static output plus serverless functions for the two forms. Traffic is expected in the thousands to tens of thousands of monthly visits.

**This ADR was originally written before the existing infrastructure was known.** It assumed a greenfield launch with a domain yet to be registered. That was wrong, and the [Amendment](#amendment-2026-08-17) below records what changed and why the conclusion survives anyway.

Three providers are all genuinely excellent at static hosting from GitHub: **Cloudflare Pages**, **Netlify** and **Vercel**. All three give free hosting, PR previews, free SSL, GitHub integration and serverless functions at this scale. On C8 alone, any of them would do.

**C9 is the tie-breaker,** and it points clearly in one direction.

## Decision

**Cloudflare Pages for hosting and Cloudflare DNS for both zones, in an account owned by Nadia. Domain registration stays at GoDaddy.**

```
git push → GitHub → Cloudflare Pages build → global edge
                 └→ pull request → preview URL
```

## Alternatives considered

| | **Cloudflare** ✅ | Netlify | Vercel | GitHub Pages |
|---|---|---|---|---|
| Free static hosting | ✅ | ✅ | ✅ | ✅ |
| Bandwidth (free tier) | **Unlimited** | 100 GB/mo | 100 GB/mo | Soft 100 GB/mo |
| GitHub → build → deploy | ✅ | ✅ | ✅ | ✅ (Actions) |
| PR preview deploys | ✅ | ✅ | ✅ | ❌ |
| Free SSL, auto-renew | ✅ | ✅ | ✅ | ✅ |
| Serverless functions | ✅ 100k/day | ✅ 125k/mo | ✅ 100k/mo | ❌ |
| **Sells domains** | ✅ **at cost** | ❌ resells | ❌ resells | ❌ |
| **DNS management** | ✅ best-in-class | Basic | Basic | ❌ |
| Cookieless analytics | ✅ free | Paid | Paid | ❌ |
| Rollback, atomic deploys | ✅ | ✅ | ✅ | Limited |
| Edge network | Largest | Good | Good | Fastly |
| Cost here | **£0** | £0 | £0 | £0 |

**GitHub Pages** is eliminated by the missing serverless function (the newsletter needs a server-side key) and the missing preview deploys (the review mechanism the [roadmap](../12-roadmap.md) depends on).

**Netlify and Vercel** are both fine hosts. Neither is a registrar — they resell, at a markup, with weaker DNS tooling. Choosing one of them means the founder manages the domain in a *different* account from the site, which is precisely the fragmentation C9 asks us to avoid.

**Cloudflare Registrar** sells domains at **wholesale cost with no markup and no renewal escalation** — typically £8–12/year for a `.com`, against £15–25 elsewhere where a discounted first year is followed by a much higher renewal. Combined with registrar, DNS, CDN, hosting, analytics and functions in one dashboard, it satisfies [P9](../02-engineering-principles.md#p9--own-the-front-door) directly.

Cloudflare's analytics also being free and cookieless removes a consent banner and a third-party script — helping [P13](../02-engineering-principles.md#p13--privacy-and-data-minimalism) and [P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration) at the same time.

## Ownership

**The account is created in Nadia's name, with her email, her payment method and her 2FA.** Engineers receive delegated access. This is not a formality: the domain is the only asset in this project that cannot be rebuilt.

## Consequences

### Good

- **One dashboard** for domain, DNS, hosting, CDN, analytics and functions — realistic for a founder to actually manage.
- **£0/month** apart from the domain.
- **Unlimited bandwidth** — a viral post cannot produce a bill.
- **Largest edge network** — TTFB is a cache hit ([P4](../02-engineering-principles.md#p4--performance-is-a-budget-enforced-in-ci-not-an-aspiration)).
- **Failed build ⇒ no deploy.** The previous version stays live; a malformed content file cannot take the site down — the safety net [ADR-0002](./0002-content-source-abstraction.md) relies on.
- **One-click rollback** to any previous deploy.
- **Preview URL per PR** — the content review mechanism.
- **Free cookieless analytics with real-user Core Web Vitals.**
- **Free Email Routing** if `hello@` forwarding is wanted.
- **Turnstile available free** if the form attracts spam.

### Bad / accepted costs

- **Concentration risk.** Domain, DNS and hosting with one vendor means one account compromise or one policy dispute affects everything. Mitigated by: 2FA on the account, and the fact that every component has a clean, fast exit (below). The alternative — splitting the registrar out — trades this for exactly the fragmentation C9 asks us to avoid. On balance, concentration with good exits is the better trade for a founder-managed site.
- **Cloudflare's UI is engineer-oriented** — more surface area than Netlify's. Mitigated by the [runbook](../10-hosting-domains-and-ops.md#operational-runbook), which documents the handful of things Nadia actually needs.
- **Pages Functions use Workers' runtime**, not Node. Our single function is a standard `fetch` handler with no Node dependencies, so this is a non-issue in practice — but it is a real constraint if the function ever grows.
- **Build minutes are capped** on the free tier (500/month). At 1–3 minutes per build this allows ~150–500 deploys monthly. Far beyond expected usage.

### Neutral

- Cloudflare's build environment needs a pinned Node version in config.

## Exit paths

Per [P16](../02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit) — the mitigation for concentration risk:

| Component | Lock-in | Exit | Effort |
|---|---|---|---|
| Pages hosting | **None** | Build output is static files; point Netlify/Vercel/S3 at the same repo | ~1 hour |
| Registrar | **None** | Standard transfer out after 60 days. Cloudflare does not obstruct transfers | ~1 day |
| DNS | **None** | Export the zone file, import elsewhere | ~1 hour |
| Pages Function | **Minimal** | One standard `fetch` handler; ports to Netlify/Vercel functions almost verbatim | ~1 hour |
| Web Analytics | **None** | Historical data is not portable, but no code depends on it | n/a |

**No application code is Cloudflare-specific.** That is what makes the concentration acceptable.

## Reversal

**Cost: low.** Moving the site to another host is roughly an hour. Moving DNS is a nameserver change.

Reversal would be triggered by a policy or pricing change, or by needing a runtime feature Workers cannot provide. Neither is foreseeable at this scale.

---

## Amendment (2026-08-17)

Written before the existing infrastructure was known. An audit of the live site and its DNS changed three things.

### What we found

| | Assumed | Actual |
|---|---|---|
| Domain | To be registered | **`nikkostudio.co`, already at GoDaddy** |
| DNS | Greenfield | **Held by Squarespace** — not GoDaddy |
| Hosting | Greenfield | **Live Squarespace site**, 4 URLs |
| Mail | Unknown | **Google Workspace, MX on `imnadiaamer.com`, inside the Squarespace zone** |

### What changes

1. **Registration stays at GoDaddy.** The at-cost-domains argument was a real part of the original case for Cloudflare, and it no longer applies — the domain exists and moving a registrar during a live migration adds a 60-day transfer lock and a second moving part for no benefit. Revisit at renewal as a standalone task; `.co` renewals at GoDaddy typically run several times Cloudflare's at-cost price, so there is money in it, just not urgency. *(Verify Cloudflare Registrar supports `.co` first.)*

2. **DNS migration becomes the highest-priority task in the project**, ahead of any build work. Not for the website's sake — because the Squarespace DNS zone carries the Google Workspace MX records, so **cancelling Squarespace before migrating would stop business email**. Full runbook: [15 — Migration & Cutover](../15-migration-and-cutover.md).

3. **One serverless function becomes two,** plus a datastore: newsletter → Kit's API, enquiry → Cloudflare D1 with Resend notifications. All still on the free tier. See [16 — Forms & Data Capture](../16-forms-and-data-capture.md).

### Does the decision survive?

**Yes, on weaker but sufficient grounds.** With the registrar argument removed, Cloudflare wins on: best-in-class free DNS (now the *strongest* reason, since the zones have to move somewhere regardless), unlimited bandwidth, free cookieless analytics with real-user Core Web Vitals, free D1 and Turnstile for the enquiry form, and the largest edge network.

**Netlify is now a close second** rather than a clear runner-up. If there were a preference for its simpler dashboard, the real costs would be paying for analytics, finding another home for DNS, and replacing D1 — all manageable. Cloudflare remains the recommendation, but the margin is narrower than this ADR originally implied, and that is worth stating plainly rather than letting an outdated rationale carry the decision.
