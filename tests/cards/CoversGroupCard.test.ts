// ====================================================================
// CoversGroupCard — unit tests
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import '../../src/cards/CoversGroupCard';
import { bubbleHashFor } from '../../src/utils/bubble-integration';

type CoversGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): CoversGroupCardEl {
  return document.createElement('oriel-covers-group-card') as CoversGroupCardEl;
}

// <hui-tile-card> shim — records setConfig calls so tests can assert on
// what the CoversGroupCard would have rendered.
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

describe('oriel-covers-group-card', () => {
  describe('setConfig', () => {
    let el: CoversGroupCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('accepts open / closed / partially_open', () => {
      for (const t of ['open', 'closed', 'partially_open']) {
        expect(() => el.setConfig({ group_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to host attribute', () => {
      el.setConfig({ group_type: 'open', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });
  });

  describe('LovelaceCard contract', () => {
    it('getGridOptions is half-width (2-up), content-measured, uncapped (no overlap)', () => {
      const el = mount();
      el.setConfig({ group_type: 'open' });
      const opts = el.getGridOptions();
      expect(opts.columns).toBe('full');
      expect(opts.rows).toBe('auto');
      expect(opts.max_rows).toBeUndefined();
    });
  });

  describe('bubble_drawers tile rewiring (ROADMAP §2)', () => {
    function makeHassWithCover(entityId: string): unknown {
      return {
        states: {
          [entityId]: {
            entity_id: entityId,
            state: 'open',
            attributes: { current_position: 100, device_class: 'shutter' },
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
      const entityId = 'cover.kitchen';
      const el = mount();
      el.setConfig({ group_type: 'open', bubble_drawers: true });
      (el as unknown as { hass: unknown }).hass = makeHassWithCover(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig?.tap_action).toEqual({
        action: 'navigate',
        navigation_path: bubbleHashFor(entityId),
      });
    });

    it('emits without tap_action when bubble_drawers omitted', () => {
      const entityId = 'cover.bedroom';
      const el = mount();
      el.setConfig({ group_type: 'open' });
      (el as unknown as { hass: unknown }).hass = makeHassWithCover(entityId);
      const tile = (
        el as unknown as { _getOrCreateTileCard(id: string): HuiTileCardShim }
      )._getOrCreateTileCard(entityId);
      expect(tile.lastConfig).not.toHaveProperty('tap_action');
    });
  });

  describe('picker integration', () => {
    it('registers with window.customCards including preview:true', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'oriel-covers-group-card',
      ) as { preview?: boolean } | undefined;
      expect(entry).toBeDefined();
      expect(entry?.preview).toBe(true);
    });

    it('getStubConfig returns group_type=open', () => {
      const ctor = customElements.get('oriel-covers-group-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { group_type: string } })
        | undefined;
      expect(ctor!.getStubConfig?.().group_type).toBe('open');
    });
  });
});
