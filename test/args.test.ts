// Arguments and exit codes (spec 6.2): 0 answered, 1 refused or failed, 2 wrong usage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, MINT, VERSION } from './helpers.ts';

function assertUsageError(r: { code: number; out: string; err: string; calls: unknown[] }, mentions?: string) {
  assert.equal(r.code, 2, r.err);
  assert.equal(r.out, '', 'a usage error prints nothing on stdout');
  const lines = r.err.trimEnd().split('\n');
  assert.equal(lines.length, 2, `one plain line, then "Run conyr --help":\n${r.err}`);
  assert.equal(lines[1], 'Run conyr --help');
  if (mentions) assert.ok(lines[0]!.includes(mentions), `the line names ${mentions}: ${lines[0]}`);
  assert.equal(r.calls.length, 0, 'a usage error makes no call');
}

test('no argument prints the help and exits 0', async () => {
  const r = await cli([]);
  const help = await cli(['--help']);
  assert.equal(r.code, 0);
  assert.equal(r.err, '');
  assert.ok(r.out.length > 200, 'the help is printed');
  assert.equal(r.out, help.out);
  assert.equal(r.calls.length, 0);
});

test('--help and -h print the same help', async () => {
  const a = await cli(['--help']);
  const b = await cli(['-h']);
  assert.equal(a.code, 0);
  assert.equal(b.code, 0);
  assert.equal(a.out, b.out);
});

test('--version prints the version in package.json', async () => {
  const r = await cli(['--version']);
  assert.equal(r.code, 0);
  assert.equal(r.out, `${VERSION}\n`);
  assert.equal(r.err, '');
});

for (const command of ['token', 'get', 'key']) {
  test(`${command} --help prints that command's help, makes no call and exits 0`, async () => {
    const r = await cli([command, '--help']);
    assert.equal(r.code, 0);
    assert.ok(r.out.includes(`conyr ${command}`), r.out);
    assert.notEqual(r.out, (await cli(['--help'])).out);
    assert.equal(r.calls.length, 0);
  });
}

test('an unknown command is a usage error', async () => assertUsageError(await cli(['wallet', MINT]), 'wallet'));

test('an unknown option is a usage error', async () => assertUsageError(await cli(['token', MINT, '--fast']), '--fast'));

test('an option given without a command is a usage error', async () => assertUsageError(await cli(['--json'])));

test('token without a mint is a usage error', async () => assertUsageError(await cli(['token'])));

test('token with two addresses is a usage error', async () => assertUsageError(await cli(['token', MINT, MINT])));

test('a usage error in JSON mode still prints only on stderr', async () =>
  assertUsageError(await cli(['token', 'not-a-mint', '--json']), 'not-a-mint'));

for (const [why, mint] of [
  ['31 characters', '1'.repeat(31)],
  ['45 characters', '1'.repeat(45)],
  ['a zero', `${'1'.repeat(40)}0`],
  ['a capital O', `${'1'.repeat(40)}O`],
  ['a capital I', `${'1'.repeat(40)}I`],
  ['a small L', `${'1'.repeat(40)}l`],
  ['a coin name', 'BONK'],
]) {
  test(`a mint with ${why} is a usage error`, async () => assertUsageError(await cli(['token', mint!])));
}

for (const hours of ['0', '25', 'abc', '1.5', '', '-1']) {
  test(`--hours ${JSON.stringify(hours)} is a usage error`, async () =>
    assertUsageError(await cli(['token', MINT, '--hours', hours]), '--hours'));
}

test('--hours without a value is a usage error', async () => assertUsageError(await cli(['token', MINT, '--hours'])));

test('--hours is only for token', async () => {
  assertUsageError(await cli(['key', '--hours', '2']), '--hours');
  assertUsageError(await cli(['get', `/v1/token/${MINT}/info`, '--hours', '2']), '--hours');
});

test('get without a route is a usage error', async () => assertUsageError(await cli(['get'])));

test('key takes no address', async () => assertUsageError(await cli(['key', MINT])));

for (const via of ['token-check', 'conyr-', 'conyr-Token', 'conyr-token_check', `conyr-${'a'.repeat(59)}`]) {
  test(`--via ${via.length > 20 ? `with ${via.length} characters` : via} is a usage error`, async () =>
    assertUsageError(await cli(['key', '--via', via]), '--via'));
}
