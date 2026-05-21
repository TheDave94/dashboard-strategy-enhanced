// ============================================================================
// Tests — scripts/check-ha-version-markers.mjs
// ============================================================================
// Pins the script's behaviour: clean repo passes; a synthetic file
// using a future-HA API fails the script with a precise pointer.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-ha-version-markers.mjs');
const CANARY_PATH = path.resolve(__dirname, '../../src/utils/_version_marker_canary.ts');

describe('check-ha-version-markers script', () => {
  it('exits 0 on the clean repo', () => {
    const res = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
    expect(res.status, `stderr: ${res.stderr.slice(0, 400)}`).toBe(0);
  });

  it('exits 1 when a source file uses a future-HA marker', () => {
    // The script reads hacs.json's `homeassistant` floor; the only way
    // to make a marker "newer than the floor" without editing the
    // script itself is to either drop hacs.json or add a synthetic
    // marker to a test file. We add a synthetic marker tied to a
    // pretend-future-version directly into a TS file by patching the
    // VERSION_MARKERS table — too invasive for a test. Cleaner: rely
    // on the script also surfacing pattern presence in error output,
    // and assert: if we add a synthetic marker to a fixture, the
    // script reports it under the current pinned floor.
    //
    // Pragmatic approach: write a file containing the literal
    // `__FUTURE_HA_API_DO_NOT_USE__` token and assert the script's
    // CURRENT failure mode (a `getCreateSuggestions` reference here
    // would still be 2025.5, equal to the floor — not newer).
    //
    // Easier: directly invoke the script with a temporary
    // `hacs.json` floor < the markers' introduction version. We
    // simulate this by writing a wrapper that overrides hacs.json
    // temporarily. To stay simple, we mutate hacs.json inline,
    // re-run, then restore.
    const hacsPath = path.resolve(__dirname, '../../hacs.json');
    const orig = existsSync(hacsPath) && require('node:fs').readFileSync(hacsPath, 'utf8');
    try {
      // Lower the floor BELOW the markers' introduction version
      writeFileSync(
        hacsPath,
        JSON.stringify(
          { name: 'Oriel', filename: 'oriel.js', homeassistant: '2024.1.0' },
          null,
          2,
        ),
      );
      const res = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
      expect(res.status, `script should fail when src uses 2025.5 markers but floor is 2024.1; stderr=${res.stderr.slice(0, 400)}`).not.toBe(0);
      // Error should mention the file + a hint at the marker
      expect(res.stderr).toMatch(/getCreateSuggestions|ll-strategy-dashboard-/);
    } finally {
      if (orig) writeFileSync(hacsPath, orig);
      // Clean any leftover canary file (paranoid)
      if (existsSync(CANARY_PATH)) unlinkSync(CANARY_PATH);
    }
  });
});
