/**
 * The Privacy Policy and Terms & Conditions pages.
 *
 * Unlike every other façade in this folder, this one hands back a rendered
 * `Content` component rather than plain data — the body is long-form
 * Markdown (docs/04-content-architecture.md), so there is nothing to shape
 * into a typed object. Templates still never touch `astro:content`
 * directly. [P7, ADR-0002]
 */
import { getEntry, render } from 'astro:content';

export type LegalSlug = 'privacy-policy' | 'terms-and-conditions';

export interface LegalPage {
  description: string;
  Content: Awaited<ReturnType<typeof render>>['Content'];
}

export async function getLegalPage(slug: LegalSlug): Promise<LegalPage> {
  const entry = await getEntry('legal', slug);
  if (!entry) {
    throw new Error(
      `src/content/legal/${slug}.md is missing — this page cannot render without it.`,
    );
  }
  const { Content } = await render(entry);
  return { description: entry.data.description, Content };
}
