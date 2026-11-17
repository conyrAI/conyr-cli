// Bars for conyr token's text: one character cell is eight steps, so a bar of width 10 draws in steps of 1.25%.
const PARTS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

// A bar for a fraction from 0 to 1, padded to `width` cells. A value above zero always draws at least one step.
export function bar(fraction: number, width: number): string {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  let steps = Math.round(f * width * 8);
  if (f > 0 && steps === 0) steps = 1;
  return ('█'.repeat(Math.floor(steps / 8)) + PARTS[steps % 8]).padEnd(width);
}
