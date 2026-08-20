import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

/**
 * The nine homepage sections, one accessor each.
 *
 * Every accessor throws rather than returning a partial object: a missing
 * content file is a build error, not a runtime degradation. The build failing
 * loudly — with the file named — is the safety net that makes it safe for a
 * non-technical editor to change these files directly.
 *
 * Templates import these from `../lib/content`, never from `astro:content`.
 * [P7, ADR-0002]
 */

export type Hero = CollectionEntry<'hero'>['data'];
export type Marquee = CollectionEntry<'marquee'>['data'];
export type Attention = CollectionEntry<'attention'>['data'];
export type Language = CollectionEntry<'language'>['data'];
export type Founder = CollectionEntry<'founder'>['data'];
export type Services = CollectionEntry<'services'>['data'];
export type Service = Services['items'][number];
export type Sampler = CollectionEntry<'sampler'>['data'];
export type Testimonial = Sampler['testimonial'];
export type Joyride = CollectionEntry<'joyride'>['data'];
export type Pitch = CollectionEntry<'pitch'>['data'];

/** Shared shapes, exported so components can type a prop against them. */
export type Cta = Hero['cta'];
export type ContentImage = Hero['collage'];
export type ContentFigure = Attention['figure'];
export type Counter = Attention['counter'];

function missing(file: string): Error {
  return new Error(`Missing src/content/homepage/${file}.yaml — the page cannot be built without it.`);
}

export async function getHero(): Promise<Hero> {
  const entry = await getEntry('hero', 'hero');
  if (!entry) throw missing('hero');
  return entry.data;
}

export async function getMarquee(): Promise<Marquee> {
  const entry = await getEntry('marquee', 'marquee');
  if (!entry) throw missing('marquee');
  return entry.data;
}

export async function getAttention(): Promise<Attention> {
  const entry = await getEntry('attention', 'attention');
  if (!entry) throw missing('attention');
  return entry.data;
}

export async function getLanguage(): Promise<Language> {
  const entry = await getEntry('language', 'language');
  if (!entry) throw missing('language');
  return entry.data;
}

export async function getFounder(): Promise<Founder> {
  const entry = await getEntry('founder', 'founder');
  if (!entry) throw missing('founder');
  return entry.data;
}

export async function getServices(): Promise<Services> {
  const entry = await getEntry('services', 'services');
  if (!entry) throw missing('services');
  return entry.data;
}

export async function getSampler(): Promise<Sampler> {
  const entry = await getEntry('sampler', 'sampler');
  if (!entry) throw missing('sampler');
  return entry.data;
}

export async function getJoyride(): Promise<Joyride> {
  const entry = await getEntry('joyride', 'joyride');
  if (!entry) throw missing('joyride');
  return entry.data;
}

export async function getPitch(): Promise<Pitch> {
  const entry = await getEntry('pitch', 'pitch');
  if (!entry) throw missing('pitch');
  return entry.data;
}
