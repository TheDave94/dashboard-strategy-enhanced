// ====================================================================
// Camera companion extractor (v4.8.0)
// ====================================================================
// Given a camera entity, find every "companion" entity on the same
// HA device — that is, sensors / controls that belong logically with
// the camera (its motion detector, its battery, its built-in siren,
// the doorbell event source, an integrated spotlight light).
//
// Five companion buckets, each defined by an HA-standard device-class
// or domain pattern:
//
//   light    → light.* on the same device
//   motion   → binary_sensor.* with device_class=motion
//   siren    → siren.* on the same device
//   battery  → sensor.* with device_class=battery
//   doorbell → event.* with device_class=doorbell
//
// Replaces the v3.x Reolink/Aqara hardcoded branches in
// RoomViewStrategy.ts. None of the extraction logic is actually
// vendor-specific; the device-class shape applies to any camera
// integration that registers its sensors correctly (Reolink, Aqara,
// Eufy, Tapo, generic ONVIF, MQTT-published cams, you name it).
//
// Filtering: the strategy config knob `room_camera_companions: [...]`
// (default = all five) lets users opt out of categories. This module
// applies the filter at extraction time so downstream callers don't
// need to.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { Registry } from '../Registry';

export type CameraCompanionKind = 'light' | 'motion' | 'siren' | 'battery' | 'doorbell';

/**
 * Default companion set. When `room_camera_companions` isn't set in
 * the dashboard config, all five buckets are extracted.
 */
export const DEFAULT_CAMERA_COMPANIONS: CameraCompanionKind[] = [
  'light',
  'motion',
  'siren',
  'battery',
  'doorbell',
];

export interface CameraCompanions {
  light?: string;
  motion?: string;
  siren?: string;
  battery?: string;
  doorbell?: string;
}

/**
 * True when the entity matches the bucket's domain + device-class
 * predicate AND isn't excluded by the Registry's standard hidden/
 * disabled/no_dboard rules.
 */
function matches(
  kind: CameraCompanionKind,
  entityId: string,
  hass: HomeAssistant,
): boolean {
  if (Registry.isEntityExcluded(entityId)) return false;
  const state = hass.states[entityId];
  if (!state) return false;
  switch (kind) {
    case 'light':
      return entityId.startsWith('light.');
    case 'motion':
      return (
        entityId.startsWith('binary_sensor.') &&
        state.attributes?.device_class === 'motion'
      );
    case 'siren':
      return entityId.startsWith('siren.');
    case 'battery':
      return (
        entityId.startsWith('sensor.') &&
        state.attributes?.device_class === 'battery'
      );
    case 'doorbell':
      return (
        entityId.startsWith('event.') &&
        state.attributes?.device_class === 'doorbell'
      );
  }
}

/**
 * Find companion entities for a camera. Returns an object keyed by
 * companion kind, with at most one entity id per bucket (the first
 * match wins — production cams rarely have more than one of each).
 *
 * The `enabled` parameter filters which buckets are checked. Callers
 * pass the resolved `room_camera_companions` config (or
 * `DEFAULT_CAMERA_COMPANIONS` when unset).
 *
 * Returns an empty object when:
 *   - the camera entity has no device_id (unlikely but possible for
 *     ONVIF / generic streams)
 *   - the device has no matching companion entities
 *   - every requested bucket is filtered out by `enabled`
 *
 * The caller then decides whether to emit a `picture-glance` (when
 * any companion exists) or fall back to plain `picture-entity`.
 */
export function extractCameraCompanions(
  cameraEntityId: string,
  hass: HomeAssistant,
  enabled: CameraCompanionKind[] = DEFAULT_CAMERA_COMPANIONS,
): CameraCompanions {
  const out: CameraCompanions = {};
  if (!cameraEntityId.startsWith('camera.')) return out;

  const camEntry = Registry.getEntity(cameraEntityId);
  const deviceId = camEntry?.device_id;
  if (!deviceId) return out;

  const devEntities = Registry.getEntityIdsForDevice(deviceId);
  if (devEntities.length === 0) return out;

  // Resolve in a stable order — light, motion, siren, battery,
  // doorbell — so the output is deterministic regardless of which
  // entities the device exposed first.
  const enabledSet = new Set(enabled);
  for (const kind of ['light', 'motion', 'siren', 'battery', 'doorbell'] as const) {
    if (!enabledSet.has(kind)) continue;
    const hit = devEntities.find((id) => matches(kind, id, hass));
    if (hit) out[kind] = hit;
  }
  return out;
}

/**
 * True when the companions object has at least one entry — used by
 * the strategy to decide between `picture-glance` (companions present)
 * and `picture-entity` (no companions, plain camera card).
 */
export function hasAnyCompanion(companions: CameraCompanions): boolean {
  return (
    !!companions.light ||
    !!companions.motion ||
    !!companions.siren ||
    !!companions.battery ||
    !!companions.doorbell
  );
}

/**
 * Validate a `room_camera_companions` config value. Returns the
 * subset of input that's a valid CameraCompanionKind. Used by the
 * config-resolution path to silently drop garbage entries (e.g. typos
 * from hand-edited YAML).
 */
export function sanitizeCompanionList(value: unknown): CameraCompanionKind[] {
  if (!Array.isArray(value)) return DEFAULT_CAMERA_COMPANIONS;
  const valid: CameraCompanionKind[] = ['light', 'motion', 'siren', 'battery', 'doorbell'];
  const seen = new Set<CameraCompanionKind>();
  for (const v of value) {
    if (typeof v === 'string' && valid.includes(v as CameraCompanionKind)) {
      seen.add(v as CameraCompanionKind);
    }
  }
  return [...seen];
}
