import { call, type Io } from './api.ts';
import { chooseKey } from './keys.ts';
import { KEY_PAGE, SIGN_UP, tagged, type Place } from './links.ts';
import { printRefusal, toJson } from './output.ts';
import { refusalFor } from './refusals.ts';
import { startScan } from './scan.ts';
import * as words from './words.ts';

export interface KeyArgs {
  json: boolean;
  via: string | undefined;
}

// A free route on a coin that always has an answer (BONK), to see whether the API accepts the key.
const CHECK = '/v1/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/bundles/summary';

// conyr key: which key, whether the API accepts it (a 429 means accepted and at its limit), and how to get one.
export async function runKey(args: KeyArgs, io: Io): Promise<number> {
  const key = chooseKey(io.env);
  const place: Place = { command: 'key', via: args.via };
  const scan = args.json ? startScan({ ...io, stderrIsTTY: false }) : startScan(io);
  scan.phase(words.scanKey());
  const answer = await call(CHECK, key, io);
  scan.stop();
  let accepted: boolean;
  let atLimit = false;
  if (answer.ok) accepted = true;
  else if (answer.failure.kind === 'status' && answer.failure.status === 429) [accepted, atLimit] = [true, true];
  else if (answer.failure.kind === 'status' && answer.failure.status === 401) accepted = false;
  else return printRefusal(refusalFor(answer.failure, key.kind, place), key.kind, args.json, io);

  const links = { free_key: tagged(SIGN_UP, place), key_page: tagged(KEY_PAGE, place), plans: tagged(SIGN_UP, place) };
  if (args.json) {
    io.stdout(toJson({ ok: true, command: 'key', key: key.kind, accepted, links }));
    return 0;
  }
  const which = key.kind === 'own' ? words.ownKey(key.value.slice(0, 16)) : words.demoKey;
  const verdict = !accepted
    ? key.kind === 'own' ? words.keyRefused() : words.demoKeyRetired()
    : atLimit ? words.acceptedAtLimit : words.accepted;
  io.stdout(words.keyReport(which, verdict, links));
  return 0;
}
