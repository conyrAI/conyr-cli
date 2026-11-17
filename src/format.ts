// How numbers are printed in text. JSON carries the API's numbers as they come.

const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const count = (n: number) => grouped(Math.round(n));

// USD: whole dollars from $10 up, cents below. `signed` adds + to a positive amount.
export function usd(x: number, signed = false): string {
  const sign = x < 0 ? '-' : signed && x > 0 ? '+' : '';
  const a = Math.abs(x);
  return `${sign}$${a === 0 ? '0' : a >= 10 ? grouped(Math.round(a)) : a.toFixed(2)}`;
}

// A percent from 0 to 100, printed as it comes: one decimal from 0.1 up, and below that enough digits that a value
// above zero never prints as zero (0.04 is 0.04%).
export function pct(x: number): string {
  if (x === 0) return '0%';
  const a = Math.abs(x);
  if (a >= 0.1) return `${x.toFixed(1)}%`;
  const decimals = Math.min(100, Math.ceil(-Math.log10(a)) + 1);
  return `${x.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}%`;
}
