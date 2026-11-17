#!/usr/bin/env node
import { run } from './main.ts';

process.exitCode = await run(process.argv.slice(2), {
  env: process.env,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  fetch: globalThis.fetch,
  timeoutMs: 20_000,
  stderrIsTTY: process.stderr.isTTY === true,
});
