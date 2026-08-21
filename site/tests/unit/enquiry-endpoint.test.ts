/**
 * Unit tests for the enquiry endpoint pipeline.
 *
 * The two things these exist to prove:
 *
 * 1. **A submission is never silently dropped.** If D1 took it, it is a
 *    success. If D1 did not but Nadia's inbox did, it is still a success. If
 *    neither did, the visitor is told so — and the payload is in the log.
 * 2. **The endpoint behaves sanely with nothing configured**, which is the
 *    state it will actually be deployed in first.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { handleEnquiry, handleNonPost } from '../../src/lib/enquiry/server/handler.ts';
import type { EnquiryEnv } from '../../src/lib/enquiry/server/env.ts';
import { resetMemoryLimiter } from '../../src/lib/enquiry/server/rate-limit.ts';
import {
  buildEnquirerEmail,
  buildNadiaEmail,
  firstName,
} from '../../src/lib/enquiry/server/email.ts';
import { esc, headerSafe } from '../../src/lib/enquiry/server/html.ts';
import { hashIp } from '../../src/lib/enquiry/server/privacy.ts';
import type { EnquiryRecord } from '../../src/lib/enquiry/server/store.ts';

/* ── Test doubles ─────────────────────────────────────────────────────────── */

interface FakeRow {
  [column: string]: unknown;
}

/**
 * Just enough D1 to exercise the two statements the endpoint issues: the
 * enquiry INSERT and the rate-limit upsert. Not a SQLite emulator — it
 * recognises the statements by shape and records what was bound.
 */
class FakeD1 {
  readonly enquiries: FakeRow[] = [];
  readonly updates: FakeRow[] = [];
  private readonly counters = new Map<string, number>();
  failInserts = false;

  prepare(query: string) {
    const self = this;
    let bound: unknown[] = [];

    const statement = {
      bind(...values: unknown[]) {
        bound = values;
        return statement;
      },
      async run() {
        if (query.includes('INSERT INTO enquiries')) {
          if (self.failInserts) throw new Error('D1_ERROR: no such table: enquiries');
          self.enquiries.push({
            id: bound[0],
            reference: bound[1],
            received_at: bound[2],
            business: bound[3],
            name: bound[4],
            email: bound[5],
            outputs: bound[10],
            budget: bound[15],
            ip_hash: bound[16],
            ip_hash_alg: bound[17],
            user_agent: bound[18],
            status: bound[20],
          });
        } else if (query.includes('UPDATE enquiries')) {
          self.updates.push({ id: bound[0], notify_state: bound[1] });
        }
        return { success: true };
      },
      async first<T>() {
        if (query.includes('enquiry_rate_limit')) {
          const key = `${String(bound[0])}:${String(bound[1])}`;
          const next = (self.counters.get(key) ?? 0) + 1;
          self.counters.set(key, next);
          return { hits: next } as T;
        }
        return null;
      },
      async all() {
        return { success: true, results: [] };
      },
    };

    return statement;
  }
}

interface Call {
  url: string;
  body: unknown;
}

function fakeFetch(
  calls: Call[],
  options: { resendStatus?: number; turnstileSuccess?: boolean } = {},
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes('turnstile')) {
      calls.push({ url, body: String(init?.body ?? '') });
      return new Response(
        JSON.stringify({
          success: options.turnstileSuccess ?? true,
          'error-codes': options.turnstileSuccess === false ? ['invalid-input-response'] : [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    const status = options.resendStatus ?? 200;
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(status === 200 ? JSON.stringify({ id: 're_123' }) : 'domain not verified', {
      status,
      headers: { 'content-type': status === 200 ? 'application/json' : 'text/plain' },
    });
  }) as typeof fetch;
}

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const NOW = new Date('2026-08-21T09:00:00.000Z');

function body(overrides: Record<string, string | string[]> = {}): URLSearchParams {
  const base: Record<string, string | string[]> = {
    business: 'Fable & Co',
    name: 'Sam Okonkwo',
    email: 'sam@example.com',
    intent: 'launch',
    outputs: ['website', 'messaging'],
    why: 'Nobody can tell what we actually sell.',
    goals: 'A site that explains us in one breath.',
    month: 'March',
    year: '2027',
    budget: '10k-20k',
    ...overrides,
  };

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else params.append(key, value);
  }
  return params;
}

function post(
  params: URLSearchParams,
  headers: Record<string, string> = {},
  ip = '203.0.113.7',
): Request {
  return new Request('https://nikkostudio.co/api/enquiry', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'cf-connecting-ip': ip,
      'user-agent': 'Mozilla/5.0 (test)',
      ...headers,
    },
    body: params,
  });
}

const JSON_HEADERS = { accept: 'application/json' };

/** The state the endpoint will actually be deployed in first: nothing wired up. */
const UNCONFIGURED: EnquiryEnv = {};

/** Everything wired up. */
function configured(db: FakeD1): EnquiryEnv {
  return {
    DB: db,
    RESEND_API_KEY: 're_test_key',
    ENQUIRY_NOTIFY_TO: 'nadia@example.com',
    ENQUIRY_FROM: 'Nikko Studio <hello@nikkostudio.co>',
    ENQUIRY_IP_SALT: 'a-real-salt',
    ENQUIRY_FALLBACK_EMAIL: 'nadia@example.com',
  };
}

beforeEach(() => {
  resetMemoryLimiter();
});

/* ── The happy path ───────────────────────────────────────────────────────── */

describe('POST /api/enquiry — fully configured', () => {
  test('writes to D1 first, then sends both emails, then responds', async () => {
    const db = new FakeD1();
    const calls: Call[] = [];

    const response = await handleEnquiry(post(body(), JSON_HEADERS), configured(db), {
      fetchImpl: fakeFetch(calls),
      now: NOW,
    });

    assert.equal(response.status, 201);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload['ok'], true);
    assert.equal(payload['stored'], true);
    assert.equal(payload['notified'], true);
    assert.match(String(payload['reference']), /^NKO-\d{6}$/);

    // 4 — the record
    assert.equal(db.enquiries.length, 1);
    const row = db.enquiries[0]!;
    assert.equal(row['business'], 'Fable & Co');
    assert.equal(row['reference'], payload['reference']);
    assert.equal(row['outputs'], '["website","messaging"]');
    assert.equal(row['received_at'], NOW.toISOString());
    assert.equal(row['status'], 'new');

    // 5 & 6 — two emails
    const emails = calls.filter((c) => c.url.includes('resend'));
    assert.equal(emails.length, 2);

    const toNadia = emails.find(
      (c) => (c.body as { to: string[] }).to[0] === 'nadia@example.com',
    ) as Call;
    const toEnquirer = emails.find(
      (c) => (c.body as { to: string[] }).to[0] === 'sam@example.com',
    ) as Call;
    assert.ok(toNadia, 'Nadia was not emailed');
    assert.ok(toEnquirer, 'the enquirer was not emailed');

    // Reply-To is the enquirer, so replying just works.
    assert.equal((toNadia.body as { reply_to: string }).reply_to, 'sam@example.com');
    assert.equal(
      (toNadia.body as { subject: string }).subject,
      'New enquiry — Fable & Co — £10k – £20k',
    );

    // The notification outcome is written back against the row.
    assert.equal(db.updates.length, 1);
    assert.deepEqual(JSON.parse(String(db.updates[0]!['notify_state'])), {
      nadia: 'sent',
      enquirer: 'sent',
    });
  });

  test('never stores the raw IP address', async () => {
    const db = new FakeD1();
    await handleEnquiry(post(body(), JSON_HEADERS), configured(db), {
      fetchImpl: fakeFetch([]),
      now: NOW,
    });

    const row = db.enquiries[0]!;
    assert.notEqual(row['ip_hash'], '203.0.113.7');
    assert.match(String(row['ip_hash']), /^[0-9a-f]{64}$/);
    assert.equal(row['ip_hash_alg'], 'sha256-salted/v1');

    const serialised = JSON.stringify(db.enquiries);
    assert.ok(!serialised.includes('203.0.113.7'), 'the raw IP leaked into the row');
  });

  test('the salt actually changes the hash', async () => {
    const a = await hashIp('203.0.113.7', 'salt-one');
    const b = await hashIp('203.0.113.7', 'salt-two');
    const none = await hashIp('203.0.113.7', undefined);

    assert.notEqual(a.hash, b.hash);
    assert.equal(none.algorithm, 'sha256-unsalted/v1');
    assert.equal(a.algorithm, 'sha256-salted/v1');
    assert.equal((await hashIp(null, 'salt-one')).hash, null);
  });
});

/* ── Unconfigured: the state it ships in ──────────────────────────────────── */

describe('POST /api/enquiry — nothing configured', () => {
  test('with no D1 and no Resend, the visitor is told it failed and the payload is logged', async () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (line: unknown) => lines.push(String(line));

    try {
      const response = await handleEnquiry(post(body(), JSON_HEADERS), UNCONFIGURED, {
        fetchImpl: fakeFetch([]),
        now: NOW,
      });

      assert.equal(response.status, 503);
      const payload = (await response.json()) as Record<string, unknown>;
      assert.equal(payload['ok'], false);
      assert.equal(payload['error'], 'unrecorded');
      assert.match(String(payload['message']), /could not record/i);
    } finally {
      console.error = original;
    }

    // The last-resort log carries the brief, because it is the only copy left.
    const lost = lines.map((l) => JSON.parse(l)).find((l) => l.event === 'submission_unrecorded');
    assert.ok(lost, 'the lost submission was not logged');
    assert.equal(lost.payload.business, 'Fable & Co');
    assert.equal(lost.payload.why, 'Nobody can tell what we actually sell.');
    // Provenance is not needed to recover the enquiry, so it is not in the log.
    assert.equal(lost.payload.ipHash, undefined);
    assert.equal(lost.payload.userAgent, undefined);
  });

  test('with no D1 but a working Resend, the email is the record and it is a success', async () => {
    const calls: Call[] = [];
    const response = await handleEnquiry(post(body(), JSON_HEADERS), {
      RESEND_API_KEY: 're_test_key',
      ENQUIRY_NOTIFY_TO: 'nadia@example.com',
    }, { fetchImpl: fakeFetch(calls), now: NOW });

    assert.equal(response.status, 201);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload['ok'], true);
    // Honest about durability: the receipt says it was not stored.
    assert.equal(payload['stored'], false);
    assert.equal(payload['notified'], true);
    assert.equal(calls.filter((c) => c.url.includes('resend')).length, 2);
  });

  test('with D1 working but Resend failing, it is still a success', async () => {
    const db = new FakeD1();
    const response = await handleEnquiry(post(body(), JSON_HEADERS), configured(db), {
      fetchImpl: fakeFetch([], { resendStatus: 403 }),
      now: NOW,
    });

    assert.equal(response.status, 201);
    const payload = (await response.json()) as Record<string, unknown>;
    assert.equal(payload['ok'], true);
    assert.equal(payload['stored'], true);
    assert.equal(payload['notified'], false);

    // And the row records that nobody was told, so it can be found later.
    assert.equal(db.enquiries.length, 1);
    const state = JSON.parse(String(db.updates[0]!['notify_state']));
    assert.match(state.nadia, /^failed:/);
  });

  test('a D1 error is not a lost enquiry when the email lands', async () => {
    const db = new FakeD1();
    db.failInserts = true;

    const response = await handleEnquiry(post(body(), JSON_HEADERS), configured(db), {
      fetchImpl: fakeFetch([]),
      now: NOW,
    });

    assert.equal(response.status, 201);
    assert.equal(db.enquiries.length, 0);
    assert.equal(((await response.json()) as Record<string, unknown>)['stored'], false);
  });

  test('an unconfigured endpoint reports what is missing on every request', async () => {
    const lines: string[] = [];
    const original = console.warn;
    console.warn = (line: unknown) => lines.push(String(line));

    try {
      await handleEnquiry(post(body(), JSON_HEADERS), UNCONFIGURED, {
        fetchImpl: fakeFetch([]),
        now: NOW,
      });
    } finally {
      console.warn = original;
    }

    const warning = lines.map((l) => JSON.parse(l)).find((l) => l.event === 'unconfigured');
    assert.ok(warning, 'nothing warned about the missing configuration');
    assert.equal(warning.missing.length, 5);
    assert.ok(warning.missing.some((m: string) => m.includes('DB')));
    assert.ok(warning.missing.some((m: string) => m.includes('RESEND_API_KEY')));
  });
});

/* ── Rejections ───────────────────────────────────────────────────────────── */

describe('POST /api/enquiry — rejections', () => {
  test('a bad option code is rejected before anything is written', async () => {
    const db = new FakeD1();
    const calls: Call[] = [];

    const response = await handleEnquiry(
      post(body({ budget: '50k-plus' }), JSON_HEADERS),
      configured(db),
      { fetchImpl: fakeFetch(calls), now: NOW },
    );

    assert.equal(response.status, 422);
    const payload = (await response.json()) as { error: string; errors: { field: string }[] };
    assert.equal(payload.error, 'invalid');
    assert.deepEqual(
      payload.errors.map((e) => e.field),
      ['budget'],
    );
    assert.equal(db.enquiries.length, 0);
    assert.equal(calls.length, 0, 'nothing should have been sent');
  });

  test('the honeypot is accepted silently, emails nobody, and quarantines the row', async () => {
    const db = new FakeD1();
    const calls: Call[] = [];
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (line: unknown) => warnings.push(String(line));

    let response: Response;
    try {
      response = await handleEnquiry(
        post(body({ nk_hp: 'http://spam.example' }), JSON_HEADERS),
        configured(db),
        { fetchImpl: fakeFetch(calls), now: NOW },
      );
    } finally {
      console.warn = originalWarn;
    }

    // A bot is told it worked; telling it otherwise teaches it which field to skip.
    assert.equal(response.status, 202);
    assert.equal(((await response.json()) as Record<string, unknown>)['ok'], true);

    // Nobody is emailed...
    assert.equal(calls.length, 0);

    // ...but the row is kept as spam, because a browser can autofill a hidden
    // input and a false positive must not delete a real enquiry.
    assert.equal(db.enquiries.length, 1);
    assert.equal(db.enquiries[0]!['status'], 'spam');
    assert.equal(db.enquiries[0]!['business'], 'Fable & Co');

    const tripped = warnings.map((l) => JSON.parse(l)).find((l) => l.event === 'honeypot_tripped');
    assert.ok(tripped);
    assert.equal(tripped.quarantined, true);
  });

  test('a honeypot trip with no D1 stores nothing and says so in the log', async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (line: unknown) => warnings.push(String(line));

    try {
      await handleEnquiry(post(body({ nk_hp: 'x' }), JSON_HEADERS), UNCONFIGURED, {
        fetchImpl: fakeFetch([]),
        now: NOW,
      });
    } finally {
      console.warn = originalWarn;
    }

    const tripped = warnings.map((l) => JSON.parse(l)).find((l) => l.event === 'honeypot_tripped');
    assert.ok(tripped);
    assert.equal(tripped.quarantined, false);
    assert.match(tripped.recovery, /unrecoverable/i);
  });

  test('a honeypot trip on an invalid payload is just a validation failure', async () => {
    const db = new FakeD1();
    const response = await handleEnquiry(
      post(body({ nk_hp: 'x', budget: '50k-plus' }), JSON_HEADERS),
      configured(db),
      { fetchImpl: fakeFetch([]), now: NOW },
    );

    assert.equal(response.status, 422);
    assert.equal(db.enquiries.length, 0);
  });

  test('a failed Turnstile check is rejected', async () => {
    const db = new FakeD1();
    const response = await handleEnquiry(
      post(body({ 'cf-turnstile-response': 'nope' }), JSON_HEADERS),
      { ...configured(db), TURNSTILE_SECRET: '0x-secret' },
      { fetchImpl: fakeFetch([], { turnstileSuccess: false }), now: NOW },
    );

    assert.equal(response.status, 422);
    assert.equal(((await response.json()) as Record<string, unknown>)['error'], 'spam_check_failed');
    assert.equal(db.enquiries.length, 0);
  });

  test('rate limiting kicks in on the sixth submission from one address', async () => {
    const db = new FakeD1();
    const env = configured(db);
    const statuses: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      const response = await handleEnquiry(post(body(), JSON_HEADERS), env, {
        fetchImpl: fakeFetch([]),
        now: NOW,
      });
      statuses.push(response.status);
    }

    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429, 429]);
    assert.equal(db.enquiries.length, 5);
  });

  test('rate limiting still applies with no D1 bound', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const response = await handleEnquiry(
        post(body(), JSON_HEADERS),
        { RESEND_API_KEY: 're_test_key', ENQUIRY_NOTIFY_TO: 'nadia@example.com' },
        { fetchImpl: fakeFetch([]), now: NOW },
      );
      statuses.push(response.status);
    }
    assert.deepEqual(statuses.slice(5), [429, 429]);
  });

  test('an over-large body is refused without being parsed', async () => {
    const request = new Request('https://nikkostudio.co/api/enquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': String(1024 * 1024),
        accept: 'application/json',
      },
      body: body(),
    });

    const response = await handleEnquiry(request, configured(new FakeD1()), {
      fetchImpl: fakeFetch([]),
      now: NOW,
    });
    assert.equal(response.status, 400);
  });
});

/* ── Content negotiation [P3] ─────────────────────────────────────────────── */

describe('content negotiation', () => {
  test('a plain form POST gets a redirect to the thank-you page', async () => {
    const db = new FakeD1();
    const response = await handleEnquiry(post(body()), configured(db), {
      fetchImpl: fakeFetch([]),
      now: NOW,
    });

    assert.equal(response.status, 303);
    const location = response.headers.get('location') ?? '';
    assert.ok(location.startsWith('/contact/thank-you?ref=NKO-'), location);
    assert.equal(db.enquiries.length, 1);
  });

  test('a plain form POST that fails validation goes back to the form with the field names', async () => {
    const response = await handleEnquiry(
      post(body({ budget: '', email: 'nope' })),
      configured(new FakeD1()),
      { fetchImpl: fakeFetch([]), now: NOW },
    );

    assert.equal(response.status, 303);
    const location = response.headers.get('location') ?? '';
    assert.ok(location.startsWith('/contact?'), location);
    const query = location.slice(location.indexOf('?') + 1, location.indexOf('#'));
    const params = new URLSearchParams(query);
    assert.equal(params.get('enquiry'), 'invalid');
    assert.deepEqual((params.get('fields') ?? '').split(',').sort(), ['budget', 'email']);
  });

  test('an unrecorded plain form POST gets a real HTML page, not a redirect', async () => {
    const original = console.error;
    console.error = () => {};
    let response: Response;
    try {
      response = await handleEnquiry(post(body()), UNCONFIGURED, {
        fetchImpl: fakeFetch([]),
        now: NOW,
      });
    } finally {
      console.error = original;
    }

    assert.equal(response.status, 503);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    const html = await response.text();
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /was not sent/i);
    assert.match(html, /href="\/contact"/);
  });

  test('a fetch with no Accept header is still treated as JSON', async () => {
    const response = await handleEnquiry(
      post(body(), { 'sec-fetch-mode': 'same-origin' }),
      configured(new FakeD1()),
      { fetchImpl: fakeFetch([]), now: NOW },
    );
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  });

  test('a JSON request body is accepted', async () => {
    const db = new FakeD1();
    const request = new Request('https://nikkostudio.co/api/enquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        business: 'Fable & Co',
        name: 'Sam Okonkwo',
        email: 'sam@example.com',
        intent: 'launch',
        outputs: ['website'],
        why: 'Nobody can tell what we actually sell.',
        goals: 'A site that explains us.',
        year: 'flexible',
        budget: 'unsure',
      }),
    });

    const response = await handleEnquiry(request, configured(db), {
      fetchImpl: fakeFetch([]),
      now: NOW,
    });
    assert.equal(response.status, 201);
    assert.equal(db.enquiries[0]!['outputs'], '["website"]');
  });

  test('GET is a redirect for a browser and a 405 for a client', () => {
    const browser = handleNonPost(
      new Request('https://nikkostudio.co/api/enquiry'),
      UNCONFIGURED,
    );
    assert.equal(browser.status, 303);
    assert.equal(browser.headers.get('location'), '/contact');

    const client = handleNonPost(
      new Request('https://nikkostudio.co/api/enquiry', { headers: JSON_HEADERS }),
      UNCONFIGURED,
    );
    assert.equal(client.status, 405);
  });

  test('the redirect targets can never leave the origin', async () => {
    const db = new FakeD1();
    const response = await handleEnquiry(
      post(body()),
      { ...configured(db), ENQUIRY_THANK_YOU_PATH: 'https://evil.example/thanks' },
      { fetchImpl: fakeFetch([]), now: NOW },
    );

    assert.ok((response.headers.get('location') ?? '').startsWith('/contact/thank-you'));
  });
});

/* ── Escaping [P15] ───────────────────────────────────────────────────────── */

describe('email escaping', () => {
  function recordWith(overrides: Partial<EnquiryRecord>): EnquiryRecord {
    return {
      id: 'id-1',
      reference: 'NKO-000001',
      receivedAt: NOW.toISOString(),
      business: 'Fable & Co',
      name: 'Sam Okonkwo',
      email: 'sam@example.com',
      social: null,
      pronouns: 'they',
      access: null,
      intent: 'launch',
      outputs: ['website'],
      why: 'Nobody can tell what we sell.',
      goals: 'A site that explains us.',
      month: 'March',
      year: '2027',
      budget: '10k-20k',
      ipHash: null,
      ipHashAlgorithm: 'sha256-salted/v1',
      userAgent: null,
      source: '/contact',
      ...overrides,
    };
  }

  const XSS = '<img src=x onerror="alert(1)">';

  test('a script tag in any field is escaped in both emails', () => {
    const record = recordWith({
      business: XSS,
      name: XSS,
      why: `${XSS}\nsecond line`,
      goals: XSS,
      access: XSS,
      social: XSS,
    });

    for (const built of [buildNadiaEmail(record), buildEnquirerEmail(record)]) {
      assert.ok(!built.html.includes('<img'), 'raw tag survived into the HTML body');
      assert.ok(!built.html.includes('onerror='), 'raw attribute survived into the HTML body');
      // The subject is a mail header, rendered as plain text by every client —
      // escaping it would show Nadia `&lt;img&gt;` and hide nothing. What must
      // not survive there is a header separator, tested separately below. The
      // subject is also used as the document `<title>`, and *that* is escaped:
      assert.ok(!built.html.includes('<title><img'), 'the subject reached the title unescaped');
    }

    const nadia = buildNadiaEmail(record);
    assert.ok(nadia.html.includes('&lt;img src&#61;x onerror&#61;&quot;alert(1)&quot;&gt;'));
    // Prose keeps its line breaks — after escaping, never before.
    assert.ok(nadia.html.includes('<br>'));
  });

  test('a newline in a field cannot split a mail header', () => {
    const record = recordWith({ business: 'Acme\r\nBcc: victim@example.com' });
    const built = buildNadiaEmail(record);

    assert.ok(!built.subject.includes('\n'));
    assert.ok(!built.subject.includes('\r'));
    assert.equal(headerSafe('a\r\nb'), 'a b');
  });

  test('Reply-To is the bare address, never a submitted display name', () => {
    const record = recordWith({ name: 'Sam" <attacker@example.com>, "' });
    assert.equal(buildNadiaEmail(record).replyTo, 'sam@example.com');
  });

  test('esc covers the characters that matter', () => {
    assert.equal(esc('<>&"\'`='), '&lt;&gt;&amp;&quot;&#39;&#96;&#61;');
    assert.equal(esc(null), '');
  });

  test('the confirmation makes no promise about timing until Nadia gives us one', () => {
    // RESPONSE_TIME_PROMISE is null on purpose (TODO(nadia), docs/16 Q3). If
    // this test starts failing, someone invented a commitment the studio has
    // not made — which is exactly what it is here to catch.
    const built = buildEnquirerEmail(recordWith({}));
    assert.ok(!/\b\d+\s*(hours?|days?|weeks?|working days?)\b/i.test(built.text), built.text);
  });

  test('the greeting uses the first name', () => {
    assert.equal(firstName('Sam Okonkwo'), 'Sam');
    assert.equal(firstName('  Cher  '), 'Cher');
    assert.ok(buildEnquirerEmail(recordWith({ name: 'Sam Okonkwo' })).text.startsWith('Thank you, Sam.'));
  });

  test('the reference reaches the enquirer and the studio', () => {
    const record = recordWith({ reference: 'NKO-123456' });
    assert.ok(buildEnquirerEmail(record).text.includes('NKO-123456'));
    assert.ok(buildNadiaEmail(record).text.includes('NKO-123456'));
  });
});
