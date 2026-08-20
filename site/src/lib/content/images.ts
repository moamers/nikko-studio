import type { ImageMetadata } from 'astro';

/**
 * Turn a filename from a content file into an `astro:assets` image.
 *
 * Content files name images by filename only ("nadia-portrait.png") because
 * that is what a founder can reasonably be asked to type. The mapping from
 * that string to an optimisable asset happens here, once, rather than in
 * every template. [P7]
 *
 * The glob is deliberately LAZY. An eager glob would emit every file in
 * `assets/images/` into `dist/` at its original size — nine megabytes of
 * source PNGs, which P4 forbids outright — whether or not a template ever
 * renders it. Lazy, only the images actually resolved are built.
 */
const loaders = import.meta.glob<{ default: ImageMetadata }>(
  '../../assets/images/*.{png,jpg,jpeg,webp,avif}',
);

const byFilename = new Map(
  Object.entries(loaders).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1), load]),
);

export async function resolveImage(filename: string): Promise<ImageMetadata> {
  const load = byFilename.get(filename);
  if (!load) {
    throw new Error(
      `Unknown image "${filename}". Add it to site/src/assets/images/ ` +
        `(available: ${[...byFilename.keys()].sort().join(', ')}).`,
    );
  }
  return (await load()).default;
}
