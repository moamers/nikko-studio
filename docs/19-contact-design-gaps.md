# 19 — Contact Page: Design Gaps & Decisions

> **Status:** Build complete · **Owner:** Engineering · **Last updated:** 2026-08-21
> **Related:** [Docs index](./README.md) · [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess) · [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact) · [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged)

Nadia flagged that `design-handoff/contact/` was produced in a difficult session and asked for the dropped pieces to be named, not silently patched over. This is that list, plus every place this build deliberately followed the established system instead of the contact handoff, per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess). It does **not** cover implementation choices that aren't design questions — those are commented in the code where they matter.

## Two real tokens are missing from `tokens.css`

The contact handoff's own token table (`CLAUDE_CODE_PROMPT.md`) names two colours that **do not exist anywhere in `tokens.css`**. Both are used constantly — every input, textarea and unselected choice control on the page needs the first one.

| Token the design names | Hex | Used for | Present in `tokens.css`? |
|---|---|---|---|
| "Field paper" | `#F7F3E8` | The fill under every input, textarea, and unselected card/chip/box — distinct from the page ground | **No** |
| Validation red | `#C2381F` | Error text and the invalid-icon square — darker than `--nk-coral` for AA contrast at 10.5px | **No** |

`tokens.css` is out of my ownership for this task, so I could not add either as a real custom property. Both are approximated in `src/styles/contact.css` via `color-mix()` off the nearest existing token (`--nk-paper` and `--nk-coral` respectively) rather than a new hex literal, scoped to `.nk-contact` so nothing leaks onto the rest of the site:

```css
--nk-field: color-mix(in srgb, var(--nk-paper) 65%, white 35%);
--nk-error: color-mix(in srgb, var(--nk-coral) 70%, black);
```

**Recommendation:** add `--nk-field: #F7F3E8` and a validation-red token to `tokens.css` proper in a follow-up PR, then swap these two lines for the real token. The visual result today is close but not pixel-identical to the handoff's literal hex values.

## Checked and confirmed present — not gaps

Nadia specifically asked me to look for these. I checked each one against the contact build; all are intact.

| What to check | Finding |
|---|---|
| **Accent slot bar** on every button | Present. The submit button and "Review your answers" both render through `Pill.astro`, which owns the slot bar — so both automatically carry it and cross-fade with the accent cycle, with zero bespoke code. |
| **Live accent cycle** (`--nk-accent` / `--nk-ground`) | Present and working. The page inherits `Base.astro`'s `initSite()` unchanged — same header, same ground tint, same 2600ms/3400ms transitions as the homepage. Verified by screenshot: the submit button's slot bar and the header logo mark both read the live accent. |
| **`::selection` / focus rings / reduced motion** | All inherited from `base.css` globally (yellow selection, 3px coral `:focus-visible`, the blanket `prefers-reduced-motion` override) — nothing in the contact CSS overrides them. |
| **`#B5AC98` muted-paper misuse** | Not used anywhere in the contact build. All secondary text on the paper ground uses `--nk-ink-muted` (`#4A463C`), correctly. |

## Where the contact handoff conflicts with the established system

The contact design (`Nikko Contact.dc.html`) was authored in a separate session from the homepage and drifts from it in a few small, consistent ways. Per [P0](./02-engineering-principles.md#p0--precedence-when-sources-conflict-we-escalate-we-do-not-guess), the homepage system wins and the deviation is logged here rather than guessed at silently.

| What the contact source shows | What the established system says | What this build does |
|---|---|---|
| Card hover lift: `translateY(-2px)`/`(-3px)`, varying by control | Every existing card (`Services.astro`, `Founder.astro`) lifts a consistent `translateY(-4px)` on `--nk-dur-card`/`--nk-ease-card` | Card-scale controls (intent cards, output boxes, budget boxes) lift `-4px` on the system's own duration/easing; chip-scale controls (pronouns, year, month) keep the smaller `-2px` lift, matching `Pill.astro`'s own convention for a button that size |
| Choice-control corners at a flat `2px` | The "R2" rule: radius is `0` or `50%`, with one documented exception — `--nk-radius-input: 3px`, "form inputs" | Every choice control (radio/checkbox card, chip, box) is styled as a real `<input>` behind a label, so it *is* a form input under that exception. Uses `var(--nk-radius-input)` (3px) rather than a new hard-coded `2px`, which is the one-pixel deviation from the source's literal value |
| Focus state: native ring suppressed entirely, replaced by an ink border + 3px cobalt underbar | [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement): "visible focus (`3px solid #EE5439`, `outline-offset: 3px`)" stated as the floor, not a suggestion | The site-wide coral `:focus-visible` ring is **kept** (it costs nothing extra — `base.css` already applies it everywhere) and the cobalt underbar/ink border is layered on top as the decorative flourish the design wants. The underbar is drawn `inset` so the result is one ring, not two — see "Corrections to the handoff's own values" below |
| The 18px "cut corner" on intent cards, drawn via a `background-image` mask trick keyed to the card's current border colour | No precedent elsewhere on the site | Reproduced with the same masking technique (a small corner `span` with a two-stop `linear-gradient`, reading `var(--nk-ground)` so it stays in sync with the live accent-tinted ground) rather than `clip-path`, which would leave the diagonal edge without a border stroke |
| Receipt's scalloped foot, drawn with a masked `radial-gradient` | The exact same masking technique already exists in `Pitch.astro`'s `.nk-pitch__perforation` | Reused verbatim rather than reinvented — one fewer one-off pattern on the page |

## A real accessibility issue this page surfaced (not introduced, not fixable here)

An `axe-core` pass on `/contact` found one contrast violation: the analogue/digital dial's "Auto" state label (`.nk-dial__state`, inside `SiteHeader.astro` → `ModeDial.astro`) renders at `#848070` on the accent-tinted ground `#F7EED0` — a 3.41:1 ratio against a 4.5:1 requirement for 10px text.

The same scan against `/` (the homepage) returns **zero** violations, not because the header is fine there but because the opening sequence hides the header entirely for the whole window in which this would be visible — the contrast bug exists on the homepage too, just behind a curtain. The contact page has no opening sequence (correctly, per the brief), so the header is visible immediately and the pre-existing bug is exposed on first paint instead of being masked.

This lives in `SiteHeader.astro`/`ModeDial.astro`/`header.css`, all explicitly out of this task's ownership. **Flagging, not fixing** — logged here so it doesn't quietly stay invisible just because the page that exposes it isn't the page that caused it.

**Update, 2026-08-21:** a fresh axe-core pass over the whole of `/contact` at 1440px — with the form empty and again with it part-filled — now returns **zero** violations, the dial included. Either the dial's state colour or the ground behind it has moved since that scan. The finding above is left in place as the record of what was seen; it is no longer reproducible here. `tests/e2e/contact.spec.ts` runs that pass on every build, so a regression would show up as a failing test rather than as prose.

## Deliberate simplifications (mine, not the design's)

Distinct from the above — these are scope trims made to ship a complete, correct, accessible form in the time available, not things dropped from the handoff by whoever produced it.

| Feature in the source | What shipped instead | Why |
|---|---|---|
| The section rail's "gathered fragments" — a stamped chip per answered value, appearing live as the form fills in | **Now shipped** — see "Reversed" below | Cut originally as live state with no functional payoff; the founder asked for it back, and it is in |
| Per-section completion squares (cobalt = done, yellow = in view) in the rail | Not implemented | Same reasoning — purely a progress affordance, not load-bearing |
| Cloudflare Turnstile widget in the form | Not embedded | Needs a live site key this task doesn't have. `src/lib/enquiry/server/turnstile.ts` already degrades gracefully with no token present ("Skipped… lets the enquiry through"), so the endpoint isn't blocked on it — it's a follow-up wiring task, not a functional gap in the form today |

## One thing built beyond the original file list: `/contact/thank-you`

`src/lib/enquiry/server/env.ts` documents that a plain, no-JS form POST redirects to `ENQUIRY_THANK_YOU_PATH` (default `/contact/thank-you`) on success, with the note *"The contact page owns this route; if it is not built yet the redirect 404s."* That route did not exist. Built `src/pages/contact/thank-you.astro` so the no-JS path has somewhere real to land, verified end-to-end against the live endpoint via `wrangler pages dev` (see the build report). Because the site is fully static, that page cannot read its own `?ref=` query string without a small enhancement script — without JavaScript it still reads correctly, just without quoting the reference number back (which the visitor already has in the URL and in the confirmation email).

## Reversed: the rail's selection summary is back

The "gathered fragments" cut above did not survive review. The rail now shows a live summary of the visitor's picks, per the design: a `GATHERED nn` count over one stamped chip per answered value, in the design's own colour language — cobalt for the single-select intent, yellow for the multi-select deliverables, an outline chip for typed text. Labels are truncated at 17 characters exactly as `support.js` does it.

Two implementation notes that matter:

- **It degrades correctly.** The markup in `ContactRail.astro` ships empty and `hidden`; `contact-form.ts` fills and reveals it. With JavaScript off the rail is the five-line navigation aid it always was, not an empty box. [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order)
- **It is `aria-hidden`.** Every value in it mirrors a control the visitor has just filled in and can still reach. Announcing a business name again on every keystroke is noise, not information. [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement)

Per-section completion squares in the rail are still not implemented.

## Removed, then restored under a switch: the draft autosave

**This is a removed feature, not a bug fix.** The form used to autosave every keystroke to `localStorage['nk-brief-draft']` and restore it on the next load. Nadia asked for a hard refresh to start clean: a refresh is the one gesture a visitor has for "start again", and a form that silently repopulates itself has taken that away.

What changed in `src/scripts/contact-form.ts`:

- nothing is restored on load;
- any draft an earlier build left in storage is cleared once, on load, so a returning visitor is not carrying a stale copy of an answer they can no longer see;
- the autosave went with it. A writer with no reader would have left the page filling a visitor's storage with data nothing ever reads. [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)

`EnquiryForm.astro` also carries `autocomplete="off"` on the `<form>`, which is the part that stops the *browser's* own restore-form-state-on-reload from reproducing the same behaviour. Individual fields keep their `autocomplete` values (`organization`, `name`, `email`), so real autofill is untouched.

**Cost of the removal, stated plainly:** a visitor who closes the tab mid-brief and comes back loses their answers. The form is four minutes long and single-page, and the design's own standalone prototype demonstrates draft restore, so this is a deliberate divergence from the handoff at the founder's request, not an oversight.

### Reversed: the autosave is back, with a control on it

**The paragraphs above are the record of what happened, not the current behaviour.** That cost was the one that mattered, and Nadia asked for the feature back on the condition that it is visible and the visitor can turn it off. It is, and they can.

The re-reading of the original complaint that this rests on: the defect was never that the form remembered. It was that the form remembered *silently* — nothing on the page said a draft existed, nothing explained why yesterday's answers were in today's fields, and nothing short of guessing offered a way out. Removing the memory fixed the symptom by removing the feature. Naming the memory fixes it by removing the silence.

What `src/scripts/contact-form.ts` does now:

- `saveDraft` and `restoreDraft` are back as they were before 9889221 — the whole form via `new FormData(form)`, so every text answer, radio and checkbox comes back, not only the card choices. All storage access stays inside `try`/`catch` for private browsing;
- a `nk-brief-autosave` key holds the switch's own state, deliberately separate from the `nk-brief-draft` key it controls: a preference has to outlive the thing it is a preference about, or turning autosave off would erase the record of the decision to turn it off;
- **on** is the default for a visitor who has never expressed a view;
- **off deletes the stored draft in the same tick**, not on the next load. Stopping the writer while keeping the file is not what "off" means to anyone, and a copy of somebody's answers left behind after they opted out is the wrong behaviour whatever the intent. [P13](./02-engineering-principles.md#p13--privacy-and-data-minimalism)
- **on** starts saving immediately from what is already on screen, rather than waiting for the next keystroke;
- when a draft *is* restored, a quiet mono line under the status row says so and says how to clear it. Not a banner, and not a dismissable one — it is one sentence in the page's own voice, and it is the part that actually answers the original complaint.

The control itself, in `ContactIntro.astro` and `contact.css`:

- a real `<input type="checkbox" role="switch">` behind the same `.nk-vh-input` + styled-`<label>` pattern every other choice control on this page uses. Focusable, Space-operable, carries the page's 3px coral `:focus-visible` ring, accessible name "Autosave". The visible ON/OFF word is `aria-hidden`, because the switch role already announces the state and a screen reader should hear it once. [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement)
- drawn in the idiom the handoff already uses for the header's analogue/digital mode button — mono uppercase, hairline ink box, square corners, a status lamp, a 120ms `steps(2)` cut. That control exists to say "here is a state you can change", which is this control's job too, so it borrows rather than inventing a second vocabulary for one idea;
- R2 holds: the box is radius `0`, the lamp is `--nk-radius-oval` (a true 50%). No pill;
- the lamp is `var(--nk-accent)` read live, so it moves with the accent cycle. Off, it is a hollow ring in muted ink — the state is carried by lamp fill, border weight, text colour and the word together, never by hue alone;
- no new token was needed and no hex literal was introduced. [P11](./02-engineering-principles.md#p11--one-source-of-truth-per-fact)
- **one deliberate deviation from the handoff's idiom:** the mode button inverts to solid ink on hover; this switch lifts 2px and firms its border instead, like the choice chips. The pointer rests on the switch straight after a click, so an inverting hover made "off" paint itself solid black and read as the louder, more-engaged-looking of the two states. Hover says touchable; state is said by the switch. [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged)

Progressive enhancement: autosave is a JavaScript feature and cannot be anything else, so the switch ships `hidden` in the markup and `contact-form.ts` unhides it as its first act. Its visibility is exactly the condition under which it is honest. The same gate covers storage that exists but throws — `storageAvailable()` probes with a real write, because Safari's private mode returns a working-looking object that only fails on `setItem` — and if the probe fails the switch never appears. With JavaScript off the form posts exactly as it always has. [P3](./02-engineering-principles.md#p3--progressive-enhancement-in-layers-in-that-order)

`autocomplete="off"` on the `<form>` stays. It is a different mechanism and still unwanted: the *browser's* form-state restoration is untitled, unexplained and not controllable from this page, which is precisely the property this feature was rebuilt to not have.

The e2e test `nothing survives a reload [D8]` was repointed rather than deleted — its subject was never "the form must forget" but "the form must not remember behind the visitor's back", and five tests in `tests/e2e/contact.spec.ts` now hold both halves of that. See the D8 note in that file's header.

## Corrections to the handoff's own values

Three places where the source file's literal numbers are wrong and this build does not reproduce them. [P12](./02-engineering-principles.md#p12--design-fidelity-is-a-specification-deviations-are-logged) requires them logged rather than quietly "improved".

| Where | The source says | What ships | Why |
|---|---|---|---|
| Ruled textareas | `line-height: 28px`, rules every 28px, `padding: 13px 16px` | Same rules and line-height, `padding-top` one whole rule (28px), background offset 1px | 13px is not a multiple of the rule pitch, so text sat 15px off its own rules and every line landed at a different height in its band. The three numbers now agree |
| Focused input/textarea | `box-shadow: 0 3px 0 #2B45F0` (outer) | The same bar, `inset` | The site keeps its coral `:focus-visible` ring (P10). An *outer* shadow lands in the gap `outline-offset` opens and reads as a second, blue ring around the field. Inset, it is a bar under the text and the field has exactly one ring |
| Group label → controls | Fieldset `gap: 14px` | Legend `margin-bottom: 24px` | A rendered `<legend>` is excluded from its fieldset's flex layout, so the `gap` never applied — the measured clearance was 0px and a card's 4px hover lift covered the label above it. The lift is unchanged |

| Selected intent card's note | `color: rgba(242,236,223,0.76)` | `var(--nk-paper)`, full opacity | 14.5px at 0.76 (or the 0.86 this build shipped) over the cobalt fill is 3.17:1 against a 4.5:1 requirement — axe-core fails `/contact` the moment a card is selected. Full paper is ~6:1. [P10](./02-engineering-principles.md#p10--accessibility-is-a-functional-requirement) outranks the literal value |

One more, not a value but a placement: `.nk-c-intro` now states `max-width` / `margin` / `padding` matching `.nk-c-shell`. The design draws the intro inside the two-column shell, where it inherits that container; here it is a sibling above the shell, so without those three declarations it ran flush to the viewport edge.
