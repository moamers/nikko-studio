# Prompt for Claude Code

Two variants below. Use **A** if you push this folder to a GitHub repo; use **B** if you're dropping the files into a local project/upload. Everything after the `---` line is the prompt — paste it as-is and edit the bracketed bits.

---

## A — When the design lives in a GitHub repo

> Replace `<REPO_URL>`, `<PATH>` and the stack line. If the design folder is committed into the same repo you're building in, drop the "clone" sentence and just give the path.

---

I'm implementing a marketing homepage from a design handoff.

**Design source:** `<REPO_URL>` (branch `main`), folder `<PATH>/design_handoff_nikko_homepage/`.
If it's a separate repo, clone it somewhere temporary — don't add it as a dependency.

Start by reading, in this order:
1. `design_handoff_nikko_homepage/README.md` — the full spec: tokens, section-by-section layout, interactions, state, accessibility notes.
2. `design_handoff_nikko_homepage/Nikko Homepage.dc.html` — the design source. Read the template as JSX-equivalent markup: `{{ x }}` is a value returned from the logic class's `renderVals()`, `<sc-if value="{{ x }}">` is a conditional, `<sc-for list="{{ xs }}" as="x">` is a list, and `style-hover="…"` is a `:hover` rule. The logic class at the bottom is component state.
3. `design_handoff_nikko_homepage/Nikko Homepage (standalone).html` — a self-contained build you can open in a browser to see the motion. Don't edit it; it's a reference.

**Important:** these HTML files are a *design reference*, not production code. Do not copy the runtime, and do not keep the inline styles — the prototype uses them only because its authoring environment required it. Rebuild the design in this codebase using its existing stack and conventions.

**Target stack:** `<e.g. Next.js App Router + Tailwind, TypeScript, existing components in src/components>`. Match the patterns already in the repo — file layout, styling approach, component granularity, lint rules.

**What to build:** one route, the homepage, with the ten sections described in the README, in order. Fidelity is high — colours, type scale, spacing, radii and motion timings in the README are exact and should be reproduced, not approximated.

Please:
- Extract the design tokens (colour, type, radius, motion) into whatever the codebase already uses for theming — Tailwind config, CSS custom properties, a theme file — rather than hardcoding hexes across components.
- Copy the images from `design_handoff_nikko_homepage/assets/` into the project's asset pipeline and serve them responsively. They're placeholders; keep swapping them easy.
- Implement the accent-cycle, analogue/digital mode, wake splash, cursor, scroll reveals and the sampler's projector treatment as described. Respect `prefers-reduced-motion` everywhere — the README says which behaviours must bail out entirely.
- Use `animation-timeline: view()` / `scroll(root)` where the source does, but add a graceful fallback (or an IntersectionObserver path) for browsers without scroll-driven animations.
- Keep the logo as CSS markup, not an image — its lower stripe animates with the accent.
- Generate the favicon set from the logo mark per the Assets section of the README (none exists yet). Include the small-size variant with thickened stripes.
- Wire the newsletter form to `<your ESP / API route>` with real validation and success/error states. The prototype's form is inert.
- The `marks` localStorage feature in the source is a dead hook with no UI — leave it out unless I ask for it.

Before you write code, give me a short plan: the component breakdown, where tokens will live, and anything in the spec that conflicts with this codebase's conventions. Then implement section by section so I can review as you go.

---

## B — When you're uploading / dropping the files in

> Same prompt, minus the repo bits. Put the `design_handoff_nikko_homepage` folder somewhere in the project (or in the working directory) before you start.

---

I'm implementing a marketing homepage from a design handoff. The files are in `./design_handoff_nikko_homepage/` in this directory.

Read them in this order:
1. `README.md` — the full spec: tokens, section-by-section layout, interactions, state, accessibility notes.
2. `Nikko Homepage.dc.html` — the design source. Read the template as JSX-equivalent markup: `{{ x }}` is a value returned from the logic class's `renderVals()`, `<sc-if value="{{ x }}">` is a conditional, `<sc-for list="{{ xs }}" as="x">` is a list, and `style-hover="…"` is a `:hover` rule. The logic class at the bottom is component state.
3. `Nikko Homepage (standalone).html` — a self-contained build; open it in a browser to see the motion. Don't edit it.

**Important:** these HTML files are a *design reference*, not production code. Do not copy the runtime, and do not keep the inline styles — the prototype uses them only because its authoring environment required it. Rebuild the design properly.

**Target stack:** `<e.g. Astro + vanilla CSS / React + Tailwind / plain HTML+CSS, no framework>`. `<If there's existing code: match its conventions. If this is a fresh project: pick the simplest stack that supports the motion work — it's a static marketing page — and tell me what you chose and why before scaffolding.>`

**What to build:** one page, the ten sections described in the README, in order. Fidelity is high — colours, type scale, spacing, radii and motion timings in the README are exact and should be reproduced, not approximated.

Please:
- Put the design tokens (colour, type, radius, motion) in one place — CSS custom properties or a theme file — not hardcoded across the markup.
- Move `assets/` into the project's asset directory and serve the images responsively (AVIF/WebP + sizes). They're placeholders; keep swapping them easy.
- Implement the accent-cycle, analogue/digital mode, wake splash, cursor, scroll reveals and the sampler's projector treatment as described. Respect `prefers-reduced-motion` everywhere — the README says which behaviours must bail out entirely.
- Use `animation-timeline: view()` / `scroll(root)` where the source does, but add a graceful fallback (or an IntersectionObserver path) for browsers without scroll-driven animations.
- Keep the logo as CSS markup, not an image — its lower stripe animates with the accent.
- Generate the favicon set from the logo mark per the Assets section of the README (none exists yet). Include the small-size variant with thickened stripes.
- Wire the newsletter form to `<your ESP / endpoint>` with real validation and success/error states. The prototype's form is inert.
- The `marks` localStorage feature in the source is a dead hook with no UI — leave it out unless I ask for it.
- Check it at 1440, 1024, 768 and 390 wide. The layout is flex/grid with `flex-wrap` throughout, so most of it should hold, but the hero collage, the ticket bar and the three-up service card grid need a look on small screens.

Before you write code, give me a short plan: the component/file breakdown and where tokens will live. Then implement section by section so I can review as you go.

---

## Useful follow-ups once it's running

- "Compare your build side by side with `Nikko Homepage (standalone).html` at 1440 wide and list every visual difference you can find, then fix them."
- "The motion timings drifted — recheck every duration and easing against the Motion table in the README."
- "Audit the page: keyboard focus order, contrast against the values in the README's accessibility notes, and reduced-motion behaviour."
