// ============================================================================
// Tests — camera-companion extractor (follow-up #3 §3)
// ============================================================================
// Pins the three claims the spec requires:
//   1. Given a device with a camera + light + battery, returns both.
//   2. Given a device with no companions, returns empty (caller falls
//      back to picture-entity).
//   3. The filter knob narrows the result (room_camera_companions:
//      ['battery'] returns only battery).
//
// Plus the input-sanitisation contract for hand-edited YAML.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from '../../src/Registry';
import {
  extractCameraCompanions,
  hasAnyCompanion,
  sanitizeCompanionList,
  DEFAULT_CAMERA_COMPANIONS,
} from '../../src/utils/camera-companions';
import { makeHass } from '../fixtures/hass';

beforeEach(() => {
  Registry.resetForTesting();
});

/**
 * Build a hass with one camera device that has the requested
 * companion entities attached.
 */
function makeCameraHass(opts: {
  include?: Array<'light' | 'motion' | 'siren' | 'battery' | 'doorbell'>;
}) {
  const include = new Set(opts.include ?? []);
  const entities: Array<{
    entity_id: string;
    state?: string;
    area_id?: string;
    device_id?: string;
    attributes?: Record<string, unknown>;
  }> = [
    {
      entity_id: 'camera.front',
      state: 'idle',
      area_id: 'porch',
      device_id: 'dev1',
    },
  ];
  if (include.has('light')) {
    entities.push({
      entity_id: 'light.front_spotlight',
      state: 'off',
      area_id: 'porch',
      device_id: 'dev1',
    });
  }
  if (include.has('motion')) {
    entities.push({
      entity_id: 'binary_sensor.front_motion',
      state: 'off',
      area_id: 'porch',
      device_id: 'dev1',
      attributes: { device_class: 'motion' },
    });
  }
  if (include.has('siren')) {
    entities.push({
      entity_id: 'siren.front_alarm',
      state: 'off',
      area_id: 'porch',
      device_id: 'dev1',
    });
  }
  if (include.has('battery')) {
    entities.push({
      entity_id: 'sensor.front_battery',
      state: '87',
      area_id: 'porch',
      device_id: 'dev1',
      attributes: { device_class: 'battery' },
    });
  }
  if (include.has('doorbell')) {
    entities.push({
      entity_id: 'event.front_doorbell',
      state: 'idle',
      area_id: 'porch',
      device_id: 'dev1',
      attributes: { device_class: 'doorbell' },
    });
  }
  return makeHass({
    areas: [{ area_id: 'porch', name: 'Porch' }],
    devices: [{ id: 'dev1', area_id: 'porch', manufacturer: 'Acme' }],
    entities,
  });
}

describe('extractCameraCompanions', () => {
  it('returns both light + battery when present (spec case 1)', () => {
    const hass = makeCameraHass({ include: ['light', 'battery'] });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.front', hass);
    expect(out.light).toBe('light.front_spotlight');
    expect(out.battery).toBe('sensor.front_battery');
    expect(out.motion).toBeUndefined();
    expect(out.siren).toBeUndefined();
    expect(out.doorbell).toBeUndefined();
    expect(hasAnyCompanion(out)).toBe(true);
  });

  it('returns empty when no companions exist (spec case 2 — falls back to picture-entity)', () => {
    const hass = makeCameraHass({ include: [] });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.front', hass);
    expect(out).toEqual({});
    expect(hasAnyCompanion(out)).toBe(false);
  });

  it("filter knob narrows the result (room_camera_companions: ['battery']) — spec case 3", () => {
    const hass = makeCameraHass({ include: ['light', 'motion', 'battery'] });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.front', hass, ['battery']);
    expect(out.battery).toBe('sensor.front_battery');
    expect(out.light).toBeUndefined();
    expect(out.motion).toBeUndefined();
  });

  it('returns all five companions when present + default filter', () => {
    const hass = makeCameraHass({
      include: ['light', 'motion', 'siren', 'battery', 'doorbell'],
    });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.front', hass);
    expect(out).toEqual({
      light: 'light.front_spotlight',
      motion: 'binary_sensor.front_motion',
      siren: 'siren.front_alarm',
      battery: 'sensor.front_battery',
      doorbell: 'event.front_doorbell',
    });
  });

  it('returns empty for an entity that is not a camera', () => {
    const hass = makeCameraHass({ include: ['light'] });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('light.front_spotlight', hass);
    expect(out).toEqual({});
  });

  it('returns empty when the camera has no device_id', () => {
    const hass = makeHass({
      areas: [{ area_id: 'porch', name: 'Porch' }],
      entities: [
        { entity_id: 'camera.streaming_only', state: 'idle', area_id: 'porch' },
      ],
    });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.streaming_only', hass);
    expect(out).toEqual({});
  });

  it('skips entities flagged as hidden / disabled via the Registry exclusion path', () => {
    const hass = makeHass({
      areas: [{ area_id: 'porch', name: 'Porch' }],
      devices: [{ id: 'dev1', area_id: 'porch' }],
      entities: [
        { entity_id: 'camera.front', state: 'idle', area_id: 'porch', device_id: 'dev1' },
        // Hidden via hidden_by — excluded by Registry's filter
        {
          entity_id: 'light.front_hidden',
          state: 'off',
          area_id: 'porch',
          device_id: 'dev1',
          hidden_by: 'user',
        },
      ],
    });
    Registry.initialize(hass, {});
    const out = extractCameraCompanions('camera.front', hass);
    expect(out.light).toBeUndefined();
  });
});

describe('sanitizeCompanionList', () => {
  it('returns the default list when input is not an array', () => {
    expect(sanitizeCompanionList(undefined)).toEqual(DEFAULT_CAMERA_COMPANIONS);
    expect(sanitizeCompanionList(null)).toEqual(DEFAULT_CAMERA_COMPANIONS);
    expect(sanitizeCompanionList('battery')).toEqual(DEFAULT_CAMERA_COMPANIONS);
  });

  it('returns an empty array for an explicit empty input — disables picture-glance', () => {
    expect(sanitizeCompanionList([])).toEqual([]);
  });

  it('drops unrecognised entries from hand-edited YAML', () => {
    const result = sanitizeCompanionList(['battery', 'motion', 'co2', 42, '<script>']);
    expect(result.sort()).toEqual(['battery', 'motion']);
  });

  it('deduplicates repeated entries', () => {
    const result = sanitizeCompanionList(['battery', 'battery', 'motion', 'battery']);
    expect(result.sort()).toEqual(['battery', 'motion']);
  });
});
