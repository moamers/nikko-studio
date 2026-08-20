# Handoff: Nikko Studio — Homepage

## Overview
Marketing homepage for **Nikko Studio**, a creative story studio (London / UAE). One long scrolling page: hero, an attention/"stories travel" section, a turquoise language section, founder, services ("Put us to work"), a work sampler + testimonial, a "joyride" section with a word-swap interaction, and a newsletter/pitch footer on black.

The page has a deliberate living quality: an accent colour cycles slowly through the whole page (logo slot, button slots, page background tint), an analogue/digital "mode" drifts as you scroll, a projector-style sampler swaps case-study lines, hovering key words in a heading deals out a fan of image scraps, and and the page opens with a supplied scroll-driven title sequence that hands off into the site.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behaviour, **not production code to copy directly**. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, Astro, plain HTML/CSS…) using its established patterns, component conventions and styling approach. If no environment exists yet, choose the most appropriate framework and implement it there.

Note on the source format: the design was authored as a "Design Component" — a single HTML file containing an inline template and a small logic class. Read the template as JSX-equivalent markup (`{{ x }}` = a value from the logic class, `<sc-if>` / `<sc-for>` = conditional / list rendering, `style-hover="…"` = a `:hover` rule) and the logic class as component state. **Do not port the runtime itself.** Styling is inline in the prototype only because that authoring environment requires it — in production, use whatever the codebase uses (CSS modules, Tailwind, styled-components…).

## Fidelity
**High-fidelity.** Final colours, typography, spacing, motion timings and copy. Recreate accurately using the codebase's libraries. All values below are exact and taken from the source.

---

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| Ink | `#111110` | All text, borders, dark sections |
| Paper | `#F2ECDF` | Base page ground, text on dark |
| Muted ink | `#4A463C` | Secondary text on paper; footer rule |
| Muted paper | `#B5AC98` | Secondary/mono text on ink — never on paper |
| Coral | `#EE5439` | Punctuation accent, italic pull-quotes, focus ring, service 01 |
| Cobalt | `#2B45F0` | Structure accent, button hover, service 02 |
| Horizon yellow | `#FFD400` | Accent state 1, `::selection`, sampler tag |
| Turquoise | `#00B2A9` | Language-section surface, hero ticket drop-shadow, hero perforation |

**Accent cycle.** Three accent states rotate on a timer (default 12s hold, 2600ms crossfade):

| # | Name | Accent | Ground target |
|---|---|---|---|
| 1 | Horizon | `#FFD400` | `#F7EED0` |
| 2 | Last light | `#EE5439` | `#F9E9DF` |
| 3 | Offshore | `#2B45F0` | `#EAEDF8` |

The **page background**, the **logo's slot stripe**, the **slot bar inside every dark button**, the **header veil**, the **language-section paper panel** and the **footer logo** all read from the same active accent, so the page shifts together. Ground = base paper `rgb(242,236,223)` lerped toward the state's ground target by `tintDepth` (default 1.0). Header veil = the same rgb at `0.74` alpha with `backdrop-filter: blur(9px)`. Background transition `3400ms cubic-bezier(0.4,0,0.2,1)`; accent transition `2600ms`, same easing.

On-accent text colour: ink `#111110` on yellow, paper `#F2ECDF` on coral/cobalt.

### Typography
- **Display** — Archivo Black. All h1/h2/h3 and big numerals. Section titles uppercase; letter-spacing `-0.03em` to `-0.05em`; line-height `0.78`–`1.0`.
- **Body** — Archivo 400/600. `clamp(16px,1.35vw,19px)`, line-height `1.55`.
- **Mono** — DM Mono 400/500. All metadata, eyebrows, labels, serials, nav. 9.5–12px, `letter-spacing: 0.12em–0.2em`, uppercase.
- **Editorial** — Newsreader italic. Pull-quotes, the "khashmak" line, `<em>` inside headings. `clamp(19px,1.9vw,26px)` up to `clamp(30px,4.2vw,64px)`.
- **Arabic** — Noto Kufi Arabic 700, line-height 1.5, always `dir="rtl" lang="ar"`. Never set Arabic in the Latin display face.

Google Fonts request:
`Archivo:ital,wght@0,400..700;1,400..600` · `Archivo+Black` · `DM+Mono:wght@400;500` · `Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500` · `Noto+Kufi+Arabic:wght@400;700`

### Shape (the "R2" rule)
Radius is **0 or 50%** — never a plain rounded corner. Permitted forms:
- **Arch / lid** — `border-radius: 50% 50% 8px 8px / 26% 26% 8px 8px` (images and framed collages; service card images use `50% 50% 8px 8px / 22% 22% 8px 8px`; language tiles `50% 50% 6px 6px / 30% 30% 6px 6px`)
- **Soft lid** — service cards: `34px 34px 8px 8px`; language paper panel: `26px 26px 8px 8px`
- **Oval** — `border-radius: 50%`. Every pill button, tag and stamp is a true 50%, never `999px`
- **Section lid** — dark section opens with `border-radius: 50% 50% 0 0 / clamp(40px,6vw,90px) clamp(40px,6vw,90px) 0 0`
- Exception: the hover scraps in §3 use a plain `16px` radius (they read as loose photos, not framed artefacts), and form inputs use `3px`.

### Spacing & layout
- Content column `max-width: 1280px`, gutter `40px`.
- Section rhythm `padding: clamp(80px,10vw,150px) 40px 0`; full-bleed dark/turquoise sections `clamp(60px,7vw,110px) 0 clamp(70px,8vw,120px)`.
- Body copy measure 46–56ch; headings 20–32ch. `text-wrap: pretty` on all prose.
- Sibling groups use flex/grid + `gap`, never margins between items.
- Page wrapper: `min-height:100vh; overflow-x: clip` (clip, not hidden — hidden breaks the sticky header while still letting the hero collage bleed).

### Motion
| Interaction | Timing |
|---|---|
| Button hover (lift / invert) | `transform`/`background-color` `120ms steps(2)` — stepped, mechanical |
| Button hover (colour) | `background 200ms ease` |
| Service card hover | `transform 220ms cubic-bezier(0.33,0.1,0.25,1)`, `box-shadow 220ms ease` |
| Accent / ground crossfade | `2600ms` / `3400ms cubic-bezier(0.4,0,0.2,1)` |
| Scroll reveals | `animation-timeline: view()`, `animation-range: entry 10% entry 90%` |
| Parallax | `animation-timeline: view()`, `animation-range: entry 0% exit 100%`, ±52px / ±90px / −40px..40px variants |
| Scrap deal-in | `220ms cubic-bezier(0.3,1.3,0.5,1)`, 60ms stagger |
| Language tile reveal | shutter `300ms cubic-bezier(0.3,1,0.4,1)`, copy staggered 90ms / 140ms |
| Sampler swap | `780ms` projector treatment (below) |
| Opening sequence | scroll-driven, no fixed duration — see §0 |
| Chrome reveal after opening | `opacity`/`transform` `420ms ease` |
| Marquee | `34s linear infinite`, pauses on hover |

Everything is gated behind `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`; the cursor bails out entirely in JS, and the opening sequence collapses to a single static frame.

---

## Screens / Views

Single page, sections in order.

### 0. Opening sequence (`.nkhero-stage`, id `#top`)

**This section is client-supplied and must be reproduced verbatim.** It arrived as its own scoped stylesheet + markup + script and was integrated as-is. Do not restyle it, retime it, or fold it into the site's token system — it is intentionally its own visual world, and the site proper begins immediately after its closing tag.

**Structure.** A `320vh` tall `<section class="nkhero-stage">` (`270vh` under 900px) containing one `position:sticky; top:0; height:100vh` `.nkhero-frame`. Everything inside is absolutely positioned within that frame. The tall parent is the scroll runway; the sticky child is the stage.

**Drive.** A scroll listener (rAF-throttled, `passive`) computes `progress = clamp(-rect.top / (offsetHeight - innerHeight))` and writes six normalised custom properties onto the stage element. All visual state is `calc()` off those properties — there are no keyframes.

| Property | Formula | Range |
|---|---|---|
| `--nkhero-opening` | `ease(progress / 0.29)` | 0–0.29 |
| `--nkhero-resolve` | `ease((progress - 0.19) / 0.34)` | 0.19–0.53 |
| `--nkhero-signal` | `clamp(1 - abs(progress - 0.54) / 0.095)` | peaks at 0.54 |
| `--nkhero-handoff` | `ease((progress - 0.6) / 0.25)` | 0.6–0.85 |
| `--nkhero-exit` | `ease((progress - 0.86) / 0.14)` | 0.86–1 |
| `--nkhero-band` | `0.002 + opening * (1 - handoff) * 0.31 + handoff * 0.048` | — |

`ease(v) = 1 - (1 - v)³`, `clamp` to 0–1. It also sets `--nkhero-image-shift: calc((1 - progress) * 8 - 4)%` and mirrors state onto `data-nkhero-progress` / `data-nkhero-complete` for anything downstream.

**Beats.** Ink screen with two mono corner notes ("A story studio / London / Dubai", "Scroll to cross the line ↓") that fade as `opening` rises. A 2px coral band across the centre grows to 31% of viewport height, revealing an image inside it (`nkhero-band.webp`, `width:108%`, `saturate(0.85) contrast(1.08)`, slow horizontal drift). Two ink occlusion panels close in from both edges to leave a central aperture, inside which the ring-and-slot origin mark resolves and scales `0.83 → 1`. Four 4px signal lines (coral / cream / yellow / blue at −12, −4, +4, +12px) flash through at the midpoint. "STORIES" / "ENDURE." slide in from opposite sides in Arial 950 at `clamp(5rem,16.7vw,18rem)`, `line-height:0.71`, `-0.09em` — cream over blue. At `handoff` the title clears and the resolution line ("Nikko is a story studio." / "Market for memorability.") plus a mono source line rise into place. `exit` fades the mark and copy out as the site arrives.

**Its own palette — deliberately not the site's.** `--nkhero-ink #111111`, `--nkhero-paper #f1eee5`, `--nkhero-cream #f8f4e8`, `--nkhero-coral #f0584b`, `--nkhero-yellow #f4c62f`, `--nkhero-blue #333cdf`; Helvetica/Arial, not Archivo. These are close to but not identical to the site tokens. **Keep them as supplied** unless the client says otherwise — the seam is intentional and re-tokenising it would be a redesign. (If you are asked to reconcile it later, it is a six-value change confined to this block.)

**Reduced motion.** The stage collapses to `100vh`, the mark / title / resolution are forced to `opacity:1` and the band to a 5px strip — one static frame, no runway.

**Chrome gate.** The header, grain overlay, scroll-progress rail and cursor layer each carry `data-nk-chrome` and are `visibility:hidden; opacity:0; transform:translateY(-10px)` by default. The script sets `data-nkhero-live="1"` on the page shell once `exit > 0.02` (i.e. at ~86% of the runway), which reveals them with a `420ms` fade. **Default-hidden means a JS failure would leave the site with no navigation** — the source has an early-return fail-safe that sets the attribute to `1` if the stage can't be found. Preserve that, or invert the default so chrome is visible unless the sequence explicitly claims the screen. The header's natural flow position already lands exactly at the end of the runway, so the handoff is gapless without extra scroll maths.

### 1. Header (sticky)
Hidden during the opening sequence — see the chrome gate in §0.
`position: sticky; top: 0; z-index: 50`, `backdrop-filter: blur(9px)`, background = live veil colour. Inner row `max-width:1280px; padding:16px 40px; display:flex; gap:16px`.
- **Logo lockup** (left, links `#top` — the top of the opening sequence): a 44×30 ink oval (`border-radius:50%; overflow:hidden`) containing a ground-coloured stripe at `top:16px; height:5px` and an accent stripe at `top:21px; height:3px` — this pair is "the slot". Beside it, "NIKKO" in Archivo Black 22px, `-0.05em`, uppercase.
- **Nav** (`margin-left:auto`, gap 30px): mono 11px uppercase links — "The work" (`#work`), "Put us to work" (`#services`), "Founder" (`#founder`) — colour `#4A463C`, hover `#EE5439`.
- **Mode dial**: `1.5px solid #111110` button, mono 10px, showing `Analogue`/`Digital` plus a dimmed `Auto` when unpinned, with a blinking 8px accent dot (`nk-blink 1.6s steps(1) infinite`). Hover inverts to ink/paper. Click pins the mode (`localStorage` key `nk-mode`). `title` explains state.
- **CTA** "Pitch your project": ink pill, `padding:14px 26px`, `border-radius:50%`, accent slot bar `bottom:7px; height:3px` inside it; hover cobalt + `translateY(-2px)`.

### 2. Hero (`#top`)
`max-width:1280px; padding:48px 40px 40px`, flex column.
- **Collage** (decorative, `position:absolute; right:clamp(-140px,-7vw,-60px); top:24px; width:min(46vw,530px); z-index:0; transform:rotate(2.6deg)`, hovering it settles to `rotate(1.2deg) translateX(-34px)` over `420ms`). It's double-framed: an outer paper card `padding:14px 14px 0`, `2px solid #111110`, arch radius `50% 50% 10px 10px / 26% 26% 10px 10px`, containing an identically-radiused framed image. A 16px turquoise perforated strip sits along the image's bottom edge. Parallax `nk-para-slow`. In analogue mode the image gains scanlines (`repeating-linear-gradient` 1px/3px at 0.30 alpha, flickering `nk-flick 2.6s`), a slow scan sweep (`nk-scan 5.2s`), a cobalt `screen` tint at 0.09, and an occasional horizontal coral tear (`nk-tear 9s steps(2)`).
- **Ticket bar**: `display:inline-flex; gap:2px; border:2px solid #111110; background:#111110; box-shadow:8px 8px 0 #00B2A9`. Three mono 11px uppercase cells, `padding:10px 16px` — "London" and "UAE" on paper with `#4A463C` text, "Creative design studio" filled with the live accent. Paper cells invert to ink/paper on hover in `120ms steps(2)`. Clicking any cell registers a "mark" (see State).
- **H1**: Archivo Black `clamp(32px,4.6vw,68px)`, line-height `0.94`, `-0.035em`, max-width `24ch`, entrance `nk-rise 1.1s`. In analogue mode it carries chromatic misregistration: `text-shadow: 1.4px 0 0 rgba(0,178,169,0.42), -1.4px 0 0 rgba(238,84,57,0.26)`.
  Copy: *"Like family albums, plastic straws on the ocean floor, and a Nokia 3310 thrown from a fast-moving car, stories endure."*
- **Body + CTA row**: lead paragraph `clamp(17px,1.4vw,20px)`, a muted second paragraph, and a mono ink pill CTA (`padding:20px 38px`, accent slot at `bottom:9px; height:4px`, hover cobalt). Entrances staggered 0 / 0.15s / 0.28s.
- The heading, paragraph and ticket all cap their width at `calc(100% + 56px - min(38vw,430px))` so they never run under the collage.

### 3. Marquee
Full-bleed band, `overflow:hidden; padding:22px 0; margin-top:40px`. Two duplicated spans in a `width:max-content` flex row, `nk-marquee 34s linear infinite` (`translateX(0)` → `-50%`), paused on hover. Mono uppercase `clamp(13px,1.5vw,17px)`, `0.2em`:
"A creative story studio ✦ London ✦ UAE ✦ Know your customer. Market for memorability. Become the go-to ✦"

### 4. Attention section (`#work`)
- **H2** `clamp(30px,4.6vw,72px)`, max-width `32ch`: *"From campfires to comment sections, dinner tables to DMs…"*. Four hover targets — `campfires`, `comment sections`, `dinner tables`, `DMs` — each `display:inline-block` with `border-bottom: 3px dotted rgba(238,84,57,0.55)`.
- **Hover scraps**: hovering a word deals 3 image scraps from a `height:0` absolutely-positioned lane hanging off that word (`left:26%; top:0.72em; width:min(52vw,360px); z-index:30`). Cards are 50% of that lane's width, rotated `-8°`, `-1°`, `+8°`, `border-radius:16px`, `box-shadow:0 16px 34px rgba(17,17,16,0.24)`, staggered in at 0 / 60 / 120ms with `nk-deal` (`translate(-42px,26px) rotate(-16deg) scale(0.6)` → rest, `220ms cubic-bezier(0.3,1.3,0.5,1)`). `aria-hidden`, `pointer-events:none`. Each word deals a different trio from the asset set.
- **Two-column body** (image column `order:1`, text `order:2`): an animated counter — Archivo Black `clamp(56px,8vw,116px)` in coral counting to **80** ("times a day, on average") — with surrounding copy, plus an arch-cropped `mouth-plane.png` with reverse parallax and the mono caption "Fig. 01 — attention, mid-flight".
- **Pull-quote row**: coral Newsreader italic `clamp(26px,3vw,44px)` ("stickier than warm bubble gum…") beside an Archivo Black h3 and a paragraph whose three key phrases are highlighted with `box-shadow: inset 0 -0.42em 0 rgba(255,212,0,0.55)`.

### 5. Language section (turquoise)
Full-bleed `#00B2A9`, `padding: clamp(70px,8vw,120px) 0 clamp(60px,7vw,100px)`, overlaid with an elliptical dot field (`radial-gradient(ellipse 13px 21px at 50% 50%, rgba(17,17,16,0.10) 0 96%, transparent 97%)`, `background-size:32px 44px`). Bottom edge is perforated with a mask of ground-coloured half-circles (`24px`-ish tile, 20×22px mask).
- **H2** *"Where culture and commerce rub noses like Bedouins"* beside the paper-coloured Newsreader italic *"Khashmak, khashmak."* and its Arabic setting `خشمك. خشمك.` in Noto Kufi 700 ink.
- **Paper panel** (needed for legibility on the saturated ground): ground background, `2px solid #111110`, radius `26px 26px 8px 8px`, containing the countries copy with an inline animated counter (**12+**) set in Archivo Black at `1.5em`.
- **Three arch tiles** (`aspect-ratio:3/4`, `2px solid #111110`, radius `50% 50% 6px 6px / 30% 30% 6px 6px`), each with an independent parallax speed (slow / fast / reverse). Hover or tap a tile and a paper shutter wipes up over it (`nk-shutter 300ms`), each with a different ink pattern (corner dots / 45° crosshatch / 60° hatch), carrying a mono "Step 01–03" label and an Archivo Black line:
  1. Gather your people — the room, the history, the in-jokes.
  2. Find the story that sticks, in whichever language it lands.
  3. Make the brand the one they bring up unprompted.

### 6. Founder (`#founder`)
Portrait (`nadia-portrait.png`, arch radius, `nk-para-slow` parallax, hover `translateY(-4px)` in `140ms steps(2)`, click registers a mark) with a mono caption "Nadia Amer — founder, creative director". Text column: mono eyebrow "Meet the founder", Archivo Black h2 `clamp(26px,3.2vw,50px)`, two paragraphs (second muted), ink pill CTA.

### 7. Put us to work (`#services`)
Header row: Archivo Black uppercase `clamp(34px,5.4vw,88px)` "Put us to work" + mono "Two ways in". Then two cards stacked with `gap: clamp(20px,2.6vw,34px)`.

Each card: `border:1.5px solid rgba(17,17,16,0.22)`, `border-radius:34px 34px 8px 8px`, ground background, `display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))`, hover `translateY(-4px)` + `box-shadow:0 0 0 2px #111110`.
- **Header row** (`grid-column:1/-1`, bottom rule `1.5px solid rgba(17,17,16,0.18)`): giant numeral in the card colour (01 coral, 02 cobalt), uppercase Archivo Black title, and a pill stamp filled with the card colour ("Limited drop" / "Scoped, not retained").
- **Column A**: arch-cropped image + mono figure caption.
- **Column B**: lead + two body paragraphs + a coral Newsreader italic kicker (22px).
- **Column C**: separated by a `1.5px dashed rgba(17,17,16,0.28)` vertical rule inset 18px; "Investment" eyebrow, price in Archivo Black `clamp(22px,2vw,30px)`, price note, ink pill CTA, mono serial.

| | 01 | 02 |
|---|---|---|
| Title | Show&Tell — workshops & talks | Dream&Do — projects |
| Stamp | Limited drop | Scoped, not retained |
| Kicker | No reruns. No shop. | Payment plans available. |
| Price | From £35 | From £5,000+ |
| CTA | Grab a seat | Pitch your project |
| Serial | SER. NKO—01—STL | SER. NKO—02—DDO |
| Fig. | Fig. 03 — the room, mid-session | Fig. 04 — what leaves the studio |

(Full body copy is in the source under `services` in `renderVals()`.)

### 8. Work sampler + testimonial
- **Sampler**: a mono status line with a blinking coral dot — "Pulling one at random — no. NN of far too many" — a yellow pill tag, and one large Archivo 600 line (`clamp(21px,2.4vw,34px)`) that swaps every **3800ms** or on click ("Pull another →", coral underline). Eight fragments cycle, so it reads as a sample of many, not a list.
  **Projector treatment** (all keyed to an alternating a/b animation name so consecutive swaps re-trigger): the line sits in an `overflow:hidden` gate with `min-height:3.6em`. On swap it pulls up from `translateY(118%) skewY(1.6deg)`, overshoots to `-7%`, settles with two small judders (`780ms cubic-bezier(0.36,0.02,0.2,1)`); the gate flickers in `steps(8)`; a warm yellow/coral radial "burn" fades off in `steps(5)`; a permanent faint scanline overlay sits on top at 0.5 opacity; between swaps the text weaves ±0.6px on a 2.4s `steps(3)` loop.
- Coral Newsreader italic line beneath, plus an arch-cropped artefact image with the caption "12+ countries · four continents".
- **Testimonial**: mono eyebrow "And then clients come back and say things like this…", then a Newsreader italic pull-quote `clamp(30px,4.2vw,64px)` beside the longer client quote (two paragraphs) and a mono attribution — "— Maddi Cook, Founder of Maddi Cook Coaching" (name in ink, role in `#4A463C`).

### 9. Joyride / word swap
- **H2** `clamp(26px,3.4vw,52px)` mixing Archivo Black with Newsreader italic `<em>`s: *"Leo Burnett calls them big ideas. Ogilvy calls it impact. Nikko calls it hotwiring your audience and taking their thoughts for a joyride."* — final `joyride` in coral italic.
- Left column: cobalt Newsreader italic "Because marketing should be joyful." + two paragraphs.
- Right column: **the word swap**. A full-width button showing the transliteration in Archivo Black `clamp(52px,7vw,110px)` (`Khara` coral → `Kaka` cobalt on tap, colour transition 320ms), the Arabic `خرا` in Noto Kufi below (empty for the Kaka state), a mono hint line preceded by a mini 26×18 logo oval whose lower stripe takes the word colour, and an explanatory note that changes with the word. Below: a cobalt mono link "Submit your project here ➺", hover coral.

### 10. Pitch / footer (`#pitch`)
Full-bleed `#111110` with the elliptical section lid, a perforated top edge (`radial-gradient` half-circles at `rgba(242,236,223,0.14)`, tile `24px 34px`), and a Levantine dot field (three `radial-gradient`s on a 24px tile: a 2px paper dot at 0.10, a 3.6px and a 1.6px coral dot at 0.30).
- **Left**: Archivo Black h2 `clamp(30px,4.2vw,64px)` "A messy kebab of an email, dripping with sauce" + two paper paragraphs.
- **Right**: newsletter capture — mono `#B5AC98` labels, paper inputs (`2px solid #F2ECDF`, `border-radius:3px`, 16px text) for First name and Email address, a paper pill submit "Get inside" (hover `#FFD400`) with the accent slot bar, and a 13px consent note.
- **Link block** (top rule `1.5px solid #4A463C`): footer logo lockup (inverted: ground oval, ink stripe, accent stripe) + the positioning paragraph, then three columns — About ("London-based 🇬🇧 / Lebanese bread 🫓"), Follow (Threads, Substack), Legal (Privacy Policy, Terms & Conditions). Link hover `#FFD400`.
- **Legal row**: teaser line about the relaunch of irnnadiaamer.com + "© Nikko Studio 2026" in mono.

---

## Interactions & Behaviour

### Opening sequence
See §0 — it is the page's entry animation and the reason the header starts hidden. There is no timed splash overlay: the earlier one-per-session wake animation was removed when this block was integrated, so there is no `sessionStorage` guard and nothing fires on load. The sequence is entirely scroll-position-driven and fully re-playable by scrolling back up.

### Analogue / digital mode
Unpinned, it drifts with scroll depth: **analogue** above 52% of the scrollable height, **digital** below (rAF-throttled scroll listener). Clicking the dial pins the choice to `localStorage['nk-mode']`. Differences are deliberately subtle:
- **Analogue** — full-page multiply grain overlay at 0.13 opacity (two `repeating-linear-gradient`s, 1px/3px and 1px/4px), hero scanlines + scan sweep + tear, warm image filter `saturate(0.94) contrast(0.97) sepia(0.09)`, chromatic misregistration on the h1, warm cursor pool.
- **Digital** — no grain, crisper filter `saturate(1.06) contrast(1.04)`, no misregistration, cool cursor pool.

### Cursor (fine pointers only, motion allowed)
A wide aperture-shaped pool — 340×150px, `border-radius:50%`, `filter:blur(26px)`, `position:fixed`, `z-index:95` — trailing the pointer with a 0.12 lerp per frame. Analogue: `radial-gradient(closest-side, rgba(255,212,0,0.22), rgba(238,84,57,0.10) 58%, transparent)`, `mix-blend-mode:multiply`. Digital: `rgba(43,69,240,0.16) → rgba(0,178,169,0.08)`, `screen`. Every 110ms of movement it drops a faint **slot mark** (16–26px × 2px, rotated ±2.5°, the logo's slot — not a dot) that fades and contracts over 820ms (`nk-residue`). Idle 900ms → pool drops to 0.45 opacity; pointer leaves the document → 0.

### Other
- **Counters** animate once on entering the viewport (`IntersectionObserver`, `threshold: 0.4`, unobserved after firing): 1100ms, cubic ease-out. Targets: phone 80, countries 12, members 215000.
- **Scroll progress**: a fixed 3px rail down the left edge (`rgba(17,17,16,0.12)`) with an accent fill scaled by `animation-timeline: scroll(root)`.
- **Marks**: clicking the ticket cells, the portrait, the word swap or a service CTA records a labelled mark (deduped, capped at 14) into `localStorage['nk-marks']`. The state and `marks`/`hasMarks` values exist but are **not currently rendered** — treat this as a hook for a future "residue" margin rail, or drop it if you don't want it. Do not ship a dead localStorage write without the UI.
- **Anchors**: `html { scroll-behavior: smooth }`; all CTAs point to `#pitch`.

## State Management
```
accent: 0..2                       // cycling accent index, interval = cycleSeconds
mode: 'analogue' | 'digital' | null   // null = auto; persisted to localStorage 'nk-mode'
auto: 'analogue' | 'digital'          // scroll-derived when unpinned
// no wake/splash state — the opening sequence is scroll-driven and stateless in React;
// it writes custom properties straight to the DOM and never triggers a re-render
frag: 0..7                         // sampler index, 3800ms interval, reset on manual pull
hoverWord: 'fire'|'talk'|'table'|'dms'|null
hoverTile: 'a'|'b'|'c'|null        // language-section tiles
kaka: boolean                      // word swap
phone / countries / members: number   // animated counters
marks: {label, tone}[]             // persisted, currently unrendered
```
Config knobs exposed in the prototype (worth keeping as component props / theme config): `accentCycle` (boolean, default true), `cycleSeconds` (4–24, default 12), `tintDepth` (0–1.6, default 1).

No data fetching — all copy is static. The newsletter form is **not wired**: inputs have no state or submit handler. Hook it to the real ESP and add validation + success/error states.

## Accessibility notes
- Decorative layers (grain, cursor, patterns, scraps, perforations, and every layer inside the opening sequence) are `aria-hidden="true"` and `pointer-events:none`.
- Focus ring: `:focus-visible { outline: 3px solid #EE5439; outline-offset: 3px }`.
- `::selection { background:#FFD400; color:#111110 }`.
- Muted text stays above 4.5:1 — `#4A463C` on paper, `#B5AC98` on ink. Never reuse `#B5AC98` on light backgrounds.
- Language-section body copy sits on a paper panel because ink-on-turquoise body text is not comfortable at 16px.
- Hover-only content (scraps, language tiles) is decorative or duplicated in the tile's own copy; the tiles also respond to click for touch. The mode dial carries `aria-pressed` and a descriptive `title`.
- Prototype gap to fix in production: the newsletter form needs a real `<form>`, and the scrap-dealing words should be keyboard-focusable or the imagery treated as purely decorative (it currently is).

## Assets
In `assets/` — working collage and archive imagery, referenced with relative paths from the design file:
`collage-hero.png`, `collage-artefacts.png`, `mouth-plane.png`, `nadia-portrait.png`, `nadia-child.png`, `workshop-proof.png`, `journal-crt.png`, `journal-firstdraft.png`, `chips-pattern.png`, `logo-cobalt.png`.

`nkhero-band.webp` (1280×720) belongs to the opening sequence — it is the image revealed inside the growing centre band. It arrived base64-inlined in the supplied file and was extracted to a real asset; keep it as a file rather than re-inlining it.
These are placeholders/working images from the studio's archive — expect final art to be swapped in. Serve responsive sizes (AVIF/WebP) in production; several are used at `aspect-ratio` crops with `object-fit: cover`.

The logo is drawn in CSS, not an image: an ink oval (`border-radius:50%`) with two absolutely-positioned stripes. Keep it as markup so the accent stripe can animate.

**No favicon exists yet — generate one from the logo mark.** It's trivially reproducible as SVG since the mark is two rects in an ellipse. Spec: square viewBox, ink `#111110` ellipse filling the frame with ~8% padding, a paper `#F2ECDF` stripe across the middle third, and a `#FFD400` stripe directly beneath it at ~60% of the paper stripe's height — the same proportions as the 44×30 header oval (stripes at `top:16px/height:5px` and `top:21px/height:3px`). Ship `favicon.svg` plus PNG fallbacks at 32 and 180 (apple-touch), and a `theme-color` of `#F2ECDF`. At 16px the two stripes merge, so thicken them ~1.5× in a small-size variant rather than shipping one file for all sizes.

## Files
| File | What it is |
|---|---|
| `Nikko Homepage.dc.html` | The homepage design source — template + logic class |
| `Nikko Homepage (standalone).html` | Self-contained build: open in any browser, no server, images inlined (~19 MB) |
| `assets/` | Imagery referenced by the design source |
| `CLAUDE_CODE_PROMPT.md` | Ready-to-paste prompt for Claude Code, in two variants (repo / uploaded files) |

Open the standalone file first and scroll slowly — the opening sequence, accent cycle, mode drift and sampler are all scroll- or time-driven and none of them read from a screenshot.
