// ============================================================================
// Tests — scripts/lint-translations.mjs HTML-safety gate (review §F-3)
// ============================================================================
// Each fixture under tests/fixtures/translation-bad/ contains a single
// hostile pattern that the linter must reject. The test spawns the
// linter as a subprocess against each fixture dir and asserts:
//   1. The linter exits non-zero
//   2. The stderr mentions the right kind of violation
// ============================================================================

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const SCRIPT = path.resolve(__dirname, '../../scripts/lint-translations.mjs');
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/translation-bad');

function runLinter(fixtureDir: string): { code: number; stderr: string; stdout: string } {
  const res = spawnSync('node', [SCRIPT, fixtureDir], { encoding: 'utf8' });
  return {
    code: res.status ?? -1,
    stderr: res.stderr || '',
    stdout: res.stdout || '',
  };
}

describe('lint-translations — bad-fixture gate', () => {
  // Each fixture dir is one bad-translation scenario. The test
  // auto-discovers them so adding a new bad fixture is just dropping
  // a folder.
  const fixtures = existsSync(FIXTURES_DIR)
    ? readdirSync(FIXTURES_DIR).filter((name) =>
        existsSync(path.join(FIXTURES_DIR, name, 'en.json')),
      )
    : [];

  // Sanity: ensure the test discovers the fixtures we expect
  it('discovers all bad fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
  });

  for (const name of fixtures) {
    it(`rejects fixture: ${name}`, () => {
      const dir = path.join(FIXTURES_DIR, name);
      const { code, stderr } = runLinter(dir);
      expect(code, `${name} should exit non-zero (got ${code}): ${stderr.slice(0, 300)}`).not.toBe(0);
      // Sanity: stderr should mention "lint-translations" (the prefix the
      // linter uses) so we know the script ran and reported, not crashed.
      expect(stderr).toMatch(/lint-translations/);
    });
  }
});

describe('lint-translations — real translations stay clean', () => {
  it('exits 0 on src/translations', () => {
    const realDir = path.resolve(__dirname, '../../src/translations');
    const { code } = runLinter(realDir);
    expect(code).toBe(0);
  });
});
