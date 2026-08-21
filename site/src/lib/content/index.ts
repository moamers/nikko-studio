/**
 * The content API.
 *
 * Templates import from here and from nowhere else. They never touch
 * `astro:content` directly, and they never read `src/content/**` directly.
 * That single indirection is what makes swapping the content source — flat
 * files today, a CMS later — a change to `content.config.ts` and this folder,
 * with zero template edits. (P7, ADR-0002)
 *
 * Everything returned is typed from the Zod schemas, so a template that asks
 * for `hero.subhead` when the field is `subLead` fails to compile.
 */
export { getSiteSettings } from './settings';
export { resolveImage } from './images';
export { getContactFormOptions } from './contact';
export { getLegalPage } from './legal';
export {
  getHero,
  getMarquee,
  getAttention,
  getLanguage,
  getFounder,
  getServices,
  getSampler,
  getJoyride,
  getPitch,
} from './homepage';

export type { SiteSettings, NavItem, ModeDialCopy, FooterColumn } from './settings';
export type {
  Hero,
  Marquee,
  Attention,
  Language,
  Founder,
  Services,
  Service,
  Sampler,
  Testimonial,
  Joyride,
  Pitch,
  Cta,
  ContentImage,
  ContentFigure,
  Counter,
} from './homepage';
export type {
  ContactFormOptions,
  IntentOption,
  Option,
  TimingOptions,
} from './contact';
export type { LegalPage, LegalSlug } from './legal';
