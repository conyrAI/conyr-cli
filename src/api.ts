import type { Key } from './keys.ts';
import { VERSION } from './version.ts';

export const API = 'https://api.conyr.ai';

export interface Io {
  env: Record<string, string | undefined>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  // Whether stderr is a person's terminal: only then does the scan line show.
  stderrIsTTY: boolean;
}

export type Failure =
  | { kind: 'status'; status: number; body: unknown }
  | { kind: 'bad_answer'; status: number }
  | { kind: 'timeout'; ms: number }
  | { kind: 'network'; code: string | undefined };

export type Outcome = { ok: true; status: number; data: unknown } | { ok: false; failure: Failure };

// The one place conyr calls the API: one GET to api.conyr.ai, one try, no redirect followed, given up after
// io.timeoutMs. `route` is a path with its query, starting with /v1/.
export async function call(route: string, key: Key, io: Io): Promise<Outcome> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, io.timeoutMs);
  let status: number;
  let text: string;
  try {
    const response = await io.fetch(`${API}${route}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${key.value}`, 'user-agent': `conyr-cli/${VERSION}`, accept: 'application/json' },
      redirect: 'manual',
      signal: controller.signal,
    });
    status = response.status;
    text = await response.text();
  } catch (error) {
    if (timedOut) return { ok: false, failure: { kind: 'timeout', ms: io.timeoutMs } };
    const code = (error as { cause?: { code?: unknown } })?.cause?.code;
    return { ok: false, failure: { kind: 'network', code: typeof code === 'string' ? code : undefined } };
  } finally {
    clearTimeout(timer);
  }
  if (status >= 200 && status < 300) {
    try {
      return { ok: true, status, data: JSON.parse(text) };
    } catch {
      return { ok: false, failure: { kind: 'bad_answer', status } };
    }
  }
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // A refusal is read by its status; a body that is not JSON carries nothing else to read.
  }
  return { ok: false, failure: { kind: 'status', status, body } };
}
