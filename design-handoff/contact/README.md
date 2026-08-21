# Nikko — Contact / project-enquiry page (design handoff)

| File | What it is |
| --- | --- |
| `CLAUDE_CODE_PROMPT.md` | Paste this into Claude Code as the build brief. |
| `Nikko Contact (standalone).html` | The approved design, fully interactive, offline. Source of truth. |
| `Nikko Contact.dc.html` + `support.js` | Authored design file — readable markup and logic, for reference. |

Open the standalone file first and fill the form in (including a deliberately empty submit) to see
selection mechanics, validation, timing picker, draft restore and the receipt state.

Decisions taken since the original prototype: Light/Split/Dark dropped (light only), native selects
and the native month input replaced with chip and month-grid controls, `+ / ×` icons replaced with a
circle dot (single select) and punched square (multi select), cut corner redrawn as a true 18px
diagonal, selection colour limited to cobalt (single) and yellow (multi), and the page now inherits
the homepage header, footer, newsletter block, accent cycle and analogue/digital control.
