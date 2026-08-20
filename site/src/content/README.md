# The content directory

**This directory is yours.** Everything else in `site/` belongs to the engineer.

Each file here holds the words for one part of the site. Edit the text between
the quotes; leave the labels on the left alone. Every file is checked when the
site builds, so a typo in a field name fails the build with the file and field
named — it cannot reach the live site. Cloudflare keeps the last good version
up while a broken build is being fixed.

## How to change something

1. Open the file on github.com
2. Click the pencil icon
3. Change the words
4. "Commit changes"
5. About ninety seconds later it is live

## Images

Put images in `site/src/assets/images/`, then reference them by filename here.

- Upload the **largest version you have** — never pre-shrink. The build makes
  the small versions; it cannot invent detail.
- Always fill in `alt`. If the image is purely decorative, leave it as `""`.
- Filenames: lowercase, hyphens, descriptive. `nadia-portrait.png`, not
  `IMG_4821.PNG`.

## What is not in here

Colours, type sizes, spacing and animation timings are design tokens, not
content — they live in `site/src/styles/tokens.css` and changing them by hand
would break the system. See `docs/04-content-architecture.md`.
