import { parseArgs } from 'node:util';
import * as words from './words.ts';

export type Command = 'token' | 'get' | 'key';
const COMMANDS: readonly string[] = ['token', 'get', 'key'];

export class UsageError extends Error {}

const OPTIONS = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
  json: { type: 'boolean' },
  hours: { type: 'string' },
  via: { type: 'string' },
} as const;

// The options each command takes; `none` is conyr with no command.
const ALLOWED: Record<Command | 'none', readonly string[]> = {
  none: ['help', 'version', 'via'],
  token: ['help', 'json', 'hours', 'via'],
  get: ['help', 'json', 'via'],
  key: ['help', 'json', 'via'],
};

export type Parsed =
  | { action: 'help'; command: Command | undefined; via: string | undefined }
  | { action: 'version' }
  | { action: 'token'; mint: string; hours: number; json: boolean; via: string | undefined }
  | { action: 'get'; route: string; via: string | undefined }
  | { action: 'key'; json: boolean; via: string | undefined };

export const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const VIA_RE = /^conyr-[a-z0-9-]{1,58}$/;

export function parse(argv: string[]): Parsed {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (error) {
    throw fromParseArgs(error);
  }
  const { values, positionals } = parsed;
  const [first, ...rest] = positionals;
  if (first !== undefined && !COMMANDS.includes(first)) throw new UsageError(words.unknownCommand(first));
  const command = first as Command | undefined;
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || ALLOWED[command ?? 'none'].includes(name)) continue;
    throw new UsageError(command ? words.notForCommand(`--${name}`, command) : words.needsCommand(`--${name}`));
  }
  const via = values.via;
  if (via !== undefined && !VIA_RE.test(via)) throw new UsageError(words.badVia(via));
  if (values.help) return { action: 'help', command, via };
  if (values.version) return { action: 'version' };
  switch (command) {
    case undefined:
      return { action: 'help', command, via };
    case 'token': {
      const mint = rest[0];
      if (mint === undefined || rest.length > 1) throw new UsageError(words.tokenNeedsMint());
      if (!MINT_RE.test(mint)) throw new UsageError(words.notAMint(mint));
      return { action: 'token', mint, hours: hours(values.hours), json: values.json === true, via };
    }
    case 'get': {
      const [route, ...params] = rest;
      if (route === undefined) throw new UsageError(words.getNeedsRoute());
      return { action: 'get', route: resolveRoute(route, params), via };
    }
    case 'key':
      if (rest[0] !== undefined) throw new UsageError(words.keyTakesNothing(rest[0]));
      return { action: 'key', json: values.json === true, via };
  }
}

function hours(value: string | undefined): number {
  if (value === undefined) return 1;
  const n = /^[0-9]{1,2}$/.test(value) ? Number(value) : NaN;
  if (!(n >= 1 && n <= 24)) throw new UsageError(words.badHours(value));
  return n;
}

// A route of the API as the path and query conyr sends: /v1/... only, on api.conyr.ai only. name=value pairs are
// encoded and added to the query.
export function resolveRoute(route: string, params: string[]): string {
  let url: URL;
  try {
    if (route.startsWith('https://api.conyr.ai/v1/')) url = new URL(route);
    else if (route.startsWith('/v1/')) url = new URL(route, 'https://api.conyr.ai');
    else throw new UsageError(words.badRoute(route));
  } catch {
    throw new UsageError(words.badRoute(route));
  }
  // Checked after the address is resolved, so a path that climbs out of /v1 with .. is refused. The host is
  // api.conyr.ai by the prefixes above.
  if (!url.pathname.startsWith('/v1/')) throw new UsageError(words.badRoute(route));
  let search = url.search;
  for (const param of params) {
    const at = param.indexOf('=');
    if (at < 1) throw new UsageError(words.badParam(param));
    const pair = `${encodeURIComponent(param.slice(0, at))}=${encodeURIComponent(param.slice(at + 1))}`;
    search = search ? `${search}&${pair}` : `?${pair}`;
  }
  return url.pathname + search;
}

// node:util's own messages are long and name a fix that does not apply here; say it in one line.
function fromParseArgs(error: unknown): UsageError {
  const { code, message } = error as { code?: string; message?: string };
  const option = /'(-[^' ]*)/.exec(message ?? '')?.[1] ?? 'an option';
  if (code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return new UsageError(words.unknownOption(option));
  if (code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    return new UsageError(/does not take an argument/.test(message ?? '') ? words.takesNoValue(option) : words.missingValue(option));
  }
  return new UsageError(message ?? String(error));
}
