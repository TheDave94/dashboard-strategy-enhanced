// ============================================================================
// Tests — Bubble Card tile tap_action rewiring (ROADMAP §2)
// ============================================================================
// Pins, across the actionable-domain emit sites:
//   - With `use_bubble_drawers: true` AND bubble-card installed, every
//     emitted tile of a domain in BUBBLE_ACTIONABLE_DOMAINS has its
//     tap_action rewritten to `navigate` at the canonical bubble hash.
//   - With the toggle off OR bubble-card uninstalled, every tile emits
//     without a tap_action — HA's default more-info path fires.
//   - Non-actionable-domain tiles at dynamic-domain sites (favorites,
//     room_pins) keep their default tap_action regardless.
//
// The pin fails loudly if a future change drops a domain from the
// rewrite set or alters the tap_action shape — `{ action: 'navigate',
// navigation_path: '#bubble-<entity-id-with-dashes>' }`.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Registry } from '../../src/Registry';
import { makeHass } from '../fixtures/hass';
import {
  BUBBLE_ACTIONABLE_DOMAINS,
  bubbleHashFor,
} from '../../src/utils/bubble-integration';

// View strategies side-effect-register their custom elements on import,
// but for tests we call their static generate() directly. Importing
// them up-front loads the modules.
import '../../src/views/RoomViewStrategy';
import '../../src/views/ClimateViewStrategy';

// Helpers ----------------------------------------------------------------

const HASS_LANGUAGE = 'en';

/**
 * Register a fake `<bubble-card>` so `isBubbleCardInstalled()` reports
 * true. Returns a cleanup that restores the spy — the customElements
 * registry doesn't expose an unregister API, so we mock the lookup.
 */
function withBubbleCardInstalled(installed: boolean): () => void {
  if (!installed) {
    // happy-dom starts without bubble-card registered, so nothing to do.
    return () => undefined;
  }
  const realGet = customElements.get.bind(customElements);
  const spy = vi.spyOn(customElements, 'get').mockImplementation((tag) => {
    if (tag === 'bubble-card') {
      // Any defined class satisfies the truthy check inside isBubbleCardInstalled.
      return HTMLElement as unknown as CustomElementConstructor;
    }
    return realGet(tag);
  });
  return () => spy.mockRestore();
}

interface SectionLike {
  cards?: Array<Record<string, unknown>>;
}
interface ViewLike {
  sections?: SectionLike[];
}

function collectTiles(view: ViewLike): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const section of view.sections ?? []) {
    for (const card of section.cards ?? []) {
      if (card?.type === 'tile') out.push(card);
    }
  }
  return out;
}

function bubbleNavigation(entityId: string): Record<string, unknown> {
  return { action: 'navigate', navigation_path: bubbleHashFor(entityId) };
}

// Fixtures ---------------------------------------------------------------

const ACTIONABLE_ENTITIES: Record<string, { entity_id: string; attributes?: Record<string, unknown> }> = {
  light: { entity_id: 'light.living_room' },
  climate: {
    entity_id: 'climate.bedroom',
    attributes: { hvac_action: 'heating', current_temperature: 21 },
  },
  cover: {
    entity_id: 'cover.kitchen_shutter',
    attributes: { device_class: 'shutter', current_position: 50 },
  },
  fan: {
    entity_id: 'fan.lounge',
    attributes: { supported_features: 1 },
  },
  media_player: {
    entity_id: 'media_player.tv',
    attributes: { supported_features: 16384 },
  },
};

function buildAreaHass(): { hass: ReturnType<typeof makeHass>; area: any } {
  const areaId = 'area_test';
  const hass = makeHass({
    areas: [{ area_id: areaId, name: 'Test Area' }],
    entities: Object.values(ACTIONABLE_ENTITIES).map((e) => ({
      ...e,
      area_id: areaId,
    })),
    language: HASS_LANGUAGE,
  });
  const area = (hass.areas as Record<string, any>)[areaId];
  return { hass, area };
}

async function generateRoomView(
  dashboardConfig: Record<string, unknown>,
): Promise<ViewLike> {
  const { hass, area } = buildAreaHass();
  Registry.resetForTesting();
  const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
  return await strategy.generate(
    { area, groups_options: {}, dashboardConfig },
    hass,
  );
}

async function generateClimateView(
  dashboardConfig: Record<string, unknown>,
): Promise<ViewLike> {
  const hass = makeHass({
    entities: [
      {
        ...ACTIONABLE_ENTITIES.climate,
        area_id: 'area_test',
      },
    ],
    areas: [{ area_id: 'area_test', name: 'Test Area' }],
    language: HASS_LANGUAGE,
  });
  Registry.resetForTesting();
  const strategy = customElements.get('ll-strategy-view-oriel-climate') as any;
  return await strategy.generate({ config: dashboardConfig }, hass);
}

// Tests ------------------------------------------------------------------

describe('Bubble tile tap_action rewiring — actionable-domain pin', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    Registry.resetForTesting();
  });

  it('pins the actionable-domain set against silent shrinkage', () => {
    // If a future refactor drops a domain, the strategy test loop below
    // would silently shrink its coverage along with it. This explicit
    // pin makes that drop visible at the source of truth.
    expect([...BUBBLE_ACTIONABLE_DOMAINS].sort()).toEqual([
      'climate',
      'cover',
      'fan',
      'light',
      'media_player',
    ]);
  });

  describe('with use_bubble_drawers: true AND bubble-card installed', () => {
    beforeEach(() => {
      cleanup = withBubbleCardInstalled(true);
    });

    it('rewrites RoomViewStrategy tiles for climate / cover / media_player / fan', async () => {
      const view = await generateRoomView({ use_bubble_drawers: true });
      const tiles = collectTiles(view);
      // RoomView emits one tile per actionable domain at the test fixture.
      // Light is rendered inside oriel-lights-group-card, not as a plain tile —
      // that path is pinned separately by the LightsGroupCard test.
      const byEntity: Record<string, Record<string, unknown>> = {};
      for (const tile of tiles) byEntity[String(tile.entity)] = tile;
      for (const domain of ['climate', 'cover', 'fan', 'media_player'] as const) {
        const e = ACTIONABLE_ENTITIES[domain].entity_id;
        expect(byEntity[e], `${domain} tile not emitted`).toBeDefined();
        expect(
          byEntity[e].tap_action,
          `${domain} tile missing bubble tap_action`,
        ).toEqual(bubbleNavigation(e));
      }
    });

    it('passes bubble_drawers:true to the inline oriel-lights-group-card', async () => {
      const view = await generateRoomView({ use_bubble_drawers: true });
      const lightCards: Array<Record<string, unknown>> = [];
      for (const section of view.sections ?? []) {
        for (const card of section.cards ?? []) {
          if (card?.type === 'custom:oriel-lights-group-card') lightCards.push(card);
        }
      }
      expect(lightCards.length).toBeGreaterThan(0);
      for (const card of lightCards) {
        expect(card.bubble_drawers).toBe(true);
      }
    });

    it('rewrites ClimateViewStrategy tiles', async () => {
      const view = await generateClimateView({ use_bubble_drawers: true });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(tile.tap_action).toEqual(
          bubbleNavigation(String(tile.entity)),
        );
      }
    });
  });

  describe('no-op paths', () => {
    it('toggle off → tiles emit without tap_action', async () => {
      cleanup = withBubbleCardInstalled(true);
      const view = await generateRoomView({ use_bubble_drawers: false });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(tile).not.toHaveProperty('tap_action');
      }
      // Lights group card receives no bubble_drawers flag.
      for (const section of view.sections ?? []) {
        for (const card of section.cards ?? []) {
          if (card?.type === 'custom:oriel-lights-group-card') {
            expect(card).not.toHaveProperty('bubble_drawers');
          }
        }
      }
    });

    it('bubble-card uninstalled → tiles emit without tap_action even with toggle on', async () => {
      // Default happy-dom env: bubble-card is not registered.
      const view = await generateRoomView({ use_bubble_drawers: true });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(tile).not.toHaveProperty('tap_action');
      }
    });

    it('toggle off → ClimateView tiles emit without tap_action', async () => {
      cleanup = withBubbleCardInstalled(true);
      const view = await generateClimateView({ use_bubble_drawers: false });
      const tiles = collectTiles(view);
      expect(tiles.length).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(tile).not.toHaveProperty('tap_action');
      }
    });
  });

  describe('dynamic-domain sites (room_pins)', () => {
    it('rewires actionable pin domains and leaves non-actionable pins alone', async () => {
      cleanup = withBubbleCardInstalled(true);
      const areaId = 'area_test';
      const hass = makeHass({
        areas: [{ area_id: areaId, name: 'Test Area' }],
        entities: [
          { entity_id: 'light.pinned', area_id: areaId },
          { entity_id: 'switch.pinned', area_id: areaId },
          { entity_id: 'sensor.pinned', area_id: areaId },
        ],
        language: HASS_LANGUAGE,
      });
      const area = (hass.areas as Record<string, any>)[areaId];
      Registry.resetForTesting();
      const strategy = customElements.get('ll-strategy-view-oriel-room') as any;
      const view: ViewLike = await strategy.generate(
        {
          area,
          groups_options: {},
          dashboardConfig: {
            use_bubble_drawers: true,
            room_pin_entities: ['light.pinned', 'switch.pinned', 'sensor.pinned'],
          },
        },
        hass,
      );
      const tiles = collectTiles(view);
      const byEntity: Record<string, Record<string, unknown>> = {};
      for (const tile of tiles) byEntity[String(tile.entity)] = tile;
      expect(byEntity['light.pinned']?.tap_action).toEqual(
        bubbleNavigation('light.pinned'),
      );
      expect(byEntity['switch.pinned']).not.toHaveProperty('tap_action');
      expect(byEntity['sensor.pinned']).not.toHaveProperty('tap_action');
    });
  });
});
