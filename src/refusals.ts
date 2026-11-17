import type { Failure } from './api.ts';
import type { KeyKind } from './keys.ts';
import { KEY_PAGE, SIGN_UP, tagged, type Place } from './links.ts';
import * as words from './words.ts';

// The `reason` words stay as they are through 1.x, like the JSON field names.
export type Reason =
  | 'key_refused'
  | 'demo_key_retired'
  | 'plan'
  | 'rate_limit'
  | 'demo_key_busy'
  | 'bad_request'
  | 'not_found'
  | 'api_error'
  | 'bad_answer'
  | 'timeout'
  | 'network';

export interface Refusal {
  status: number | null;
  reason: Reason;
  message: string;
  links: Record<string, string>;
  requiredPlan?: string | null;
}

const text = (body: unknown, field: string): string | null => {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === 'string' && /^(Free|Layer [1-9]|Enterprise|Platform Feed)$/.test(value) ? value : null;
};

// What a failed call means, from its status and, on a 403, the plan fields. The wording of `error` is never read.
export function refusalFor(failure: Failure, key: KeyKind, place: Place): Refusal {
  const signUp = tagged(SIGN_UP, place);
  if (failure.kind === 'timeout') return { status: null, reason: 'timeout', message: words.timeout(failure.ms), links: {} };
  if (failure.kind === 'network') return { status: null, reason: 'network', message: words.network(failure.code), links: {} };
  if (failure.kind === 'bad_answer') return { status: failure.status, reason: 'bad_answer', message: words.badAnswer(), links: {} };
  const { status, body } = failure;
  switch (status) {
    case 401:
      return key === 'own'
        ? { status, reason: 'key_refused', message: words.keyRefused(), links: { key_page: tagged(KEY_PAGE, place), free_key: signUp } }
        : { status, reason: 'demo_key_retired', message: words.demoKeyRetired(), links: { free_key: signUp } };
    case 403: {
      const required = text(body, 'required_tier');
      const resolved = key === 'demo' ? 'Free' : text(body, 'resolved_tier');
      return { status, reason: 'plan', message: words.plan(required, resolved, key), links: { plans: signUp }, requiredPlan: required };
    }
    case 429:
      return key === 'own'
        ? { status, reason: 'rate_limit', message: words.rateLimit(), links: { plans: signUp } }
        : { status, reason: 'demo_key_busy', message: words.demoKeyBusy(), links: { free_key: signUp } };
    case 400:
      return { status, reason: 'bad_request', message: words.badRequest(), links: {} };
    case 404:
      return { status, reason: 'not_found', message: words.notFound(), links: {} };
    default:
      return { status, reason: 'api_error', message: words.apiError(status), links: {} };
  }
}

// A refusal in text: the message, then each link on its own line. Text mode prints it on stderr; JSON mode prints the
// document on stdout and repeats this on stderr.
export function refusalText(refusal: Refusal): string {
  const links = Object.entries(refusal.links).map(([name, url]) => `${words.linkLabel(name)}: ${url}`);
  return [refusal.message, ...links].join('\n') + '\n';
}

export function refusalDocument(refusal: Refusal, key: KeyKind): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    ok: false,
    status: refusal.status,
    reason: refusal.reason,
    message: refusal.message,
    key,
    links: refusal.links,
  };
  if (refusal.status === 403) doc.required_plan = refusal.requiredPlan ?? null;
  return doc;
}
