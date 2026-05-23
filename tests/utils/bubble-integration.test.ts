// ============================================================================
// Tests — bubble-integration helpers (HACS-uninstalled fallback)
// ============================================================================
// PRINCIPLES.md §6 (CI-tested tier): bubble-card pop-up section emission gates
// on `use_bubble_drawers === true && isBubbleCardInstalled()`. With bubble-
// card uninstalled the strategy silently emits zero pop-up cards — no warning,
// no error. That's the §2-permitted silent fallback, but PRINCIPLES.md §6
// requires CI to verify it stays silent (vs. silently throwing, or silently
// emitting broken `custom:bubble-card` placeholders that HA would render as
// "Custom element doesn't exist").
//
// Once ROADMAP §2's tile-tap_action rewiring lands, this surface gets
// further responsibility — every emitted tile's tap_action would be
// rewritten on the same gate. The `withBubbleTapAction` helper is already
// here; this file pins it ahead of that wiring so a regression there
// is caught immediately.
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  BUBBLE_ACTIONABLE_DOMAINS,
  isBubbleActionable,
  isBubbleCardInstalled,
  bubbleHashFor,
  buildBubblePopupCards,
  collectBubbleCandidates,
  withBubbleTapAction,
} from '../../src/utils/bubble-integration';
import { makeHass } from '../fixtures/hass';

describe('isBubbleCardInstalled()', () => {
  let getSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    getSpy?.mockRestore();
    getSpy = undefined;
  });

  it('returns false when bubble-card is not registered', () => {
    // Test env default — no customElements.define for bubble-card.
    expect(isBubbleCardInstalled()).toBe(false);
  });

  it('returns true when bubble-card IS registered', () => {
    class StubBubble extends HTMLElement {}
    getSpy = vi.spyOn(customElements, 'get').mockImplementation((tag) => {
      if (tag === 'bubble-card') return StubBubble as unknown as CustomElementConstructor;
      return undefined;
    });
    expect(isBubbleCardInstalled()).toBe(true);
  });

  it('returns false rather than throwing when customElements.get throws', () => {
    // Defensive — the try/catch in the helper guards against unusual hosts
    // (SSR, locked-down web views) where customElements may behave oddly.
    getSpy = vi.spyOn(customElements, 'get').mockImplementation(() => {
      throw new Error('synthetic');
    });
    expect(isBubbleCardInstalled()).toBe(false);
  });
});

describe('bubbleHashFor()', () => {
  it('replaces dots with dashes and prefixes with #bubble-', () => {
    expect(bubbleHashFor('light.living_room')).toBe('#bubble-light-living_room');
    expect(bubbleHashFor('climate.kitchen')).toBe('#bubble-climate-kitchen');
    expect(bubbleHashFor('media_player.lounge_sonos')).toBe(
      '#bubble-media_player-lounge_sonos',
    );
  });

  it('produces stable output for the same entity_id', () => {
    expect(bubbleHashFor('cover.shutter_1')).toBe(bubbleHashFor('cover.shutter_1'));
  });
});

describe('withBubbleTapAction()', () => {
  it('returns a copy with tap_action pointing at the canonical bubble hash', () => {
    const tile = { type: 'tile', entity: 'light.living_room', icon: 'mdi:lamp' };
    const result = withBubbleTapAction(tile, 'light.living_room');
    expect(result).toEqual({
      type: 'tile',
      entity: 'light.living_room',
      icon: 'mdi:lamp',
      tap_action: {
        action: 'navigate',
        navigation_path: '#bubble-light-living_room',
      },
    });
  });

  it('does not mutate the original tile config', () => {
    const tile = { type: 'tile', entity: 'fan.bedroom' };
    const result = withBubbleTapAction(tile, 'fan.bedroom');
    expect(tile).not.toHaveProperty('tap_action');
    expect(result).not.toBe(tile);
  });

  it('overrides any existing tap_action', () => {
    const tile = {
      type: 'tile',
      entity: 'light.kitchen',
      tap_action: { action: 'more-info' },
    };
    const result = withBubbleTapAction(tile, 'light.kitchen');
    expect(result.tap_action).toEqual({
      action: 'navigate',
      navigation_path: '#bubble-light-kitchen',
    });
  });
});

describe('buildBubblePopupCards()', () => {
  it('returns one pop-up card per entity present in hass.states', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'light.kitchen', state: 'on', attributes: { friendly_name: 'Kitchen' } },
        { entity_id: 'climate.bedroom', state: 'heat', attributes: { friendly_name: 'Bedroom' } },
      ],
    });
    const cards = buildBubblePopupCards(['light.kitchen', 'climate.bedroom'], hass);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      type: 'custom:bubble-card',
      card_type: 'pop-up',
      hash: '#bubble-light-kitchen',
      entity: 'light.kitchen',
      name: 'Kitchen',
      button_type: 'state',
    });
    expect(cards[1]).toMatchObject({
      type: 'custom:bubble-card',
      card_type: 'pop-up',
      hash: '#bubble-climate-bedroom',
      entity: 'climate.bedroom',
      name: 'Bedroom',
    });
  });

  it('skips entities not present in hass.states', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'light.real', attributes: { friendly_name: 'Real' } }],
    });
    const cards = buildBubblePopupCards(['light.real', 'light.ghost'], hass);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ entity: 'light.real' });
  });

  it('falls back to entity_id when friendly_name is missing', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'fan.unnamed' }],
    });
    const cards = buildBubblePopupCards(['fan.unnamed'], hass);
    expect(cards[0]).toMatchObject({ name: 'fan.unnamed' });
  });

  it('returns empty array when given empty input', () => {
    const hass = makeHass();
    expect(buildBubblePopupCards([], hass)).toEqual([]);
  });
});

describe('BUBBLE_ACTIONABLE_DOMAINS', () => {
  // Pin: every actionable domain stays in the set. A removal here would
  // silently drop tile-rewriting for that domain across RoomView,
  // ClimateView, LightsGroupCard, CoversGroupCard, and favorites.
  it('contains exactly the documented actionable domains', () => {
    expect([...BUBBLE_ACTIONABLE_DOMAINS].sort()).toEqual([
      'climate',
      'cover',
      'fan',
      'light',
      'media_player',
    ]);
  });
});

describe('isBubbleActionable()', () => {
  it.each(['light.kitchen', 'climate.bedroom', 'cover.shutter', 'fan.lounge', 'media_player.sonos'])(
    'returns true for actionable entity %s',
    (id) => {
      expect(isBubbleActionable(id)).toBe(true);
    },
  );

  it.each([
    'switch.relay',
    'lock.front_door',
    'sensor.temp',
    'binary_sensor.motion',
    'alarm_control_panel.house',
    'scene.movie_night',
    'input_select.mode',
  ])('returns false for non-actionable entity %s', (id) => {
    expect(isBubbleActionable(id)).toBe(false);
  });

  it('returns false for malformed entity_id without a domain', () => {
    expect(isBubbleActionable('')).toBe(false);
    expect(isBubbleActionable('no_dot')).toBe(false);
  });
});

describe('collectBubbleCandidates()', () => {
  it('collects only supported actionable domains', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'light.a' },
        { entity_id: 'climate.b' },
        { entity_id: 'cover.c' },
        { entity_id: 'fan.d' },
        { entity_id: 'media_player.e' },
        // unsupported domains — should be excluded
        { entity_id: 'sensor.skip' },
        { entity_id: 'switch.skip' },
        { entity_id: 'binary_sensor.skip' },
        { entity_id: 'lock.skip' },
      ],
    });
    const candidates = collectBubbleCandidates(hass);
    expect(candidates).toEqual([
      'climate.b',
      'cover.c',
      'fan.d',
      'light.a',
      'media_player.e',
    ]);
  });

  it('returns sorted entity_ids', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'light.zulu' },
        { entity_id: 'light.alpha' },
        { entity_id: 'light.mike' },
      ],
    });
    expect(collectBubbleCandidates(hass)).toEqual([
      'light.alpha',
      'light.mike',
      'light.zulu',
    ]);
  });

  it('returns empty array when no supported entities exist', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'sensor.temp' }, { entity_id: 'switch.relay' }],
    });
    expect(collectBubbleCandidates(hass)).toEqual([]);
  });
});
