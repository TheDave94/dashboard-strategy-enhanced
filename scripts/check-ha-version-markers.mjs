#!/usr/bin/env node
// ====================================================================
// HA version-marker check
// ====================================================================
// Guards against silent bumps to the minimum-HA requirement.
//
// `hacs.json` declares the minimum HA version (the floor we're
// committing to). Some HA frontend APIs / custom-element tags /
// service-action shapes were introduced AFTER that floor — using one
// of them in `src/` would silently raise the real-world minimum
// without bumping the declared one, breaking installs on the declared
// minimum.
//
// This script maintains a small allowlist of "introduced-in" markers
// keyed by API name. When `src/**/*.ts` contains a marker whose
// introduction version is newer than the hacs.json floor, the build
// fails with a precise pointer.
//
// To bump the floor:
//   1. Edit `hacs.json` `homeassistant` to the new minimum.
//   2. Add the new APIs you're now relying on to the allowlist below.
//   3. Document the rationale in the README + the relevant PR.
//
// ====================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// HA-introduced-in markers. Each entry: a substring (or word-boundary
// matched regex) to look for in source, and the HA version that
// introduced it. Sourced from the HA frontend changelog + the original
// review's audit findings.
//
// IMPORTANT: This list is intentionally small. Don't add markers for
// every API call — only the ones that mark a HA version boundary the
// project cares about gating against. Catalog of known boundaries:
//
//   - `LovelaceDashboardStrategyGetCreateSuggestions` interface
//     name + the `getCreateSuggestions` static method on strategies
//     → 2025.5
//   - The strict `ll-strategy-<type>-<name>` element-naming
//     enforcement → 2025.5
//   - The `perform-action` tap-action shape that supersedes
//     `call-service` → 2024.8 (older than 2025.5, harmless)
//   - The `select-options` tile feature → 2024.10 (older than
//     2025.5, harmless)
//
// Add to the list when you adopt an API tied to a strictly newer
// release than the current `homeassistant` declaration.
const VERSION_MARKERS = [
  // No 2025.6+ markers in use today. Adding `getCreateSuggestions`
  // as a sentinel — if this script's HA pin ever drops BELOW 2025.5
  // by accident, the build catches it.
  { needle: /getCreateSuggestions/g, introduced: '2025.5' },
  { needle: /ll-strategy-dashboard-/g, introduced: '2025.5' },
];

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(v);
  if (!m) throw new Error(`unrecognised version: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

function cmp(a, b) {
  const [a0, a1, a2] = parseVersion(a);
  const [b0, b1, b2] = parseVersion(b);
  return a0 - b0 || a1 - b1 || a2 - b2;
}

const floor = readJson('hacs.json').homeassistant;
if (!floor) {
  console.error('[check-ha-version-markers] hacs.json missing `homeassistant` field');
  process.exit(1);
}

const files = walk('src');
const violations = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // Strip line + block comments so a "deprecated since X" note in a
  // comment doesn't false-positive against an actual use site.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  for (const { needle, introduced } of VERSION_MARKERS) {
    if (cmp(introduced, floor) <= 0) continue; // marker older than or equal to floor — fine
    needle.lastIndex = 0;
    if (needle.test(stripped)) {
      violations.push({ file, needle: needle.source, introduced });
    }
  }
}

if (violations.length > 0) {
  console.error(`[check-ha-version-markers] hacs.json declares HA ≥ ${floor}, but src/ uses APIs introduced in a newer version:`);
  for (const v of violations) {
    console.error(`  ${v.file}: pattern /${v.needle}/ — introduced in ${v.introduced}`);
  }
  console.error('Either bump `homeassistant` in hacs.json to match, or remove the API usage.');
  process.exit(1);
}

console.log(`[check-ha-version-markers] OK (floor ${floor}, ${VERSION_MARKERS.length} marker(s) checked, ${files.length} file(s))`);
