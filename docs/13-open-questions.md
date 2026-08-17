# 13 — Open Questions

> **Status:** Awaiting answers · **Owner:** Nadia (business) / Design · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [Roadmap](./12-roadmap.md) · [Design Source Conflicts](./14-design-source-conflicts.md)

Questions that need an answer from outside engineering. Each states **what we would do if we heard nothing**, so nothing is blocked while they are open — but the 🔴 items should be answered before the build starts, because they are expensive to retrofit.

**Priority:** 🔴 blocks the build · 🟠 blocks a section · 🟡 needed before launch · ⚪ can wait

---

## 🔴 Q1 — Which email service provider?

**Why it matters.** Email is described in the README as historically generating the large majority of sales. The newsletter form is the highest-value interaction on the page ([Job 2](./01-project-brief.md#job-2--capture-email-the-real-conversion-event)). We need to know where subscribers go before we can wire it.

The footer links **Substack**, which suggests the newsletter may already live there — worth confirming, because Substack's API for programmatic subscription is limited and it may be better to capture into a proper ESP and cross-post.

| Option | Notes |
|---|---|
| **Kit** (ConvertKit) | Best-in-class for creator businesses; excellent API, tagging, sequences. Free to 10k subscribers |
| **beehiiv** | Strong growth tooling and referral mechanics; good API |
| **MailerLite** | Cheapest capable option; solid API |
| **Substack** | If the list already lives there. Limited API — may need an embed, which costs us control and adds a third-party script |
| **Mailchimp** | Works; gets expensive; heavier |

**Also needed:** does the flow use double opt-in? Is there a welcome sequence? Should first name be required or optional?

**Default if unanswered:** build against a provider-agnostic interface with a stub, so the ESP is a one-file change later. The form ships fully working in every other respect.

---

## 🔴 Q2 — Where do project enquiries actually go?

**Why it matters.** This is the biggest **business** gap in the design. Every primary CTA — "Pitch your project" (×4), "Grab a seat", "Submit your project here ➺" — points at `#pitch`, which is the *newsletter*. The site's main commercial action has no destination.

Options:

| Option | Trade-off |
|---|---|
| **A dedicated `/pitch` page with a real form** ✅ | Best qualification, best tracking, best experience. Needs form fields and destination decided. *Recommended* |
| A `mailto:` link | Zero build, but no qualification, no tracking, and it invites spam |
| An external form (Tally, Typeform) | Fast; costs a third-party script, a visual break and some data-protection surface |
| A booking link (Cal.com, Calendly) | Conflicts with the README's stated position on selective founder access — *"Nadia does not want an always-open consultation calendar"* |

**If a form:** what does Nadia need to know before replying? Suggested minimum — name, email, business/website, what the challenge is, timeline, budget band. The budget band matters: with a £5,000 floor, it does the qualification work that keeps the inbox useful.

**And separately:** where does "Grab a seat" for Show&Tell go? Eventbrite, Lu.ma, a Stripe payment link, or an email waitlist? This determines whether phase 2 needs any dynamic behaviour at all.

**Default if unanswered:** `/pitch` is scaffolded with a form whose destination is a stub, and CTAs point at it rather than the newsletter.

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

## 🟡 Q5 — Domain, and what happens to `irnnadiaamer.com`?

Three things needed:

1. **What is the new domain?** Not specified anywhere in the repo. Is it registered? Where?
2. **Does `irnnadiaamer.com` still exist and does Nadia still control it?** The footer implies it does.
3. **Are there existing pages worth redirecting individually,** or is a blanket 301 to `/` acceptable?

That domain carries eight years of history, inbound links and brand searches. Losing it, or redirecting it badly, throws away the most valuable SEO asset the business has. **Do not let it lapse** — see [10](./10-hosting-domains-and-ops.md#irnnadiaamercom).

**Default:** launch on the domain provided at launch time; a blanket 301 from the old domain if no URL list is available.

---

## 🟡 Q6 — Should AI crawlers be allowed?

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

## Answer log

| Q | Answered | Decision | Date |
|---|---|---|---|
| *(populated as answers arrive)* | | | |
