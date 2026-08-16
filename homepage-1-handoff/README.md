# Handoff: Nikko Studio — Homepage

## Overview
Marketing homepage for Nikko Studio, a creative story studio (London / UAE). One long scrolling page: hero, "how stories travel" section, a turquoise language section, founder, services ("Put us to work"), a work sampler + testimonial, a newsletter/pitch footer on black. The page has a distinct living quality: an accent colour cycles through the whole page (logo, buttons, background tint), an analogue/digital mode drifts as you scroll, a projector-style sampler swaps case-study lines, and hovering key words in a heading deals out a fan of image scraps.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, Astro, etc.) using its established patterns, component library and styling approach. If no environment exists yet, choose the most appropriate framework and implement the designs there.

Note on the source format: the design was authored as a "Design Component" — a single HTML file with an inline template and a small logic class. Treat the template as JSX-equivalent markup and the logic class as component state; do not try to port the runtime itself.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, motion timings and copy. Recreate pixel-accurately using the codebase's libraries. All values below are exact.

---

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| Ink | `#111110` | All text, borders, dark sections |
| Paper | `#F2ECDF` | Base page ground, text on dark |
| Muted ink | `#4A463C` | Secondary text on paper |
| Muted paper | `#B5AC98` | Secondary text on ink (8.4:1) — never on paper |
| Coral | `#EE5439` | Punctuation accent, italic pull-quotes, focus ring |
| Cobalt | `#2B45F0` | Structure accent, button hover |
| Horizon yellow | `#FFD400` | Accent state 1, selection highlight |
| Turquoise (Levantine) | `#00B2A9` | Language section surface; scrap shadow uses `rgba(13,94,90,0.42)` |

**Accent cycle.** Three accent states rotate on a timer (default 12s hold, 2.6s crossfade):
1. Horizon `#FFD400` — ground tint target `#F7EED0`
2. Last light `#EE5439` — ground tint target `#F9E9DF`
3. Offshore `#2B45F0` — ground tint target `#EAEDF8`

The **page background**, the **logo's slot stripe**, the **slot inside every dark button**, and the **header veil** all read from the same active accent, so the whole page shifts together. Ground colour = base paper `rgb(242,236,223)` lerped toward the state's ground target by a `tintDepth` factor (default 1.0). Header veil = same rgb at 0.74 alpha with `backdrop-filter: blur(9px)`. Background transition `3400ms cubic-bezier(0.4,0,0.2,1)`; accent transition `2600ms` same easing.

On-accent text colour: ink `#111110` on yellow, paper `#F2ECDF` on coral/cobalt.

### Typography
- **Display**: Archivo Black — all h1/h2/h3, big numerals. Uppercase for section titles and card titles; letter-spacing `-0.03em` to `-0.05em`; line-height 0.78–1.0.
- **Body**: Archivo 400/600 — `clamp(16px,1.4vw,19px)`, line-height 1.55.
- **Mono**: DM Mono 400/500 — all metadata, labels, serials, eyebrows. 9.5–12px, `letter-spacing: 0.12em–0.2em`, uppercase.
- **Editorial**: Newsreader italic — pull-quotes, the "khashmak" line, closing italic lines. `clamp(19px,1.9vw,26px)` up to `clamp(30px,4.2vw,64px)`.
- **Arabic**: Noto Kufi Arabic 700, line-height 1.5, `dir="rtl" lang="ar"`. Never set Arabic in the Latin display face.

Google Fonts: `Archivo:ital,wght@0,400..700;1,400..600`, `Archivo+Black`, `DM+Mono:wght@400;500`, `Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500`, `Noto+Kufi+Arabic:wght@400;700`.

### Shape (the "R2" rule)
Radius is **0 or 50%** — never a plain rounded corner. Permitted forms:
- **Arch / lid**: `border-radius: 50% 50% 8px 8px / 26% 26% 8px 8px` (images, scraps, service cards use `34px 34px 8px 8px`)
- **Foot** (inverted arch): `border-radius: 8px 8px 50% 50% / 8px 8px 26% 26%`
- **Oval**: `border-radius: 50%` — all pill buttons are true 50%, never `999px`
- **Section lid**: dark sections open with `border-radius: 50% 50% 0 0 / clamp(40px,6vw,90px) clamp(40px,6vw,90px) 0 0`

### Spacing & layout
- Content column `max-width: 1280px`, gutter `40px`.
- Section rhythm `padding: clamp(80px,10vw,150px) 40px 0`; full-bleed dark sections `clamp(60px,7vw,110px) 0 clamp(70px,8vw,120px)`.
- Body copy measure 46–56ch; headings 20–32ch.
- Sibling groups use flex/grid + `gap`, never margins between items.

### Motion
| Interaction | Timing |
|---|---|
| Button hover (lift) | `transform 120ms steps(2)` — stepped, mechanical |
| Button hover (colour) | `background 200ms ease` |
| Card hover | `transform 220ms cubic-bezier(0.33,0.1,0.25,1)`, `box-shadow 220ms ease` |
| Accent / ground crossfade | 2600ms / 3400ms `cubic-bezier(0.4,0,0.2,1)` |
| Scroll reveals | `animation-timeline: view()`, `animation-range: entry 10% entry 90%` |
| Scrap deal-in | `240ms cubic-bezier(0.3,1.3,0.5,1)`, 55ms stagger |
| Sampler swap | 780ms, projector-style (see below) |
| Wake splash | 2600ms `cubic-bezier(0.72,0,0.16,1)` |

All motion is gated behind `prefers-reduced-motion: reduce` (wake and cursor bail out entirely).

---

## Screens / Views

Single page. Sections in order:

### 1. Header (sticky)
`position: sticky; top: 0; z-index: 50`, `backdrop-filter: blur(9px)`, background = live veil colour.
- **Logo lockup** (left): 44×30 ink oval, inside it a paper stripe at y=16 h=5 and an accent stripe at y=21 h=3 — this is the "slot". Next to it "NIKKO" in Archivo Black 22px, `-0.05em`. Clicking replays the wake animation.
- **Nav**: mono 11px uppercase links (Work, Language, Founder) in `#4A463C`, hover `#EE5439`.
- **Mode dial**: bordered button showing `Analogue`/`Digital` + `Auto` when unpinned, with a blinking accent dot. Click pins the mode (persisted to `localStorage`).
- **CTA**: ink pill, 50% radius, accent slot bar across the bottom inside it; hover cobalt + 2px lift.

### 2. Hero (`#top`)
`min-height: 82vh`, centred column.
- **Ticket bar** (max-width 540px): a 2px ink frame with 2px gaps between cells, `box-shadow: 8px 8px 0 #00B2A9`. Cell 1 (accent fill, weight 600): "Creative story studio / // Marketing for memorability". Cells 2–3 (paper fill, with a small map-pin glyph drawn from a bordered circle + stem): "London", "UAE". Hovering a cell inverts it to ink/paper. Clicking any cell registers a "mark".
- **H1**: `clamp(38px,6.6vw,104px)`, line-height 0.9, `-0.04em`. In analogue mode it carries a chromatic misregistration text-shadow: `1.4px 0 0 rgba(0,178,169,0.42), -1.4px 0 0 rgba(238,84,57,0.26)`.
- **Collage** (right, absolutely positioned, `width: min(38vw,430px)`, arch radius, parallax on scroll). In analogue mode it gains scanlines, a slow vertical scan sweep, a cobalt screen tint and an occasional horizontal tear ("bad aerial").
- Body paragraph + mono CTA pill.

### 3. Marquee
Full-bleed ink band, mono uppercase, scrolling `34s linear infinite`; pauses on hover. Content: "A creative story studio ✦ London ✦ UAE ✦ Know your customer. Market for memorability. Become the go-to ✦" (duplicated for seamless loop).

### 4. "From campfires…" (`#work`)
- **H2** `max-width: 32ch`: "From campfires to comment sections, dinner tables to DMs". Four words are hover targets (`campfires`, `comment sections`, `dinner tables`, `DMs`), each with a 3px dotted coral underline.
- **Hover decks**: hovering a word deals 3–4 image scraps into a **fixed lane directly below the heading** (a `position:relative; height:0` container immediately after the h2 — this is deliberate: anchoring the fan to the inline word caused it to land on the text or off-screen). Cards are `width: min(30%,138px)`, arch/foot/oval radii, rotated −12°…+13°, overlapping like a held hand, staggered deal-in. **No black frame** — the depth comes from `box-shadow: 4px 5px 0 rgba(13,94,90,0.42), 0 6px 16px rgba(17,17,16,0.10)`.
- Two-column body: animated counters (80 phone checks/day, 12 countries, 215,000 members) driven by IntersectionObserver, plus a parallax collage with a mono caption.

### 5. Language section (turquoise)
Full-bleed `#00B2A9` with a subtle elliptical dot pattern. Contains the khara/kaka word-swap interaction (tap to switch the Latin transliteration, Arabic set in Noto Kufi), a paper panel for body copy (needed for legibility on the saturated ground), and three arch-cropped archive images with independent parallax speeds.

### 6. Founder (`#founder`)
Portrait (arch radius, parallax, hover lift) + bio column with mono eyebrow, Archivo Black h2, two paragraphs, ink CTA pill.

### 7. Put us to work (`#services`)
Two service cards, each a soft-lid container: `border: 1.5px solid rgba(17,17,16,0.22)`, `border-radius: 34px 34px 8px 8px`, ground background, hover `translateY(-4px)` + `box-shadow: 0 0 0 2px #111110`.
Grid: `repeat(auto-fit, minmax(min(100%,340px),1fr))`.
- **Header row** (full width, bottom rule): giant numeral in the card's colour (01 coral, 02 cobalt), uppercase title, and a pill "stamp" ("Limited drop" / "Scoped, not retained").
- **Column A**: arch-cropped image + mono figure caption.
- **Column B**: lead + two body paragraphs + coral italic kicker.
- **Column C** (separated by a vertical dashed rule): "Investment", price in Archivo Black, price note, ink CTA pill, mono serial (`SER. NKO—01—STL`).

### 8. Work sampler + testimonial
- **Sampler**: a mono status line ("Pulling one at random — no. NN of far too many"), a yellow pill tag, and one large line of case-study copy that swaps every 3.8s (or on click of "Pull another →"). Eight fragments cycle, so it reads as a sample of many, not a list of five.
  **Projector treatment**: the line sits in an `overflow:hidden` gate. On swap it pulls up from `translateY(118%)` with a 1.6° skew, overshoots to −7%, settles with two small judders (780ms, `cubic-bezier(0.36,0.02,0.2,1)`); the gate flickers in `steps(8)`; a warm yellow/coral "burn" gradient fades off in `steps(5)`; a permanent faint scanline overlay sits on top; between swaps the text weaves ±0.6px on a 2.4s loop.
- **Testimonial**: two columns — a big Newsreader italic pull-quote and the longer client quote with a mono attribution.

### 9. Pitch / footer (`#pitch`)
Full-bleed `#111110` with the elliptical lid, a perforated top edge, and a Levantine dot pattern (`radial-gradient` triplet at 24px tile). Newsletter capture, three-column link block, and legal line — **all body text in paper `#F2ECDF`**, mono metadata in `#B5AC98`.

---

## Interactions & Behaviour

### Wake splash (once per session)
2600ms, skippable on any pointer/key press, replayable by clicking the logo.
1. **0–10%** — screen is ink; a single accent slot spans the full width (the logo scaled ×16, clipped to `inset(66.7% 0 24.4% 0)` so only its accent stripe shows).
2. **13%** — one flicker to 0.55 opacity.
3. **10–40%** — the clip opens to `inset(0)`: the full-bleed aperture appears.
4. **54–100%** — the whole logo shrinks and travels to its header position: `translate(calc(62px - 50vw), calc(37px - 50vh)) scale(0.191)`. The ink veil fades out from 52% to 88%, so the site is revealed behind the shrinking mark.
Skipped entirely under `prefers-reduced-motion`.

### Analogue / digital mode
Unpinned, it drifts with scroll: analogue above 52% depth, digital below. Clicking the dial pins the choice (localStorage `nk-mode`). Differences are deliberately subtle:
- **Analogue**: full-page multiply grain overlay at 0.13, hero scanlines + scan sweep + tear, warm image filter `saturate(0.94) contrast(0.97) sepia(0.09)`, chromatic misregistration on the h1, warm cursor pool.
- **Digital**: no grain, crisper image filter `saturate(1.06) contrast(1.04)`, no misregistration, cool cobalt cursor pool.

### Cursor (fine pointers only)
A wide aperture-shaped pool — 340×150px, `border-radius: 50%`, `filter: blur(26px)` — trailing the pointer with a 0.12 lerp. Analogue: warm `rgba(255,212,0,0.22)` → `rgba(238,84,57,0.10)`, `mix-blend-mode: multiply`. Digital: `rgba(43,69,240,0.16)` → `rgba(0,178,169,0.08)`, `screen`. Every 110ms it drops a faint 16–26px × 2px **slot mark** (the logo's slot, not a dot) that fades and contracts over 820ms. Idle for 900ms → pool drops to 0.45 opacity.

### Other
- Word swap (khara ⇄ kaka) on tap, with the Arabic and the explanatory note both changing.
- Counters animate once on entering the viewport.
- Scroll progress bar: 3px accent line down the left edge, driven by `animation-timeline: scroll(root)`.

## State Management
```
accent: 0..2          // cycling accent index, interval = cycleSeconds
mode: 'analogue'|'digital'|null   // null = auto; persisted
auto: 'analogue'|'digital'        // scroll-derived when unpinned
wake: boolean         // splash visible; sessionStorage guard
frag: 0..7            // sampler index, 3800ms interval
hoverWord: 'fire'|'talk'|'table'|'dms'|null
kaka: boolean         // word swap
phone/countries/members: number   // animated counters
```
Tweakable props: `accentCycle` (bool), `cycleSeconds` (4–24, default 12), `tintDepth` (0–1.6, default 1).

No data fetching — all copy is static.

## Accessibility notes
- Decorative layers (grain, cursor, patterns, scraps, wake) are `aria-hidden` and `pointer-events: none`.
- Focus ring: `3px solid #EE5439`, offset 3px.
- Muted text never goes below 4.5:1 — `#4A463C` on paper, `#B5AC98` on ink. Do not reuse `#B5AC98` on light backgrounds.
- The page wrapper uses `overflow-x: clip` (not `hidden`) so the hero collage can bleed without breaking the sticky header.

## Assets
In `assets/` — collage and archive imagery used throughout: `collage-hero.png`, `collage-artefacts.png`, `mouth-plane.png`, `nadia-portrait.png`, `nadia-child.png`, `workshop-proof.png`, `journal-crt.png`, `journal-firstdraft.png`, `chips-pattern.png`, `logo-cobalt.png`. These are placeholder/working images from the studio's archive — expect final art to be swapped in.

## Files
| File | What it is |
|---|---|
| `Nikko Homepage.dc.html` | The homepage design source (template + logic) |
| `Nikko Homepage (standalone).html` | Self-contained build — open in any browser, no server, fonts and images inlined |
| `Nikko Direction v2.dc.html` | The art-direction / design-system document: colour licences, shape rules, type scale, interaction grammar |
| `Nikko Direction v2 (standalone).html` | Self-contained build of the direction document |
| `assets/` | Imagery referenced by both files |

**Read the direction document first** — it defines the rules the homepage is an application of (notably: turquoise may only ever be a surface inside a picture, never a UI fill, rule, chip or link; and the radius rule above).
