/**
 * Generates `options.generated.ts` from `src/content/contact/form.yaml`.
 *
 * WHY THIS EXISTS. The allowed option codes (`launch`, `website`, `20k-plus`…)
 * live in `form.yaml` because they are Nadia's to edit [P7]. The server-side
 * validator needs the same list, but it runs inside a Cloudflare Pages Function
 * — a Worker bundle that cannot read a YAML file off disk at request time and
 * cannot import `astro:content`.
 *
 * So the list is *derived*, never re-typed: this script reads the YAML and
 * emits a typed TypeScript module the Worker can import. `npm run build` runs
 * it before Astro, and `tests/unit/options.test.ts` fails the build if the
 * committed output has drifted from the YAML.
 *
 * Run directly:  node src/lib/enquiry/options.build.mjs
 * Check only:    node src/lib/enquiry/options.build.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
export const YAML_PATH = join(here, '..', '..', 'content', 'contact', 'form.yaml');
export const OUTPUT_PATH = join(here, 'options.generated.ts');

const lit = (s) => JSON.stringify(String(s));

/** @returns {string} the full text of `options.generated.ts` for the current YAML. */
export function renderOptionsModule(yamlText) {
  const data = parse(yamlText);

  for (const key of ['intents', 'outputs', 'budgets', 'pronouns', 'timing']) {
    if (!data?.[key]) throw new Error(`form.yaml is missing the "${key}" section.`);
  }

  /** @param {{value: string, label: string}[]} list */
  const options = (list) =>
    list.map((o) => `  { value: ${lit(o.value)}, label: ${lit(o.label)} },`).join('\n');

  const { yearsAhead, flexibleLabel, months } = data.timing;

  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/content/contact/form.yaml
 * Regenerate: npm run enquiry:options   (also runs as part of npm run build)
 *
 * The enquiry validator runs in a Worker and cannot read YAML at request time,
 * so the founder-editable option list is compiled into this module instead.
 * Editing this file by hand will be overwritten and will fail the unit tests.
 */

export interface EnquiryOption {
  /** The stable code stored against a submission. */
  readonly value: string;
  /** What a person reads. Safe to reword; the value is not. */
  readonly label: string;
}

export const INTENTS: readonly EnquiryOption[] = [
${options(data.intents)}
] as const;

export const OUTPUTS: readonly EnquiryOption[] = [
${options(data.outputs)}
] as const;

export const BUDGETS: readonly EnquiryOption[] = [
${options(data.budgets)}
] as const;

export const PRONOUNS: readonly EnquiryOption[] = [
${options(data.pronouns)}
] as const;

/** This year plus N — the year chips are derived at request time, never stored. */
export const YEARS_AHEAD = ${Number(yearsAhead)};

/** The label of the chip that greys out the month grid. */
export const FLEXIBLE_LABEL = ${lit(flexibleLabel)};

/** The code submitted for that chip. Not in the YAML: it is a wire value. */
export const FLEXIBLE_YEAR = 'flexible';

export const MONTHS: readonly string[] = [
${months.map((m) => `  ${lit(m)},`).join('\n')}
] as const;
`;
}

function main() {
  const yamlText = readFileSync(YAML_PATH, 'utf8');
  const next = renderOptionsModule(yamlText);

  if (process.argv.includes('--check')) {
    const current = readFileSync(OUTPUT_PATH, 'utf8');
    if (current !== next) {
      console.error(
        'options.generated.ts is out of date with form.yaml. Run: npm run enquiry:options',
      );
      process.exit(1);
    }
    console.log('options.generated.ts is up to date.');
    return;
  }

  writeFileSync(OUTPUT_PATH, next, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
