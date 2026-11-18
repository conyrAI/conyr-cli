// Keys, the one call to the API, and every row of the refusal table (spec 6.6), on the demo key and on one's own,
// in text and in JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, json, DEMO_KEY, MINT, VERSION, type Reply } from './helpers.ts';
import { refusalFor } from '../src/refusals.ts';

const OWN_KEY = 'conyr_live_madeUpKeyForTheTests00000000000';
const OWN = { CONYR_API_KEY: OWN_KEY };
const SUMMARY = `/v1/token/${MINT}/bundles/summary`;
const BUYERS = `/v1/token/${MINT}/buyer-quality?window_hours=1`;
const ROUTE = `/v1/token/${MINT}/liquidity`;

const SIGN_UP = 'https://conyr.ai/api?utm_source=cli&utm_medium=cli&utm_content=token';
const KEY_PAGE = 'https://conyr.ai/app/profile?tab=api&utm_source=cli&utm_medium=cli&utm_content=token';

const forbidden = (required: string, resolved: string): Reply => ({
  status: 403,
  body: { code: 403, error: `Endpoint requires ${required} tier (resolved: ${resolved})`, required_tier: required, resolved_tier: resolved },
});

interface Row {
  name: string;
  reply: Reply;
  status: number | null;
  own: { reason: string; links: Record<string, string>; says?: string[] };
  demo: { reason: string; links: Record<string, string>; says?: string[] };
  requiredPlan?: string | null;
}

const ROWS: Row[] = [
  {
    name: '401',
    reply: { status: 401, body: { code: 401, error: 'Invalid API key' } },
    status: 401,
    own: { reason: 'key_refused', links: { key_page: KEY_PAGE, free_key: SIGN_UP }, says: ['CONYR_API_KEY'] },
    demo: { reason: 'demo_key_retired', links: { free_key: SIGN_UP } },
  },
  {
    name: '403 naming both plans',
    reply: forbidden('Layer 2', 'Layer 1'),
    status: 403,
    requiredPlan: 'Layer 2',
    own: { reason: 'plan', links: { plans: SIGN_UP }, says: ['Layer 2', 'Layer 1'] },
    demo: { reason: 'plan', links: { plans: SIGN_UP }, says: ['Layer 2', 'Free'] },
  },
  {
    name: '403 without required_tier',
    reply: { status: 403, body: { code: 403, error: 'Forbidden' } },
    status: 403,
    requiredPlan: null,
    own: { reason: 'plan', links: { plans: SIGN_UP } },
    demo: { reason: 'plan', links: { plans: SIGN_UP }, says: ['Free'] },
  },
  {
    name: '429',
    reply: { status: 429, body: { code: 429, error: 'rate limit exceeded' } },
    status: 429,
    own: { reason: 'rate_limit', links: { plans: SIGN_UP } },
    demo: { reason: 'demo_key_busy', links: { free_key: SIGN_UP } },
  },
  {
    name: '400',
    reply: { status: 400, body: { code: 400, error: 'invalid mint' } },
    status: 400,
    own: { reason: 'bad_request', links: {} },
    demo: { reason: 'bad_request', links: {} },
  },
  {
    name: '404',
    reply: { status: 404, body: { code: 404, error: 'not found' } },
    status: 404,
    own: { reason: 'not_found', links: {} },
    demo: { reason: 'not_found', links: {} },
  },
  {
    name: '500',
    reply: { status: 500, body: { code: 500, error: 'internal' } },
    status: 500,
    own: { reason: 'api_error', links: {}, says: ['500'] },
    demo: { reason: 'api_error', links: {}, says: ['500'] },
  },
  {
    name: '503 with a body that is not JSON',
    reply: { status: 503, raw: '<html>Service Unavailable</html>', headers: { 'content-type': 'text/html' } },
    status: 503,
    own: { reason: 'api_error', links: {}, says: ['503'] },
    demo: { reason: 'api_error', links: {}, says: ['503'] },
  },
  {
    name: '200 that is not JSON',
    reply: { status: 200, raw: '<html>maintenance</html>', headers: { 'content-type': 'text/html' } },
    status: 200,
    own: { reason: 'bad_answer', links: {} },
    demo: { reason: 'bad_answer', links: {} },
  },
  {
    name: 'a redirect, which is not followed',
    reply: { status: 302, headers: { location: 'https://elsewhere.example/v1/collect' } },
    status: 302,
    own: { reason: 'api_error', links: {}, says: ['302'] },
    demo: { reason: 'api_error', links: {}, says: ['302'] },
  },
  {
    name: 'no answer in time',
    reply: 'hang',
    status: null,
    own: { reason: 'timeout', links: {} },
    demo: { reason: 'timeout', links: {} },
  },
  {
    name: 'no connection',
    reply: 'network',
    status: null,
    own: { reason: 'network', links: {}, says: ['api.conyr.ai'] },
    demo: { reason: 'network', links: {}, says: ['api.conyr.ai'] },
  },
];

for (const row of ROWS) {
  for (const kind of ['own', 'demo'] as const) {
    const env = kind === 'own' ? OWN : {};
    const want = row[kind];

    test(`${row.name} on the ${kind} key, as text: stderr says it, stdout stays empty, exit 1`, async () => {
      const r = await cli(['token', MINT], { env, replies: { [SUMMARY]: row.reply }, timeoutMs: 50 });
      assert.equal(r.code, 1);
      assert.equal(r.out, '');
      for (const link of Object.values(want.links)) assert.ok(r.err.includes(link), `stderr gives ${link}:\n${r.err}`);
      for (const fact of want.says ?? []) assert.ok(r.err.includes(fact), `stderr says ${fact}:\n${r.err}`);
      assert.doesNotMatch(r.err, /utm_content=(?!token)/, 'every link carries the command');
      assert.equal(r.calls.length, 1, 'one try, and the second call is not sent');
    });

    test(`${row.name} on the ${kind} key, as JSON: one document on stdout, the message on stderr, exit 1`, async () => {
      const r = await cli(['token', MINT, '--json'], { env, replies: { [SUMMARY]: row.reply }, timeoutMs: 50 });
      assert.equal(r.code, 1);
      const doc = json(r);
      assert.equal(typeof doc.message, 'string');
      assert.ok(doc.message.length > 10);
      assert.ok(r.err.includes(doc.message), 'stderr repeats the plain message');
      const expected: Record<string, unknown> = { ok: false, status: row.status, reason: want.reason, message: doc.message, key: kind, links: want.links };
      if (row.status === 403) expected.required_plan = row.requiredPlan;
      assert.deepEqual(doc, expected);
      assert.equal(r.calls.length, 1);
    });
  }
}

test('get answers a refusal in the same JSON shape, with get in its links', async () => {
  const r = await cli(['get', ROUTE], { replies: { [ROUTE]: forbidden('Layer 1', 'Free') } });
  assert.equal(r.code, 1);
  assert.deepEqual(json(r), {
    ok: false,
    status: 403,
    reason: 'plan',
    message: json(r).message,
    key: 'demo',
    links: { plans: 'https://conyr.ai/api?utm_source=cli&utm_medium=cli&utm_content=get' },
    required_plan: 'Layer 1',
  });
  assert.ok(r.err.includes('Layer 1'));
});

test('a refused second call of token is a refusal too, and nothing is printed on stdout', async () => {
  const r = await cli(['token', MINT], {
    replies: {
      [SUMMARY]: { status: 200, body: { token_mint: MINT, bundle_count: 0, open_bundle_count: 0, bundled_supply_pct: 0, bundled_value_usd: 0, bundled_realized_pnl_usd: 0, dominant_bundle_type: null } },
      [BUYERS]: { status: 429, body: { code: 429, error: 'rate limit exceeded' } },
    },
  });
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  assert.ok(r.err.includes(SIGN_UP));
  assert.equal(r.calls.length, 2);
});

// The key choice (spec 6.6): CONYR_API_KEY when set and not empty, otherwise the shared demo key.
for (const [name, env, key, kind] of [
  ['set', OWN, OWN_KEY, 'own'],
  ['set with spaces around it', { CONYR_API_KEY: `  ${OWN_KEY}\n` }, OWN_KEY, 'own'],
  ['empty', { CONYR_API_KEY: '' }, DEMO_KEY, 'demo'],
  ['only spaces', { CONYR_API_KEY: '   ' }, DEMO_KEY, 'demo'],
  ['not set', {}, DEMO_KEY, 'demo'],
] as const) {
  test(`CONYR_API_KEY ${name}: the ${kind} key is sent, to api.conyr.ai only, with the tool's name`, async () => {
    const r = await cli(['token', MINT, '--json'], { env, replies: { [SUMMARY]: { status: 404, body: { code: 404, error: 'x' } } } });
    assert.equal(json(r).key, kind);
    assert.equal(r.calls.length, 1);
    const call = r.calls[0]!;
    assert.equal(call.url, `https://api.conyr.ai${SUMMARY}`);
    assert.equal(call.headers.authorization, `Bearer ${key}`);
    assert.equal(call.headers['user-agent'], `conyr-cli/${VERSION}`);
  });
}

// The two kinds of 429 (API plans, spec 6.3 and 6.10): a body with reason "month_limit" is the monthly free stop, told
// apart from the busy minute. The body below is the API's own answer at the monthly cap (local run of the API with its
// start moved to 11-01, 2026-11-17).
const place = { command: 'get', via: undefined };
const MONTH_LINK = 'https://conyr.ai/app/profile?tab=api&plan=L1&utm_source=api&utm_medium=refusal&utm_content=month-limit';
const MONTH_BODY = { code: 429, error: 'Monthly free limit reached', limit: 10000, reason: 'month_limit', resets_at: '2026-12-01T00:00:00Z', retry_after_seconds: 1131712, upgrade_url: MONTH_LINK, used: 10004 };

test('a monthly stop is told apart from a busy minute', () => {
  const r = refusalFor({ kind: 'status', status: 429, body: { code: 429, reason: 'month_limit', limit: 10000,
    used: 10004, resets_at: '2026-12-01T00:00:00Z',
    upgrade_url: 'https://conyr.ai/app/profile?tab=api&plan=L1&utm_source=api&utm_medium=refusal&utm_content=month-limit' } },
    'own', place);
  assert.equal(r.reason, 'month_limit');
  assert.match(r.message, /10,000/);
  assert.match(r.message, /10,004/);
  assert.match(r.message, /2026-12-01/);
  assert.doesNotMatch(r.message, /minute/i);
  assert.equal(r.links.plans, 'https://conyr.ai/app/profile?tab=api&plan=L1&utm_source=api&utm_medium=refusal&utm_content=month-limit');
});
test('a link that is not Conyr is never printed', () => {
  const r = refusalFor({ kind: 'status', status: 429, body: { reason: 'month_limit', upgrade_url: 'https://evil.example/x' } }, 'own', place);
  assert.ok(r.links.plans?.startsWith('https://conyr.ai/'));
});
test('a Conyr link with hidden characters in it is never printed', () => {
  const bad = 'https://conyr.ai/app\u001b]8;;https://evil.example/\u0007/profile';
  const r = refusalFor({ kind: 'status', status: 429, body: { reason: 'month_limit', upgrade_url: bad } }, 'own', place);
  assert.equal(r.reason, 'month_limit');
  assert.equal(r.links.plans, 'https://conyr.ai/api?utm_source=cli&utm_medium=cli&utm_content=get');
});
test('a count or a date that does not read is left out of the line', () => {
  const r = refusalFor({ kind: 'status', status: 429, body: { reason: 'month_limit', used: 10004.5, limit: -1, resets_at: 'soon' } }, 'own', place);
  assert.equal(r.reason, 'month_limit');
  assert.doesNotMatch(r.message, /10,00[45]|-1|soon|NaN|undefined|null|Invalid/);
});
test('a 429 with no reason is still the minute limit', () => {
  assert.equal(refusalFor({ kind: 'status', status: 429, body: { code: 429, error: 'rate limit exceeded' } }, 'own', place).reason, 'rate_limit');
});
test('the demo key at a 429 is still "busy"', () => {
  assert.equal(refusalFor({ kind: 'status', status: 429, body: { reason: 'minute_limit' } }, 'demo', place).reason, 'demo_key_busy');
});

test('token on a key at the monthly stop: the line and the link on stderr, no "wait a minute", exit 1', async () => {
  const r = await cli(['token', MINT], { env: OWN, replies: { [SUMMARY]: { status: 429, body: MONTH_BODY } } });
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  for (const fact of ['10,004', '10,000', '2026-12-01', MONTH_LINK]) assert.ok(r.err.includes(fact), `stderr says ${fact}:\n${r.err}`);
  assert.doesNotMatch(r.err, /minute/i);
  assert.equal(r.calls.length, 1, 'the second call is not sent');
});

test('token --json on a key at the monthly stop: one refusal document with the reason and the link', async () => {
  const r = await cli(['token', MINT, '--json'], { env: OWN, replies: { [SUMMARY]: { status: 429, body: MONTH_BODY } } });
  assert.equal(r.code, 1);
  const doc = json(r);
  assert.deepEqual(doc, { ok: false, status: 429, reason: 'month_limit', message: doc.message, key: 'own', links: { plans: MONTH_LINK } });
  assert.ok(r.err.includes(doc.message));
});
