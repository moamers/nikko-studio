# 14 — Design Source Conflicts

> **Status:** ⚠️ Needs a ruling · **Owner:** Design / Nadia · **Last updated:** 2026-08-17
> **Related:** [Docs index](./README.md) · [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess) · [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) · [Q10](./13-open-questions.md#-q10--which-design-document-wins)

The handoff bundle contains **two design documents that disagree with each other** on load-bearing points. This was not obvious until both were read closely, and it is the single most important thing surfaced in this review.

| | Document | Character |
|---|---|---|
| **A** | `design-handoff/homepage/README.md` + `Nikko Homepage.dc.html` | A specific, copy-approved, high-fidelity **page design**. Buildable as-is |
| **B** | `Nikko Direction v2.dc.html` — *"Art Direction v1.1 (moodboard reconciled)"*, serial `NKO—2026—08—14` | A system-level **direction board**: 18 plates of rules, specimens and laws. Contains several explicitly open decisions |

Neither is wrong. **B states the system's laws; A breaks several of them.** That is a normal and healthy tension between art direction and a page design — but it has to be resolved deliberately, because the resolution determines what page 2 looks like.

## How we are proceeding

Per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess):

1. **Build the homepage to A.** It is specific, copy-approved and buildable, and the prototype demonstrates it works as a whole.
2. **Log every conflict here.**
3. **Get a ruling before building a second page.** Otherwise page 2 follows B, page 1 follows A, and the site does not look like itself — the worst possible outcome for a studio selling memorability.

**C1 and C4 need answering first.** Both affect the homepage build directly, not just future pages.

---

## The conflicts

### C1 — The turquoise licence 🔴

| | |
|---|---|
| **B says** | *"Turquoise may be a surface inside a picture — plaster, tile, thread, a mount. It may never be a fill, a rule, a chip, a link or a word."* It is listed as `RESERVE — imagery only`. |
| **A does** | Uses `#00B2A9` as a **full-bleed section background** for the entire language section (§5), as the hero ticket bar's **hard drop shadow** (`box-shadow: 8px 8px 0 #00B2A9`), and as the hero collage's **perforation strip**. |
| **Impact** | Direct and total. These are mutually exclusive positions, and §5 is one of the page's strongest moments — a full-bleed turquoise plane with an elliptical dot field, an Arabic setting and three arch tiles. |
| **Cost to change** | **High.** Removing the turquoise ground means redesigning §5 — a different ground colour changes the paper panel's purpose, the perforated bottom edge, and the tiles' contrast. |

**Question for design:** does the turquoise licence still hold, or did the homepage design deliberately supersede it? If it holds, §5 needs a new ground and the ticket-bar shadow needs a new colour.

**Our read:** the homepage's use of turquoise is confident and works. It looks like a deliberate evolution rather than an oversight — but we cannot assume that. If it is intentional, B should be amended so the next page does not revert.

---

### C4 — Motion grammar 🔴

| | |
|---|---|
| **B says** | *"Cut, snap, stamp — never fade."* Timing **120–220 ms**, `steps()` and hard cubic-bezier. **"No 800ms luxury ease."** Reveals are *"wipe, clip and slide — content arrives from under a layer, never fading up from below."* The anti-brief explicitly bans *"fade-up everything"* and *"scroll-jacking"*. |
| **A does** | Sampler swap **780 ms**. Wake **2600 ms**. Accent crossfade **2600 ms**, ground **3400 ms**. Scroll reveals are `nk-rise` / `nk-fade` — **fade-up from below** — via `animation-timeline: view()`, used ~30 times. |
| **Impact** | Broad. It affects the page's entire feel, not one component. |
| **Cost to change** | **Medium–high.** Retiming is cheap; changing every reveal from fade-up to wipe/clip is a real rework of the motion layer. |

**Question for design:** is the 120–220 ms grammar the law, with the accent cycle and wake as deliberate exceptions (which is defensible — they are ambient, not interactive)? Or should the reveals be rebuilt as wipes?

**Our read:** there is a coherent reconciliation available. **Interaction** feedback — buttons, dials, tiles, swaps — obeys B's 120–220 ms stepped grammar. **Ambient** state changes — the accent cycle, the ground drift, the wake — are a different category and legitimately slow. The one genuinely unresolved item is the **fade-up reveal**, which B bans outright and A uses everywhere. Worth a decision; a wipe-from-under-a-layer reveal would arguably be more distinctive.

---

### C2 — Muted-on-ink colour 🟠

| B | `#8A8474` |
|---|---|
| **A** | `#B5AC98` |

Same role, two values. A's is lighter and therefore has better contrast on ink — B's `#8A8474` on `#111110` is around 4.2:1, marginally under the 4.5:1 AA threshold for body text.

**Recommendation: use A's `#B5AC98`**, on accessibility grounds ([P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement)). Low cost either way. Both documents agree it is never used on light backgrounds.

---

### C3 — Ground drift: values *and* mechanism 🟠

| | **A** | **B** |
|---|---|---|
| Mechanism | 3 states, JS lerp | 5-stop CSS `@keyframes` loop |
| Timing | 12 s hold, 3400 ms crossfade | 48 s loop, ease-in-out, legal range 30–90 s |
| Stops | `#F7EED0` / `#F9E9DF` / `#EAEDF8` | `#F2ECDF → #F9F3DB → #FAEFE9 → #EFF1FC → #FAF1E0 → #F2ECDF` |
| Constraint | — | *"loop must close on paper"*; adjacent stops within ~4% lightness |
| Reduced motion | — | *"holds the ground at paper, permanently"* |

B's version is arguably better engineering: pure CSS, no JS, no timer, and the "close on paper" rule prevents the ground drifting somewhere unintended.

**But** A's accent index also drives the logo stripe, every button's slot bar, the header veil and the footer logo — those need a discrete accent *value*, not just a background. So the two are not interchangeable.

**Recommendation:** keep A's three-state model (it drives more than the ground) but adopt two of B's rules: the loop closes on paper, and **`prefers-reduced-motion` holds at paper permanently**. Both are already in our [motion architecture](./05-motion-and-interaction.md#1-accent-cycle--accentts).

Also adopt B's explicit rule: *"Only the page ground drifts. Cards, plates, the memory box and every image mount stay fixed paper."* A's language panel and service cards currently read the drifting ground — worth confirming.

---

### C5 — Radius: one dome or five? 🟠

| | |
|---|---|
| **B says** | One shallow dome everywhere: `50% 50% 8px 8px / 24% 24% 8px 8px` — *"a lid, not an archway"*, *"This is the curve used everywhere on the site now"*. And: **"Mixed radii (8 here, 16 there) is the failure mode."** |
| **A does** | Five variants — `26%` (hero collage), `22%` (service images, portrait), `24%` (figures), `30%` (language tiles), plus soft lids `34px 34px 8px 8px` and `26px 26px 8px 8px`, plus a **`16px` exception** for hover scraps. |

A is, fairly precisely, the failure mode B names.

**Recommendation:** **normalise to B's single 24% dome** unless design objects. The variance between 22%, 24% and 26% is close to imperceptible, and collapsing it makes the shape language stronger and the token set smaller ([P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact)). The `16px` scrap exception is justified — A explains they *"read as loose photos, not framed artefacts"* — and should be kept as a deliberate, documented exception rather than a sixth variant.

Low cost, and this is one where B is straightforwardly right.

---

### C6 — Type scale and measure 🟠

| | **A** | **B** |
|---|---|---|
| Display | `clamp(32px, 4.6vw, 68px)`, lh `0.94` | `clamp(46px, 7.4vw, 116px)`, lh `0.86` |
| Section h2 | `clamp(30px, 4.6vw, 72px)` | `clamp(30px, 4vw, 60px)`, lh `0.94` |
| Body measure | 46–56ch | **62ch** |
| Container | `1280px` / `40px` gutter | `1320px` / `32px` gutter |
| Newsreader | upright **and** italic requested | **italic only** |

B's display scale is dramatically larger — nearly double at the top end. A's h1 is set to a specific 130-character headline, which at B's scale would be enormous.

**Recommendation:** keep A's scale for the homepage (it is tuned to the actual copy), but adopt two of B's points:
- **Newsreader italic-only.** A's font request includes an upright range the homepage never uses — a free payload saving ([08](./08-performance.md#fonts-the-biggest-lever)).
- **Container: pick one.** 1280/40 and 1320/32 give near-identical content widths (1200 vs 1256). Pick A's 1280/40 and note it.

Body measure: A's 46–56ch is the better typographic call; 62ch is long for 17–20 px type.

---

### C7 — Button budget 🟡

| **B says** | *"One filled oval, one outlined oval, per page."* Also: *"PRESS = SLOT SHRINKS TO 2PX. NO DROP SHADOW."* |
|---|---|
| **A does** | Six filled ink pills on the homepage (header CTA, hero CTA, founder CTA, two service CTAs, newsletter submit), plus a `box-shadow: 0 0 0 2px` on service-card hover and `8px 8px 0` on the ticket bar. |

B's rule is almost certainly about *variants per page*, not *instances* — six instances of one button style is consistent, not chaotic. Reading it as "one instance" would make a multi-CTA page impossible.

**Recommendation:** read it as "one filled variant, one outlined variant" — A complies. **Do adopt** the press behaviour: the slot bar shrinking to 2 px on `:active` is a lovely detail that A does not specify, and it costs nothing.

---

### C8 — `overflow-x`: `hidden` or `clip`? 🟡

| **A (README)** | `clip` — *"clip, not hidden — hidden breaks the sticky header"* ✅ correct |
|---|---|
| **A (source)** | `body { overflow-x: hidden }` on line 20 — contradicting its own README |
| **B** | `overflow-x: hidden` on the wrapper |

**Recommendation:** A's README is right. Use `overflow: clip` on the wrapper, and **remove `overflow-x` from `body` entirely**. See [R10](./06-responsive-and-mobile-risks.md#r10--overflow-x-hidden-on-body-breaks-the-sticky-header-) — this is an active bug in the prototype, not just a documentation inconsistency.

---

### C9 — Focus ring colour: coral or cobalt? 🟠

*Not an A-vs-B conflict. This one is A against A: the two page designs in the handoff bundle disagree with each other.*

| | |
|---|---|
| **Homepage says** | `Nikko Homepage.dc.html` — `outline: 3px solid #EE5439` (coral), and `homepage/README.md`'s token table names coral as the focus colour. This is what `--nk-focus-colour` in `tokens.css` was built from |
| **Contact says** | `Nikko Contact.dc.html` — `outline: 3px solid #2B45F0` (cobalt), consistently, on every control |
| **Impact** | Site-wide if resolved the obvious way. `--nk-focus-colour` is one token read by every `:focus-visible` rule on the site, so repointing it to cobalt for the contact page would silently recolour the homepage too |
| **Cost to change** | Nil either way. One token, or one scoped override |

**What this build does, pending a ruling:** the global token stays coral, and `.nk-contact` overrides `--nk-focus-colour` to `var(--nk-cobalt)` for the contact page only. Each page therefore matches its own design source, and neither source has been overruled by the other.

Measured, against the two grounds a ring on this page is ever drawn over — the field fill (`#F7F3EA`) and the accent-tinted page ground:

| Ring | vs field fill | vs page ground | 3:1 non-text floor |
|---|---|---|---|
| Coral `#EE5439` | 3.17:1 | **2.99:1** | fails on the ground |
| Cobalt `#2B45F0` | 5.89:1 | 5.56:1 | passes on both |

So this is not purely a taste decision. Coral is a marginal ring at best and an under-floor one around the controls that sit directly on the page ground (the pronoun chips, the year chips, the autosave switch). [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement)

**Our read:** cobalt is the better value on the contact page specifically, and the reason is not aesthetic. That page's error state is coral — coral text, a coral invalid-icon square, a coral field border — so a coral ring around a *valid* field the visitor is typing into is the same colour saying two opposite things. Cobalt is already the page's "chosen" colour there (the selected intent card and the selected month chip both fill with it). On the homepage, with no form and no error state to collide with, coral is unambiguous.

**One thing this measurement says about the homepage, flagged not fixed:** coral's 2.99:1 against the paper ground is not a contact-page property. The homepage draws the same coral ring over the same ground, so its focus ring is fractionally under the same floor. Nothing on the homepage was touched here — that page is out of this task's ownership and the ruling below may moot it — but if the answer to C9 is "coral everywhere", the ring needs a darker coral or a companion inner stroke to clear 3:1.

**Question for design:** is cobalt the contact page's own accent, or should focus be one colour site-wide? If it should be one colour, we need to know which — and if the answer is cobalt everywhere, say so explicitly, because that is a one-line change to `tokens.css` that moves every ring on the site.

---

## Open decisions inside the direction document

Separate from the conflicts, B carries decisions it explicitly marks unresolved. These need closing before anything beyond the homepage is built:

| # | Open item | B's own words | Impact |
|---|---|---|---|
| D1 | **Logo mark not chosen** | Four live candidates: Mark 01, 01R, 02, 02C | Header, footer, wake splash, mini-logo, favicon. A assumes one form — [Q8](./13-open-questions.md) |
| D2 | **Accent name "Offshore" is a placeholder** | *"Deep End and Blue Hour are the other two candidates"* | Token naming only. Cheap |
| D3 | **Arabic pending native sign-off** | Stated twice | Two homepage strings — [Q8](./13-open-questions.md) |
| D4 | **House pattern not picked** | Ten Levantine patterns: *"Pick one as the house pattern; delete the rest"* | Not used on the homepage; blocks later pages |
| D5 | **Box primitives not narrowed** | *"Nine available; expect to use four"* | Later pages |
| D6 | **Third word-weight register** | *"faecal matter / clinical"* — *"needs sign-off or removal"* | Not on the homepage |
| D7 | **Beat 04 copy order** | Recommends *"hook, don't move"* | Section order — A's order is settled, so likely closed |

## Missing files

B links to four sibling documents that **are not in this bundle**:

- `Nikko Archive - Logo Round 1.dc.html`
- `Nikko Archive - Colour.dc.html`
- `Nikko Archive - Lockups.dc.html`
- `Nikko Archive - Buttons.dc.html`

They may contain the resolutions to D1 and C2. **Worth asking whether they exist** — if the logo has already been chosen elsewhere, that closes the most consequential open decision.

---

## Scope note

B catalogues a substantial amount of design that is **not in the homepage handoff**: the memory box (three cartridges — text, album, voice), voice-note players with transcripts, the word-weight selector, a console/dialogue box, the margin ticket-stub rail (desktop ≥1560 px only), thirteen edge treatments, ten Levantine patterns, nine box primitives, and drop cards with live/gone status.

**None of it is in phase 1.** It is [phase 3 material at the earliest](./12-roadmap.md#phase-3--compounding-assets), and it is listed in the [roadmap risks](./12-roadmap.md#risks-to-delivery) as the most likely source of scope creep. Flagging it here so it is a decision rather than a surprise.

One item from B is worth adopting early regardless, because it is a good target for [content architecture](./04-content-architecture.md): *"Founder tooling is four fields: upload, caption, back-note, tone."* That is the right level of simplicity to aim for.

---

## Ruling log

| # | Conflict | Ruling | Date | By |
|---|---|---|---|---|
| *(populated as rulings arrive)* | | | | |
