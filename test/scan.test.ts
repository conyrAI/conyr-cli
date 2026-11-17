// The scan (his picks at the gate, 2026-11-17): while the API answers, a person's terminal shows wallets (dots) forming
// bundles on stderr, with a line saying what is being read; it is erased before anything else is printed. Agents,
// pipes, --json, CI and dumb terminals never get it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, MINT, type Reply } from './helpers.ts';

const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const ERASE = '\r\u001b[2A\u001b[J';
const slow = (body: unknown): Reply => ({ status: 200, body, delayMs: 200 });
const SUMMARY = { token_mint: MINT, bundle_count: 2, open_bundle_count: 1, bundled_supply_pct: 1.5, bundled_value_usd: 1, bundled_realized_pnl_usd: 3, dominant_bundle_type: 'JitoMev' };
const BUYERS = { token_mint: MINT, window_hours: 1, total_buyers: 1, quality_tiers: [{ tier: 'bot_operated', count: 1, pct_of_buyers: 100, total_volume_usd: 50, avg_win_rate: null, notable_wallets: [] }], smart_money_signal: 0, volume_decomposition: {} };
const replies = {
  [`/v1/token/${MINT}/bundles/summary`]: slow(SUMMARY),
  [`/v1/token/${MINT}/buyer-quality?window_hours=1`]: slow(BUYERS),
};

test('in a terminal, token shows the scan on stderr, erases it, and prints the same answer', async () => {
  const shown = await cli(['token', MINT], { replies, stderrIsTTY: true });
  const plain = await cli(['token', MINT], { replies });
  assert.equal(shown.code, 0);
  assert.equal(shown.out, plain.out, 'stdout is the same with or without the scan');
  assert.match(shown.err, /reading bundles/);
  assert.match(shown.err, /reading buyers/);
  assert.match(shown.err, /\u00b7/, 'wallets are drawn as dots');
  assert.ok(shown.err.endsWith(ERASE), JSON.stringify(shown.err.slice(-40)));
});

test('the scan names the coin by its short form and the window', async () => {
  const r = await cli(['token', MINT], { replies, stderrIsTTY: true });
  assert.ok(r.err.includes(`${MINT.slice(0, 4)}…${MINT.slice(-4)}`), JSON.stringify(r.err.slice(0, 120)));
  assert.match(r.err, /1 hour/);
});

for (const [name, argv, env] of [
  ['--json', ['token', MINT, '--json'], {}],
  ['CI', ['token', MINT], { CI: 'true' }],
  ['a dumb terminal', ['token', MINT], { TERM: 'dumb' }],
] as const) {
  test(`no scan with ${name}`, async () => {
    const r = await cli([...argv], { replies, stderrIsTTY: true, env: { ...env } });
    assert.equal(r.code, 0);
    assert.equal(r.err, '');
  });
}

test('no scan when stderr is not a terminal (agents, pipes)', async () => {
  const r = await cli(['token', MINT], { replies });
  assert.equal(r.err, '');
});

test('a refusal is printed after the scan is erased', async () => {
  const r = await cli(['token', MINT], {
    replies: { [`/v1/token/${MINT}/bundles/summary`]: { status: 429, body: { code: 429, error: 'rate limit exceeded' }, delayMs: 150 } },
    stderrIsTTY: true,
  });
  assert.equal(r.code, 1);
  const after = r.err.slice(r.err.lastIndexOf(ERASE) + ERASE.length);
  assert.match(after, /^The shared demo key is at its limit/);
  assert.doesNotMatch(after, /\u00b7|\r|\u001b/);
});

test('key shows the scan while it checks the key', async () => {
  const check = { [`/v1/token/${BONK}/bundles/summary`]: slow(SUMMARY) };
  const shown = await cli(['key'], { replies: check, stderrIsTTY: true });
  const plain = await cli(['key'], { replies: check });
  assert.equal(shown.out, plain.out);
  assert.match(shown.err, /checking the key/);
  assert.ok(shown.err.endsWith(ERASE));
});

test('get never shows the scan: it always prints JSON', async () => {
  const route = `/v1/token/${MINT}/liquidity`;
  const r = await cli(['get', route], { replies: { [route]: slow({}) }, stderrIsTTY: true });
  assert.equal(r.code, 0);
  assert.equal(r.err, '');
});

test('the field: scattered wallets at the start, every wallet inside a bundle at the end', async () => {
  const { field } = await import('../src/scan.ts');
  const start = field(0);
  const end = field(1);
  assert.equal(start.length, 2);
  for (const row of [...start, ...end]) assert.ok(row.length <= 40, row);
  assert.ok(start.join('').includes('\u00b7'));
  assert.ok(!start.join('').includes('['), 'no bundle yet');
  for (const row of end) {
    assert.match(row, /\[\u00b7+\]/);
    assert.equal(row.replace(/\[\u00b7+\]/g, '').trim(), '', `every wallet is in a bundle: ${row}`);
  }
  assert.equal((end.join('').match(/\[/g) ?? []).length, 8, 'four bundles a row');
});
