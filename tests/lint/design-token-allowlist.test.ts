// ============================================================================
// Tests — design-token migration allowlist (v4.7.0 item 4)
// ============================================================================
// Pins the migration claim from the v4.7.0 follow-up #2 §4:
//
//   1. Card source files (src/cards/**) use no hardcoded hex colors
//      except in the explicitly-commented intentional exceptions.
//   2. The intentional-exception files (debug-panel.ts,
//      ScreensaverCard.ts) carry the "Whitelisted in the v4.7.0
//      design-token migration" sentinel comment so future readers
//      know why the hexes are there.
//
// Regression guard: a future PR that adds a raw hex in a card file
// without the sentinel trips the test, prompting either a migration
// to a token or an explicit allowlist addition.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ALLOWLIST = new Set([
  // Developer-debug surface, intentionally hardcoded so it's visually
  // identical across themes (screenshots in bug reports).
  'src/utils/debug-panel.ts',
  // Screensaver overlay's #000 / #fff fallbacks are deliberate so it
  // still renders dark-on-light when --card-background-color is unset.
  'src/cards/ScreensaverCard.ts',
]);

const HEX_RE = /#[0-9a-fA-F]{3,6}\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function relPath(file: string): string {
  const root = path.resolve(__dirname, '../..');
  return path.relative(root, file).replace(/\\/g, '/');
}

describe('design-token allowlist (§4 migration)', () => {
  const cardFiles = walk(path.resolve(__dirname, '../../src/cards'));

  it('no card file outside the allowlist contains a raw hex color', () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const f of cardFiles) {
      const rel = relPath(f);
      if (ALLOWLIST.has(rel)) continue;
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // Skip comment-only lines — `simon42#224` style issue refs
        // contain a `#` but aren't hex literals.
        if (/^\s*\/\//.test(line)) return;
        if (HEX_RE.test(line)) {
          offenders.push({ file: rel, line: i + 1, text: line.trim().slice(0, 100) });
        }
      });
    }
    expect(
      offenders,
      `Cards must use --ha-* tokens or semantic vars (no raw hex). Add to the allowlist with an intentional-exception comment if a hex is truly required.\n${offenders
        .map((o) => `  ${o.file}:${o.line}  ${o.text}`)
        .join('\n')}`,
    ).toHaveLength(0);
  });

  it('allowlisted files carry the explicit migration sentinel comment', () => {
    for (const rel of ALLOWLIST) {
      const full = path.resolve(__dirname, '../..', rel);
      const src = readFileSync(full, 'utf8');
      expect(
        src.includes('design-token migration') || src.includes('hardcoded-hex allowlist'),
        `${rel} must include a comment referencing the design-token migration so future readers see the intentional exception`,
      ).toBe(true);
    }
  });
});
