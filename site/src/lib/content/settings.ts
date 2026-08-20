import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type SiteSettings = CollectionEntry<'settings'>['data'];

export type NavItem = SiteSettings['nav'][number];

/**
 * Site-wide settings: name, description, header navigation, primary CTA.
 *
 * Throws rather than returning a partial object — a missing settings file is
 * a build error, not a runtime degradation. The build failing loudly is the
 * safety net that makes direct file editing viable.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const entry = await getEntry('settings', 'site');
  if (!entry) {
    throw new Error(
      'Missing src/content/settings/site.yaml — the site cannot be built without it.',
    );
  }
  return entry.data;
}
