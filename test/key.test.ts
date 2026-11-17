// conyr key (spec 6.5): which key, whether the API accepts it, and how to get one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, json, type Reply } from './helpers.ts';

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const CHECK = `/v1/token/${BONK}/bundles/summary`;
const OWN_KEY = 'conyr_live_madeUpKeyForTheTests00000000000';
const OWN = { CONYR_API_KEY: OWN_KEY };
const TAGS = 'utm_source=cli&utm_medium=cli&utm_content=key';
const LINKS = {
  free_key: `https://conyr.ai/api?${TAGS}`,
  key_page: `https://conyr.ai/app/profile?tab=api&${TAGS}`,
  plans: `https://conyr.ai/api?${TAGS}`,
};
const ok: Reply = { status: 200, body: { token_mint: BONK, bundle_count: 1, open_bundle_count: 1, bundled_supply_pct: 0.1, bundled_value_usd: 1, bundled_realized_pnl_usd: 0, dominant_bundle_type: null } };

test('the demo key, accepted: one free call, the links and the line that sets a key, exit 0', async () => {
  const r = await cli(['key'], { replies: { [CHECK]: ok } });
  assert.equal(r.code, 0, r.err);
  assert.equal(r.err, '');
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0]!.url, `https://api.conyr.ai${CHECK}`);
  assert.match(r.out, /demo key/i);
  for (const link of Object.values(LINKS)) assert.ok(r.out.includes(link), link);
  assert.match(r.out, /export CONYR_API_KEY=/);
});

test('your own key is shown only by its first 16 characters', async () => {
  const r = await cli(['key'], { env: OWN, replies: { [CHECK]: ok } });
  assert.equal(r.code, 0);
  assert.ok(r.out.includes(OWN_KEY.slice(0, 16)));
  assert.ok(!r.out.includes(OWN_KEY.slice(0, 17)), 'nothing past the prefix');
  assert.equal(r.calls[0]!.headers.authorization, `Bearer ${OWN_KEY}`);
});

test('--json: accepted', async () => {
  const r = await cli(['key', '--json'], { env: OWN, replies: { [CHECK]: ok } });
  assert.deepEqual(json(r), { ok: true, command: 'key', key: 'own', accepted: true, links: LINKS });
});

test('a 429 means the key is accepted and at its limit', async () => {
  const reply: Reply = { status: 429, body: { code: 429, error: 'rate limit exceeded' } };
  const r = await cli(['key'], { replies: { [CHECK]: reply } });
  assert.equal(r.code, 0);
  assert.match(r.out, /limit/i);
  assert.equal(json(await cli(['key', '--json'], { replies: { [CHECK]: reply } })).accepted, true);
});

test('a 401 means the key is not accepted, which is an answer: exit 0, accepted false', async () => {
  const reply: Reply = { status: 401, body: { code: 401, error: 'Invalid API key' } };
  const r = await cli(['key'], { env: OWN, replies: { [CHECK]: reply } });
  assert.equal(r.code, 0);
  assert.match(r.out, /CONYR_API_KEY/);
  const doc = json(await cli(['key', '--json'], { env: OWN, replies: { [CHECK]: reply } }));
  assert.deepEqual(doc, { ok: true, command: 'key', key: 'own', accepted: false, links: LINKS });
});

test('the API failing is a refusal: exit 1 with the refusal document', async () => {
  const r = await cli(['key', '--json'], { replies: { [CHECK]: { status: 503, body: { code: 503, error: 'x' } } } });
  assert.equal(r.code, 1);
  assert.equal(json(r).ok, false);
  assert.equal(json(r).reason, 'api_error');
});

test('--via gives every link the skill tags', async () => {
  const r = await cli(['key', '--via', 'conyr-api'], { replies: { [CHECK]: ok } });
  assert.ok(r.out.includes('https://conyr.ai/app/profile?tab=api&utm_source=skill&utm_medium=agent&utm_content=conyr-api'));
  assert.doesNotMatch(r.out, /utm_source=cli/);
});
