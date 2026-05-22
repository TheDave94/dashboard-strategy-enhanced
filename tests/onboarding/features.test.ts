// ============================================================================
// Tests — FEATURE_REGISTRY HACS plugin detection
// ============================================================================
// PRINCIPLES.md §6 (CI-tested tier): the wizard's per-plugin install hint is
// the user-facing signal that a HACS plugin is missing. If detect() ever
// silently returns the wrong answer (typo'd tag string, helper signature
// change, refactor that bypasses the check), users either:
//   - see "install this plugin" even when installed (false-negative), or
//   - enable a feature that doesn't work (false-positive).
// Both modes are silent — the wizard hint itself is the only surface where
// the failure would surface, and a broken hint hides its own breakage.
//
// This file pins:
//   - The entry-id → plugin-tag mapping (catches tag-string drift)
//   - detect() returns installed:false when the tag is unregistered
//   - detect() returns installed:true when the tag IS registered
//   - The voice-fab sentinel survives refactors
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';

import { FEATURE_REGISTRY } from '../../src/onboarding/features';
import { makeHass } from '../fixtures/hass';

const hass = makeHass();

// Mapping from FEATURE_REGISTRY entry id → expected HACS plugin custom-element
// tag. Maintained alongside FEATURE_REGISTRY in src/onboarding/features.ts.
// If you add or rename an entry, update this table — a missing or wrong tag
// here silently bypasses the test's purpose.
const HACS_PLUGIN_TAGS: Record<string, string> = {
  'bubble-drawers': 'bubble-card',
  // `apexcharts-sparklines` is scheduled for removal (PR #40 — the
  // dashboard-level toggle was a no-op since v3.2.1). Keeping the row
  // here keeps the drift-guard green on main; the per-entry tests below
  // skip iterations whose entry isn't in the registry, so this stays
  // safe after the removal lands. Drop this line when cleaning up.
  'apexcharts-sparklines': 'apexcharts-card',
  'decluttering-templates': 'decluttering-card',
  'floorplan-views': 'floorplan-card',
};

describe('FEATURE_REGISTRY HACS plugin detection', () => {
  let getSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    getSpy?.mockRestore();
    getSpy = undefined;
  });

  describe.each(Object.entries(HACS_PLUGIN_TAGS))(
    '%s → %s',
    (entryId, tag) => {
      it('detect() reports installed:false when the tag is not registered', () => {
        const entry = FEATURE_REGISTRY.find((e) => e.id === entryId);
        if (!entry) {
          // Forward-compat: if the entry was removed (e.g. a feature was
          // retired), skip rather than fail. The HACS_PLUGIN_TAGS table
          // should be updated in the same PR that removes the entry.
          return;
        }
        // No spy — happy-dom's customElements has none of these tags.
        const result = entry.detect(hass);
        expect(result.installed).toBe(false);
      });

      it('detect() reports installed:true when the tag IS registered', () => {
        const entry = FEATURE_REGISTRY.find((e) => e.id === entryId);
        if (!entry) return;
        class StubElement extends HTMLElement {}
        // Return the stub ONLY for the expected tag — a typo in features.ts
        // (e.g. 'buble-card') would still see installed:false because the
        // typo'd lookup misses this branch.
        getSpy = vi.spyOn(customElements, 'get').mockImplementation((t) => {
          if (t === tag) return StubElement as unknown as CustomElementConstructor;
          return undefined;
        });
        const result = entry.detect(hass);
        expect(result.installed).toBe(true);
      });
    },
  );

  it('voice-fab reports installed:true even when ha-voice-command-button is unregistered', () => {
    // The `|| true` sentinel in features.ts is deliberate: ha-voice-command-
    // button is HA-core, not HACS. The wizard treats voice as always
    // available. If a refactor silently drops the sentinel, the voice-fab
    // toggle would start reporting itself as uninstalled on every HA
    // install — this test catches that.
    const entry = FEATURE_REGISTRY.find((e) => e.id === 'voice-fab');
    expect(entry).toBeDefined();
    const result = entry!.detect(hass);
    expect(result.installed).toBe(true);
  });

  it('every HACS-linked entry in the registry is covered by HACS_PLUGIN_TAGS or the voice-fab sentinel', () => {
    // Drift guard: if a new HACS plugin is added to FEATURE_REGISTRY without
    // a corresponding entry in HACS_PLUGIN_TAGS (or the voice-fab carve-out),
    // this test fails — forcing the test table to stay in sync with the
    // registry.
    const covered = new Set([...Object.keys(HACS_PLUGIN_TAGS), 'voice-fab']);
    const hacsEntries = FEATURE_REGISTRY.filter((e) => e.hacs);
    const uncovered = hacsEntries.filter((e) => !covered.has(e.id));
    expect(uncovered.map((e) => e.id)).toEqual([]);
  });
});
