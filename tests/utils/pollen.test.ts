// ============================================================================
// Tests — PollenWatch helpers (v2.1 thin-reader schema)
// ============================================================================
// PollenWatch v2.1+ writes the authoritative severity bucket onto each raw
// per-source sensor as `attributes.level_label` ("none"/"low"/"high" or
// null), driven by analytics.level_for_source(). Oriel collapsed to a
// thin reader at v4.16.2: analytics still parses the consensus sensor's
// state enum (none/low/high/mixed), but every raw source just reads the
// attribute and never re-buckets.
//
// These tests pin the reader's contract:
//
//   - analytics → state enum, case-insensitive, mixed survives.
//   - raw sources → level_label, recognised values only, anything else null.
//   - missing state, missing attribute → null (deliberate: no fallback
//     bucketing for pre-v2.1 PollenWatch installs — they show as unknown
//     until the user updates).
//
// Each test passes a synthetic hass-like fixture so behaviour is
// deterministic without depending on the live HA instance.
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

function st(
  entity_id: string,
  state: string,
  attrs: Record<string, unknown> = {},
): HassEntity {
  return {
    entity_id,
    state,
    attributes: attrs,
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

describe('pollenLevel — analytics (state enum: none/low/high/mixed)', () => {
  it('passes through every v2 consensus enum value', () => {
    expect(pollenLevel('analytics', st('x', 'none'))).toBe('none');
    expect(pollenLevel('analytics', st('x', 'low'))).toBe('low');
    expect(pollenLevel('analytics', st('x', 'high'))).toBe('high');
    // `mixed` is analytics-only — sources disagree by >1 level. The
    // consensus sensor has no level_label attribute; the state IS the
    // label, and `mixed` must survive the thin reader.
    expect(pollenLevel('analytics', st('x', 'mixed'))).toBe('mixed');
  });

  it('is case-insensitive', () => {
    expect(pollenLevel('analytics', st('x', 'HIGH'))).toBe('high');
    expect(pollenLevel('analytics', st('x', 'Mixed'))).toBe('mixed');
  });

  it('rejects v1-era `medium` (gone in v2)', () => {
    expect(pollenLevel('analytics', st('x', 'medium'))).toBe(null);
  });

  it('returns null for unknown / unavailable / nodata', () => {
    expect(pollenLevel('analytics', st('x', 'wat'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unavailable'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'unknown'))).toBe(null);
    expect(pollenLevel('analytics', st('x', 'nodata'))).toBe(null);
  });

  it('ignores the level_label attribute for the analytics source', () => {
    // The consensus sensor doesn't write level_label; even if a stale or
    // hand-crafted state object carries one, the analytics path stays
    // strictly state-driven so `mixed` continues to round-trip.
    expect(
      pollenLevel('analytics', st('x', 'mixed', { level_label: 'high' })),
    ).toBe('mixed');
    expect(
      pollenLevel('analytics', st('x', 'lol', { level_label: 'low' })),
    ).toBe(null);
  });
});

// ----------------------------------------------------------------------------
// Raw-source thin-reader contract (PollenWatch v2.1+)
// ----------------------------------------------------------------------------
// PollenWatch v2.1 added `attributes.level_label` to every raw per-source
// sensor (open_meteo, polleninformation, dwd, meteoswiss, epin, google),
// populated by `analytics.level_for_source()`. Oriel reads that attribute
// verbatim and never re-buckets the raw number. Pre-v2.1 sensors without
// the attribute resolve to null (deliberate — the reader is one-way).
// ----------------------------------------------------------------------------

const RAW_SOURCES: PollenSource[] = [
  'open_meteo',
  'polleninformation',
  'dwd',
  'meteoswiss',
  'epin',
  'google',
];

describe('pollenLevel — raw sources read attributes.level_label', () => {
  it.each(RAW_SOURCES)('%s passes through level_label none/low/high', (src) => {
    expect(
      pollenLevel(src, st('x', '0.0', { level_label: 'none' })),
    ).toBe('none');
    expect(
      pollenLevel(src, st('x', '5', { level_label: 'low' })),
    ).toBe('low');
    expect(
      pollenLevel(src, st('x', '500', { level_label: 'high' })),
    ).toBe('high');
  });

  it.each(RAW_SOURCES)(
    '%s returns null when level_label is missing (pre-v2.1 install)',
    (src) => {
      // No fallback bucketing — the user sees "unknown" on the card
      // until PollenWatch is updated. Deliberate trade for the
      // one-way thin-reader contract.
      expect(pollenLevel(src, st('x', '42'))).toBe(null);
    },
  );

  it.each(RAW_SOURCES)(
    '%s returns null for unexpected level_label values',
    (src) => {
      // Anything outside the {none, low, high} set is treated as
      // unknown rather than rounded to a neighbour. Catches both
      // upstream schema changes and accidental typos.
      expect(
        pollenLevel(src, st('x', '0', { level_label: 'mixed' })),
      ).toBe(null);
      expect(
        pollenLevel(src, st('x', '0', { level_label: 'medium' })),
      ).toBe(null);
      expect(
        pollenLevel(src, st('x', '0', { level_label: 'severe' })),
      ).toBe(null);
      expect(pollenLevel(src, st('x', '0', { level_label: null }))).toBe(null);
      expect(pollenLevel(src, st('x', '0', { level_label: 2 }))).toBe(null);
    },
  );

  it.each(RAW_SOURCES)(
    '%s ignores the raw state — only level_label drives the result',
    (src) => {
      // The whole point of the thin reader: never re-derive from
      // numeric state. A "0.0" state with level_label="high" still
      // resolves to high (PollenWatch is the source of truth).
      expect(
        pollenLevel(src, st('x', '0.0', { level_label: 'high' })),
      ).toBe('high');
      expect(
        pollenLevel(src, st('x', '999', { level_label: 'none' })),
      ).toBe('none');
    },
  );
});

describe('pollenLevel — missing state object', () => {
  it.each([...RAW_SOURCES, 'analytics' as const])(
    '%s returns null when state is undefined',
    (src) => {
      expect(pollenLevel(src, undefined)).toBe(null);
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
