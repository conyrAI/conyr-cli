// Every sentence conyr prints, apart from the help text (help.ts). The facts are fixed by the tests; the wording is free
// to change.

// --- refusals -----------------------------------------------------------------------------------------------------

export const keyRefused = () => 'The API refused the key in CONYR_API_KEY: it is wrong or was revoked.';

export const demoKeyRetired = () =>
  'The shared demo key in this version of conyr no longer works. Run the newest version, or use a free key of your own.';

export function plan(required: string | null, resolved: string | null, key: 'own' | 'demo'): string {
  const needs = required ? `This route needs the ${required} plan.` : 'This route needs a higher plan.';
  if (key === 'demo') return `${needs} The shared demo key is on the Free plan.`;
  return resolved ? `${needs} Your key is on the ${resolved} plan. Retrying will not change that.` : `${needs} Retrying will not change that.`;
}

export const rateLimit = () => 'Your key reached its limit for this minute. Wait a minute, or look at a higher plan.';

// The monthly free stop. Each part is left out when the answer did not give it: the counts as printed numbers, the
// day as YYYY-MM-DD.
export function monthLimit(used: string | null, limit: string | null, resetsOn: string | null): string {
  const amount = limit === null ? 'all of its' : used === null ? `its ${limit}` : `${used} of its ${limit}`;
  const again = resetsOn === null ? 'on the 1st of next month (UTC)' : `on ${resetsOn} (UTC)`;
  return `Your account has used ${amount} free calls this month. They start again ${again}, so retrying before then will not help.`;
}

export const demoKeyBusy = () =>
  'The shared demo key is at its limit for this minute; everyone without a key of their own shares it. Wait a minute, or get a free key of your own.';

export const badRequest = () => 'The API did not accept the address or a value in the request.';

export const notFound = () => 'Nothing at that route, or no such coin, wallet or cluster.';

export const apiError = (status: number) => `Conyr's API failed with status ${status}. Nothing is filled in.`;

export const badAnswer = () => 'The answer could not be read as JSON. Nothing is filled in.';

export const timeout = (ms: number) => `The API did not answer within ${ms / 1000} seconds. It may be slow; try again.`;

export const network = (code: string | undefined) => `api.conyr.ai could not be reached${code ? ` (${code})` : ''}.`;

const LINK_LABELS: Record<string, string> = {
  free_key: 'Free key',
  key_page: 'Create a key',
  plans: 'Plans',
  page: 'Page',
};

export const linkLabel = (name: string) => LINK_LABELS[name] ?? name;

// --- usage errors (one line each; "Run conyr --help" follows) ------------------------------------------------------

// An argument echoed back, in quotes, on one line and short.
const shown = (value: string) => JSON.stringify(value.length > 60 ? `${value.slice(0, 60)}...` : value);

export const unknownCommand = (command: string) => `Unknown command ${shown(command)}. The commands are token, get and key.`;
export const unknownOption = (option: string) => `Unknown option ${shown(option)}.`;
export const missingValue = (option: string) => `${option} needs a value.`;
export const takesNoValue = (option: string) => `${option} takes no value.`;
export const notForCommand = (option: string, command: string) => `conyr ${command} does not take ${option}.`;
export const needsCommand = (option: string) => `${option} goes with a command: token, get or key.`;
export const tokenNeedsMint = () => "conyr token needs one coin's mint address.";
export const notAMint = (value: string) =>
  `${shown(value)} is not a Solana mint address: conyr token takes a coin's mint address (32 to 44 base58 characters), not a name or ticker.`;
export const badHours = (value: string) => `--hours must be a whole number from 1 to 24, not ${shown(value)}.`;
export const badVia = (value: string) =>
  `--via must be an agent skill's name: conyr- followed by lowercase letters, digits or hyphens, at most 64 characters, not ${shown(value)}.`;
export const getNeedsRoute = () => 'conyr get needs a route, such as /v1/token/<mint>/bundles/summary.';
export const badRoute = (value: string) =>
  `${shown(value)} is not a route of Conyr's API: a route starts with /v1/ (or https://api.conyr.ai/v1/).`;
export const badParam = (value: string) => `${shown(value)} is not name=value.`;
export const keyTakesNothing = (value: string) => `conyr key takes no address or route, not ${shown(value)}.`;

// --- conyr token ----------------------------------------------------------------------------------------------------

// The ten bundle types and the six buyer kinds, with the meanings the conyr-token-check skill gives them.
export const BUNDLE_TYPES: Record<string, string> = {
  JitoMev: 'trades side by side in one slot, as in Jito or MEV execution',
  JitoSequential: 'sequential Jito execution',
  SameSlotBuyCohort: 'several wallets buying in the same slot',
  SameSlotSellCohort: 'several wallets selling in the same slot',
  LaunchSlotBurst: "a coordinated burst at the coin's launch or first trading slot",
  MultiSlotBuyCohort: 'coordinated buys spread over nearby slots',
  SybilPoisoning: 'several wallets funded from the same source, buying together',
  CexCoordinated: 'wallets funded from exchange hot wallets, acting together',
  SyntheticSwarm: 'clusters of wallets with the same structure',
  Hybrid: 'more than one of these types',
};

export const BUYER_KINDS: Record<string, string> = {
  elite_smart_money: 'top-performing profitable wallets with elite track records',
  consistent_organic: 'consistently profitable wallets that are not bot-operated or farm-funded',
  developing_organic: 'wallets that are not bot-operated or farm-funded, still building a track record',
  bot_operated: 'automated, bot-driven wallets',
  farm_funded: 'wallets funded by known farm distributors',
  unrated_new: 'wallets with no behavior profile yet',
};

export const notRecognized = 'not recognized';
export const hoursText = (h: number) => `${h} hour${h === 1 ? '' : 's'}`;

export const label = { coin: 'Coin', bundles: 'Bundles', buyers: 'Buyers', page: 'Page', key: 'Key' };
export const bundlesFound = (found: string, open: string, share: string | null) =>
  `${found} found, ${open} still open${share === null ? '' : `, holding ${share} of supply`}`;
export const noBundles = 'None found. That does not mean the coin is safe.';
export const leadingType = (type: string) => `Leading type: ${type}`;
export const realizedPnl = (amount: string) => `Realized profit and loss: ${amount}`;
export const buyersSeen = (n: string, hours: number) => `${n} wallets bought in the last ${hoursText(hours)}`;
export const noBuys = (hours: number) =>
  `No buys were seen in the last ${hoursText(hours)}.${hours < 24 ? ' Try --hours 24.' : ''}`;
export const tableHeader = { kind: 'kind', wallets: 'wallets', bought: 'bought (USD)' };
export const stillOpen = 'still open';
export const legend = (kind: string, meaning: string) => `${kind}: ${meaning}`;
export const smartMoney = (share: string) => `${share} of the buy volume came from wallets with a profitable record`;
export const demoKeyLine = (link: string) => `Conyr's shared demo key. Your own free key: ${link}`;

// Fixed sentences for `notes` in conyr token --json.
export const notes = {
  units:
    'bundled_supply_pct is a percent from 0 to 100: 0.04 means 0.04%, not 4%. pct_of_buyers is a percent from 0 to 100. ' +
    'smart_money_signal is a fraction from 0 to 1: the share of the buy volume that came from elite_smart_money and ' +
    'consistent_organic wallets. total_volume_usd and bundled_realized_pnl_usd are in USD.',
  noBundles: 'Zero bundles means Conyr found none. It does not mean the coin is safe.',
  noBuys: 'No buys were seen in the window: try --hours 24 before saying nobody is buying.',
  type: (name: string, meaning: string) => `${name}: ${meaning}.`,
  unknown: (name: string) => `${name} is not one of the types or kinds this version of conyr knows.`,
  cautions: [
    'A detection describes what was seen on chain. It does not say who owns the wallets or what they intend.',
    'Buyer kinds are labels, not proof about any one wallet.',
    'None of this is a trading signal or advice.',
  ],
};

export const badShape = (field: string) => `The answer did not hold ${field}, which conyr reads. Nothing is filled in.`;

// The scan line, while the API answers (a person's terminal only).
export const scanBundles = (shortMint: string) => `reading bundles   ${shortMint}`;
export const scanBuyers = (hours: number) => `reading buyers    last ${hoursText(hours)}`;
export const scanKey = () => 'checking the key';

// --- conyr get ------------------------------------------------------------------------------------------------------

export const cleanedNotice = (n: number) =>
  `Cleaned ${n} string${n === 1 ? '' : 's'} in the answer: hidden characters or instruction-like text removed, or long text cut.`;

// --- conyr key ------------------------------------------------------------------------------------------------------

export const ownKey = (prefix: string) => `The key in CONYR_API_KEY (${prefix}...)`;
export const demoKey = "Conyr's shared demo key (CONYR_API_KEY is not set)";
export const accepted = 'Yes';
export const acceptedAtLimit = 'Yes, and it is at its limit for this minute';
export const acceptedAtMonthLimit = (monthLine: string) => `Yes. ${monthLine}`;

export function keyReport(which: string, verdict: string, links: { free_key: string; key_page: string; plans: string }): string {
  return `Key       ${which}
Accepted  ${verdict}

A key of your own:
  1. Sign up: ${links.free_key}
  2. Create a key: ${links.key_page}
  3. Set it where you run conyr: export CONYR_API_KEY=<your key>
Plans: ${links.plans}
`;
}
