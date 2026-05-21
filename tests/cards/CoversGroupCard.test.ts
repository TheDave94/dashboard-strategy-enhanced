// ====================================================================
// CoversGroupCard — unit tests
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import '../../src/cards/CoversGroupCard';

type CoversGroupCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getGridOptions(): Record<string, unknown>;
};

function mount(): CoversGroupCardEl {
  return document.createElement('oriel-covers-group-card') as CoversGroupCardEl;
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
    it('getGridOptions reflects content-measured shape', () => {
      const el = mount();
      el.setConfig({ group_type: 'open' });
      const opts = el.getGridOptions();
      expect(opts.columns).toBe(6);
      expect(opts.rows).toBe('auto');
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
