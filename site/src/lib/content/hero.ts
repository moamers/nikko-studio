import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Hero = CollectionEntry<'hero'>['data'];

/** §2 — the hero. The worked example for every other section accessor. */
export async function getHero(): Promise<Hero> {
  const entry = await getEntry('hero', 'hero');
  if (!entry) {
    throw new Error('Missing src/content/homepage/hero.yaml.');
  }
  return entry.data;
}
