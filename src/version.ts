import { readFileSync } from 'node:fs';

// The version in package.json, which npm always ships beside the built files.
export const VERSION: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
