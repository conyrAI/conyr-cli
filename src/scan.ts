import type { Io } from './api.ts';
import { animates } from './terminal.ts';

// The scan: while the API answers, a person's terminal shows wallets (dots) drifting into bundles, with a line saying
// what is being read. It goes to stderr and is erased before anything else is printed. Agents and pipes, CI and dumb
// terminals never get it, and the commands that print JSON do not start it.
export interface Scan {
  phase(label: string): void;
  stop(): void;
}

const FRAME_MS = 80;
const ERASE = '\r\u001b[2A\u001b[J';
const NONE: Scan = { phase() {}, stop() {} };

// Two rows, four bundles each: [first column of the bundle's wallets, where each wallet starts].
const BUNDLES: Array<Array<[number, number[]]>> = [
  [[2, [8, 0, 27]], [12, [37, 3]], [20, [18, 35, 10, 24]], [32, [14, 30]]],
  [[5, [16, 1]], [14, [29, 9, 38]], [24, [21, 6]], [33, [33, 12, 26]]],
];

// The two rows of the field at progress p, from 0 (wallets scattered) to 1 (every wallet in its bundle). A bundle gets
// its brackets once all its wallets have arrived.
export function field(p: number): string[] {
  const ease = p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);
  return BUNDLES.map((bundles) => {
    const cells: string[] = Array<string>(40).fill(' ');
    for (const [first, starts] of bundles) {
      const at = starts.map((start, i) => Math.round(start + (first + i - start) * ease));
      if (at.every((x, i) => x === first + i)) [cells[first - 1], cells[first + starts.length]] = ['[', ']'];
      for (const x of at) cells[x] = '·';
    }
    return cells.join('').trimEnd();
  });
}

export function startScan(io: Io): Scan {
  if (!animates(io)) return NONE;
  let label = '';
  let started = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const draw = (first: boolean) => {
    // Bundles form within about a second; a pulse on the label shows a slower answer is still being read.
    const elapsed = Date.now() - started;
    const [a, b] = field(1 - Math.exp(-elapsed / 450));
    const pulse = '·'.repeat(1 + (Math.floor(elapsed / 300) % 3));
    io.stderr(`${first ? '' : '\r\u001b[2A'}  ${a}\u001b[K\n  ${b}\u001b[K\n  ${label} ${pulse}\u001b[K`);
  };
  return {
    phase(next: string) {
      label = next;
      if (timer === undefined) {
        started = Date.now();
        draw(true);
        // unref: a scan never keeps conyr running on its own.
        timer = setInterval(() => draw(false), FRAME_MS).unref();
      } else {
        draw(false);
      }
    },
    stop() {
      if (timer === undefined) return;
      clearInterval(timer);
      timer = undefined;
      io.stderr(ERASE);
    },
  };
}
