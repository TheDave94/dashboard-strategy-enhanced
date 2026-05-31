// ============================================================================
// Tests — PollenWatch helpers (v2 schema)
// ============================================================================
// Locks down the source-specific scaling that drives card colour and the
// weather-card badge gating. PollenWatch v2 (May 2026) expanded the
// integration to 24 canonical species across six raw sources plus an
// analytics consensus, and replaced the v1 `medium` consensus level
// with a `mixed` state (genuine cross-source disagreement). These tests
// pin the v2 mapping. Each test passes a synthetic hass-like fixture so
// behaviour is deterministic without depending on the live HA instance.
// ============================================================================

import { describe, it, expect } from 'vitest';

import {
  detectAvailableSources,
  detectAvailableTypes,
  detectPollenwatchInstalled,
  isActivePollen,
  pollenIcon,
  pollenLevel,
  pollenSensorId,
  pollenSeverityColor,
  resolvePollenTypes,
} from '../../src/utils/pollen';
import type { HassEntity } from '../../src/types/homeassistant';
import {
  ALL_POLLEN_TYPES,
  type PollenSource,
  type PollenType,
} from '../../src/types/strategy';
import { makeHass } from '../fixtures/hass';

function st(entity_id: string, state: string, unit?: string): HassEntity {
  return {
    entity_id,
    state,
    attributes: unit ? { unit_of_measurement: unit, state_class: 'measurement' } : {},
    last_changed: '2026-05-31T00:00:00Z',
    last_updated: '2026-05-31T00:00:00Z',
    context: { id: '', user_id: null, parent_id: null },
  } as HassEntity;
}

const SOURCES: PollenSource[] = [
  'analytics',
  'open_meteo',
  'polleninformation',
  'dwd',
  'meteoswiss',
  'epin',
  'google',
];

describe('pollenSensorId', () => {
  it('routes analytics through the _consensus suffix', () => {
    expect(pollenSensorId('analytics', 'grass')).toBe(
      'sensor.pollenwatch_analytics_grass_consensus',
    );
  });

  it.each(SOURCES.filter((s) => s !== 'analytics'))(
    'builds <prefix><species> for %s',
    (src) => {
      expect(pollenSensorId(src, 'birch')).toBe(`sensor.pollenwatch_${src}_birch`);
    },
  );

  it('honours canonical v2 species keys (not common-name aliases)', () => {
    // v2 entity_ids use the registry key, not the common name —
    // `plantago` not `plantain`, `carpinus` not `hornbeam`, etc.
    expect(pollenSensorId('epin', 'plantago')).toBe(
      'sensor.pollenwatch_epin_plantago',
    );
    expect(pollenSensorId('epin', 'carpinus')).toBe(
      'sensor.pollenwatch_epin_carpinus',
    );
  });
});

describe('detectPollenwatchInstalled', () => {
  it('is true when any pollenwatch sensor exists', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.pollenwatch_open_meteo_grass' }],
    });
    expect(detectPollenwatchInstalled(hass)).toBe(true);
  });

  it('is false on an instance without pollenwatch', () => {
    const hass = makeHass({ entities: [{ entity_id: 'sensor.living_room_temp' }] });
    expect(detectPollenwatchInstalled(hass)).toBe(false);
  });
});

describe('detectAvailableSources', () => {
  it('returns only sources whose prefix matches at least one sensor', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_open_meteo_grass' },
        { entity_id: 'sensor.pollenwatch_analytics_grass_consensus' },
        { entity_id: 'sensor.pollenwatch_dwd_birch' },
        { entity_id: 'sensor.pollenwatch_epin_plantago' },
      ],
    });
    expect(detectAvailableSources(hass)).toEqual([
      'analytics',
      'open_meteo',
      'dwd',
      'epin',
    ]);
  });

  it('includes meteoswiss when its prefix is present', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.pollenwatch_meteoswiss_grass' }],
    });
    expect(detectAvailableSources(hass)).toEqual(['meteoswiss']);
  });
});

describe('detectAvailableTypes', () => {
  it('lists only pollens with a sensor for the chosen source', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_open_meteo_grass' },
        { entity_id: 'sensor.pollenwatch_open_meteo_birch' },
        { entity_id: 'sensor.pollenwatch_polleninformation_ragweed' },
      ],
    });
    // Sort matches canonical ALL_POLLEN_TYPES order (alder, birch, grass, ...).
    expect(detectAvailableTypes(hass, 'open_meteo')).toEqual(['birch', 'grass']);
    expect(detectAvailableTypes(hass, 'polleninformation')).toEqual(['ragweed']);
    expect(detectAvailableTypes(hass, 'google')).toEqual([]);
  });

  it('picks up v2 species additions (e.g. plantago, alternaria)', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'sensor.pollenwatch_epin_plantago' },
        { entity_id: 'sensor.pollenwatch_epin_alternaria' },
      ],
    });
    expect(detectAvailableTypes(hass, 'epin')).toEqual(['plantago', 'alternaria']);
  });
});

describe('resolvePollenTypes', () => {
  const hass = makeHass({
    entities: [
      { entity_id: 'sensor.pollenwatch_analytics_grass_consensus' },
      { entity_id: 'sensor.pollenwatch_analytics_birch_consensus' },
    ],
  });

  it('falls back to all detected types when config is empty', () => {
    expect(resolvePollenTypes(hass, 'analytics', undefined)).toEqual(['birch', 'grass']);
    expect(resolvePollenTypes(hass, 'analytics', [])).toEqual(['birch', 'grass']);
  });

  it('drops configured types with no backing sensor', () => {
    const configured: PollenType[] = ['grass', 'olive', 'birch'];
    expect(resolvePollenTypes(hass, 'analytics', configured)).toEqual(['grass', 'birch']);
  });
});

describe('pollenLevel — analytics (v2 enum: none/low/high/mixed)', () => {
  it('passes through every v2 enum value', () => {
    expect(pollenLevel('analytics', st('x', 'none'))).toBe('none');
    expect(pollenLevel('analytics', st('x', 'low'))).toBe('low');
    expect(pollenLevel('analytics', st('x', 'high'))).toBe('high');
    expect(pollenLevel('analytics', st('x', 'mixed'))).toBe('mixed');
  });

  it('is case-insensitive', () => {
    expect(pollenLevel('analytics', st('x', 'HIGH'))).toBe('high');
    expect(pollenLevel('analytics', st('x', 'Mixed'))).toBe('mixed');
  });

  it('rejects v1-era `medium` (gone in v2)', () => {
    // Pin: if a user has a stale state object from a v1 install, we
    // resolve to null rather than silently treating it as low/high.
    expect(pollenLevel('analytics', st('x', 'medium'))).toBe(null);
  });

  it('returns null for unknown / unavailable / nodata', () => {
    expect(pollenLevel('analytics', st('x', 'wat'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unavailable'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unknown'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'nodata'))).toBe(null);
  });
});

// ----------------------------------------------------------------------------
// Stopgap-mirror lockdown
// ----------------------------------------------------------------------------
// The tests below pin pollenLevel() to PollenWatch v2 analytics.py's tables
// verbatim. Any test failure here means EITHER our mirror has drifted from
// PollenWatch (then update both in tandem with a PollenWatch release pin)
// OR PollenWatch itself moved (same answer). The TEMPORARY banner in
// pollen.ts spells out why this duplication exists and when it retires
// (PollenWatch v3 — TheDave94/pollenwatch#2). Until then this file is the
// mirror's safety net.
// ----------------------------------------------------------------------------

describe('pollenLevel — polleninformation (analytics.py _INDEX_TO_LEVEL)', () => {
  // _INDEX_TO_LEVEL = {0:0, 1:1, 2:1, 3:2, 4:2}
  it('buckets the Austrian 0-4 index exactly per analytics.py', () => {
    expect(pollenLevel('polleninformation', st('x', '0'))).toBe('none');
    expect(pollenLevel('polleninformation', st('x', '1'))).toBe('low');
    expect(pollenLevel('polleninformation', st('x', '2'))).toBe('low');
    expect(pollenLevel('polleninformation', st('x', '3'))).toBe('high');
    expect(pollenLevel('polleninformation', st('x', '4'))).toBe('high');
  });

  it('clamps out-of-range like analytics.py (max(0, min(4, int(idx))))', () => {
    expect(pollenLevel('polleninformation', st('x', '-1'))).toBe('none');
    expect(pollenLevel('polleninformation', st('x', '5'))).toBe('high');
    expect(pollenLevel('polleninformation', st('x', '99'))).toBe('high');
  });

  it('floors fractional values toward the integer bucket', () => {
    // analytics.py uses int() which truncates toward zero. 2.9 → 2 → low.
    expect(pollenLevel('polleninformation', st('x', '2.9'))).toBe('low');
    expect(pollenLevel('polleninformation', st('x', '3.0'))).toBe('high');
  });
});

describe('pollenLevel — google UPI (analytics.py _UPI_TO_LEVEL)', () => {
  // _UPI_TO_LEVEL = {0:0, 1:1, 2:1, 3:1, 4:2, 5:2}
  // Note: Moderate (3) stays at LOW per analytics.py — Google reserves
  // High/Very High for the elevated tier; the health-conservative bias
  // lives once in consensus take-the-higher, not here.
  it('buckets UPI 0-5 exactly per analytics.py', () => {
    expect(pollenLevel('google', st('x', '0'))).toBe('none');
    expect(pollenLevel('google', st('x', '1'))).toBe('low');
    expect(pollenLevel('google', st('x', '2'))).toBe('low');
    expect(pollenLevel('google', st('x', '3'))).toBe('low');
    expect(pollenLevel('google', st('x', '4'))).toBe('high');
    expect(pollenLevel('google', st('x', '5'))).toBe('high');
  });

  it('returns null for out-of-range UPI (matches `.get(upi)` semantics)', () => {
    // analytics.py's google_collapse returns None when upi is not in the
    // 0..5 keyset. We mirror that with `null` so downstream renders as
    // unknown rather than guessing.
    expect(pollenLevel('google', st('x', '6'))).toBe(null);
    expect(pollenLevel('google', st('x', '-1'))).toBe(null);
  });
});

describe('pollenLevel — dwd (analytics.py _DWD_TO_LEVEL ∘ _STR_TO_FLOAT)', () => {
  // _STR_TO_FLOAT: "0"→0.0, "0-1"→0.5, "1"→1.0, "1-2"→1.5, "2"→2.0,
  //                "2-3"→2.5, "3"→3.0
  // _DWD_TO_LEVEL: "0","0-1"→0; "1","1-2","2"→1; "2-3","3"→2
  it('low band stops at 2.0; high begins at 2.5 (the "2-3" string)', () => {
    expect(pollenLevel('dwd', st('x', '0'))).toBe('none');
    expect(pollenLevel('dwd', st('x', '0.5'))).toBe('none');
    expect(pollenLevel('dwd', st('x', '1'))).toBe('low');
    expect(pollenLevel('dwd', st('x', '1.5'))).toBe('low');
    expect(pollenLevel('dwd', st('x', '2'))).toBe('low');
    expect(pollenLevel('dwd', st('x', '2.5'))).toBe('high');
    expect(pollenLevel('dwd', st('x', '3'))).toBe('high');
  });

  it('returns null for floats outside the seven canonical _STR_TO_FLOAT values', () => {
    // analytics.py's dwd_collapse looks up by the categorical *string*;
    // anything that didn't come from _STR_TO_FLOAT (e.g. an interpolated
    // 1.7 from some hypothetical future source) has no level entry, so
    // we omit rather than guess.
    expect(pollenLevel('dwd', st('x', '0.7'))).toBe(null);
    expect(pollenLevel('dwd', st('x', '1.7'))).toBe(null);
    expect(pollenLevel('dwd', st('x', '2.7'))).toBe(null);
  });
});

describe('pollenLevel — grains/m³ (analytics.py bucket_level + _THRESHOLDS)', () => {
  // _THRESHOLDS bracket A (trees + mugwort): (10, 100)
  // _THRESHOLDS bracket B (grass + herbs):   (3, 50)
  // bucket_level: >= peak → 2 (high); >= onset → 1 (low); else 0 (none).

  describe('tree bracket (onset=10, peak=100)', () => {
    it.each([
      'alder',
      'birch',
      'olive',
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
    ] as const)('%s uses 10/100', (sp) => {
      expect(pollenLevel('open_meteo', st('x', '0', 'grains/m³'), sp)).toBe('none');
      expect(pollenLevel('open_meteo', st('x', '9', 'grains/m³'), sp)).toBe('none');
      expect(pollenLevel('open_meteo', st('x', '10', 'grains/m³'), sp)).toBe('low');
      expect(pollenLevel('open_meteo', st('x', '50', 'grains/m³'), sp)).toBe('low');
      expect(pollenLevel('open_meteo', st('x', '99', 'grains/m³'), sp)).toBe('low');
      expect(pollenLevel('open_meteo', st('x', '100', 'grains/m³'), sp)).toBe('high');
      expect(pollenLevel('open_meteo', st('x', '500', 'grains/m³'), sp)).toBe('high');
    });

    it('peak boundary belongs to high (>= peak, not >)', () => {
      // Pin: peak is INCLUSIVE in analytics.py — `if grains >= peak`.
      // This was the v4.16 tree-band drift (50-99 wrongly rendered high
      // in Oriel) being corrected — keep an explicit guard around it.
      expect(pollenLevel('meteoswiss', st('x', '100', 'grains/m³'), 'birch')).toBe('high');
      expect(pollenLevel('meteoswiss', st('x', '99.99', 'grains/m³'), 'birch')).toBe('low');
    });
  });

  describe('grass + herb bracket (onset=3, peak=50)', () => {
    it.each([
      'grass',
      'ragweed',
      'rye',
      'plantago',
      'urtica',
      'nettle_family',
      'chenopodium',
      'rumex',
      'asteraceae',
    ] as const)('%s uses 3/50', (sp) => {
      expect(pollenLevel('epin', st('x', '0', 'grains/m³'), sp)).toBe('none');
      expect(pollenLevel('epin', st('x', '2.9', 'grains/m³'), sp)).toBe('none');
      expect(pollenLevel('epin', st('x', '3', 'grains/m³'), sp)).toBe('low');
      expect(pollenLevel('epin', st('x', '49', 'grains/m³'), sp)).toBe('low');
      expect(pollenLevel('epin', st('x', '50', 'grains/m³'), sp)).toBe('high');
      expect(pollenLevel('epin', st('x', '999', 'grains/m³'), sp)).toBe('high');
    });
  });

  it('returns null for grains/m³ + alternaria (no _THRESHOLDS entry)', () => {
    // analytics.py's bucket_level returns None for species not in the
    // table; alternaria is the only such species in v2 (it travels the
    // polleninformation 0-4 index path upstream, never grains/m³).
    expect(pollenLevel('open_meteo', st('x', '50', 'grains/m³'), 'alternaria')).toBe(null);
    expect(pollenLevel('meteoswiss', st('x', '100', 'grains/m³'), 'alternaria')).toBe(null);
    expect(pollenLevel('epin', st('x', '10', 'grains/m³'), 'alternaria')).toBe(null);
  });

  it('returns null for grains/m³ when species is not supplied', () => {
    // Callers in src/cards/PollenCard.ts always pass the species; this
    // pins the defensive fall-through used elsewhere.
    expect(pollenLevel('open_meteo', st('x', '50', 'grains/m³'))).toBe(null);
  });

  it.each(['open_meteo', 'meteoswiss', 'epin'] as const)(
    '%s respects the per-species bracket (grass on tree-source still uses 3/50)',
    (src) => {
      // The source is unrelated to the bracket — bracket is per species.
      // 4 grains/m³ on grass is "low" (>=3); 4 on birch is "none" (<10).
      expect(pollenLevel(src, st('x', '4', 'grains/m³'), 'grass')).toBe('low');
      expect(pollenLevel(src, st('x', '4', 'grains/m³'), 'birch')).toBe('none');
    },
  );
});

describe('isActivePollen (v2: high or mixed)', () => {
  it('treats high and mixed as active', () => {
    expect(isActivePollen('high')).toBe(true);
    expect(isActivePollen('mixed')).toBe(true);
  });
  it('treats low / none / null as quiet', () => {
    expect(isActivePollen('low')).toBe(false);
    expect(isActivePollen('none')).toBe(false);
    expect(isActivePollen(null)).toBe(false);
  });
});

describe('pollenSeverityColor', () => {
  it('maps severity buckets to palette tokens', () => {
    expect(pollenSeverityColor('high')).toBe('red');
    // mixed shares orange with the v1 `medium` so upgrading users see
    // the same hue for "worth attention but not definitively high".
    expect(pollenSeverityColor('mixed')).toBe('orange');
    expect(pollenSeverityColor('low')).toBe('yellow');
    expect(pollenSeverityColor('none')).toBe('green');
    expect(pollenSeverityColor(null)).toBe('disabled');
  });
});

describe('pollenIcon', () => {
  it('returns a non-empty mdi id for every v2 canonical species', () => {
    for (const t of ALL_POLLEN_TYPES) {
      expect(pollenIcon(t)).toMatch(/^mdi:/);
    }
  });

  it('uses a tree mark for tree species', () => {
    expect(pollenIcon('birch')).toBe('mdi:tree');
    expect(pollenIcon('oak')).toBe('mdi:tree');
    expect(pollenIcon('hazel')).toBe('mdi:tree');
  });

  it('uses a mushroom mark for the lone fungal spore', () => {
    expect(pollenIcon('alternaria')).toBe('mdi:mushroom-outline');
  });
});
