// @ts-check
import { defineConfig } from 'astro/config';

// Static output — Cloudflare Pages serves the `dist/` directory directly.
// No adapter is needed while every route is prerendered (docs/03-tech-stack.md).
export default defineConfig({
  site: 'https://nikkostudio.co',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // Keeps `/about` rather than `/about/index.html` in the URL bar.
    format: 'directory',
  },
  image: {
    // astro:assets -> AVIF/WebP with responsive srcset (docs/08-performance.md).
    responsiveStyles: true,
    layout: 'constrained',
  },
  devToolbar: { enabled: false },
});
