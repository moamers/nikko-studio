# Build the Nikko contact / project-enquiry page

You are implementing the **/contact** page of nikko.studio in the production Next.js app
(`prototype-source/` in the original handoff: Next 15 App Router, Tailwind-less plain CSS,
Drizzle + D1 for persistence, Cloudflare Worker submission endpoint).

The approved design is in this folder:

- `Nikko Contact (standalone).html` — open in a browser, fully interactive. This is the source of truth.
- `Nikko Contact.dc.html` + `support.js` — the authored design file (readable markup + logic class).

Recreate the design faithfully in production code. Do not redesign. Where the old prototype
(`app/page.tsx`, `app/globals.css`) disagrees with this design, **this design wins** — it replaces
the prototype's native selects, native month input, `+ / ×` choice icons, cut-corner card treatment
and the Light / Split / Dark switcher (dropped: light mode only).

## Site system (inherited from the homepage — do not invent new tokens)

| Token | Value | Use |
| --- | --- | --- |
| paper | `#F2ECDF` | page ground (accent-tinted, see below) |
| field paper | `#F7F3E8` | inputs, textareas, unselected cards |
| ink | `#111110` | text, borders, selected chips |
| muted ink | `#4A463C` | labels, secondary copy |
| coral | `#EE5439` | required asterisks, validation, ruled-paper margin rule |
| cobalt | `#2B45F0` | focus, single-select fill, ruled lines |
| yellow | `#FFD400` | multi-select (deliverables) fill, selection highlight |
| teal | `#00B2A9` | reserved accent, unused on this page |

Type: **Archivo** (body 16px/1.55), **Archivo Black** (headings, `-0.035em`), **DM Mono**
(labels/meta, 10–11px, `0.14–0.18em`, uppercase), **Newsreader italic** (pull quotes).
Fonts are already self-hosted in `public/fonts/`.

**Accent cycle:** the page cycles accent (yellow → coral → cobalt) every 12s, transitioning
the page ground to a faint tint of that accent (`transition: background-color 3400ms`), exactly
as the homepage does. The logo slot, scroll progress bar, submit-button underbar and newsletter
button underbar all take the live accent.

**Analogue / Digital control** in the header behaves as on the homepage: drifts with scroll
(analogue → digital past 52%), click to pin, pinned value stored in `localStorage['nk-mode']`.
Analogue adds the fixed grain overlay at 13% multiply.

Header, footer and newsletter block are the homepage components — import them, don't re-cut them.
The header nav shows a static current-page pill for "Pitch your project"; the three homepage links
hide below 1080px.

## Page structure

One continuous page, no wizard, everything always editable.

1. **Compact intro** — kicker (`Project enquiry · about four minutes`), H1 "Pitch us your project.",
   one paragraph, `* Required` note. No gate, no CTA before the form.
2. **Section rail** (sticky, ≥1080px, right of nothing — left column): 01–05 with a completion
   square per section (cobalt = complete, yellow = currently in view), plus the **fragments**
   list: every answered value appears as a small stamped chip (`Gathered 07`). Below 1080px the
   rail is replaced by a sticky horizontal chip bar under the header.
   The fragment idea stays implicit — never explain it in copy.
3. **01 About you** — business name\*, your name\*, email\*, social/website, pronouns (chip row,
   optional, single-select, deselectable), accessibility/call adjustments (ruled textarea).
4. **02 The project** — 4 cut-corner cards, single select: Launch / Grow / Fix / Learn something,
   each with a one-line note. 18px cut corner top-right, 2px ink rule, circle dot mark
   (empty ring → filled), selected = cobalt fill + cream text.
5. **03 The work** — 8 square boxes, multi-select (≥1 required): Website, Email, Customer journey,
   Campaign, Workshop / talk, Growth strategy, Messaging & positioning, Surprise me.
   Selected = yellow fill, ink border, punched square mark.
6. **04 The reason** — ruled-paper textarea\* ("What's broken, missing or holding things back?",
   placeholder "Start anywhere."), live word count, Newsreader-italic aside.
7. **05 The finish line** — success textarea\* ("What does “this worked” look like?"), **target
   timing** (year chips incl. `Flexible`, then a 12-cell month grid; months disable when Flexible
   is chosen), **ballpark budget** (6 boxes, single select), then the submit row directly after —
   no separate closing section.

Ruled textareas: `background-image: repeating-linear-gradient(to bottom, transparent 0 27px,
rgba(43,69,240,0.16) 27px 28px); background-position: 0 -1px; background-attachment: local;`
with `line-height:28px`, `border-left:4px solid #EE5439`. Rules must sit on the baseline —
verify with typed text containing descenders.

Placeholders: Archivo **italic**, 16px, `#7A7365`, in every field. Native focus rings are
suppressed; focus = ink border + 3px cobalt underbar (`box-shadow: 0 3px 0 #2B45F0`).

## Behaviour to preserve

- Required: business, name, email, intent, ≥1 deliverable, reason (≥12 chars), success (≥8 chars),
  timing, budget. Optional: social, pronouns, accessibility. Red asterisk only; never write "optional".
- Validation on submit only: inline `role="alert"` message per field, coral border, count summary
  by the button, and the page scrolls to the first offending field (`window.scrollTo`, ~150px
  offset) and focuses it. Never `scrollIntoView`.
- Draft autosave to `localStorage['nk-brief-draft']` on every change; restored on load; cleared
  on successful submit.
- Desktop (≥900px, non-reduced-motion) uses `scroll-snap-type: y proximity` on the document with
  `scroll-padding-top: 132px`. Wheel/keyboard/touch must never be intercepted. Off on mobile.
- Success state replaces the form (header/footer stay): "Thank you, {firstName}." plus a
  **receipt** card with a scalloped foot listing every submitted answer and a reference
  (`NKO—######`), and a "Review your answers" button that returns to the filled form.
- `prefers-reduced-motion` disables all animation.

## Production wiring (replace the design's local-only behaviour)

- POST the brief to the existing Worker endpoint with server-side validation mirroring the rules
  above; persist via the Drizzle schema in `db/schema.ts` (extend it for the new fields:
  intent, outputs[], why, goals, month, year, budget, pronouns, accessibility, social).
- Return the reference id from the server and render it in the receipt instead of a client-generated one.
- Send the studio notification email; no third-party form service.
- Honeypot + rate limit on the endpoint; no CAPTCHA.

## Acceptance

- Keyboard-only completion works end to end; every control is a real button/input with
  `aria-pressed` / `aria-invalid` / labelled groups.
- All text ≥ 4.5:1 on its ground (mono meta uses `#4A463C`, never a lighter grey).
- 320px → 1600px with no wrapped pill, no horizontal scroll.
- Lighthouse a11y 100; no layout shift from the accent cycle.
