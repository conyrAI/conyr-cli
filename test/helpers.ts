// Test helpers: run the tool in-process against a fake of Conyr's API. No network.
import { readFileSync } from 'node:fs';
import { run } from '../src/main.ts';

export const VERSION: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
export const DEMO_KEY = 'conyr_live_Yei4BniFsxwp8U63lv5pe-lwOuAfgF_E';

// Made-up addresses in the shape of Solana ones (base58, 32 to 44 characters).
export const MINT = 'MadeUpCoinMint1111111111111111111111111111';
export const MINT_NO_BUNDLES = 'QuietCoin2222222222222222222222222222222222';
export const WALLET = 'MadeUpWa11et3333333333333333333333333333333';

export type Reply =
  | { status: number; body?: unknown; raw?: string; headers?: Record<string, string>; delayMs?: number }
  | 'hang'
  | 'network';

export interface Call {
  url: string;
  headers: Record<string, string>;
  redirect: string | undefined;
}

// A fake fetch. `replies` maps a path with its query (as the tool must send it) to a reply. A 3xx reply is followed
// the way the real fetch follows it when the tool asks for that, so a tool that follows redirects is caught.
export function fakeApi(replies: Record<string, Reply>) {
  const calls: Call[] = [];
  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    calls.push({ url: url.href, headers, redirect: init.redirect });
    const key = url.origin === 'https://api.conyr.ai' ? url.pathname + url.search : url.href;
    const reply = replies[key];
    if (reply === undefined) throw new Error(`fake API: no reply for ${url.href}`);
    if (reply === 'network') {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.conyr.ai'), { code: 'ENOTFOUND' }) });
    }
    if (reply === 'hang') {
      return new Promise((_, reject) => {
        const signal = init.signal;
        if (!signal) return; // never answers
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }
    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
    const location = reply.headers?.location;
    if (reply.status >= 300 && reply.status < 400 && location) {
      if (init.redirect === 'error') throw new TypeError('fetch failed', { cause: new Error('unexpected redirect') });
      if (init.redirect !== 'manual') return fetch(location, init);
    }
    const body = reply.raw ?? (reply.body === undefined ? null : JSON.stringify(reply.body));
    return new Response(body, { status: reply.status, headers: { 'content-type': 'application/json', ...reply.headers } });
  };
  return { fetch, calls };
}

export interface Result {
  code: number;
  out: string;
  err: string;
  calls: Call[];
}

export async function cli(
  argv: string[],
  {
    env = {},
    replies = {},
    timeoutMs = 1000,
    stderrIsTTY = false,
  }: { env?: Record<string, string>; replies?: Record<string, Reply>; timeoutMs?: number; stderrIsTTY?: boolean } = {},
): Promise<Result> {
  const api = fakeApi(replies);
  let out = '';
  let err = '';
  const code = await run(argv, {
    env,
    stdout: (s) => { out += s; },
    stderr: (s) => { err += s; },
    fetch: api.fetch as typeof globalThis.fetch,
    timeoutMs,
    stderrIsTTY,
  });
  return { code, out, err, calls: api.calls };
}

// The one JSON document a JSON-mode run prints on stdout.
export function json(r: Result): any {
  return JSON.parse(r.out);
}

// The tags of every conyr.ai link in a text, as "source/medium/content".
export function tagsOfLinks(text: string): string[] {
  return [...text.matchAll(/https:\/\/conyr\.ai\/[^\s"]*/g)].map((m) => {
    const u = new URL(m[0]);
    return `${u.searchParams.get('utm_source')}/${u.searchParams.get('utm_medium')}/${u.searchParams.get('utm_content')}`;
  });
}
