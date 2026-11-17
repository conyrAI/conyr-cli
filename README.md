# conyr-cli

Solana coin checks from the command line, answered by Conyr's API: whether coordinated groups of wallets (bundles)
are on a coin and still open, and what kinds of wallets are buying it. With a key of your own, any other route of the
API: holders, liquidity, wallets, clusters.

## Try it

No signup and nothing to set up, with Node.js 22 or later:

```bash
npx -y conyr-cli token DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

Installed with `npm install -g conyr-cli`, the command is `conyr`.

```
Coin     DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
Bundles  625 found, 492 still open, holding 0.045% of supply
         still open  ███████▉    78.7%
         Leading type: MultiSlotBuyCohort (coordinated buys spread over nearby slots)
         Realized profit and loss: +$0.46
Buyers   58 wallets bought in the last 1 hour
         kind                wallets                bought (USD)
         unrated_new         25  ████▎       43.1%    $167  ▎           3.0%
         bot_operated        23  ████        39.7%  $4,492  ████████▏   81.8%
         developing_organic   7  █▎          12.1%     $56  ▏           1.0%
         consistent_organic   2  ▍            3.4%     $77  ▏           1.4%
         farm_funded          1  ▏            1.7%    $699  █▎          12.7%
         1.4% of the buy volume came from wallets with a profitable record
         unrated_new: wallets with no behavior profile yet
         bot_operated: automated, bot-driven wallets
         developing_organic: wallets that are not bot-operated or farm-funded, still building a track record
         consistent_organic: consistently profitable wallets that are not bot-operated or farm-funded
         farm_funded: wallets funded by known farm distributors
Page     https://conyr.ai/app/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263?utm_source=npm&utm_medium=package&utm_content=conyr
Key      Conyr's shared demo key. Your own free key: https://conyr.ai/api?utm_source=npm&utm_medium=package&utm_content=conyr
```

That is BONK on 2026-11-17. `conyr token` takes a coin's mint address, not a name, a ticker or a wallet address.

## Commands

| Command | Plan | What it answers |
|---|---|---|
| `conyr token <mint> [--hours <1-24>] [--json]` | Free | Bundles on the coin, and the kinds of wallets that bought it in the last hours (1 by default, up to 24) |
| `conyr get <route> [name=value ...]` | The route's own | Any `/v1` route of the API, printed as one JSON document |
| `conyr key [--json]` | Free | Which key is in use, whether the API accepts it, and how to get one |

`conyr --help` and `conyr <command> --help` give the details. Exit codes: 0 answered, 1 refused or failed (the
message says why and what to do next), 2 wrong usage.

Every `/v1` route and its plan is listed in the OpenAPI file, https://conyr.ai/docs/openapi.yaml. An example on the
Layer 1 plan: `conyr get /v1/token/<mint>/liquidity`

Text written by outsiders, such as coin names and labels, is cleaned before it is printed: hidden characters and
instruction-like text are removed, and very long text is cut.

## The key

Without a key, conyr uses Conyr's shared demo key: a Free key that everyone without a key of their own shares, so it
can be at its limit for the minute. A key of your own:

1. Sign up at https://conyr.ai/api?utm_source=npm&utm_medium=package&utm_content=conyr
2. Create a key at https://conyr.ai/app/profile?tab=api&utm_source=npm&utm_medium=package&utm_content=conyr
3. Set it where you run conyr: `export CONYR_API_KEY=<your key>`

conyr sends the key only to `https://api.conyr.ai`, and only in `GET` requests.

## Plans

Free, Layer 1 (market data), Layer 2 (wallet intelligence), Layer 3 (security and coordination), Platform Feed and
Enterprise. Each paid plan includes everything in the plans before it. Prices and limits:
https://conyr.ai/api?utm_source=npm&utm_medium=package&utm_content=conyr

## For AI agents

Conyr's agent skills teach an agent to answer Solana coin and wallet questions with Conyr. The free coin check,
`conyr-token-check`, runs this tool.

```bash
npx skills add conyrai/conyr-skills
```

The skills: https://github.com/conyrAI/conyr-skills

## What it is not

conyr only reads. It is not a trading tool, and it never touches a wallet. A detection describes what was seen on
chain, not who owns the wallets or what they intend, and none of it is a trading signal.
