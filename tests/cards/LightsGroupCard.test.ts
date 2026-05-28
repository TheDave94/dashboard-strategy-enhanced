// ====================================================================
// LightsGroupCard — unit tests
// ====================================================================
// Coverage focus: setConfig validation, getStubConfig shape, picker
// registration, and the Bubble Card tile tap_action rewiring (ROADMAP §2).
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import '../../src/cards/LightsGroupCard';
import { bubbleHashFor } from '../../src/utils/bubble-integration';

type LightsGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): LightsGroupCardEl {
  return document.createElement('oriel-lights-group-card') as LightsGroupCardEl;
}

// Shim for HA's <hui-tile-card>: records the config passed to setConfig
// so tests can interrogate what the LightsGroupCard would have rendered.
class HuiTileCardShim extends HTMLElement {
  public lastConfig: Record<string, unknown> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hass: any;
  setConfig(cfg: Record<string, unknown>): void {
    this.lastConfig = cfg;
  }
}
if (!customElements.get('hui-tile-card')) {
  customElements.define('hui-tile-card', HuiTileCardShim);
}

describe('oriel-lights-group-card', () => {
  describe('setConfig', () => {
    let el: LightsGroupCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('throws when group_type is missing', () => {
      expect(() => el.setConfig({})).toThrow(/group_type/);
    });

    it('throws on invalid group_type', () => {
      expect(() => el.setConfig({ group_type: 'middle' })).toThrow(/group_type/);
    });

    it('accepts on / off / all', () => {
      for (const t of ['on', 'off', 'all']) {
        expect(() => el.setConfig({ group_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to host attribute', () => {
      el.setConfig({ group_type: 'all', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });
  });

  describe('LovelaceCard contract', () => {
    it('getGridOptions is half-width (2-up), content-measured, uncapped (no overlap)', () => {
      const el = mount();
      el.setConfig({ group_type: 'all' });
      const opts = el.getGridOptions();
      // Half-width so groups sit side-by-side; NO max_rows cap so a tall
      // group sizes to content instead of overflowing onto its neighbour.
      expect(opts.columns).toBe('full');
      expect(opts.rows).toBe('auto');
      expect(opts.max_rows).toBeUndefined();
    });
  });

  describe('bubble_drawers tile rewiring (ROADMAP §2)', () => {
    function makeHassWithLight(entityId: string): unknown {
      return {
        states: {
          [entityId]: {
            entity_id: entityId,
            state: 'on',
            attributes: { supported_color_modes: ['brightness'] },
            last_changed: '2026-01-01T00:00:00+00:00',
            last_updated: '2026-01-01T00:00:00+00:00',
          },
        },
        entities: {},
        devices: {},
        areas: {},
        language: 'en',
        locale: { language: 'en' },
      };
    }

    it('applies navigate tap_action to emitted tile when bubble_drawers:true', () => {
      const entityId = 'light.living_room';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId], bubble_drawers: true });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig?.tap_action).toEqual({
        action: 'navigate',
        navigation_path: bubbleHashFor(entityId),
      });
    });

    it('emits without tap_action when bubble_drawers omitted', () => {
      const entityId = 'light.bedroom';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId] });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });

    it('emits without tap_action when bubble_drawers:false', () => {
      const entityId = 'light.kitchen';
      const el = mount();
      el.setConfig({ group_type: 'all', entities: [entityId], bubble_drawers: false });
      (el as unknown as { hass: unknown }).hass = makeHassWithLight(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });
  });

  describe('picker integration', () => {
    it('registers with window.customCards including preview:true', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'oriel-lights-group-card',
      ) as { preview?: boolean } | undefined;
      expect(entry).toBeDefined();
      expect(entry?.preview).toBe(true);
    });

    it('getStubConfig returns group_type=all', () => {
      const ctor = customElements.get('oriel-lights-group-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { group_type: string } })
        | undefined;
      expect(ctor!.getStubConfig?.().group_type).toBe('all');
    });
  });
});
