// ============================================================================
// Tests — OverviewSection builders
// ============================================================================
// Focus: lock down the auto-hide contract and the shape of the
// custom-cards section. Snapshots capture the assembled grid so a future
// refactor can't change the rendered output without a deliberate
// snapshot update.
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Registry } from '../../src/Registry';
import { createCustomCardsSection, createOverviewSection } from '../../src/sections/OverviewSection';
import { makeHass } from '../fixtures/hass';
import { bubbleHashFor } from '../../src/utils/bubble-integration';

beforeEach(() => {
  Registry.resetForTesting();
});

describe('createCustomCardsSection', () => {
  it('returns null when no parsed cards are provided', () => {
    expect(createCustomCardsSection([])).toBeNull();
  });

  it('returns null when every entry lacks parsed_config', () => {
    expect(
      createCustomCardsSection([
        { yaml: 'not parsed' as unknown as string },
        { yaml: 'also not parsed' as unknown as string },
      ])
    ).toBeNull();
  });

  it('renders parsed cards under the default heading', () => {
    const section = createCustomCardsSection([
      { parsed_config: { type: 'markdown', content: 'hello' } as Record<string, unknown> },
    ]);
    expect(section).not.toBeNull();
    expect(section?.type).toBe('grid');
    // Heading first, then the parsed card
    expect(section?.cards?.[0]).toMatchObject({ type: 'heading' });
    expect(section?.cards?.[1]).toMatchObject({ type: 'markdown', content: 'hello' });
  });

  it('honors a custom heading + icon', () => {
    const section = createCustomCardsSection(
      [{ parsed_config: { type: 'markdown' } as Record<string, unknown> }],
      'My Stuff',
      'mdi:star'
    );
    expect(section?.cards?.[0]).toMatchObject({
      type: 'heading',
      heading: 'My Stuff',
      icon: 'mdi:star',
    });
  });

  it('emits a per-card heading when a custom card has a title', () => {
    const section = createCustomCardsSection([
      {
        title: 'Sub-heading',
        parsed_config: { type: 'markdown' } as Record<string, unknown>,
      },
    ]);
    expect(section?.cards).toEqual([
      expect.objectContaining({ type: 'heading' }),       // section heading
      expect.objectContaining({ type: 'heading', heading: 'Sub-heading' }),
      expect.objectContaining({ type: 'markdown' }),
    ]);
  });
});

describe('createOverviewSection', () => {
  it('returns a grid section with the configured pieces', () => {
    const hass = makeHass({});
    Registry.initialize(hass, {});
    const section = createOverviewSection({
      someSensorId: 'sensor.dummy',
      showSearchCard: false,
      config: {},
      hass,
    });
    expect(section?.type).toBe('grid');
    // Existence-of-cards is the contract here; the snapshot pins the rest.
    expect(Array.isArray(section?.cards)).toBe(true);
    expect(section?.cards.length).toBeGreaterThan(0);
  });

  it('matches the snapshot for a default config', () => {
    const hass = makeHass({});
    Registry.initialize(hass, {});
    const section = createOverviewSection({
      someSensorId: 'sensor.dummy',
      showSearchCard: false,
      config: {},
      hass,
    });
    expect(section).toMatchSnapshot();
  });

  it('matches the snapshot when show_clock_card is disabled', () => {
    const hass = makeHass({});
    Registry.initialize(hass, {});
    const section = createOverviewSection({
      someSensorId: 'sensor.dummy',
      showSearchCard: false,
      config: { show_clock_card: false },
      hass,
    });
    expect(section).toMatchSnapshot();
  });

  describe('favorites — Bubble Card tile tap_action rewiring (ROADMAP §2)', () => {
    let spy: ReturnType<typeof vi.spyOn> | undefined;
    function installBubbleCard(): void {
      const realGet = customElements.get.bind(customElements);
      spy = vi.spyOn(customElements, 'get').mockImplementation((tag) => {
        if (tag === 'bubble-card') {
          return HTMLElement as unknown as CustomElementConstructor;
        }
        return realGet(tag);
      });
    }
    afterEach(() => {
      spy?.mockRestore();
      spy = undefined;
    });

    function favoriteTilesFromSection(section: { cards?: Array<Record<string, unknown>> } | null): Record<string, Record<string, unknown>> {
      const out: Record<string, Record<string, unknown>> = {};
      for (const card of section?.cards ?? []) {
        if (card.type === 'tile' && typeof card.entity === 'string') {
          out[card.entity] = card;
        }
      }
      return out;
    }

    const favEntities = [
      'light.fav_light',
      'climate.fav_climate',
      'cover.fav_cover',
      'fan.fav_fan',
      'media_player.fav_media',
      'switch.fav_switch',
      'sensor.fav_sensor',
    ];

    function buildHass(): ReturnType<typeof makeHass> {
      return makeHass({
        entities: favEntities.map((id) => ({ entity_id: id })),
      });
    }

    it('rewrites tap_action for actionable-domain favorites; leaves non-actionable untouched', () => {
      installBubbleCard();
      const hass = buildHass();
      Registry.initialize(hass, { use_bubble_drawers: true });
      const section = createOverviewSection({
        someSensorId: 'sensor.dummy',
        showSearchCard: false,
        config: {
          use_bubble_drawers: true,
          favorite_entities: favEntities,
          // Suppress the entire summaries row so the favorites tiles
          // are the only tile cards in this section, keeping the
          // assertion focused.
          show_light_summary: false,
          show_covers_summary: false,
          show_security_summary: false,
          show_battery_summary: false,
          show_clock_card: false,
        },
        hass,
      });
      const byEntity = favoriteTilesFromSection(section);
      for (const id of ['light.fav_light', 'climate.fav_climate', 'cover.fav_cover', 'fan.fav_fan', 'media_player.fav_media']) {
        expect(byEntity[id]?.tap_action, `actionable favorite ${id} missing bubble tap_action`).toEqual({
          action: 'navigate',
          navigation_path: bubbleHashFor(id),
        });
      }
      for (const id of ['switch.fav_switch', 'sensor.fav_sensor']) {
        expect(byEntity[id], `non-actionable favorite ${id} not emitted`).toBeDefined();
        expect(byEntity[id]).not.toHaveProperty('tap_action');
      }
    });

    it('emits without tap_action when use_bubble_drawers is false (even with bubble-card installed)', () => {
      installBubbleCard();
      const hass = buildHass();
      Registry.initialize(hass, {});
      const section = createOverviewSection({
        someSensorId: 'sensor.dummy',
        showSearchCard: false,
        config: {
          favorite_entities: favEntities,
          show_light_summary: false,
          show_covers_summary: false,
          show_security_summary: false,
          show_battery_summary: false,
          show_clock_card: false,
        },
        hass,
      });
      const byEntity = favoriteTilesFromSection(section);
      for (const id of favEntities) {
        expect(byEntity[id]).not.toHaveProperty('tap_action');
      }
    });

    it('emits without tap_action when bubble-card is uninstalled (toggle on)', () => {
      // No installBubbleCard() — default happy-dom env: bubble-card unregistered.
      const hass = buildHass();
      Registry.initialize(hass, { use_bubble_drawers: true });
      const section = createOverviewSection({
        someSensorId: 'sensor.dummy',
        showSearchCard: false,
        config: {
          use_bubble_drawers: true,
          favorite_entities: favEntities,
          show_light_summary: false,
          show_covers_summary: false,
          show_security_summary: false,
          show_battery_summary: false,
          show_clock_card: false,
        },
        hass,
      });
      const byEntity = favoriteTilesFromSection(section);
      for (const id of favEntities) {
        expect(byEntity[id]).not.toHaveProperty('tap_action');
      }
    });
  });
});
