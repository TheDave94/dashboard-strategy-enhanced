// ============================================================================
// Tests — source-staleness detection
// ============================================================================
// Locks down the two design choices that make staleness correct:
//   * last_updated (not last_changed) is the freshness signal
//   * only the `sensor` domain counts; hidden/labelled entities are skipped
// All checks take an explicit `now` so tests are deterministic.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import { Registry } from '../../src/Registry';
import {
  DEFAULT_STALE_AFTER_MINUTES,
  staleThresholdMs,
  isStateStale,
  isMeasurementSensor,
  collectStaleSensors,
} from '../../src/utils/staleness';
import type { HassEntity } from '../../src/types/homeassistant';
import { makeHass } from '../fixtures/hass';

const NOW = Date.parse('2026-05-29T12:00:00Z');
const ONE_HOUR_MS = 60 * 60 * 1000;
const iso = (msAgo: number): string => new Date(NOW - msAgo).toISOString();

function st(partial: Partial<HassEntity>): HassEntity {
  return {
    entity_id: 'sensor.x',
    state: '21.0',
    attributes: {},
    last_changed: iso(0),
    last_updated: iso(0),
    context: { id: '', user_id: null, parent_id: null },
    ...partial,
  } as HassEntity;
}

beforeEach(() => {
  Registry.resetForTesting();
});

describe('staleThresholdMs', () => {
  it('defaults to 60 minutes when unset', () => {
    expect(staleThresholdMs({})).toBe(DEFAULT_STALE_AFTER_MINUTES * 60_000);
    expect(staleThresholdMs({})).toBe(ONE_HOUR_MS);
  });

  it('uses the configured value', () => {
    expect(staleThresholdMs({ stale_after: 30 })).toBe(30 * 60_000);
  });

  it('falls back to default for zero / negative / non-number', () => {
    expect(staleThresholdMs({ stale_after: 0 })).toBe(ONE_HOUR_MS);
    expect(staleThresholdMs({ stale_after: -5 })).toBe(ONE_HOUR_MS);
    expect(staleThresholdMs({ stale_after: NaN })).toBe(ONE_HOUR_MS);
  });
});

describe('isStateStale', () => {
  it('is false for a freshly-updated sensor', () => {
    expect(isStateStale(st({ last_updated: iso(5 * 60_000) }), ONE_HOUR_MS, NOW)).toBe(false);
  });

  it('is true when last_updated is older than the threshold', () => {
    expect(isStateStale(st({ last_updated: iso(2 * ONE_HOUR_MS) }), ONE_HOUR_MS, NOW)).toBe(true);
  });

  it('uses last_updated, NOT last_changed (steady value still reporting = fresh)', () => {
    // Value hasn't changed in 3h (stale last_changed) but it's still
    // reporting every few minutes (fresh last_updated) — not stale.
    const steady = st({ last_changed: iso(3 * ONE_HOUR_MS), last_updated: iso(2 * 60_000) });
    expect(isStateStale(steady, ONE_HOUR_MS, NOW)).toBe(false);
  });

  it('is false for unavailable / unknown / none / empty states', () => {
    const old = iso(2 * ONE_HOUR_MS);
    for (const state of ['unavailable', 'unknown', 'none', '']) {
      expect(isStateStale(st({ state, last_updated: old }), ONE_HOUR_MS, NOW)).toBe(false);
    }
  });

  it('is false for a missing state or missing/invalid timestamp', () => {
    expect(isStateStale(undefined, ONE_HOUR_MS, NOW)).toBe(false);
    expect(isStateStale(st({ last_updated: undefined as unknown as string }), ONE_HOUR_MS, NOW)).toBe(false);
    expect(isStateStale(st({ last_updated: 'not-a-date' }), ONE_HOUR_MS, NOW)).toBe(false);
  });
});

describe('isMeasurementSensor', () => {
  const base = (partial: Partial<HassEntity>) => st(partial);
  it('is true for state_class: measurement', () => {
    expect(isMeasurementSensor(base({ attributes: { state_class: 'measurement' } }))).toBe(true);
  });
  it('is true for a numeric value with a unit', () => {
    expect(isMeasurementSensor(base({ state: '21.4', attributes: { unit_of_measurement: '°C' } }))).toBe(true);
  });
  it('is false for enum / id / timestamp sensors (no unit, no measurement class)', () => {
    expect(isMeasurementSensor(base({ state: 'Work (PC)', attributes: {} }))).toBe(false);
    expect(isMeasurementSensor(base({ state: '2026-05-30T02:24:47+00:00', attributes: {} }))).toBe(false);
    expect(isMeasurementSensor(base({ state: 'abc123', attributes: { unit_of_measurement: '' } }))).toBe(false);
  });
  it('is false for a non-numeric value even with a unit', () => {
    expect(isMeasurementSensor(base({ state: 'idle', attributes: { unit_of_measurement: 'W' } }))).toBe(false);
  });
});

describe('collectStaleSensors', () => {
  const meas = (id: string, msAgo: number, state = '21.0') => ({
    entity_id: id,
    state,
    last_updated: iso(msAgo),
    attributes: { unit_of_measurement: '°C', state_class: 'measurement' },
  });

  it('counts stale measurement sensors and ignores fresh ones', () => {
    const hass = makeHass({
      entities: [
        meas('sensor.stale_temp', 3 * ONE_HOUR_MS),
        meas('sensor.fresh_temp', 2 * 60_000, '22.0'),
        meas('sensor.also_stale', 2 * ONE_HOUR_MS, '40'),
      ],
    });
    Registry.initialize(hass, {});
    const { count, sampleId } = collectStaleSensors(hass, ONE_HOUR_MS, NOW);
    expect(count).toBe(2);
    expect(sampleId).toMatch(/^sensor\./);
  });

  it('only counts the sensor domain (event-driven domains idle legitimately)', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'binary_sensor.motion', state: 'off', last_updated: iso(5 * ONE_HOUR_MS) },
        { entity_id: 'switch.plug', state: 'on', last_updated: iso(5 * ONE_HOUR_MS) },
        meas('sensor.temp', 5 * ONE_HOUR_MS),
      ],
    });
    Registry.initialize(hass, {});
    const { count, sampleId } = collectStaleSensors(hass, ONE_HOUR_MS, NOW);
    expect(count).toBe(1);
    expect(sampleId).toBe('sensor.temp');
  });

  it('ignores stale non-measurement sensors (enum / id / timestamp)', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.desk_mode', state: 'Work', last_updated: iso(5 * ONE_HOUR_MS), attributes: {} },
        { entity_id: 'sensor.admin_user_id', state: 'abc123', last_updated: iso(5 * ONE_HOUR_MS), attributes: {} },
        meas('sensor.real_temp', 5 * ONE_HOUR_MS),
      ],
    });
    Registry.initialize(hass, {});
    const { count, sampleId } = collectStaleSensors(hass, ONE_HOUR_MS, NOW);
    expect(count).toBe(1);
    expect(sampleId).toBe('sensor.real_temp');
  });

  it('skips hidden and no_dboard-labelled sensors', () => {
    const hass = makeHass({
      entities: [
        { ...meas('sensor.hidden', 2 * ONE_HOUR_MS), hidden_by: 'user' },
        { ...meas('sensor.labelled', 2 * ONE_HOUR_MS), labels: ['no_dboard'] },
        meas('sensor.visible', 2 * ONE_HOUR_MS),
      ],
    });
    Registry.initialize(hass, {});
    const { count, sampleId } = collectStaleSensors(hass, ONE_HOUR_MS, NOW);
    expect(count).toBe(1);
    expect(sampleId).toBe('sensor.visible');
  });

  it('returns zero with no sample when nothing is stale', () => {
    const hass = makeHass({ entities: [meas('sensor.fresh', 60_000)] });
    Registry.initialize(hass, {});
    const { count, sampleId } = collectStaleSensors(hass, ONE_HOUR_MS, NOW);
    expect(count).toBe(0);
    expect(sampleId).toBeUndefined();
  });
});
