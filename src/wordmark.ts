import type { Io } from './api.ts';
import { animates, blue, sleep } from './terminal.ts';

const ROWS = [
  ' ██████  ██████  ███    ██ ██    ██ ██████',
  '██      ██    ██ ████   ██  ██  ██  ██   ██',
  '██      ██    ██ ██ ██  ██   ████   ██████',
  '██      ██    ██ ██  ██ ██    ██    ██   ██',
  ' ██████  ██████  ██   ████    ██    ██   ██',
];
const STEP = 3;
const FRAME_MS = 40;

// The CONYR wordmark, drawn in by a sweeping scan line (about 0.6 s) on stderr, in Conyr's blue. Shown above the help
// in a person's terminal; it stays on screen.
export async function wordmark(io: Io): Promise<void> {
  if (!animates(io)) return;
  const { on, off } = blue(io.env);
  const width = Math.max(...ROWS.map((r) => r.length));
  const draw = (first: boolean, cols: number, cursor: boolean) =>
    io.stderr((first ? '' : '\u001b[5A') + ROWS.map((r) => `\r${on}${(r.slice(0, cols) + (cursor ? '▌' : '')).trimEnd()}${off}\u001b[K\n`).join(''));
  for (let cols = 0; cols < width; cols += STEP) {
    draw(cols === 0, cols, true);
    await sleep(FRAME_MS);
  }
  draw(false, width, false);
  io.stderr('\n');
}
