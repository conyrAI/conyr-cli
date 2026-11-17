// The bars in conyr token's text: eighth-block characters, a fixed width, and never invisible above zero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bar } from '../src/chart.ts';

for (const [fraction, width, drawn] of [
  [0, 8, '        '],
  [1, 8, '████████'],
  [0.5, 8, '████    '],
  [0.4035, 16, '██████▌         '],
  [0.0001, 8, '▏       '],
  [1.5, 8, '████████'],
  [-0.2, 8, '        '],
  [Number.NaN, 4, '    '],
] as const) {
  test(`bar(${fraction}, ${width})`, () => assert.equal(bar(fraction, width), drawn));
}
