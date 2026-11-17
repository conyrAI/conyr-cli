// The help text. An agent that guessed `npx conyr` has only this text, so it must be enough to use the tool correctly.
import type { Command } from './args.ts';
import { DOCS, KEY_PAGE, OPENAPI, SIGN_UP, tagged, type Place } from './links.ts';

export function mainHelp(place: Place): string {
  return `conyr: Conyr's Solana API from the command line. Is coordinated wallet buying (bundles) on a coin,
what kinds of wallets are buying it, and any other /v1 route of the API.

Commands
  conyr token <mint> [--hours <1-24>] [--json]
      Free plan. Bundles on the coin, and the kinds of wallets that bought it in the
      last hours. <mint> is a coin's mint address: not a name or ticker, and not a
      wallet address (a wallet answers as a coin with nothing found).
  conyr get <route> [name=value ...]
      Any /v1 route of the API, answered as one JSON document. Each route has its
      plan: Free, Layer 1, Layer 2 or Layer 3, as the OpenAPI file below says.
      Example on the Layer 1 plan: conyr get /v1/token/<mint>/liquidity
  conyr key [--json]
      Which key is in use, whether the API accepts it, and how to get one.

The key
  conyr uses the key in CONYR_API_KEY. When it is not set, conyr uses Conyr's shared
  demo key: a Free key that everyone without a key of their own shares, so it can be
  at its limit. A free key of your own: ${tagged(SIGN_UP, place)}
  Create it at ${tagged(KEY_PAGE, place)}
  then: export CONYR_API_KEY=<your key>

Options
  --json          Print one JSON document on stdout. conyr get always does.
  --hours <n>     token only: how many hours of buying to read, 1 to 24 (default 1).
  --via <skill>   For agent skills: the skill's name (conyr-...), so links carry its tags.
  -h, --help      This text. conyr <command> --help for one command.
  --version       The version of conyr.

Exit codes
  0   answered
  1   the call was refused or failed; the message says why and what to do next
  2   wrong usage

The API
  For agents: ${tagged(DOCS, place)}
  Every /v1 route and its plan: ${OPENAPI}

A detection describes what was seen on chain, not who owns the wallets or what they
intend. None of it is a trading signal.
`;
}

export function commandHelp(command: Command, place: Place): string {
  switch (command) {
    case 'token':
      return `conyr token <mint> [--hours <1-24>] [--json]

Free plan. Two calls for a Solana coin, by its mint address (not a name or ticker):
  bundles   coordinated bundles of wallets on the coin, how many are still open, the share
            of supply they hold and the leading bundle type
  buyers    the kinds of wallets that bought it in the last hours, by wallet count and USD

  --hours <n>     hours of buying to read, 1 to 24 (default 1); use 24 for a coin that
                  trades slowly
  --json          the same facts as one JSON document, under the API's field names
  --via <skill>   for agent skills: the skill's name, so links carry its tags

<mint> must be a coin's mint address. A wallet address answers as a coin with no bundles
and no buyers, which says nothing about the wallet. A coin with no bundles found is not
shown to be safe.

Example: conyr token DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
`;
    case 'get':
      return `conyr get <route> [name=value ...]

One GET of a /v1 route of Conyr's API, printed as one JSON document:
  { "ok": true, "status": 200, "route": "...", "data": <the answer>, "cleaned": 0, "key": "own" }
A refusal is { "ok": false, "status": ..., "reason": "...", "message": "...", ... } and exit 1.

  <route>         starts with /v1/, or https://api.conyr.ai/v1/
  name=value      added to the route's query, encoded
  --via <skill>   for agent skills: the skill's name, so links carry its tags

Each route has its plan (Free, Layer 1, Layer 2 or Layer 3). The list of routes, with each
one's plan: ${OPENAPI}
Text written by outsiders (coin names, labels, reasons) is cleaned: hidden characters and
instruction-like text are removed, and very long text is cut. "cleaned" counts the strings
changed.

Example on the Layer 1 plan: conyr get /v1/token/<mint>/ohlcv timeframe=5m limit=100
Plans: ${tagged(SIGN_UP, place)}
`;
    case 'key':
      return `conyr key [--json]

Says which key conyr uses (the one in CONYR_API_KEY, or Conyr's shared demo key), makes
one free call to see whether the API accepts it, and says how to get a key of your own.

  --json          the same as one JSON document
  --via <skill>   for agent skills: the skill's name, so links carry its tags

A free key: ${tagged(SIGN_UP, place)}
`;
  }
}
