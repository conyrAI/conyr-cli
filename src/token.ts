import { call, type Io } from './api.ts';
import { bar } from './chart.ts';
import { cleanString } from './clean.ts';
import { count, pct, usd } from './format.ts';
import { chooseKey } from './keys.ts';
import { coinPage, SIGN_UP, tagged, type Place } from './links.ts';
import { printRefusal, toJson } from './output.ts';
import { refusalFor } from './refusals.ts';
import { startScan } from './scan.ts';
import * as words from './words.ts';

// Width of every bar, in character cells.
const BAR = 10;

export interface TokenArgs {
  mint: string;
  hours: number;
  json: boolean;
  via: string | undefined;
}

interface Bundles {
  bundle_count: number;
  open_bundle_count: number;
  bundled_supply_pct: number | null;
  bundled_realized_pnl_usd: number | null;
  dominant_bundle_type: string | null;
}

interface Tier {
  tier: string;
  count: number;
  pct_of_buyers: number;
  total_volume_usd: number;
}

interface Buyers {
  window_hours: number;
  total_buyers: number;
  smart_money_signal: number | null;
  quality_tiers: Tier[];
}

// conyr token: two Free calls in order; the second is not sent when the first is refused. Both must answer: there
// is no half answer.
export async function runToken(args: TokenArgs, io: Io): Promise<number> {
  const key = chooseKey(io.env);
  const place: Place = { command: 'token', via: args.via };
  const refuse = (failure: Parameters<typeof refusalFor>[0]) => printRefusal(refusalFor(failure, key.kind, place), key.kind, args.json, io);
  const scan = args.json ? startScan({ ...io, stderrIsTTY: false }) : startScan(io);
  scan.phase(words.scanBundles(`${args.mint.slice(0, 4)}…${args.mint.slice(-4)}`));
  const summary = await call(`/v1/token/${args.mint}/bundles/summary`, key, io);
  if (!summary.ok) {
    scan.stop();
    return refuse(summary.failure);
  }
  scan.phase(words.scanBuyers(args.hours));
  const quality = await call(`/v1/token/${args.mint}/buyer-quality?window_hours=${args.hours}`, key, io);
  scan.stop();
  if (!quality.ok) return refuse(quality.failure);

  const bundles = readBundles(summary.data);
  const buyers = readBuyers(quality.data);
  for (const read of [bundles, buyers]) {
    if (typeof read === 'string') {
      const refusal = { status: 200, reason: 'bad_answer' as const, message: words.badShape(read), links: {} };
      return printRefusal(refusal, key.kind, args.json, io);
    }
  }
  const b = bundles as Bundles;
  const q = buyers as Buyers;
  q.quality_tiers.sort(byWalletsThenKind);
  const links: Record<string, string> = { page: tagged(coinPage(args.mint), place) };
  if (key.kind === 'demo') links.free_key = tagged(SIGN_UP, place);

  if (args.json) {
    io.stdout(toJson({ ok: true, command: 'token', mint: args.mint, bundles: b, buyers: q, notes: notes(b, q), links, key: key.kind }));
  } else {
    io.stdout(text(args.mint, b, q, links));
  }
  return 0;
}

const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const field = (data: unknown, name: string) => (data !== null && typeof data === 'object' ? (data as Record<string, unknown>)[name] : undefined);

// The fields conyr prints, from the API's answer. A missing count is an answer that cannot be read (the name of the
// missing field is returned); a missing share, profit and loss, type or smart-money figure is printed as missing.
function readBundles(data: unknown): Bundles | string {
  const bundleCount = number(field(data, 'bundle_count'));
  const openCount = number(field(data, 'open_bundle_count'));
  if (bundleCount === null) return 'bundle_count';
  if (openCount === null) return 'open_bundle_count';
  const type = field(data, 'dominant_bundle_type');
  return {
    bundle_count: bundleCount,
    open_bundle_count: openCount,
    bundled_supply_pct: number(field(data, 'bundled_supply_pct')),
    bundled_realized_pnl_usd: number(field(data, 'bundled_realized_pnl_usd')),
    dominant_bundle_type: typeof type === 'string' ? cleanString(type) : null,
  };
}

function readBuyers(data: unknown): Buyers | string {
  const hours = number(field(data, 'window_hours'));
  const total = number(field(data, 'total_buyers'));
  const tiers = field(data, 'quality_tiers');
  if (hours === null) return 'window_hours';
  if (total === null) return 'total_buyers';
  if (!Array.isArray(tiers)) return 'quality_tiers';
  const read: Tier[] = [];
  for (const t of tiers) {
    const name = field(t, 'tier');
    const wallets = number(field(t, 'count'));
    const share = number(field(t, 'pct_of_buyers'));
    const volume = number(field(t, 'total_volume_usd'));
    if (typeof name !== 'string' || wallets === null || share === null || volume === null) return 'quality_tiers';
    read.push({ tier: cleanString(name), count: wallets, pct_of_buyers: share, total_volume_usd: volume });
  }
  return { window_hours: hours, total_buyers: total, smart_money_signal: number(field(data, 'smart_money_signal')), quality_tiers: read };
}

const KIND_ORDER = Object.keys(words.BUYER_KINDS);
const rank = (kind: string) => (KIND_ORDER.includes(kind) ? KIND_ORDER.indexOf(kind) : KIND_ORDER.length);

// Most wallets first; a tie goes in the skill's order of the kinds.
function byWalletsThenKind(a: Tier, b: Tier): number {
  return b.count - a.count || rank(a.tier) - rank(b.tier) || a.tier.localeCompare(b.tier);
}

// A value from a fixed list is printed as it is; anything else, already cleaned, in quotes as not recognized.
const shown = (value: string, list: Record<string, string>) => (value in list ? value : JSON.stringify(value));
const meaning = (value: string, list: Record<string, string>) => list[value] ?? words.notRecognized;

function text(mint: string, b: Bundles, q: Buyers, links: Record<string, string>): string {
  const lines: string[] = [];
  const row = (label: string, value: string) => lines.push(`${label.padEnd(9)}${value}`);
  const more = (value: string) => lines.push(`${' '.repeat(9)}${value}`);

  row(words.label.coin, mint);
  if (b.bundle_count === 0) {
    row(words.label.bundles, words.noBundles);
  } else {
    const share = b.bundled_supply_pct === null ? null : pct(b.bundled_supply_pct);
    row(words.label.bundles, words.bundlesFound(count(b.bundle_count), count(b.open_bundle_count), share));
    const open = b.open_bundle_count / b.bundle_count;
    more(`${words.stillOpen}  ${bar(open, BAR)}  ${pct(open * 100)}`);
    const type = b.dominant_bundle_type;
    if (type !== null) more(words.leadingType(`${shown(type, words.BUNDLE_TYPES)} (${meaning(type, words.BUNDLE_TYPES)})`));
    if (b.bundled_realized_pnl_usd !== null) more(words.realizedPnl(usd(b.bundled_realized_pnl_usd, true)));
  }

  if (q.total_buyers === 0) {
    row(words.label.buyers, words.noBuys(q.window_hours));
  } else {
    row(words.label.buyers, words.buyersSeen(count(q.total_buyers), q.window_hours));
    // Each kind's wallets (its share of the buyers, from the API) and its USD bought (its share of what all the kinds
    // bought, the same total smart_money_signal is a share of).
    const bought = q.quality_tiers.reduce((sum, t) => sum + t.total_volume_usd, 0);
    const rows = q.quality_tiers.map((t) => {
      const ofBought = bought > 0 ? t.total_volume_usd / bought : 0;
      return {
        kind: shown(t.tier, words.BUYER_KINDS), wallets: count(t.count), walletBar: bar(t.pct_of_buyers / 100, BAR),
        walletPct: pct(t.pct_of_buyers), usd: usd(t.total_volume_usd), usdBar: bar(ofBought, BAR), usdPct: pct(ofBought * 100),
      };
    });
    const w = (pick: (r: (typeof rows)[number]) => string, min = 0) => Math.max(min, ...rows.map((r) => pick(r).length));
    const [kindW, walletsW, walletPctW, usdW] = [w((r) => r.kind, words.tableHeader.kind.length), w((r) => r.wallets), w((r) => r.walletPct), w((r) => r.usd)];
    const walletsBlock = walletsW + 2 + BAR + 2 + walletPctW;
    more(`${words.tableHeader.kind.padEnd(kindW)}  ${words.tableHeader.wallets.padEnd(walletsBlock)}  ${words.tableHeader.bought}`);
    for (const r of rows) {
      more(`${r.kind.padEnd(kindW)}  ${r.wallets.padStart(walletsW)}  ${r.walletBar}  ${r.walletPct.padStart(walletPctW)}  ` +
        `${r.usd.padStart(usdW)}  ${r.usdBar}  ${r.usdPct}`);
    }
    if (q.smart_money_signal !== null) more(words.smartMoney(pct(q.smart_money_signal * 100)));
    for (const t of q.quality_tiers) more(words.legend(shown(t.tier, words.BUYER_KINDS), meaning(t.tier, words.BUYER_KINDS)));
  }

  row(words.label.page, links.page!);
  if (links.free_key) row(words.label.key, words.demoKeyLine(links.free_key));
  return `${lines.join('\n')}\n`;
}

function notes(b: Bundles, q: Buyers): string[] {
  const out = [words.notes.units];
  const explain = (value: string, list: Record<string, string>) =>
    out.push(value in list ? words.notes.type(value, list[value]!) : words.notes.unknown(JSON.stringify(value)));
  if (b.bundle_count === 0) out.push(words.notes.noBundles);
  else if (b.dominant_bundle_type !== null) explain(b.dominant_bundle_type, words.BUNDLE_TYPES);
  if (q.total_buyers === 0) out.push(words.notes.noBuys);
  for (const t of q.quality_tiers) explain(t.tier, words.BUYER_KINDS);
  return [...out, ...words.notes.cautions];
}
