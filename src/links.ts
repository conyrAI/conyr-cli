// Every conyr.ai address conyr prints is written out in full in this file, so that tools/check can find and fetch
// each one. Pages a person opens get tags of the place the link was printed in; a file for machines gets none.
export const SIGN_UP = 'https://conyr.ai/api';
export const KEY_PAGE = 'https://conyr.ai/app/profile?tab=api';
export const DOCS = 'https://conyr.ai/docs/agents';
export const OPENAPI = 'https://conyr.ai/docs/openapi.yaml';

export function coinPage(mint: string): string {
  return `https://conyr.ai/app/token/${mint}`;
}

// Where a link is printed: the command, or the agent skill that ran conyr with --via.
export interface Place {
  command: string;
  via: string | undefined;
}

export function tagged(address: string, place: Place): string {
  const url = new URL(address);
  const [source, medium, content] = place.via ? ['skill', 'agent', place.via] : ['cli', 'cli', place.command];
  url.searchParams.append('utm_source', source);
  url.searchParams.append('utm_medium', medium);
  url.searchParams.append('utm_content', content);
  return url.href;
}
