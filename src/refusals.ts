import type { Failure } from './api.ts';
import { count } from './format.ts';
import type { KeyKind } from './keys.ts';
import { KEY_PAGE, SIGN_UP, tagged, type Place } from './links.ts';
import * as words from './words.ts';

// The `reason` words stay as they are through 1.x, like the JSON field names.
export type Reason =
  | 'key_refused'
  | 'demo_key_retired'
  | 'plan'
  | 'rate_limit'
  | 'month_limit'
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

// A count from the answer, used only when it is a whole number from 0 up.
const whole = (body: unknown, field: string): number | null => {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
};

// The UTC day of a time in the answer, as YYYY-MM-DD, used only when the time reads.
const day = (body: unknown, field: string): string | null => {
  const value = (body as Record<string, unknown> | null)?.[field];
  const time = typeof value === 'string' ? new Date(value) : null;
  const iso = time && !Number.isNaN(time.getTime()) ? time.toISOString().slice(0, 10) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
};

// A link in the answer is outside text: it is printed only when it is a plain https://conyr.ai/ address (printable
// characters, no spaces, at most 500 of them). Otherwise the tool prints its own link.
const conyrLink = (body: unknown, field: string): string | null => {
  const value = (body as Record<string, unknown> | null)?.[field];
  return typeof value === 'string' && value.length <= 500 && /^https:\/\/conyr\.ai\/[!-~]*$/.test(value) ? value : null;
};

// What a failed call means, from its status, the plan fields on a 403 and the reason on a 429. The wording of `error`
// is never read.
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
      if (key === 'own' && (body as Record<string, unknown> | null)?.reason === 'month_limit') {
        const used = whole(body, 'used');
        const limit = whole(body, 'limit');
        const message = words.monthLimit(used === null ? null : count(used), limit === null ? null : count(limit), day(body, 'resets_at'));
        return { status, reason: 'month_limit', message, links: { plans: conyrLink(body, 'upgrade_url') ?? signUp } };
      }
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
