# 18 — Staging & Deployment

> **Status:** Ready to connect · **Owner:** Nadia (account) + Engineering (config) · **Last updated:** 2026-08-20
> **Related:** [Docs index](./README.md) · [Hosting & Domains](./10-hosting-domains-and-ops.md) · [Migration](./15-migration-and-cutover.md) · [ADR-0005](./adr/0005-hosting-and-domain-management.md)

How to get a URL you can open on a phone, share with people for feedback, and eventually promote to production.

## The one thing to understand first

> **Staging touches nothing that is live.**
>
> The site deploys to a `*.pages.dev` address. It needs **no DNS change**, so `nikkostudio.co` keeps serving Squarespace and the Google Workspace mail records on `imnadiaamer.com` are untouched.
>
> This is completely decoupled from the [DNS migration](./15-migration-and-cutover.md) and can happen first, safely, today.

---

## Why not just run it locally?

You can — but it needs Node installed, a terminal, and your laptop switched on and on the same Wi-Fi as your phone. That is a poor way to review a design on a phone, and useless for sending to anyone else.

For completeness, the local route is in [`site/README.md`](../site/README.md). For everything else, use staging.

---

## Setup — roughly ten minutes, once

### 1. Create a Cloudflare account
[dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — free, no card required for what we need.

**Use Nadia's email and turn on 2FA.** Per [P9](./02-engineering-principles.md#p9--own-the-front-door), this account will eventually hold DNS for both domains, so it must be hers, not an engineer's. Engineers get invited to it.

### 2. Create the Pages project
**Workers & Pages → Create → Pages → Connect to Git**, authorise GitHub, pick `moamers/nikko-studio`.

### 3. Build settings

| Field | Value |
|---|---|
| Production branch | `main` |
| **Deploy command** | `cd site && npm install && npm run build && npx wrangler deploy` |
| **Root directory** | **Leave empty** |
| Node version | `22` *(plain env var `NODE_VERSION=22`)* |

**Why a single deploy command rather than the usual framework preset.** Once
`site/wrangler.toml` existed, Cloudflare switched this project to the
Wrangler deploy path, which runs one command from the **repository root** and
ignores the separate "build command" field. The website lives in `site/`, so
the command has to `cd` there itself. Setting **Root directory** *as well*
double-applies the path and the build fails with `cd: can't cd to site` — it
must be left empty.

**⚠️ The failure this actually causes, and how to recognise it.** Every
misconfiguration here produces a *missing-files* error rather than a useful
one — `Could not detect a directory containing static files`, `cd: can't cd to
site`, or `Could not read package.json`. All three mean the same thing: the
build is looking somewhere that has no website in it. Check, in this order:
1. **Is it building the right branch?** `main` carried no `site/` directory
   until the 2026-08-21 merge. Building a branch without the site produces
   all three errors above and none of them mention the branch.
2. Is **Root directory** empty?
3. Does the deploy command start with `cd site`?

Leave `PUBLIC_ALLOW_INDEXING` **unset**. See [indexing](#indexing-is-off-by-default) below.

### 4. Deploy
First build takes 2–4 minutes. You get:

```
https://nikko-studio.pages.dev          ← the staging URL
https://<hash>.nikko-studio.pages.dev   ← one per deployment, permanent
```

Open the first on your phone. Done.

---

## What you get from then on

| Event | Result |
|---|---|
| Any push to the production branch | Staging URL updates in ~2 min |
| Any pull request | Its **own** preview URL, so a change can be reviewed before it lands |
| A build that fails | **Nothing deploys.** The last good version stays up |
| A deploy you dislike | One-click rollback to any previous deployment |

That last pair is what makes direct content editing safe — a malformed YAML file fails the build rather than taking the site down.

---

## Indexing is off by default

Every build emits `<meta name="robots" content="noindex, nofollow">` **unless** the environment variable `PUBLIC_ALLOW_INDEXING` is exactly `true`.

This is deliberately fail-safe. A staging deploy that forgets to set anything is noindex — the harmless mistake. The damaging one, a `*.pages.dev` copy competing with the real domain in Google, can only happen if someone opts in on purpose.

**Set `PUBLIC_ALLOW_INDEXING=true` on the production deployment only, at cutover.** Nowhere else, ever.

Verified both ways: unset → the tag is present; set to `true` → absent.

---

## Sharing staging for user testing

The `*.pages.dev` URL is public to anyone with the link — fine for feedback, but it is a real URL on the internet.

If you want it locked down:

- **Cloudflare Access** (free for up to 50 users) puts an email-code login in front of the whole project. Best option if the work should stay private before launch.
- Or just don't publicise the link. It is `noindex`, so it won't turn up in search.

Worth a decision before sharing widely — the site describes unreleased pricing and positioning.

---

## Promoting to production later

Staging and production are the same pipeline, so going live is a small step, not a migration:

1. Complete the [DNS migration](./15-migration-and-cutover.md) — **this is the part with real risk, and it must come first**
2. Add `www.nikkostudio.co` as a custom domain on the Pages project
3. Set `PUBLIC_ALLOW_INDEXING=true`
4. Verify, watch for a fortnight, then cancel Squarespace

---

## Costs

| | |
|---|---|
| Cloudflare Pages | **£0** — unlimited bandwidth, unlimited preview deploys |
| Build minutes | **£0** — 500/month free; at ~2 min/build that is ~250 deploys |
| Cloudflare Access *(optional)* | **£0** up to 50 users |

No card required at this stage.

---

## What engineering has already done

- [x] Astro configured for static output — no adapter needed
- [x] `npm run build` green, 36 e2e tests passing
- [x] `PUBLIC_ALLOW_INDEXING` fail-safe, verified both ways
- [x] `.gitignore` covers build output and test artefacts
- [x] Node version pinned via `engines` (`>=20.11`)

## What is blocked on Nadia

| | Item |
|---|---|
| 1 | Create the Cloudflare account (in her name, 2FA on) |
| 2 | Connect the repo and apply the [build settings](#3-build-settings) — or invite an engineer to do it |
| 3 | Decide whether staging should be behind Cloudflare Access |

---

**Next:** [15 — Migration & Cutover](./15-migration-and-cutover.md) — the DNS work, which is the part that carries real risk.
