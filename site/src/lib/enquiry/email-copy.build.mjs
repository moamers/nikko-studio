/**
 * Generates `server/email-copy.generated.ts` from `src/content/email/copy.yaml`.
 *
 * WHY THIS EXISTS. Every static sentence in the two enquiry-form emails
 * (subjects, headlines, field labels, the masthead) lives in `copy.yaml`
 * because it is Nadia's to edit [P7] — the handoff's own instruction is
 * "keep all static wording in the supplied YAML; do not duplicate it inside
 * application code." The email builder runs inside a Cloudflare Pages
 * Function, which cannot read a YAML file off disk at request time and
 * cannot import `astro:content` (see `options.build.mjs`, which solves the
 * identical problem for the form's option list).
 *
 * So the copy is *derived*, never re-typed: this script reads the YAML and
 * emits a typed TypeScript module the Worker can import. `npm run build`
 * runs it before Astro, and `tests/unit/enquiry-email-copy.test.ts` fails
 * the build if the committed output has drifted from the YAML.
 *
 * Run directly:  node src/lib/enquiry/email-copy.build.mjs
 * Check only:    node src/lib/enquiry/email-copy.build.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
export const YAML_PATH = join(here, '..', '..', 'content', 'email', 'copy.yaml');
export const OUTPUT_PATH = join(here, 'server', 'email-copy.generated.ts');

const lit = (s) => JSON.stringify(String(s));

const REQUIRED_KEYS = {
  brand: ['name', 'locations', 'masthead', 'website_label'],
  sections: ['about_you', 'project', 'reason', 'finish_line'],
  fields: [
    'business', 'name', 'email', 'social', 'pronouns', 'accessibility',
    'movement', 'outputs', 'why', 'goals', 'target_timing', 'budget',
    'budget_short', 'intent', 'target_short',
  ],
  customer: [
    'subject', 'preheader_prefix', 'preheader_suffix', 'status',
    'headline_line_1', 'headline_line_2', 'greeting', 'intro', 'support',
  ],
  owner: [
    'subject_prefix', 'preheader_suffix', 'status', 'headline_line_1',
    'headline_line_2', 'reply_label',
  ],
};

/** @returns {string} the full text of `email-copy.generated.ts` for the current YAML. */
export function renderEmailCopyModule(yamlText) {
  const data = parse(yamlText);

  for (const [section, keys] of Object.entries(REQUIRED_KEYS)) {
    if (!data?.[section]) throw new Error(`copy.yaml is missing the "${section}" section.`);
    for (const key of keys) {
      if (typeof data[section][key] !== 'string' || data[section][key].length === 0) {
        throw new Error(`copy.yaml is missing "${section}.${key}".`);
      }
    }
  }

  const obj = (section) =>
    REQUIRED_KEYS[section].map((k) => `    ${k}: ${lit(data[section][k])},`).join('\n');

  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/content/email/copy.yaml
 * Regenerate: npm run enquiry:email-copy   (also runs as part of npm run build)
 *
 * The email builder runs in a Worker and cannot read YAML at request time,
 * so Nadia's editable copy is compiled into this module instead. Editing
 * this file by hand will be overwritten and will fail the unit tests.
 */

export interface EmailCopy {
  readonly brand: {
    readonly name: string;
    readonly locations: string;
    readonly masthead: string;
    readonly website_label: string;
  };
  readonly sections: {
    readonly about_you: string;
    readonly project: string;
    readonly reason: string;
    readonly finish_line: string;
  };
  readonly fields: {
    readonly business: string;
    readonly name: string;
    readonly email: string;
    readonly social: string;
    readonly pronouns: string;
    readonly accessibility: string;
    readonly movement: string;
    readonly outputs: string;
    readonly why: string;
    readonly goals: string;
    readonly target_timing: string;
    readonly budget: string;
    readonly budget_short: string;
    readonly intent: string;
    readonly target_short: string;
  };
  readonly customer: {
    readonly subject: string;
    readonly preheader_prefix: string;
    readonly preheader_suffix: string;
    readonly status: string;
    readonly headline_line_1: string;
    readonly headline_line_2: string;
    /** The enquirer's first name is substituted for {name} at send time. */
    readonly greeting: string;
    readonly intro: string;
    readonly support: string;
  };
  readonly owner: {
    readonly subject_prefix: string;
    readonly preheader_suffix: string;
    readonly status: string;
    readonly headline_line_1: string;
    readonly headline_line_2: string;
    readonly reply_label: string;
  };
}

export const EMAIL_COPY: EmailCopy = {
  brand: {
${obj('brand')}
  },
  sections: {
${obj('sections')}
  },
  fields: {
${obj('fields')}
  },
  customer: {
${obj('customer')}
  },
  owner: {
${obj('owner')}
  },
};
`;
}

function main() {
  const yamlText = readFileSync(YAML_PATH, 'utf8');
  const next = renderEmailCopyModule(yamlText);

  if (process.argv.includes('--check')) {
    const current = readFileSync(OUTPUT_PATH, 'utf8');
    if (current !== next) {
      console.error(
        'email-copy.generated.ts is out of date with copy.yaml. Run: npm run enquiry:email-copy',
      );
      process.exit(1);
    }
    console.log('email-copy.generated.ts is up to date.');
    return;
  }

  writeFileSync(OUTPUT_PATH, next, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
