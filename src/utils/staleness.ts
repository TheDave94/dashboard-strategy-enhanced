// ====================================================================
// Source-staleness detection (ROADMAP §3 — promoted 2026-05)
// ====================================================================
// A sensor can stop reporting without ever going `unavailable` — the
// integration keeps the last value around and the entity just sits on
// a frozen number. `hide_unavailable_in_rooms` / the unavailable alert
// badge never catch this case. These helpers detect "available but
// stale" so the dashboard can degrade visibly instead of showing a
// silent, frozen reading.
//
// Two deliberate design choices:
//
//   * Uses `last_updated`, NOT `last_changed`. `last_changed` only moves
//     when the value itself changes — a thermostat holding 21°C for an
//     hour has a fresh `last_updated` (still reporting) but a stale
//     `last_changed`. Staleness means "no updates received", which is
//     `last_updated`.
//
//   * Scoped to MEASUREMENT sensors, not just the `sensor` domain. The
//     spec is "showing a frozen number" — a periodically-reporting
//     measurement (temperature, humidity, power, %, air quality). Many
//     healthy `sensor` entities update only on change and legitimately
//     sit still for hours: enum sensors (a "mode"), timestamp sensors
//     (sun_next_dawn), id/text sensors. Counting those produces constant
//     false positives (verified against a live instance: ~520 "stale"
//     sensors at a 5-min window collapse to the real measurement set once
//     filtered). A sensor counts as a measurement when it declares
//     `state_class: measurement` or carries a numeric value with a unit.
//
// All checks run at generate-time (the same pass as the unavailable
// badge), so there is zero added cost on the reactive `willUpdate` hot
// path of the custom cards — the constraint the ROADMAP deferral flagged.
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';

/** Default freshness window (minutes) when `stale_after` is unset. */
export const DEFAULT_STALE_AFTER_MINUTES = 60;

/** Resolve the configured staleness threshold to milliseconds. */
export function staleThresholdMs(config: OrielConfig): number {
  const minutes =
    typeof config.stale_after === 'number' && config.stale_after > 0 ? config.stale_after : DEFAULT_STALE_AFTER_MINUTES;
  return minutes * 60_000;
}

/**
 * True when a state looks like a periodically-reporting measurement: it
 * declares `state_class: measurement`, or it carries a numeric value with
 * a unit. Filters out enum / timestamp / id / text sensors that update
 * only on change and would otherwise be flagged as "stale" forever.
 */
export function isMeasurementSensor(state: HassEntity | undefined): boolean {
  if (!state) return false;
  const attrs = (state.attributes ?? {}) as Record<string, unknown>;
  if (attrs.state_class === 'measurement') return true;
  if (!attrs.unit_of_measurement) return false;
  return state.state !== '' && state.state != null && !Number.isNaN(Number(state.state));
}

/**
 * True when an entity is "available but stale": it has a real value
 * (not unavailable/unknown/none) but its `last_updated` is older than
 * `thresholdMs`. Returns false for missing states and missing/invalid
 * timestamps — absence of evidence is not staleness.
 */
export function isStateStale(state: HassEntity | undefined, thresholdMs: number, now: number = Date.now()): boolean {
  if (!state) return false;
  const s = state.state;
  if (s === 'unavailable' || s === 'unknown' || s === 'none' || s == null || s === '') return false;
  const ts = state.last_updated;
  if (!ts) return false;
  const updatedMs = new Date(ts).getTime();
  if (Number.isNaN(updatedMs)) return false;
  return now - updatedMs > thresholdMs;
}

/**
 * Count stale measurement sensors, skipping anything the user hid
 * (no_dboard label, Registry config-hidden, or registry `hidden`).
 * Mirrors the unavailable-badge filtering so the two alerts agree on
 * what "counts". Returns the count plus one sample entity id to anchor
 * the badge.
 */
export function collectStaleSensors(
  hass: HomeAssistant,
  thresholdMs: number,
  now: number = Date.now()
): { count: number; sampleId?: string } {
  let count = 0;
  let sampleId: string | undefined;
  for (const [entityId, state] of Object.entries(hass.states)) {
    if (!entityId.startsWith('sensor.')) continue;
    if (!isMeasurementSensor(state as HassEntity)) continue;
    if (!isStateStale(state as HassEntity, thresholdMs, now)) continue;
    if (Registry.isExcludedByLabel(entityId)) continue;
    if (Registry.isHiddenByConfig(entityId)) continue;
    if (Registry.getEntity(entityId)?.hidden) continue;
    if (!sampleId) sampleId = entityId;
    count++;
  }
  return { count, sampleId };
}
