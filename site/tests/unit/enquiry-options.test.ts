/**
 * The accept-list must never drift from `src/content/contact/form.yaml`.
 *
 * `options.generated.ts` is compiled from the YAML because the validator runs
 * in a Worker and cannot read a file at request time. That is only safe if the
 * committed output is provably the YAML's output — otherwise the server quietly
 * starts rejecting an option the form is still offering, or accepting one Nadia
 * deleted. This test is the proof.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  OUTPUT_PATH,
  YAML_PATH,
  renderOptionsModule,
} from '../../src/lib/enquiry/options.build.mjs';
import {
  BUDGETS,
  INTENTS,
  MONTHS,
  OUTPUTS,
  PRONOUNS,
} from '../../src/lib/enquiry/options.generated.ts';

describe('enquiry options', () => {
  test('options.generated.ts matches form.yaml exactly', () => {
    const expected = renderOptionsModule(readFileSync(YAML_PATH, 'utf8'));
    const actual = readFileSync(OUTPUT_PATH, 'utf8');

    assert.equal(
      actual,
      expected,
      'options.generated.ts is stale. Run: npm run enquiry:options',
    );
  });

  test('every option code is unique within its list', () => {
    for (const [name, list] of Object.entries({ INTENTS, OUTPUTS, BUDGETS, PRONOUNS })) {
      const codes = list.map((o) => o.value);
      assert.equal(new Set(codes).size, codes.length, `${name} has a duplicate value`);
    }
  });

  test('codes are safe to put in a URL, a CSV cell and a JSON array', () => {
    for (const list of [INTENTS, OUTPUTS, BUDGETS, PRONOUNS]) {
      for (const option of list) {
        assert.match(
          option.value,
          /^[a-z0-9][a-z0-9-]*$/,
          `"${option.value}" should be lower-case, hyphenated and comma-free`,
        );
        assert.ok(option.label.trim().length > 0, `${option.value} has no label`);
      }
    }
  });

  test('there are twelve months, in order', () => {
    assert.equal(MONTHS.length, 12);
    assert.equal(MONTHS[0], 'January');
    assert.equal(MONTHS[11], 'December');
  });
});
