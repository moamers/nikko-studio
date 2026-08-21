# 10 — Hosting, Domains & Operations

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure) · [P9](./02-engineering-principles.md#p9--own-the-front-door) · [ADR-0005](./adr/0005-hosting-and-domain-management.md)

Answers constraints **C8** (*"simple hosting nothing major/costly (code → github → build/compile → deploy)"*) and **C9** (*"when we host i need to be able to manage domains"*).

## Current state (verified 2026-08-17)

This is a **replatform, not a launch**. What exists today:

| | |
|---|---|
| **Domain** | `nikkostudio.co` — registered at **GoDaddy** |
| **DNS** | ⚠️ **Squarespace** (`ns0X.squarespacedns.com`), *not* GoDaddy |
| **Hosting** | Squarespace, 4 pages, `www` canonical |
| **Email** | Google Workspace — MX records are on **`imnadiaamer.com`**, not `nikkostudio.co` |
| **ESP** | **Kit (ConvertKit)** — already live on the homepage |
| **Enquiries** | An existing `/contact` form posting to a Google Apps Script |
| **Mail security** | ⚠️ No SPF, no DMARC on `nikkostudio.co` |

> 🔴 **Because the DNS zone lives at Squarespace and that zone carries the Google Workspace MX records, cancelling Squarespace before migrating DNS would take down Nadia's business email.** The full sequence is in **[15 — Migration & Cutover](./15-migration-and-cutover.md)**. Read that before touching anything.

## Recommendation

**Cloudflare Pages** for hosting, **Cloudflare DNS** for both zones, **registration stays at GoDaddy for now** — all in accounts **owned by Nadia**.

The pipeline is exactly what was asked for:

```
git push → GitHub → Cloudflare Pages build → deploy to global edge
                 └→ pull request → preview URL
```

No servers, no containers, no deploy scripts, no ops. Push to `main` and the site is live in 1–3 minutes.

**Why registration stays at GoDaddy:** the urgent move is **DNS**, which must leave Squarespace regardless of anything else. Transferring the registrar at the same time adds a 60-day transfer lock and a second moving part during a live migration, for no benefit. It is a worthwhile *later* task — Cloudflare Registrar sells at cost and `.co` renewals at GoDaddy typically run several times that — but it belongs after cutover, on its own. *(Confirm Cloudflare Registrar supports `.co` before planning on it.)*

---

## Why Cloudflare

Three providers are all genuinely good at this: Cloudflare Pages, Netlify and Vercel.

**The original tie-breaker no longer applies.** This document first recommended Cloudflare partly because it sells domains at cost — but the domain is already registered at GoDaddy and staying there through the migration, so that argument is deferred rather than decisive. Restating the case honestly on what remains:

| Reason | Still holds? |
|---|---|
| **Best-in-class DNS, free** | ✅ **Now the strongest reason.** The DNS zones *must* move off Squarespace, and they have to go somewhere good |
| Unlimited bandwidth (vs 100 GB/mo) | ✅ |
| Free cookieless analytics with real-user Core Web Vitals | ✅ Netlify and Vercel both charge; this also avoids a consent banner ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)) |
| Largest edge network | ✅ |
| Domains at cost | ⏸️ Deferred — relevant only if the registrar moves later |

Cloudflare still wins, less decisively than before. **Netlify is now a close second** and would be a perfectly defensible choice; if there is a preference for its simpler dashboard, the only real cost is paying for analytics and hosting DNS elsewhere. The full comparison below is unchanged.

| | **Cloudflare** ✅ | Netlify | Vercel |
|---|---|---|---|
| Static hosting, free tier | ✅ Unlimited bandwidth | ✅ 100 GB/mo | ✅ 100 GB/mo |
| GitHub → build → deploy | ✅ | ✅ | ✅ |
| PR preview deploys | ✅ | ✅ | ✅ |
| Free SSL, auto-renew | ✅ | ✅ | ✅ |
| Serverless functions (free) | ✅ 100k req/day | ✅ 125k/mo | ✅ 100k/mo |
| **Sells domains** | ✅ **at cost, no markup** | ❌ resells | ❌ resells |
| **DNS management** | ✅ best-in-class, free | ✅ basic | ✅ basic |
| Analytics | ✅ free, cookieless | Paid | Paid |
| Redirects, headers as files | ✅ | ✅ | ✅ |
| Edge network | Largest | Good | Good |
| Cost at this scale | **£0** | £0 | £0 |

**The exit is clean** ([P16](./02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)): the build output is a directory of static files. Moving to Netlify, Vercel, GitHub Pages or an S3 bucket is a config change, roughly an hour. Nothing in the application code is Cloudflare-specific except the one Pages Function, which is a standard `fetch` handler and ports directly.

---

## Domain plan

### Ownership — non-negotiable

Registrar and DNS accounts are held **in Nadia's name, with her email, her payment method, and her 2FA**. Engineers get delegated access; they never hold the registration.

The domain is the only asset in this project that cannot be rebuilt. Code, design and hosting are all replaceable within a week.

**Immediate action, independent of everything else:** confirm auto-renew is on at GoDaddy for both `nikkostudio.co` and `imnadiaamer.com`, and that the card on file is current. `.co` is a commercially operated ccTLD with no grace period worth relying on.

### Target configuration

| Setting | Value |
|---|---|
| Canonical host | **`www.nikkostudio.co`** — already canonical today; apex 301s to it. Keep it, don't change it mid-replatform |
| Registration | **GoDaddy** (unchanged for now — see [above](#recommendation)) |
| DNS | **Cloudflare**, proxied (orange cloud) — migrated from Squarespace per [15](./15-migration-and-cutover.md) |
| SSL/TLS mode | Full (strict) |
| Always Use HTTPS | On |
| HSTS | On, `max-age=31536000`, `includeSubDomains` — **only after** cutover is verified and every subdomain is HTTPS |
| Minimum TLS | 1.2 |
| Auto-renew | **On**, at GoDaddy, with the renewal date in Nadia's calendar as a backstop |
| Registrar lock | On |
| CAA | Restrict issuance to the CAs actually in use |
| **SPF** | ⚠️ **Currently missing.** Must include Google Workspace **and** Kit |
| **DKIM** | ⚠️ Google Workspace + Kit |
| **DMARC** | ⚠️ **Currently missing.** Start `p=none`, tighten to `quarantine` then `reject` |

The three ⚠️ rows are not website work — they are basic mail hygiene that happens to become possible once DNS is somewhere manageable. Without SPF and DMARC, anyone can send mail appearing to come from `@nikkostudio.co`, and Kit's sending reputation will suffer once the newsletter runs from the domain.

### The two domains

| Domain | Today | Plan |
|---|---|---|
| **`nikkostudio.co`** | Live Squarespace site, 4 pages, `www` canonical, no mail | The new site launches here. Keep existing slugs; only `/home` needs a redirect |
| **`imnadiaamer.com`** | Live Squarespace site; **carries the Google Workspace MX records** | DNS **must** move to Cloudflare. Then decide: retire the site and 301 the domain to `nikkostudio.co` (recommended — consolidates eight years of link equity), and separately whether mail moves to `@nikkostudio.co` |

Note: the design footer copy spells this domain `irnnadiaamer.com`. That is a typo — `rn` for `m`. It needs correcting in the copy before launch.

Do not let either domain lapse. `imnadiaamer.com` in particular holds the mail *and* the history.

Full sequence, risks and rollback: **[15 — Migration & Cutover](./15-migration-and-cutover.md)**.

---

## Environments

| Environment | Trigger | URL | Indexed |
|---|---|---|---|
| **Production** | push to `main` | the live domain | ✅ |
| **Preview** | every pull request | `<hash>.nikko-studio.pages.dev` | ❌ `noindex` + `robots.txt` disallow |
| **Local** | `npm run dev` | `localhost:4321` | n/a |

Preview deploys are the review mechanism: every content change and every code change gets a real URL Nadia can open on her phone before it goes live. Preview environments **must** be `noindex` — duplicate content on a `pages.dev` subdomain is a classic and avoidable SEO own-goal.

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production. Protected. Merges only via PR with green CI |
| `claude/*`, `feat/*`, `fix/*` | Working branches |

Content edits made through the GitHub UI or a CMS commit to `main` directly — the schema validation and the last-good-deploy fallback are what make that safe. If a review step for content is ever wanted, the CMS can be configured for editorial workflow (commits to a branch, opens a PR).

## Deployment safety

- **Failed build = no deploy.** The previous version stays live. A malformed YAML file cannot take the site down.
- **Instant rollback** to any previous deployment from the dashboard, one click.
- **Atomic deploys** — no half-updated state.
- **Immutable, content-hashed assets** — a stale cache cannot serve a broken mix.

---

## The one serverless function

`POST /api/subscribe` — a Cloudflare Pages Function that proxies the newsletter form to the ESP.

```
Browser → POST /api/subscribe → Pages Function → ESP API
                                    ├ validate (server-side)
                                    ├ honeypot check
                                    ├ rate limit by IP
                                    └ ESP key from env, never in the client
```

Why a function rather than the ESP's embed widget: it keeps the API key server-side ([P15](./02-engineering-principles.md#p15--nothing-is-trusted-at-the-boundary)), avoids a third-party script and its cookies ([P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)), keeps the form's markup and states fully ours to design, and costs nothing at this volume.

An enquiry form ([Q2](./13-open-questions.md)) would use the same pattern.

## Secrets

Environment variables in the Cloudflare dashboard, never in the repository. Anything named `PUBLIC_*` is public by definition — a CI check enforces that no secret carries that prefix.

| Variable | Scope |
|---|---|
| `ESP_API_KEY` | Production + preview |
| `ESP_LIST_ID` | Production + preview |
| `TURNSTILE_SECRET` | If spam becomes a problem |

## Security headers

Set via `public/_headers`:

```
/*
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
```

`style-src 'unsafe-inline'` is needed because the accent system sets inline custom properties on `<html>`. It can be tightened to a nonce or hash later; the risk is low given there is no user-generated content.

---

## Cost

| Item | Provider | Cost |
|---|---|---|
| Hosting, CDN, SSL, previews, unlimited bandwidth | Cloudflare Pages | **£0** |
| Serverless function | Cloudflare Pages Functions | **£0** |
| DNS | Cloudflare | **£0** |
| Analytics | Cloudflare Web Analytics | **£0** |
| CI | GitHub Actions | **£0** |
| Git-based CMS *(phase 2)* | Sveltia CMS | **£0** |
| Domain | Cloudflare Registrar | **£8–12/yr** |
| ESP | TBC ([Q1](./13-open-questions.md)) | **£0–40/mo** |
| **Total recurring** | | **≈ £1/month + the ESP** |

**The ESP is the only meaningful recurring cost**, and it is a business tool the studio needs regardless of the website.

Optional later: Plausible analytics (~£7/mo) if richer reporting is wanted; a hosted CMS (£0 on free tiers).

## Vendor exit paths

Per [P16](./02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit):

| Vendor | Lock-in | Exit |
|---|---|---|
| Cloudflare Pages | None | Build output is static files. Point another host at the repo. ~1 hour |
| Cloudflare Registrar | None | Standard transfer out after 60 days. Cloudflare does not block transfers |
| Cloudflare DNS | None | Export the zone file, import elsewhere |
| Cloudflare Functions | Minimal | One standard `fetch` handler; ports to Netlify/Vercel functions directly |
| GitHub | Low | Standard Git. `git remote set-url` |
| Sveltia CMS | None | Content stays in the repo as files; delete the CMS and edit directly |
| ESP | **Medium** | Verify export before committing. **Always retain a current CSV export of the list** — it is the business's most valuable digital asset |

That last row matters more than all the others. The email list is worth more than the website.

---

## Operational runbook

| Task | How | Who |
|---|---|---|
| Change text or an image | Edit the file on GitHub (or in the CMS) → auto-deploys | Nadia |
| Preview before publishing | Open a PR; use the preview URL | Nadia |
| Roll back a bad change | Cloudflare Pages → Deployments → Rollback | Nadia |
| Add a page | Content file + route | Engineer |
| Rotate a secret | Cloudflare dashboard → env vars → redeploy | Engineer |
| Domain renewal | Auto; calendar reminder as backstop | Nadia |
| Dependency updates | Dependabot PRs, CI must pass | Engineer |
| Check performance | Search Console + Cloudflare Analytics | Monthly |

---

**Next:** [11 — Quality Gates](./11-quality-gates.md)
