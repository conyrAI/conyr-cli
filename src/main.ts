import { parse, UsageError } from './args.ts';
import type { Io } from './api.ts';
import { commandHelp, mainHelp } from './help.ts';
import { runGet } from './get.ts';
import { runKey } from './key.ts';
import { runToken } from './token.ts';
import { VERSION } from './version.ts';
import { wordmark } from './wordmark.ts';

export type { Io } from './api.ts';

// conyr as a function: the arguments and the outside world in, the exit code out. 0 answered, 1 refused or failed,
// 2 wrong usage.
export async function run(argv: string[], io: Io): Promise<number> {
  let parsed;
  try {
    parsed = parse(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.stderr(`${error.message}\nRun conyr --help\n`);
    return 2;
  }
  switch (parsed.action) {
    case 'help':
      if (!parsed.command) await wordmark(io);
      io.stdout(parsed.command
        ? commandHelp(parsed.command, { command: parsed.command, via: parsed.via })
        : mainHelp({ command: 'help', via: parsed.via }));
      return 0;
    case 'version':
      io.stdout(`${VERSION}\n`);
      return 0;
    case 'token':
      return runToken(parsed, io);
    case 'get':
      return runGet(parsed, io);
    case 'key':
      return runKey(parsed, io);
  }
}
