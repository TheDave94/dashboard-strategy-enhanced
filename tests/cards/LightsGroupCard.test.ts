// ====================================================================
// LightsGroupCard — unit tests
// ====================================================================
// Coverage focus: setConfig validation, getStubConfig shape, picker
// registration. Render-level tests would need a real <ha-tile-card>
// shim — deferred to a later beta if useful.
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import '../../src/cards/LightsGroupCard';

type LightsGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): LightsGroupCardEl {
  return document.createElement('oriel-lights-group-card') as LightsGroupCardEl;
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
    it('getGridOptions reflects content-measured shape', () => {
      const el = mount();
      el.setConfig({ group_type: 'all' });
      const opts = el.getGridOptions();
      expect(opts.columns).toBe(6);
      expect(opts.rows).toBe('auto');
      expect(opts.min_columns).toBe(6);
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
