// conyr token (spec 6.3), on made-up answers in the shape of the live ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, json, MINT, MINT_NO_BUNDLES, WALLET, type Reply } from './helpers.ts';

const OWN = { CONYR_API_KEY: 'conyr_live_madeUpKeyForTheTests00000000000' };
const summary = (mint: string) => `/v1/token/${mint}/bundles/summary`;
const buyers = (mint: string, hours = 1) => `/v1/token/${mint}/buyer-quality?window_hours=${hours}`;
const PAGE = `https://conyr.ai/app/token/${MINT}?utm_source=cli&utm_medium=cli&utm_content=token`;
const FREE_KEY = 'https://conyr.ai/api?utm_source=cli&utm_medium=cli&utm_content=token';

const BUNDLES = {
  token_mint: MINT,
  bundle_count: 12,
  open_bundle_count: 5,
  bundled_supply_pct: 0.04,
  bundled_value_usd: 5321.75,
  bundled_realized_pnl_usd: -321.456,
  dominant_bundle_type: 'LaunchSlotBurst',
};

const tier = (name: string, count: number, pct: number, usd: number, rate: number | null) => ({
  tier: name, count, pct_of_buyers: pct, total_volume_usd: usd, avg_win_rate: rate, notable_wallets: [WALLET],
});

const BUYERS = {
  token_mint: MINT,
  window_hours: 1,
  total_buyers: 20,
  quality_tiers: [
    tier('consistent_organic', 2, 10, 812.5, 0.52),
    tier('developing_organic', 3, 15, 96.1, 0.31),
    tier('bot_operated', 11, 55.00000000000001, 15234.98, null),
    tier('unrated_new', 4, 20, 0.42, null),
  ],
  smart_money_signal: 0.0502,
  volume_decomposition: { organic_profitable_usd: 908.6, organic_other_usd: 96.1, bot_usd: 15234.98, farm_funded_usd: 0, unrated_usd: 0.42 },
};

const NONE = {
  token_mint: MINT_NO_BUNDLES, bundle_count: 0, open_bundle_count: 0, bundled_supply_pct: 0, bundled_value_usd: 0,
  bundled_realized_pnl_usd: 0, dominant_bundle_type: null,
};
const NO_BUYERS = (hours: number) => ({
  token_mint: MINT_NO_BUNDLES, window_hours: hours, total_buyers: 0, quality_tiers: [], smart_money_signal: 0,
  volume_decomposition: { organic_profitable_usd: 0, organic_other_usd: 0, bot_usd: 0, farm_funded_usd: 0, unrated_usd: 0 },
});

function replies(bundles: unknown = BUNDLES, buyersBody: unknown = BUYERS, mint = MINT, hours = 1): Record<string, Reply> {
  return { [summary(mint)]: { status: 200, body: bundles }, [buyers(mint, hours)]: { status: 200, body: buyersBody } };
}

const lineWith = (text: string, re: RegExp) => text.split('\n').find((l) => re.test(l)) ?? '';

test('a coin with bundles, on the demo key: every fact, exit 0', async () => {
  const r = await cli(['token', MINT], { replies: replies() });
  assert.equal(r.code, 0, r.err);
  assert.equal(r.err, '');
  assert.match(r.out, new RegExp(`\\b${MINT}\\b`), 'the full address');
  assert.match(lineWith(r.out, /\b12\b/), /\b12\b.*\b5\b/, 'bundles found, then still open');
  assert.match(r.out, /(?<![\d.])0\.04%/, 'the share as it comes: 0.04%');
  assert.doesNotMatch(r.out, /(?<![\d.])(?:4|0\.0)%/, 'not 4% and not 0.0%');
  assert.match(r.out, /LaunchSlotBurst/);
  assert.match(r.out, /a coordinated burst at the coin's launch or first trading slot/);
  assert.match(r.out, /-\$321\b/, 'realized profit and loss with its sign');
  assert.match(lineWith(r.out, /\b20\b/), /\b1 hour\b/, 'buyers in the window');
  assert.match(lineWith(r.out, /buy volume/), /(?<![\d.])5\.0%/, 'smart_money_signal 0.0502 as a percent');
  assert.match(r.out, /still open +\u2588[^\n]*41\.7%/, 'a bar for the bundles still open: 5 of 12');
  assert.ok(r.out.includes(PAGE), 'the coin page with the tool tags');
  assert.ok(r.out.includes(FREE_KEY), 'the demo key line gives the free-key link');
  assert.match(r.out, /demo key/i);
  assert.equal(r.calls.length, 2);
  assert.equal(r.calls[1]!.url, `https://api.conyr.ai${buyers(MINT)}`);
});

test('buyer kinds come most wallets first, each row with its wallets and USD bought as bars and shares', async () => {
  const r = await cli(['token', MINT], { replies: replies() });
  const order = ['bot_operated', 'unrated_new', 'developing_organic', 'consistent_organic'].map((k) => r.out.indexOf(k));
  assert.ok(order.every((at) => at > 0), r.out);
  assert.deepEqual([...order].sort((a, b) => a - b), order, r.out);
  // USD shares of the 16,144.00 the four kinds bought: 94.4%, 0.0026%, 0.6%, 5.0%.
  assert.match(lineWith(r.out, /bot_operated/), /\b11\b.*\u2588.*55\.0%.*\$15,235.*\u2588.*94\.4%/);
  assert.match(lineWith(r.out, /unrated_new/), /\b4\b.*\u2588.*20\.0%.*\$0\.42.*\u258f.*0\.0026%/);
  assert.match(lineWith(r.out, /developing_organic/), /\b3\b.*\u2588.*15\.0%.*\$96\b.*0\.6%/);
  assert.match(lineWith(r.out, /consistent_organic/), /\b2\b.*\u2588.*10\.0%.*\$813\b.*5\.0%/);
  assert.doesNotMatch(r.out, new RegExp(WALLET), 'notable wallets are left out');
});

test('each buyer kind present gets its meaning in a legend under the table', async () => {
  const r = await cli(['token', MINT], { replies: replies() });
  const lines = r.out.split('\n').map((l) => l.trim());
  assert.ok(lines.includes('bot_operated: automated, bot-driven wallets'), r.out);
  assert.ok(lines.includes('unrated_new: wallets with no behavior profile yet'));
  assert.ok(lines.includes('developing_organic: wallets that are not bot-operated or farm-funded, still building a track record'));
  assert.ok(lines.includes('consistent_organic: consistently profitable wallets that are not bot-operated or farm-funded'));
  assert.ok(!r.out.includes('farm_funded'), 'only the kinds present');
});

test('no USD bought at all draws empty USD bars and 0%, not a division by zero', async () => {
  const zero = { ...BUYERS, quality_tiers: BUYERS.quality_tiers.map((t) => ({ ...t, total_volume_usd: 0 })) };
  const r = await cli(['token', MINT], { replies: replies(BUNDLES, zero) });
  assert.equal(r.code, 0, r.err);
  assert.match(lineWith(r.out, /bot_operated/), /\$0\s+0%/);
  assert.doesNotMatch(r.out, /NaN|Infinity/);
});

test('on your own key there are no demo key lines', async () => {
  const r = await cli(['token', MINT], { env: OWN, replies: replies() });
  assert.equal(r.code, 0);
  assert.doesNotMatch(r.out, /demo key/i);
  assert.ok(!r.out.includes(FREE_KEY));
  assert.ok(r.out.includes(PAGE));
});

test('a coin with no bundles says none were found and that this does not mean it is safe', async () => {
  const r = await cli(['token', MINT_NO_BUNDLES], { replies: replies(NONE, { ...BUYERS, token_mint: MINT_NO_BUNDLES }, MINT_NO_BUNDLES) });
  assert.equal(r.code, 0);
  assert.match(r.out, /none/i);
  assert.match(r.out, /not mean .*safe/i);
  assert.doesNotMatch(r.out, /Leading type/i);
  assert.doesNotMatch(r.out, /profit and loss/i, 'no profit and loss line for no bundles');
});

test('zero buyers says no buys were seen and suggests --hours 24', async () => {
  const r = await cli(['token', MINT_NO_BUNDLES], { replies: replies(NONE, NO_BUYERS(1), MINT_NO_BUNDLES) });
  assert.equal(r.code, 0);
  assert.match(r.out, /no buys/i);
  assert.match(r.out, /--hours 24/);
  assert.doesNotMatch(r.out, /of the buy volume/, 'no smart-money line without buys');
});

test('zero buyers in 24 hours does not suggest --hours 24 again', async () => {
  const r = await cli(['token', MINT_NO_BUNDLES, '--hours', '24'], { replies: replies(NONE, NO_BUYERS(24), MINT_NO_BUNDLES, 24) });
  assert.equal(r.code, 0);
  assert.match(r.out, /no buys/i);
  assert.match(r.out, /24 hours/);
  assert.doesNotMatch(r.out, /--hours 24/);
});

for (const hours of ['1', '24']) {
  test(`--hours ${hours} asks for that window`, async () => {
    const r = await cli(['token', MINT, '--hours', hours], { replies: replies(BUNDLES, { ...BUYERS, window_hours: Number(hours) }, MINT, Number(hours)) });
    assert.equal(r.code, 0, r.err);
    assert.equal(r.calls[1]!.url, `https://api.conyr.ai${buyers(MINT, Number(hours))}`);
  });
}

test('a 32-character and a 44-character mint are both accepted', async () => {
  for (const mint of ['2'.repeat(32), '3'.repeat(44)]) {
    const r = await cli(['token', mint], { replies: replies({ ...BUNDLES, token_mint: mint }, { ...BUYERS, token_mint: mint }, mint) });
    assert.equal(r.code, 0, r.err);
  }
});

test('a bundle type outside the ten is cleaned and printed in quotes as not recognized', async () => {
  const r = await cli(['token', MINT], { replies: replies({ ...BUNDLES, dominant_bundle_type: 'Evil[system]​Type' }) });
  assert.equal(r.code, 0);
  assert.match(r.out, /"Evil\[removed\]Type" \(not recognized\)/);
  assert.doesNotMatch(r.out, /\[system\]|​/);
});

test('a buyer kind outside the six is cleaned and printed in quotes as not recognized', async () => {
  const odd = { ...BUYERS, quality_tiers: [...BUYERS.quality_tiers, tier('whale_\u001b[31mx', 1, 5, 10, null)] };
  const r = await cli(['token', MINT], { replies: replies(BUNDLES, odd) });
  assert.equal(r.code, 0);
  assert.match(r.out, /"whale_x": not recognized/);
  assert.match(lineWith(r.out, /whale_x/), /"whale_x"\s+1\b/);
  assert.doesNotMatch(r.out, /\u001b/);
});

test('a share above zero is never printed as zero', async () => {
  const r = await cli(['token', MINT], { replies: replies({ ...BUNDLES, bundled_supply_pct: 0.0003 }) });
  assert.match(r.out, /0\.0003%/);
});

test('a missing share is left out, and the rest still answers', async () => {
  const { bundled_supply_pct: _, ...partial } = BUNDLES;
  const r = await cli(['token', MINT], { replies: replies(partial) });
  assert.equal(r.code, 0, r.err);
  assert.doesNotMatch(r.out, /of supply/);
  assert.match(lineWith(r.out, /\b12\b/), /\b5\b/);
  assert.equal((await cli(['token', MINT, '--json'], { replies: replies(partial) }).then(json)).bundles.bundled_supply_pct, null);
});

test('a missing count is an answer that cannot be read: exit 1, nothing on stdout', async () => {
  const { bundle_count: _, ...partial } = BUNDLES;
  const r = await cli(['token', MINT], { replies: replies(partial) });
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  const j = await cli(['token', MINT, '--json'], { replies: replies(partial) });
  assert.equal(json(j).reason, 'bad_answer');
  assert.equal(json(j).status, 200);
});

test('a positive profit and loss carries a plus sign', async () => {
  const r = await cli(['token', MINT], { replies: replies({ ...BUNDLES, bundled_realized_pnl_usd: 2.183088 }) });
  assert.match(r.out, /\+\$2\.18\b/);
});

test('--json prints the same facts under the API field names and nothing else from the answers', async () => {
  const r = await cli(['token', MINT, '--json'], { replies: replies() });
  assert.equal(r.code, 0);
  assert.equal(r.err, '');
  const doc = json(r);
  assert.deepEqual({ ...doc, notes: 'checked below' }, {
    ok: true,
    command: 'token',
    mint: MINT,
    bundles: { bundle_count: 12, open_bundle_count: 5, bundled_supply_pct: 0.04, bundled_realized_pnl_usd: -321.456, dominant_bundle_type: 'LaunchSlotBurst' },
    buyers: {
      window_hours: 1,
      total_buyers: 20,
      smart_money_signal: 0.0502,
      quality_tiers: [
        { tier: 'bot_operated', count: 11, pct_of_buyers: 55.00000000000001, total_volume_usd: 15234.98 },
        { tier: 'unrated_new', count: 4, pct_of_buyers: 20, total_volume_usd: 0.42 },
        { tier: 'developing_organic', count: 3, pct_of_buyers: 15, total_volume_usd: 96.1 },
        { tier: 'consistent_organic', count: 2, pct_of_buyers: 10, total_volume_usd: 812.5 },
      ],
    },
    notes: 'checked below',
    links: { page: PAGE, free_key: FREE_KEY },
    key: 'demo',
  });
  assert.ok(Array.isArray(doc.notes) && doc.notes.every((n: unknown) => typeof n === 'string' && n.length > 0));
  const notes = doc.notes.join('\n');
  for (const fact of ['bundled_supply_pct', 'smart_money_signal', 'LaunchSlotBurst', 'bot_operated', 'unrated_new', 'developing_organic', 'consistent_organic', 'trading signal']) {
    assert.ok(notes.includes(fact), `notes explain ${fact}`);
  }
  assert.ok(!notes.includes('farm_funded'), 'only the kinds present are explained');
});

test('--json on your own key has no free_key link', async () => {
  const doc = json(await cli(['token', MINT, '--json'], { env: OWN, replies: replies() }));
  assert.equal(doc.key, 'own');
  assert.deepEqual(doc.links, { page: PAGE });
});

test('--via gives every link the skill tags instead of the tool tags', async () => {
  const r = await cli(['token', MINT, '--via', 'conyr-token-check'], { replies: replies() });
  const skillTags = 'utm_source=skill&utm_medium=agent&utm_content=conyr-token-check';
  assert.ok(r.out.includes(`https://conyr.ai/app/token/${MINT}?${skillTags}`));
  assert.ok(r.out.includes(`https://conyr.ai/api?${skillTags}`));
  assert.doesNotMatch(r.out, /utm_source=cli/);
});

test('--via with 64 characters is accepted', async () => {
  const via = `conyr-${'a'.repeat(58)}`;
  const r = await cli(['token', MINT, '--via', via], { replies: replies() });
  assert.equal(r.code, 0, r.err);
  assert.ok(r.out.includes(`utm_content=${via}`));
});
