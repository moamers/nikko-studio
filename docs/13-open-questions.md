# 13 — Open Questions

> **Status:** Awaiting answers · **Owner:** Nadia (business) / Design · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Roadmap](./12-roadmap.md) · [Design Source Conflicts](./14-design-source-conflicts.md)

Questions that need an answer from outside engineering. Each states **what we would do if we heard nothing**, so nothing is blocked while they are open — but the 🔴 items should be answered before the build starts, because they are expensive to retrofit.

**Priority:** 🔴 blocks the build · 🟠 blocks a section · 🟡 needed before launch · ⚪ can wait

---

## ✅ Q1 — Which email service provider? — **ANSWERED: Kit**

Confirmed by Nadia and by the live site, which already loads `app.kit.com` / `f.convertkit.com`. Kit was our top recommendation; nothing changes.

**Architecture decision:** the design's own signup form posts to a Cloudflare Function which calls **Kit's API**, rather than embedding Kit's JavaScript widget. Kit still owns the list, the double opt-in, the confirmation email and the sequences — we replace only the widget, which would otherwise cost us a third-party script, cookies (and therefore a cookie banner), and control of the design. Full reasoning: [16 — Forms & Data Capture](./16-forms-and-data-capture.md#part-1--newsletter--kit).

**Still needed, minor:** which Kit form/tag should site subscribers land in? Source tagging (`site-footer` etc.) lets Nadia see what the website actually contributes to the list.

---

## 🟠 Q2 — Enquiry form — **LARGELY ANSWERED**

A real enquiry form already exists at `/contact`, and its **field design is good** — it asks the qualifying questions that matter, including **budget**, which is exactly right on a service with a £5,000 floor.

**Resolved:**
- ✅ There is a form, and it stays at `/contact` — [keep the URL](./15-migration-and-cutover.md#redirect-map), don't rename it to `/pitch`. The CTA copy can still say "Pitch your project"
- ✅ The homepage CTAs point at `/contact`, not at the newsletter
- ✅ The current Apps Script → Google Sheet pipeline is [being replaced](./16-forms-and-data-capture.md#part-2--enquiry-form) with durable storage plus notification to both Nadia and the enquirer

**Still open:** the form is being redesigned and will arrive in the updated handoff. See [16's open questions](./16-forms-and-data-capture.md#open-questions) for the four operational decisions (where notifications go, what the confirmation says, retention, whether the Google Sheet stays).

**And separately, still unanswered:** where does **"Grab a seat"** for Show&Tell go? Eventbrite, Lu.ma, a Stripe payment link, or an email waitlist? This is the one thing that determines whether phase 2 needs any dynamic behaviour at all — see [Q3](#-q3--homepage-only-or-the-fuller-site).

---

## 🔴 Q3 — Homepage only, or the fuller site?

**Why it matters.** It changes what we build in phase 1 versus what we architect for. The [content model](./04-content-architecture.md) and [route plan](./09-seo-and-llm-discoverability.md#the-information-architecture-problem) already anticipate more, so the cost of answering "more" later is low — but knowing now affects sequencing.

Specifically: **do Show&Tell drops need live availability on-site** (seat counts, sold-out states, dates)? If yes, that is the one requirement in this project that could justify a data source beyond flat files. If bookings live on Eventbrite or Lu.ma, it stays entirely static.

**Default if unanswered:** phase 1 is the homepage plus legal pages, architected for expansion, per the [roadmap](./12-roadmap.md).

---

## 🟠 Q4 — CMS now, or file editing first?

Our recommendation is to **start with file editing** (free, works day one, editable from a phone browser via github.com) and add **Sveltia CMS** in phase 2 once we know what actually gets edited often. Adding the CMS is purely additive and costs nothing to defer.

The question for Nadia: **how comfortable are you editing a structured text file?** [04](./04-content-architecture.md#phase-1-files-start-here) has a worked example of exactly what that looks like. If the honest answer is "not at all", we bring the CMS into phase 1 — it is about a day of work, not a rearchitecture.

**Default:** files first, CMS in phase 2.

---

## 🔴 Q5 — Domain & migration — **MOSTLY ANSWERED, one urgent item**

**Resolved by Nadia and by DNS inspection:**
- ✅ The domain is **`nikkostudio.co`**, registered at **GoDaddy**, currently on Squarespace
- ✅ `www` is canonical; apex already 301s to it — **keep it that way**
- ✅ Only 4 URLs exist, so the redirect map is [trivial](./15-migration-and-cutover.md#redirect-map)
- ✅ The legacy domain is **`imnadiaamer.com`** — note the design footer spells it `irnnadiaamer.com`, an `rn`/`m` typo that would ship as written

**⚠️ Still needed, and urgent — this is now the highest-priority item in this document:**

1. **Confirm the Google business email is on `@imnadiaamer.com`.** That domain has live Google Workspace MX records; `nikkostudio.co` has none. If mail is somewhere else too, we need to know before touching nameservers.
2. **Do not cancel Squarespace yet.** Squarespace holds the **DNS zone** for both domains — including those MX records. Cancelling before DNS moves would **stop email delivery**. See [15 — Migration & Cutover](./15-migration-and-cutover.md).
3. **Should `imnadiaamer.com` be retired** and 301'd to `nikkostudio.co`? Recommended — it consolidates eight years of link equity rather than splitting it across two live sites.
4. **Should email move to `@nikkostudio.co`?** Optional, separate, and should not be bundled with the website cutover.

**Default:** move DNS to Cloudflare, keep registration at GoDaddy, keep `www` canonical, keep the three existing slugs, 301 `/home` → `/`.

---

## 🟠 Q6 — Should AI crawlers be allowed?

**New context:** the current Squarespace site **already blocks all of them** — `GPTBot`, `ClaudeBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `Applebot-Extended`, `PerplexityBot` and more — via Squarespace's default `robots.txt`. That was a platform default, not a decision Nadia made. **The site is currently invisible to LLM search.**

So constraint C6 requires *actively reversing* an existing block. That makes this a real decision rather than a hypothetical one, and it needs an explicit answer either way.

Constraint C6 asks for LLM discoverability. That requires letting AI crawlers in, which means Nikko's distinctive writing becomes training data, uncompensated. **For a studio whose product is distinctive language, that is a real tension** and deserves a deliberate answer rather than a default.

**Our recommendation:** allow **search/retrieval** crawlers (`OAI-SearchBot`, `PerplexityBot`, `Google-Extended`) — they cite and link back, which is the discoverability C6 asks for — and decide separately on **training** crawlers (`GPTBot`, `ClaudeBot`, `Applebot-Extended`), which generally do not.

Full breakdown: [09](./09-seo-and-llm-discoverability.md#the-robotstxt-decision).

**Default:** the split above, written explicitly in `robots.txt`.

---

## 🟡 Q7 — Final imagery

The handoff describes all ten assets as *"placeholders/working images from the studio's archive — expect final art to be swapped in."*

1. **When will final imagery be ready?** (Not a blocker — swapping an image is a one-line content change by design.)
2. **`chips-pattern.png` is a 2-byte file** — corrupt or a stub — and is referenced twice in the design source. It needs replacing.
3. **Is there a real photograph of Nadia** for the founder section and OG cards? The current `nadia-portrait.png` is described as working archive imagery.
4. **Who holds the rights** to the archive imagery, particularly `workshop-proof.png` (which appears to show real attendees) and any client artefacts? Publishing recognisable people needs consent.

**Default:** build with placeholders; swap on delivery.

---

## 🟠 Q8 — Arabic and naming sign-offs

Three items the direction document itself leaves open:

1. **Arabic glyphs need native sign-off** — flagged twice in the direction document. Two strings on the homepage: `خشمك. خشمك.` (§5) and `خرا` (§9). Both are colloquial and culturally loaded, and both are set at display scale. This should start now.
2. **The accent name "Offshore" is a placeholder** — "Deep End" and "Blue Hour" are the other candidates. It appears in code as a token name, so it is cheap to change but better decided once.
3. **The logo mark is not chosen.** The direction document shows four live candidates (Mark 01, 01R, 02, 02C). The homepage handoff assumes one specific form: an ink oval with a ground stripe and an accent stripe. **We will build to the homepage handoff's version**, which is buildable and consistent with the header, footer, wake splash and mini-logo — but if a different mark wins, several components change.

**Default:** build to the homepage handoff's logo; keep the accent name as "Offshore" in code; ship Arabic as authored with a clear flag that it is unverified.

---

## 🟡 Q9 — Mobile design decisions

Engineering can propose; design must sign off. All three are 🔴 [hard breaks](./06-responsive-and-mobile-risks.md) with no specified mobile behaviour:

| Q | Element | Our proposal |
|---|---|---|
| 9a | **Header** ([R1](./06-responsive-and-mobile-risks.md)) | Logo + mode dial + menu button below 1024 px; full-screen `<dialog>` panel. **Should the mode dial survive on mobile at all?** |
| 9b | **Language tiles** ([R3](./06-responsive-and-mobile-risks.md)) | Stack vertically below 768 px, or a scroll-snap carousel. Carousel keeps more character |
| 9c | **Hero collage** ([R4](./06-responsive-and-mobile-risks.md)) | Move below the hero copy as a full-width figure below 900 px |

Also worth a decision: **should the hover scraps** ([R5](./06-responsive-and-mobile-risks.md)) have any mobile presence, or is it accepted that they are a desktop reward?

**Default:** the proposals above, logged as [deviations](./06-responsive-and-mobile-risks.md#deviations-log).

---

## 🟡 Q10 — Which design document wins?

The [homepage handoff and the direction document contradict each other](./14-design-source-conflicts.md) in at least eight material ways — including whether turquoise may be used as a surface at all (the homepage's entire §5 depends on it) and whether long, eased motion is permitted (the homepage's accent cycle, wake and sampler all depend on it).

Per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess) we will **build the homepage to the handoff** and log each conflict. But before a second page is built, we need a ruling — otherwise page 2 will not look like page 1.

The two that need answering first are **[C1 turquoise](./14-design-source-conflicts.md#c1--the-turquoise-licence-)** and **[C4 motion grammar](./14-design-source-conflicts.md#c4--motion-grammar-)**.

**Default:** homepage handoff wins for the homepage; ruling required before phase 2.

---

## ⚪ Q11 — Analytics depth

Our recommendation is **Cloudflare Web Analytics** — free, cookieless, no consent banner, no performance cost, and it reports real-user Core Web Vitals.

It gives pageviews, referrers, countries, devices and vitals. It does **not** give funnels, session recordings or cohort analysis. If richer reporting is wanted later, Plausible (~£7/mo) is the natural upgrade and is also cookieless.

**Default:** Cloudflare Web Analytics.

---

## ⚪ Q12 — Ongoing maintenance

Who maintains this after launch? It shapes how much we invest in [P14](./02-engineering-principles.md#p14--build-it-so-someone-else-can-maintain-it) tooling and documentation. The answer is likely "Nadia, with an AI assistant, plus occasional engineering" — which is what the current documentation depth assumes.

Also worth agreeing: a light cadence for dependency updates and a quarterly check on performance and Search Console.

**Default:** documentation written for a competent stranger; Dependabot configured; a monthly review checklist in [10](./10-hosting-domains-and-ops.md#operational-runbook).

---

## 🟡 Q13 — Enquiry data: storage and notifications

New, arising from [16 — Forms & Data Capture](./16-forms-and-data-capture.md). Four operational decisions:

1. **Keep the Google Sheet** as a working view of enquiries, or is an email plus a periodic export enough? (The Sheet is a decent lightweight CRM and it's already the habit — we'd keep it as a best-effort mirror, not the system of record.)
2. **Where do enquiry notifications go** — Nadia's Workspace address, or a shared `hello@`?
3. **What should the enquirer's confirmation email say about when they'll hear back?** This is where a studio wins trust, and the current setup can't do it at all.
4. **Retention period** for enquiry data? Suggested: 24 months, then deleted or anonymised.

**Default:** durable storage in Cloudflare D1, notification to Nadia and confirmation to the enquirer via Resend, Google Sheet mirror retained, 24-month retention.

---

## Answer log

| Q | Decision | Date |
|---|---|---|
| **Q1** ESP | **Kit (ConvertKit)** — confirmed. Our form → Kit API, not Kit's JS embed | 2026-08-17 |
| **Q2** Enquiry form | An enquiry form already exists at `/contact` and stays at that URL. Being redesigned; arriving in the updated handoff | 2026-08-17 |
| **Q5** Domain | `nikkostudio.co`, GoDaddy registrar, Squarespace DNS+hosting → migrate DNS to Cloudflare, keep registrar at GoDaddy, keep `www` canonical | 2026-08-17 |
| **Q5** Legacy domain | It is `imnadiaamer.com` (design copy has an `rn`/`m` typo). Carries the Google Workspace MX records | 2026-08-17 |
| **Q6** AI crawlers | Context changed: currently **blocked** by Squarespace's default. Decision still open | 2026-08-17 |
