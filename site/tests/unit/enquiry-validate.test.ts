/**
 * Unit tests for the enquiry validator.
 *
 * Run: `npm run test:unit`
 *
 * These use Node's built-in test runner and Node 22's native TypeScript type
 * stripping — no Vitest, no ts-node, no extra dependency to keep current [P8].
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  FIELDS,
  MAX_LENGTH,
  MIN_LENGTH,
  allowedYears,
  canonicalMonth,
  isHoneypotFilled,
  isValidEmail,
  labelFor,
  validateEnquiry,
} from '../../src/lib/enquiry/validate.ts';
import { BUDGETS, OUTPUTS } from '../../src/lib/enquiry/options.generated.ts';

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const NOW = new Date('2026-08-21T09:00:00.000Z');

/** A submission that should pass every rule. */
function validPayload(): Record<string, string | string[]> {
  return {
    business: 'Fable & Co',
    name: 'Sam Okonkwo',
    email: 'Sam@Example.com',
    social: 'https://example.com',
    pronouns: 'they',
    access: 'Captions on any call, please.',
    intent: 'launch',
    outputs: ['website', 'messaging'],
    why: 'Nobody can tell what we actually sell.',
    goals: 'A site that explains us in one breath.',
    month: 'March',
    year: '2027',
    budget: '10k-20k',
  };
}

/** Turns a plain object into the `FieldSource` the validator expects. */
function source(payload: Record<string, string | string[]>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else params.append(key, value);
  }
  return params;
}

function errorFields(payload: Record<string, string | string[]>): string[] {
  const result = validateEnquiry(source(payload), NOW);
  assert.equal(result.ok, false, 'expected the payload to be rejected');
  return result.ok ? [] : result.errors.map((e) => e.field);
}

/* ── The four required behaviours ─────────────────────────────────────────── */

describe('validateEnquiry', () => {
  test('accepts a valid payload and normalises it', () => {
    const result = validateEnquiry(source(validPayload()), NOW);

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.business, 'Fable & Co');
    // Lower-cased so two submissions from the same person match on email.
    assert.equal(result.value.email, 'sam@example.com');
    assert.deepEqual(result.value.outputs, ['website', 'messaging']);
    assert.equal(result.value.month, 'March');
    assert.equal(result.value.year, '2027');
    assert.equal(result.value.pronouns, 'they');
  });

  test('rejects an option code that is not in form.yaml', () => {
    // The whole reason `options.generated.ts` exists: the server can never
    // accept something the UI does not offer, however plausible it looks.
    assert.deepEqual(errorFields({ ...validPayload(), intent: 'rebrand' }), ['intent']);
    assert.deepEqual(errorFields({ ...validPayload(), budget: '50k-plus' }), ['budget']);
    assert.deepEqual(errorFields({ ...validPayload(), pronouns: 'xe' }), ['pronouns']);
    assert.deepEqual(errorFields({ ...validPayload(), outputs: ['website', 'seo'] }), ['outputs']);
    assert.deepEqual(errorFields({ ...validPayload(), month: 'Smarch' }), ['month']);
    assert.deepEqual(errorFields({ ...validPayload(), year: '2031' }), ['year']);
  });

  test('every accepted code round-trips from the generated list', () => {
    for (const budget of BUDGETS) {
      const result = validateEnquiry(source({ ...validPayload(), budget: budget.value }), NOW);
      assert.equal(result.ok, true, `budget ${budget.value} should be accepted`);
    }
    for (const output of OUTPUTS) {
      const result = validateEnquiry(source({ ...validPayload(), outputs: [output.value] }), NOW);
      assert.equal(result.ok, true, `output ${output.value} should be accepted`);
    }
  });

  test('rejects a missing required field', () => {
    for (const field of ['business', 'name', 'email', 'intent', 'why', 'goals', 'budget']) {
      const payload = validPayload();
      delete payload[field];
      assert.deepEqual(errorFields(payload), [field], `${field} should be required`);
    }

    // Multi-select needs at least one.
    assert.deepEqual(errorFields({ ...validPayload(), outputs: [] }), ['outputs']);

    // Timing is two fields; an empty year is the one that fails first.
    const noYear = validPayload();
    delete noYear['year'];
    assert.deepEqual(errorFields(noYear), ['year']);
  });

  test('optional fields really are optional', () => {
    const payload = validPayload();
    delete payload['social'];
    delete payload['pronouns'];
    delete payload['access'];

    const result = validateEnquiry(source(payload), NOW);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.social, null);
    assert.equal(result.value.pronouns, null);
    assert.equal(result.value.access, null);
  });

  test('reports every broken field at once, not just the first', () => {
    const fields = errorFields({ ...validPayload(), business: '', email: 'nope', budget: '' });
    assert.deepEqual(fields.sort(), ['budget', 'business', 'email']);
  });

  /* ── Lengths ───────────────────────────────────────────────────────────── */

  test('enforces the minimum useful length on the prose answers', () => {
    assert.deepEqual(errorFields({ ...validPayload(), why: 'dunno' }), ['why']);
    assert.deepEqual(errorFields({ ...validPayload(), goals: 'good' }), ['goals']);

    const atFloor = {
      ...validPayload(),
      why: 'x'.repeat(MIN_LENGTH.why),
      goals: 'x'.repeat(MIN_LENGTH.goals),
    };
    assert.equal(validateEnquiry(source(atFloor), NOW).ok, true);
  });

  test('rejects rather than truncates an over-long answer', () => {
    const payload = { ...validPayload(), business: 'x'.repeat(MAX_LENGTH.business + 1) };
    assert.deepEqual(errorFields(payload), ['business']);
  });

  test('counts characters the way a person does', () => {
    // Five emoji are five characters, not ten UTF-16 code units.
    const payload = { ...validPayload(), business: '👩‍🎨'.repeat(20) };
    assert.equal(validateEnquiry(source(payload), NOW).ok, true);
  });

  /* ── Timing ────────────────────────────────────────────────────────────── */

  test('flexible timing discards any month that was sent with it', () => {
    const result = validateEnquiry(
      source({ ...validPayload(), year: 'flexible', month: 'March' }),
      NOW,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.year, 'flexible');
    assert.equal(result.value.month, null, 'the record must not contradict itself');
  });

  test('a fixed year without a month is rejected', () => {
    const payload = validPayload();
    delete payload['month'];
    assert.deepEqual(errorFields(payload), ['month']);
  });

  test('accepts the years the page is currently offering, and last year', () => {
    assert.deepEqual(allowedYears(NOW), ['2025', '2026', '2027', '2028']);
  });

  test('accepts a month by name or by index', () => {
    assert.equal(canonicalMonth('march'), 'March');
    assert.equal(canonicalMonth('3'), 'March');
    assert.equal(canonicalMonth('03'), 'March');
    assert.equal(canonicalMonth('13'), null);
    assert.equal(canonicalMonth(''), null);
  });

  /* ── Hostile input ─────────────────────────────────────────────────────── */

  test('strips control characters from single-line fields', () => {
    const result = validateEnquiry(
      source({ ...validPayload(), business: 'Acme\r\nBcc: victim@example.com' }),
      NOW,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(!result.value.business.includes('\r'));
    assert.ok(!result.value.business.includes('\n'));
  });

  test('rejects addresses that could carry a second header', () => {
    assert.equal(isValidEmail('sam@example.com'), true);
    assert.equal(isValidEmail('sam@example.co.uk'), true);
    assert.equal(isValidEmail('sam@example.com, victim@example.com'), false);
    assert.equal(isValidEmail('"sam"@example.com'), false);
    assert.equal(isValidEmail('sam@example'), false);
    assert.equal(isValidEmail('sam @example.com'), false);
    assert.equal(isValidEmail(`${'a'.repeat(250)}@example.com`), false);
  });

  test('de-duplicates repeated checkbox values', () => {
    const result = validateEnquiry(
      source({ ...validPayload(), outputs: ['website', 'website', 'email'] }),
      NOW,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value.outputs, ['website', 'email']);
  });
});

/* ── Honeypot ─────────────────────────────────────────────────────────────── */

describe('honeypot', () => {
  test('catches a filled honeypot under any of its names', () => {
    for (const field of ['nk_hp', 'hp', 'honeypot', 'website_url', 'leave_blank']) {
      assert.equal(
        isHoneypotFilled(source({ ...validPayload(), [field]: 'http://spam.example' })),
        true,
        `${field} should trip the honeypot`,
      );
    }
  });

  test('an empty or whitespace-only honeypot is not a trip', () => {
    assert.equal(isHoneypotFilled(source(validPayload())), false);
    assert.equal(isHoneypotFilled(source({ ...validPayload(), nk_hp: '   ' })), false);
  });
});

/* ── Contract ─────────────────────────────────────────────────────────────── */

describe('the wire contract', () => {
  test('FIELDS lists every name the form posts, once', () => {
    assert.equal(new Set(FIELDS).size, FIELDS.length);
    for (const name of ['business', 'name', 'email', 'intent', 'outputs', 'budget']) {
      assert.ok(FIELDS.includes(name as (typeof FIELDS)[number]), `${name} missing from FIELDS`);
    }
  });

  test('labelFor falls back to the code so nothing renders blank', () => {
    assert.equal(labelFor(BUDGETS, '10k-20k'), '£10k – £20k');
    assert.equal(labelFor(BUDGETS, 'gone-from-the-yaml'), 'gone-from-the-yaml');
    assert.equal(labelFor(BUDGETS, null), '');
  });
});
