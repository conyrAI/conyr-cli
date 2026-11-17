import type { Io } from './api.ts';
import type { KeyKind } from './keys.ts';
import { refusalDocument, refusalText, type Refusal } from './refusals.ts';

export const toJson = (doc: unknown) => `${JSON.stringify(doc, null, 2)}\n`;

// A refusal: in text mode on stderr only; in JSON mode one document on stdout and the plain message on stderr.
export function printRefusal(refusal: Refusal, key: KeyKind, json: boolean, io: Io): number {
  if (json) io.stdout(toJson(refusalDocument(refusal, key)));
  io.stderr(refusalText(refusal));
  return 1;
}
