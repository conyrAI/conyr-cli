import type { Io } from './api.ts';

// The two animations (the wordmark and the scan) play only in a person's terminal: stderr is a terminal, the run is
// not under CI, and the terminal is not a dumb one. Agents and pipes never get them.
export const animates = (io: Io) => io.stderrIsTTY && !io.env.CI && io.env.TERM !== 'dumb';

// Conyr's primary blue, #069CDF: full color where the terminal says it has it, otherwise the nearest of the 256
// colors. None at all when NO_COLOR is set (no-color.org).
export function blue(env: Record<string, string | undefined>): { on: string; off: string } {
  if (env.NO_COLOR) return { on: '', off: '' };
  const full = env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit';
  return { on: full ? '\u001b[38;2;6;156;223m' : '\u001b[38;5;38m', off: '\u001b[39m' };
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
