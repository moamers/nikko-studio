# 10 — Hosting, Domains & Operations

> **Status:** Draft for review · **Owner:** Engineering · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P8](./02-engineering-principles.md#p8--boring-cheap-replaceable-infrastructure) · [P9](./02-engineering-principles.md#p9--own-the-front-door) · [ADR-0005](./adr/0005-hosting-and-domain-management.md)

Answers constraints **C8** (*"simple hosting nothing major/costly (code → github → build/compile → deploy)"*) and **C9** (*"when we host i need to be able to manage domains"*).

## Recommendation

**Cloudflare Pages** for hosting, **Cloudflare Registrar** for the domain, **Cloudflare DNS** for the zone — all in one account **owned by Nadia**.

The pipeline is exactly what was asked for:

```
git push → GitHub → Cloudflare Pages build → deploy to global edge
                 └→ pull request → preview URL
```

No servers, no containers, no deploy scripts, no ops. Push to `main` and the site is live in 1–3 minutes.

---

## Why Cloudflare

Three providers are all genuinely good at this: Cloudflare Pages, Netlify and Vercel. The tie-breaker is **C9 — domain management** — and it is decisive.

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

Cloudflare Registrar sells domains at **wholesale cost with no markup and no renewal price escalation** — typically £8–12/year for a `.com`, against £15–25 elsewhere with first-year discounts that expire. Combined with the fact that registrar, DNS, CDN, hosting, analytics and the serverless function all sit in **one dashboard the founder logs into**, it directly satisfies [P9](./02-engineering-principles.md#p9--own-the-front-door).

**The exit is clean** ([P16](./02-engineering-principles.md#p16--every-vendor-choice-has-a-documented-exit)): the build output is a directory of static files. Moving to Netlify, Vercel, GitHub Pages or an S3 bucket is a config change, roughly an hour. Nothing in the application code is Cloudflare-specific except the one Pages Function, which is a standard `fetch` handler and ports directly.

---

## Domain plan

### Ownership — non-negotiable

The registrar account is created **in Nadia's name, with her email, her payment method, and her 2FA**. Engineers get delegated access; they never hold the registration.

The domain is the only asset in this project that cannot be rebuilt. Code, design and hosting are all replaceable within a week.

### Configuration

| Setting | Value |
|---|---|
| Canonical host | **Decide: apex (`nikkostudio.com`) or `www`** — one canonical, the other 301s |
| DNS | Cloudflare, proxied (orange cloud) |
| SSL/TLS mode | Full (strict) |
| Always Use HTTPS | On |
| HSTS | On, `max-age=31536000`, `includeSubDomains`, after verifying every subdomain is HTTPS |
| Minimum TLS | 1.2 |
| Auto-renew | **On** — with the renewal date in Nadia's calendar as a backstop |
| Registrar lock | On |
| WHOIS privacy | On (included free) |
| Email routing | Cloudflare Email Routing (free) if a `hello@` forwarder is wanted |

### `irnnadiaamer.com`

The footer describes the site as *"a teaser for the full relaunch of what used to be irnnadiaamer.com"*. That domain carries eight years of history and inbound links.

**Do not let it lapse.** Recommended: transfer it into the same Cloudflare account, keep it registered indefinitely, and 301 it — page-to-page where equivalents exist, to `/` otherwise. Verify both properties in Search Console and file a change of address. See [Q5](./13-open-questions.md) and [09](./09-seo-and-llm-discoverability.md#migration-from-irnnadiaamercom).

**Also needed:** which domain the new site actually launches on. Not yet specified anywhere in the repo. ([Q5](./13-open-questions.md).)

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
