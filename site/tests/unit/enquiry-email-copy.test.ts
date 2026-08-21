/**
 * The two email templates must never drift from `src/content/email/copy.yaml`.
 *
 * `email-copy.generated.ts` is compiled from the YAML because the email
 * builder runs in a Worker and cannot read a file at request time. That is
 * only safe if the committed output is provably the YAML's output —
 * otherwise an edit to the wording in the YAML silently stops appearing in
 * the emails people actually receive. This test is the proof.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  OUTPUT_PATH,
  YAML_PATH,
  renderEmailCopyModule,
} from '../../src/lib/enquiry/email-copy.build.mjs';
import { EMAIL_COPY } from '../../src/lib/enquiry/server/email-copy.generated.ts';

describe('enquiry email copy', () => {
  test('email-copy.generated.ts matches copy.yaml exactly', () => {
    const expected = renderEmailCopyModule(readFileSync(YAML_PATH, 'utf8'));
    const actual = readFileSync(OUTPUT_PATH, 'utf8');

    assert.equal(
      actual,
      expected,
      'email-copy.generated.ts is stale. Run: npm run enquiry:email-copy',
    );
  });

  test('the masthead uses a single-slash separator, not a double slash', () => {
    // Nadia flagged the ChatGPT-supplied design as reading
    // "NIKKO STUDIO // LONDON // DUBAI" (double slash) and asked for the
    // correct separator per the site's own design system. The one existing
    // precedent for this exact construction is the homepage opening
    // sequence's corner note, "A story studio / London / Dubai" — a single
    // forward slash with one space either side.
    assert.equal(EMAIL_COPY.brand.masthead, 'NIKKO STUDIO / LONDON / DUBAI');
    assert.doesNotMatch(EMAIL_COPY.brand.masthead, /\/\//, 'masthead must not use a double slash');
  });

  test('no arrow icons appear anywhere in the static copy', () => {
    // Nadia's instruction 7: "Do not add arrow icons to links." Checked
    // across every string in the object, not just the ones that render as
    // links, so a future edit can't reintroduce one unnoticed.
    const arrows = /[→➔➺➜➡⇒▶►]/u;
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        assert.doesNotMatch(value, arrows, `${path} contains an arrow icon: ${value}`);
      } else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) walk(v, `${path}.${key}`);
      }
    };
    walk(EMAIL_COPY, 'EMAIL_COPY');
  });

  test('the website label is the plain domain, no protocol or path', () => {
    assert.equal(EMAIL_COPY.brand.website_label, 'NIKKOSTUDIO.CO');
  });
});
