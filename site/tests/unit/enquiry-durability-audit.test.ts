/**
 * Independent durability audit.
 *
 * Deliberately duplicates coverage that enquiry-endpoint.test.ts already has.
 * Data loss is the highest-stakes failure this endpoint can produce — an
 * enquiry worth £5,000+ vanishing because a provider hiccuped — and the whole
 * reason we are replacing the Apps Script. A second, independently written
 * assertion of "never say thank-you unless something recorded it" is cheap
 * insurance against a future refactor quietly inverting it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleEnquiry } from '../../src/lib/enquiry/server/handler.ts';

function payload() {
  const p = new URLSearchParams();
  Object.entries({ business:'Audit Ltd', name:'Lead', email:'lead@example.com',
    intent:'launch', why:'We cannot explain what we sell.', goals:'A site that explains us clearly.', month:'March', year:'2027', budget:'10k-20k' })
    .forEach(([k,v]) => p.append(k,v));
  p.append('outputs','website');
  return p;
}
const req = () => new Request('https://x/api/enquiry', {
  method:'POST', headers:{'content-type':'application/x-www-form-urlencoded', accept:'application/json'},
  body: payload().toString(),
});

test('AUDIT: no D1 and no email provider must NOT report success', async () => {
  const res = await handleEnquiry(req(), {} as any, { fetchImpl: (async () => { throw new Error('no network'); }) as any });
  const text = await res.text();
  console.log('  status:', res.status, '| body:', text.slice(0,160));
  assert.notEqual(res.status, 200, 'returned 200 with nothing recorded — data loss');
  assert.ok(res.status >= 500, `expected 5xx, got ${res.status}`);
});

test('AUDIT: no D1 but email succeeds -> success, flagged not stored', async () => {
  const env = { RESEND_API_KEY:'k', ENQUIRY_FROM:'a@b.co', ENQUIRY_NOTIFY_TO:'n@b.co' };
  const res = await handleEnquiry(req(), env as any,
    { fetchImpl: (async () => new Response('{"id":"1"}', {status:200})) as any });
  const body = await res.json() as any;
  console.log('  status:', res.status, '| stored:', body.stored);
  assert.ok(res.status === 200 || res.status === 201, `expected 2xx, got ${res.status}`);
  assert.equal(body.stored, false, 'should admit it did not store');
});
