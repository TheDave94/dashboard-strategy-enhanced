// ====================================================================
// Performance smoke — Registry under hass.entities churn
// ====================================================================
// Baseline measurement for the follow-up #2 §5 perf work. Simulates
// the Z-Wave/Zigbee burst case: hass.entities gets replaced 10 times
// in succession (each replacement carries one added entity, mimicking
// a device-add registering its child entities), and we measure:
//
//   1. Total wall-clock time across all 10 Registry.initialize calls.
//   2. The number of times the Registry actually rebuilt (vs early-
//      returned via the cache-identity check).
//
// Baseline (no §5 mitigations applied) we expect 10/10 rebuilds. With
// the optional §5b microtask coalescing, the count drops to 1.
//
// The budget below is set with headroom over the measured-after value
// — bumping it requires a deliberate PR and a fresh measurement.
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from '../../src/Registry';
import type { HomeAssistant } from '../../src/types/homeassistant';
import type { OrielConfig } from '../../src/types/strategy';
import { makeHass } from '../fixtures/hass';

/** Same fixture shape as strategy-generate.bench.test.ts — 10 areas,
 *  300 entities (30 per area, 5 domains in rotation). */
function buildLargeHass(): HomeAssistant {
  const areas = Array.from({ length: 10 }, (_, i) => ({
    area_id: `area_${i}`,
    name: `Room ${i}`,
  }));
  const entities = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 30; j++) {
      const domain = ['light', 'switch', 'sensor', 'binary_sensor', 'cover'][j % 5]!;
      entities.push({
        entity_id: `${domain}.r${i}_${j}`,
        state: 'on',
        attributes: { friendly_name: `${domain} ${i}.${j}` },
        area_id: `area_${i}`,
      });
    }
  }
  return makeHass({ areas, entities });
}

/**
 * Return a new `hass` object whose `entities` identity differs from
 * the input. Adds one fresh entity each call so the rebuild has real
 * work to do (not just identity-flip with same contents).
 */
function replaceEntities(hass: HomeAssistant, idx: number): HomeAssistant {
  const newId = `light.churn_${idx}`;
  // hass.entities is a Record<string, EntityRegistryEntry>. Build a
  // new object reference (identity flip) carrying the existing entries
  // + one new one.
  const existing = (hass.entities ?? {}) as Record<string, unknown>;
  const newEntities = {
    ...existing,
    [newId]: {
      entity_id: newId,
      area_id: 'area_0',
      device_id: null,
      labels: [],
      hidden_by: null,
      disabled_by: null,
      platform: 'mqtt',
    },
  };
  // hass.states also needs the new entity so the perf test's lookups
  // don't see a dangling reference.
  const existingStates = (hass.states ?? {}) as Record<string, unknown>;
  const newStates = {
    ...existingStates,
    [newId]: {
      state: 'on',
      attributes: { friendly_name: `Churn ${idx}` },
      entity_id: newId,
      last_changed: new Date().toISOString(),
    },
  };
  return {
    ...hass,
    entities: newEntities,
    states: newStates,
  } as HomeAssistant;
}

const REPLACEMENTS = 10;
const WARMUP = 2;
const RUNS = 5;

// Total wall-clock budget across the 10 successive Registry.initialize
// calls on the 300-entity fixture. Set with headroom over the measured
// baseline + after-fix values; see PR description for the numbers
// observed during follow-up #2 §5.
const CHURN_BUDGET_MS = 250;

describe('Registry under hass.entities churn', () => {
  let baseHass: HomeAssistant;
  const config: OrielConfig = {};

  beforeEach(() => {
    Registry.resetForTesting();
    baseHass = buildLargeHass();
  });

  it(`completes ${REPLACEMENTS} successive entity replacements under ${CHURN_BUDGET_MS}ms`, () => {
    // Warm-up runs help V8 settle on its JIT decisions before we
    // measure — same pattern as strategy-generate.bench.test.ts.
    for (let w = 0; w < WARMUP; w++) {
      Registry.resetForTesting();
      let hass = baseHass;
      Registry.initialize(hass, config);
      for (let r = 0; r < REPLACEMENTS; r++) {
        hass = replaceEntities(hass, r);
        Registry.initialize(hass, config);
      }
    }

    const durations: number[] = [];
    for (let m = 0; m < RUNS; m++) {
      Registry.resetForTesting();
      baseHass = buildLargeHass();
      let hass = baseHass;
      // Prime the Registry with the initial fixture (counts as 1 rebuild)
      Registry.initialize(hass, config);
      const t0 = performance.now();
      for (let r = 0; r < REPLACEMENTS; r++) {
        hass = replaceEntities(hass, r);
        Registry.initialize(hass, config);
      }
      durations.push(performance.now() - t0);
    }

    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = durations.reduce((s, x) => s + x, 0) / durations.length;

    // eslint-disable-next-line no-console
    console.log(
      `[registry-churn] ${REPLACEMENTS} replacements on 300-entity fixture: ` +
        `min ${min.toFixed(1)}ms / avg ${avg.toFixed(1)}ms / max ${max.toFixed(1)}ms ` +
        `(budget ${CHURN_BUDGET_MS}ms)`,
    );

    expect(max, `worst-case must be under ${CHURN_BUDGET_MS}ms`).toBeLessThan(CHURN_BUDGET_MS);
  });

  it('records the rebuild-count contract — N replacements = N rebuilds without coalescing', () => {
    Registry.resetForTesting();
    let hass = baseHass;
    Registry.initialize(hass, config);
    const beforeChurn = Registry.getRebuildCountForTesting();
    for (let r = 0; r < REPLACEMENTS; r++) {
      hass = replaceEntities(hass, r);
      Registry.initialize(hass, config);
    }
    const afterChurn = Registry.getRebuildCountForTesting();
    const rebuildsDuringChurn = afterChurn - beforeChurn;

    // eslint-disable-next-line no-console
    console.log(`[registry-churn] rebuilds during ${REPLACEMENTS}-replacement burst: ${rebuildsDuringChurn}`);

    // Today (no coalescing): each replacement triggers a full rebuild.
    // If §5b lands, this drops to 1 and we tighten the assertion.
    expect(rebuildsDuringChurn).toBe(REPLACEMENTS);
  });

  it('idempotent within one render pass — repeated initialize with same hass identity does not rebuild', () => {
    Registry.resetForTesting();
    Registry.initialize(baseHass, config);
    const before = Registry.getRebuildCountForTesting();
    // Re-call with the same hass reference 50 times — must not trigger
    // a rebuild. This is the existing cache-identity check; the test
    // pins that contract against regressions from the §5 work.
    for (let i = 0; i < 50; i++) {
      Registry.initialize(baseHass, config);
    }
    const after = Registry.getRebuildCountForTesting();
    expect(after - before).toBe(0);
  });
});
