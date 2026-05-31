// ====================================================================
// POLLEN — PollenWatch integration helpers
// ====================================================================
// Detection + parsing for the PollenWatch HACS integration's sensor
// fleet. Generate-time only — the reactive card imports type aliases
// and pure functions, never builds dependencies on Registry from here
// (Registry isn't initialised inside the card itself).
//
// PollenWatch v2 exposes one analytics layer plus six raw sources, each
// emitting one sensor per pollen species:
//
//   sensor.pollenwatch_analytics_<species>_consensus    (enum: none/low/high/mixed)
//   sensor.pollenwatch_open_meteo_<species>             (grains/m³, float)
//   sensor.pollenwatch_polleninformation_<species>      (0–4, Austrian scale)
//   sensor.pollenwatch_dwd_<species>                    (DWD ordinal 0–3)
//   sensor.pollenwatch_meteoswiss_<species>             (grains/m³, float)
//   sensor.pollenwatch_epin_<species>                   (grains/m³, float)
//   sensor.pollenwatch_google_<species>                 (0–5, Google scale)
//
// `analytics` is the only enum source and the cleanest for tile colour.
// v2 changed the consensus vocabulary: `medium` is gone; `mixed` is new
// and means "sources disagree by >1 level" — the upstream's honesty
// signal for genuinely-conflicting readings. The raw sources are
// bucketed into none/low/high — `mixed` is a cross-source-only state.
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

// ====================================================================
// TEMPORARY — duplicates PollenWatch analytics.py thresholds AND those
// threshold values are themselves unverified
// ====================================================================
// Every numeric bucket below is a manually-mirrored copy of the
// corresponding table in PollenWatch's `custom_components/pollenwatch/
// analytics.py` (v2.0):
//
//   - GRAINS_THRESHOLDS  ↔ `_THRESHOLDS`
//   - PI_INDEX_TO_LEVEL  ↔ `_INDEX_TO_LEVEL`
//   - UPI_TO_LEVEL       ↔ `_UPI_TO_LEVEL`
//   - DWD_FLOAT_TO_LEVEL ↔ `_DWD_TO_LEVEL` composed with dwd._STR_TO_FLOAT
//
// **This is a colour-agreement tourniquet ONLY.** It makes Oriel match
// the bundled PollenWatch card; it does NOT make severity "correct".
// Two distinct problems travel together here and both retire together:
//
//   1. The duplication itself is the known root cause of drift between
//      Oriel and the PollenWatch card. v4.16 shipped with Oriel-side
//      thresholds that disagreed — PI ≥2 rendered "high" in Oriel while
//      the card showed "low" on the same reading, with parallel gaps
//      for Google UPI, DWD, and the tree grains/m³ band 50-99.
//
//   2. The threshold *values* themselves (trees 10/100, grasses 3/50,
//      and the PI/Google/DWD cutoffs) are family-borrowed EAACI
//      brackets currently under provenance review upstream — only 9 of
//      the 24 species have exact-species cutoffs; the rest borrow from
//      the family analogue. Matching analytics.py keeps us agreeing
//      with the card we're co-deployed with — it does NOT mean the
//      cutoffs themselves are settled. Do not treat them as such.
//
// Both retire the moment PollenWatch v3 exposes an authoritative
// severity attribute on every per-source sensor (Oriel collapses to a
// thin attribute reader, and the brackets debate moves entirely into
// the integration where the data lives). Tracked upstream:
//
//   https://github.com/TheDave94/pollenwatch/issues/2
//
// While this banner is in the file, treat the thresholds as a hard
// mirror of analytics.py — any change goes through PollenWatch first.
// ====================================================================

/** Trees + mugwort: EAACI (onset, peak) per analytics.py `_THRESHOLDS`. */
const _GRAINS_TREE_BRACKET: ReadonlySet<PollenType> = new Set<PollenType>([
  'alder',
  'birch',
  'olive',
  // mugwort is bracketed with trees in analytics.py "by analogy (birch/olive)".
  'mugwort',
  'hazel',
  'ash',
  'oak',
  'holm_oak',
  'beech',
  'elm',
  'carpinus',
  'plane_tree',
  'cypress_family',
  'juglans',
]);

/** Grasses + herbs: EAACI (onset, peak) per analytics.py `_THRESHOLDS`. */
const _GRAINS_GRASS_HERB_BRACKET: ReadonlySet<PollenType> = new Set<PollenType>([
  'grass',
  'ragweed',
  'rye',
  'plantago',
  'urtica',
  'nettle_family',
  'chenopodium',
  'rumex',
  'asteraceae',
]);

// Tuples below are `(onset, peak)` exactly as in analytics.py. Boundary
// convention matches `bucket_level`: `>= peak` → high, `>= onset` → low,
// else none (i.e. the threshold itself belongs to the higher level).
const _GRAINS_THRESHOLDS_TREE: readonly [number, number] = [10, 100];
const _GRAINS_THRESHOLDS_GRASS_HERB: readonly [number, number] = [3, 50];

/** polleninformation 0-4 → 3-level scale, per analytics.py `_INDEX_TO_LEVEL`. */
const _PI_INDEX_TO_LEVEL: Readonly<Record<number, 0 | 1 | 2>> = {
  0: 0, 1: 1, 2: 1, 3: 2, 4: 2,
};

/** Google UPI 0-5 → 3-level scale, per analytics.py `_UPI_TO_LEVEL`. */
const _UPI_TO_LEVEL: Readonly<Record<number, 0 | 1 | 2>> = {
  0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 2,
};

/**
 * DWD float → 3-level scale. PollenWatch's source emits the categorical
 * string mapped through `dwd._STR_TO_FLOAT` (0=0.0, 0-1=0.5, 1=1.0,
 * 1-2=1.5, 2=2.0, 2-3=2.5, 3=3.0); analytics.py then collapses the
 * STRING to a level via `_DWD_TO_LEVEL`. Here we go directly from the
 * float (the entity's `state`) to the same level — only the exact float
 * values produced by `_STR_TO_FLOAT` are valid keys.
 *
 *   {"0", "0-1"}       → none (floats 0.0, 0.5)
 *   {"1", "1-2", "2"}  → low  (floats 1.0, 1.5, 2.0)
 *   {"2-3", "3"}       → high (floats 2.5, 3.0)
 */
function _dwdFloatToLevel(n: number): 0 | 1 | 2 | null {
  // Match analytics.py's `_DWD_TO_LEVEL` exactly: any float not produced
  // by `_STR_TO_FLOAT` returns null (the source omits a level rather
  // than guess). We can't trust a free-form float — only these seven.
  if (n === 0.0 || n === 0.5) return 0;
  if (n === 1.0 || n === 1.5 || n === 2.0) return 1;
  if (n === 2.5 || n === 3.0) return 2;
  return null;
}

const _LEVEL_TO_POLLEN_LEVEL: Readonly<Record<0 | 1 | 2, PollenLevel>> = {
  0: 'none',
  1: 'low',
  2: 'high',
};

/**
 * Map a raw entity state into a normalised severity level. The mapping
 * mirrors PollenWatch v2 `analytics.py` exactly — see the TEMPORARY
 * banner above for the duplication caveat.
 *
 *   - analytics         — enum passthrough (none/low/high/mixed; nodata→null)
 *   - polleninformation — `_INDEX_TO_LEVEL`  (0=none, 1-2=low, 3-4=high)
 *   - google            — `_UPI_TO_LEVEL`    (0=none, 1-3=low, 4-5=high)
 *   - dwd               — `_DWD_TO_LEVEL` ∘ `_STR_TO_FLOAT` (≥2.5=high)
 *   - open_meteo / meteoswiss / epin — `bucket_level` (grains/m³ per species)
 *
 * Returns null when the state is missing / unavailable / unparseable,
 * or — for grains/m³ — when the species has no `_THRESHOLDS` entry
 * (alternaria is the only such species, since it's reported by PI as a
 * 0-4 index and never travels the grains/m³ path upstream).
 *
 * @param type — required when `source` is a numeric raw source so the
 *   correct per-species bracket is picked. Passing `undefined` for a
 *   grains/m³ source collapses to "no bracket" → returns null. For
 *   analytics / PI / Google / DWD the species is ignored.
 */
export function pollenLevel(
  source: PollenSource,
  state: HassEntity | undefined,
  type?: PollenType,
): PollenLevel | null {
  if (!state) return null;
  const raw = state.state;
  if (raw === 'unavailable' || raw === 'unknown' || raw === '') return null;

  if (source === 'analytics') {
    const v = raw.toLowerCase();
    if (v === 'none' || v === 'low' || v === 'high' || v === 'mixed') return v;
    // PollenWatch v2 may surface a `nodata` state on the consensus sensor
    // when no source contributed for this species today — treat as unknown.
    return null;
  }

  // Non-analytics state must be numeric; categorical raw values (e.g.
  // DWD's "0-1" strings) are exposed via `attributes.native_value`, but
  // the sensor's primary `state` is always the float from _STR_TO_FLOAT.
  if (raw === 'none') return 'none';
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;

  if (source === 'polleninformation') {
    // Match _INDEX_TO_LEVEL: clamp to 0..4, integer floor (analytics.py
    // does `int(index)` after clamping). 1.7 → 1 → low (matches the
    // PI index semantics: a value lives in the bucket of its integer
    // floor, just like Python's `int(...)`).
    const idx = Math.max(0, Math.min(4, Math.trunc(n)));
    const lvl = _PI_INDEX_TO_LEVEL[idx];
    return lvl === undefined ? null : _LEVEL_TO_POLLEN_LEVEL[lvl];
  }
  if (source === 'google') {
    const upi = Math.trunc(n);
    const lvl = _UPI_TO_LEVEL[upi];
    return lvl === undefined ? null : _LEVEL_TO_POLLEN_LEVEL[lvl];
  }
  if (source === 'dwd') {
    const lvl = _dwdFloatToLevel(n);
    return lvl === null ? null : _LEVEL_TO_POLLEN_LEVEL[lvl];
  }

  // grains/m³ sources: open_meteo, meteoswiss, epin. Per-species
  // thresholds — picked by tree vs grass+herb bracket.
  if (!type) return null;
  let bounds: readonly [number, number] | null = null;
  if (_GRAINS_TREE_BRACKET.has(type)) bounds = _GRAINS_THRESHOLDS_TREE;
  else if (_GRAINS_GRASS_HERB_BRACKET.has(type)) bounds = _GRAINS_THRESHOLDS_GRASS_HERB;
  // No entry → no bucket (matches `bucket_level` returning None for
  // species not in `_THRESHOLDS`; alternaria is the only such species
  // since it travels the PI index path upstream, never grains/m³).
  if (!bounds) return null;
  const [onset, peak] = bounds;
  if (n < onset) return 'none';
  if (n >= peak) return 'high';
  return 'low';
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
