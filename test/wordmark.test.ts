// The CONYR wordmark (his pick at the gate, 2026-11-17: "Both", "the wordmark should also be colored blue"): in a
// person's terminal, conyr and conyr --help draw the wordmark on stderr with a sweeping scan line, in Conyr's blue,
// then print the help on stdout. Agents, pipes, CI and dumb terminals never get it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli } from './helpers.ts';

const UP = '\u001b[5A';
const WORDMARK = [
  ' ██████  ██████  ███    ██ ██    ██ ██████',
  '██      ██    ██ ████   ██  ██  ██  ██   ██',
  '██      ██    ██ ██ ██  ██   ████   ██████',
  '██      ██    ██ ██  ██ ██    ██    ██   ██',
  ' ██████  ██████  ██   ████    ██    ██   ██',
];
const TRUECOLOR_BLUE = '\u001b[38;2;6;156;223m'; // #069CDF, Conyr's primary blue
const BLUE_256 = '\u001b[38;5;38m';

// The last frame drawn, as plain text rows.
function lastFrame(err: string): string[] {
  const last = err.slice(err.lastIndexOf(UP) + UP.length);
  return last.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
}

for (const argv of [[], ['--help'], ['-h']]) {
  test(`in a terminal, conyr ${argv.join(' ') || '(no argument)'} draws the wordmark, then the same help on stdout`, async () => {
    const shown = await cli(argv, { stderrIsTTY: true, env: { COLORTERM: 'truecolor' } });
    const plain = await cli(argv);
    assert.equal(shown.code, 0);
    assert.equal(shown.out, plain.out);
    assert.deepEqual(lastFrame(shown.err), WORDMARK);
    assert.ok(shown.err.split(UP).length > 8, 'it is drawn in several frames');
    assert.match(shown.err, /▌/, 'a scan line sweeps across');
  });
}

test('the wordmark is Conyr blue: full color where the terminal says it has it', async () => {
  const r = await cli([], { stderrIsTTY: true, env: { COLORTERM: 'truecolor' } });
  assert.ok(r.err.includes(TRUECOLOR_BLUE));
  assert.ok(r.err.endsWith('\u001b[39m\u001b[K\n\n') || r.err.includes('\u001b[39m'), 'the color is turned off again');
});

test('the wordmark falls back to the nearest 256-color blue', async () => {
  const r = await cli([], { stderrIsTTY: true });
  assert.ok(r.err.includes(BLUE_256));
  assert.ok(!r.err.includes(TRUECOLOR_BLUE));
});

test('NO_COLOR draws the wordmark without color', async () => {
  const r = await cli([], { stderrIsTTY: true, env: { NO_COLOR: '1', COLORTERM: 'truecolor' } });
  assert.deepEqual(lastFrame(r.err), WORDMARK);
  assert.doesNotMatch(r.err, /\u001b\[(3[0-9]|9[0-7]|38;)[0-9;]*m/);
});

for (const [name, argv, opts] of [
  ['when stderr is not a terminal', [], {}],
  ['under CI', [], { stderrIsTTY: true, env: { CI: 'true' } }],
  ['in a dumb terminal', [], { stderrIsTTY: true, env: { TERM: 'dumb' } }],
  ['for a command help', ['token', '--help'], { stderrIsTTY: true }],
  ['for --version', ['--version'], { stderrIsTTY: true }],
] as const) {
  test(`no wordmark ${name}`, async () => {
    const r = await cli([...argv], { ...opts, env: { ...('env' in opts ? opts.env : {}) } });
    assert.equal(r.code, 0);
    assert.equal(r.err, '');
  });
}
