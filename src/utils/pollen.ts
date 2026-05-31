// ====================================================================
// POLLEN — PollenWatch integration helpers (thin reader)
// ====================================================================
// Detection + parsing for the PollenWatch HACS integration's sensor
// fleet. Generate-time only — the reactive card imports type aliases
// and pure functions, never builds dependencies on Registry from here
// (Registry isn't initialised inside the card itself).
//
// PollenWatch v2 exposes one analytics layer plus six raw sources, each
// emitting one sensor per pollen species:
//
//   sensor.pollenwatch_analytics_<species>_consensus    (enum state)
//   sensor.pollenwatch_open_meteo_<species>             (grains/m³, float)
//   sensor.pollenwatch_polleninformation_<species>      (0–4, Austrian scale)
//   sensor.pollenwatch_dwd_<species>                    (DWD ordinal 0–3)
//   sensor.pollenwatch_meteoswiss_<species>             (grains/m³, float)
//   sensor.pollenwatch_epin_<species>                   (grains/m³, float)
//   sensor.pollenwatch_google_<species>                 (0–5, Google scale)
//
// Severity resolution splits by source — there is no per-dashboard
// bucketing here:
//
//   - analytics: the consensus sensor's STATE is the enum
//     (`none`/`low`/`high`/`mixed`). `mixed` is analytics-only — sources
//     disagree by >1 level. Read directly from `state.state`.
//   - raw sources: the integration v2.1+ writes the authoritative bucket
//     onto `state.attributes.level_label` (`"none"`/`"low"`/`"high"` or
//     null). Read that attribute — never re-bucket the raw number.
//
// History: v4.15 → v4.16.1 mirrored PollenWatch's threshold tables here
// and drifted (see commit b4d635d for the symptoms). PollenWatch v2.1
// made the integration the single source of truth for severity buckets;
// this module collapsed to the present thin reader at v4.16.2.
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import {
  ALL_POLLEN_SOURCES,
  ALL_POLLEN_TYPES,
  type PollenSource,
  type PollenType,
} from '../types/strategy';

/**
 * Severity bucket every source maps into. Drives badge gating, tile
 * colour, and the chip strip. `mixed` is analytics-only (sources
 * disagree); raw sources resolve to none/low/high. Non-numeric /
 * unavailable states resolve to null so callers can choose how to
 * display "unknown".
 */
export type PollenLevel = 'none' | 'low' | 'high' | 'mixed';

const SOURCE_PREFIX: Record<PollenSource, string> = {
  analytics: 'sensor.pollenwatch_analytics_',
  open_meteo: 'sensor.pollenwatch_open_meteo_',
  polleninformation: 'sensor.pollenwatch_polleninformation_',
  dwd: 'sensor.pollenwatch_dwd_',
  meteoswiss: 'sensor.pollenwatch_meteoswiss_',
  epin: 'sensor.pollenwatch_epin_',
  google: 'sensor.pollenwatch_google_',
};

/**
 * True when ANY `sensor.pollenwatch_*` exists in this hass instance.
 * Used to gate the editor subgroup so users without the integration
 * never see the controls.
 */
export function detectPollenwatchInstalled(hass: HomeAssistant): boolean {
  for (const id of Object.keys(hass.states)) {
    if (id.startsWith('sensor.pollenwatch_')) return true;
  }
  return false;
}

/**
 * Sources for which at least one sensor exists. Drives the editor's
 * source dropdown so the user only sees options they can actually pick.
 */
export function detectAvailableSources(hass: HomeAssistant): PollenSource[] {
  const out: PollenSource[] = [];
  for (const src of ALL_POLLEN_SOURCES) {
    const prefix = SOURCE_PREFIX[src];
    if (Object.keys(hass.states).some((id) => id.startsWith(prefix))) {
      out.push(src);
    }
  }
  return out;
}

/**
 * Entity id of the canonical sensor for a (source, species) pair.
 *
 * Analytics is keyed `<prefix><species>_consensus` rather than `<prefix><species>`
 * because the integration also emits divergence binary_sensors with the
 * same root. Other sources emit `<prefix><species>` directly.
 */
export function pollenSensorId(source: PollenSource, type: PollenType): string {
  if (source === 'analytics') {
    return `${SOURCE_PREFIX.analytics}${type}_consensus`;
  }
  return `${SOURCE_PREFIX[source]}${type}`;
}

/**
 * Pollen species for which a sensor exists at the given source. Preserves
 * the canonical `ALL_POLLEN_TYPES` order so editor chip ordering stays
 * stable across hass instances.
 */
export function detectAvailableTypes(
  hass: HomeAssistant,
  source: PollenSource,
): PollenType[] {
  return ALL_POLLEN_TYPES.filter(
    (type) => hass.states[pollenSensorId(source, type)] !== undefined,
  );
}

/**
 * Resolve the configured species against what the source actually exposes.
 * Empty / missing config falls back to all detected species so a fresh
 * install shows every available pollen by default.
 */
export function resolvePollenTypes(
  hass: HomeAssistant,
  source: PollenSource,
  configured: PollenType[] | undefined,
): PollenType[] {
  const available = detectAvailableTypes(hass, source);
  if (!configured || configured.length === 0) return available;
  const availableSet = new Set(available);
  return configured.filter((t) => availableSet.has(t));
}

/**
 * Resolve the severity bucket for one PollenWatch sensor.
 *
 * Split by source — there is no per-dashboard threshold logic here:
 *
 *   - `analytics` reads the consensus sensor's STATE string
 *     (`none`/`low`/`high`/`mixed`), case-insensitive. `mixed` exists
 *     only on the analytics consensus — sources disagree by >1 level
 *     — and only the state carries it (the consensus sensor has no
 *     `level_label` attribute).
 *   - every raw source (open_meteo, meteoswiss, epin, polleninformation,
 *     google, dwd) reads `state.attributes.level_label`, written by
 *     PollenWatch v2.1+ via `analytics.level_for_source()`. The
 *     integration is the single source of truth for the bucketing
 *     thresholds — Oriel does not re-derive them.
 *
 * Anything unexpected (missing state, unrecognised enum, missing or
 * non-matching attribute) → null so callers can render "unknown"
 * instead of guessing.
 *
 * Pre-v2.1 raw sensors (no `level_label` attribute yet) also resolve to
 * null — the card simply shows them as unknown until the user updates
 * PollenWatch. This is the deliberate "thin reader" trade: no fallback
 * bucketing keeps the contract one-way and audit-friendly.
 */
export function pollenLevel(
  source: PollenSource,
  state: HassEntity | undefined,
): PollenLevel | null {
  if (!state) return null;

  if (source === 'analytics') {
    const raw = state.state;
    if (raw === 'unavailable' || raw === 'unknown' || raw === '') return null;
    const v = raw.toLowerCase();
    if (v === 'none' || v === 'low' || v === 'high' || v === 'mixed') return v;
    // PollenWatch can surface a `nodata` state on the consensus sensor
    // when no source contributed for this species today — treat as unknown.
    return null;
  }

  // Raw per-source sensor — trust PollenWatch's `level_label` attribute
  // (analytics.LEVEL_LABELS = {0:"none", 1:"low", 2:"high"}).
  const label = state.attributes?.level_label;
  if (label === 'none' || label === 'low' || label === 'high') return label;
  return null;
}

/**
 * "Active" — worth raising on the weather-section badge row. high and
 * mixed count; low and none stay quiet so the row only appears when
 * something actually warrants attention. (`mixed` is a v2-era state —
 * sources disagree, which is itself worth surfacing.)
 */
export function isActivePollen(level: PollenLevel | null): boolean {
  return level === 'high' || level === 'mixed';
}

/** Severity → HA palette token used by tiles, chips, badges. */
export function pollenSeverityColor(level: PollenLevel | null): string {
  switch (level) {
    case 'high':
      return 'red';
    case 'mixed':
      // v2-era "sources disagree" — orange signals "worth attention but
      // not definitively high". Same hue as the v1 `medium` to keep the
      // visual story consistent for users upgrading.
      return 'orange';
    case 'low':
      return 'yellow';
    case 'none':
      return 'green';
    default:
      return 'disabled';
  }
}

/** MDI icon per pollen species — purely cosmetic; falls back to flower. */
export function pollenIcon(type: PollenType): string {
  switch (type) {
    case 'grass':
    case 'rye':
      return 'mdi:grass';
    case 'birch':
    case 'alder':
    case 'hazel':
    case 'ash':
    case 'oak':
    case 'holm_oak':
    case 'beech':
    case 'elm':
    case 'carpinus':
    case 'plane_tree':
    case 'juglans':
      return 'mdi:tree';
    case 'olive':
    case 'cypress_family':
      return 'mdi:tree-outline';
    case 'alternaria':
      return 'mdi:mushroom-outline';
    case 'mugwort':
    case 'ragweed':
    case 'plantago':
    case 'urtica':
    case 'nettle_family':
    case 'chenopodium':
    case 'rumex':
    case 'asteraceae':
    default:
      return 'mdi:flower-pollen';
  }
}
