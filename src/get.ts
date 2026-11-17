import { call, type Io } from './api.ts';
import { cleanDeep } from './clean.ts';
import { chooseKey } from './keys.ts';
import { SIGN_UP, tagged, type Place } from './links.ts';
import { printRefusal, toJson } from './output.ts';
import { refusalFor } from './refusals.ts';
import * as words from './words.ts';

export interface GetArgs {
  route: string;
  via: string | undefined;
}

// conyr get: one GET of a /v1 route, always one JSON document, with every string in the answer cleaned.
export async function runGet(args: GetArgs, io: Io): Promise<number> {
  const key = chooseKey(io.env);
  const place: Place = { command: 'get', via: args.via };
  const answer = await call(args.route, key, io);
  if (!answer.ok) return printRefusal(refusalFor(answer.failure, key.kind, place), key.kind, true, io);
  const { data, cleaned } = cleanDeep(answer.data);
  const doc: Record<string, unknown> = { ok: true, status: answer.status, route: args.route, data, cleaned, key: key.kind };
  if (key.kind === 'demo') doc.links = { free_key: tagged(SIGN_UP, place) };
  io.stdout(toJson(doc));
  if (cleaned > 0) io.stderr(`${words.cleanedNotice(cleaned)}\n`);
  return 0;
}
