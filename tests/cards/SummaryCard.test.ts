// ====================================================================
// SummaryCard — unit tests
// ====================================================================
// Covers setConfig validation, getCardSize / getGridOptions contract,
// host-attribute reflection for density, and the action dispatcher's
// config-shape per `detail.action`.
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

// Import for side effect (registers the custom element).
import '../../src/cards/SummaryCard';

type SummaryCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getCardSize(): number;
  getGridOptions(): Record<string, unknown>;
};

function mount(): SummaryCardEl {
  return document.createElement('dashboard-enhanced-summary-card') as SummaryCardEl;
}

describe('dashboard-enhanced-summary-card', () => {
  describe('setConfig', () => {
    let el: SummaryCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('throws when summary_type is missing', () => {
      expect(() => el.setConfig({})).toThrow(/summary_type must be one of/);
    });

    it('throws on unknown summary_type', () => {
      expect(() => el.setConfig({ summary_type: 'made_up' })).toThrow(
        /summary_type must be one of/,
      );
    });

    it('accepts every valid summary_type', () => {
      for (const t of ['lights', 'covers', 'security', 'batteries', 'climate']) {
        expect(() => el.setConfig({ summary_type: t })).not.toThrow();
      }
    });

    it('reflects density="compact" to a host attribute', () => {
      el.setConfig({ summary_type: 'lights', density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });

    it('reflects density="comfortable" to a host attribute', () => {
      el.setConfig({ summary_type: 'lights', density: 'comfortable' });
      expect(el.getAttribute('density')).toBe('comfortable');
    });

    it('clears the density attribute when unset', () => {
      el.setConfig({ summary_type: 'lights', density: 'compact' });
      el.setConfig({ summary_type: 'lights' });
      expect(el.hasAttribute('density')).toBe(false);
    });
  });

  describe('LovelaceCard contract', () => {
    it('getCardSize returns 1', () => {
      const el = mount();
      el.setConfig({ summary_type: 'lights' });
      expect(el.getCardSize()).toBe(1);
    });

    it('getGridOptions returns the half-section tile shape', () => {
      const el = mount();
      el.setConfig({ summary_type: 'lights' });
      const opts = el.getGridOptions();
      expect(opts).toMatchObject({
        columns: 6,
        rows: 1,
        min_columns: 3,
        min_rows: 1,
      });
    });
  });

  describe('picker integration', () => {
    it('publishes itself to window.customCards with preview:true', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'dashboard-enhanced-summary-card',
      ) as { type: string; preview?: boolean } | undefined;
      expect(entry).toBeDefined();
      expect(entry?.preview).toBe(true);
    });

    it('getStubConfig returns a valid summary_type', () => {
      const ctor = customElements.get('dashboard-enhanced-summary-card') as
        | (typeof HTMLElement & { getStubConfig?: () => { summary_type: string } })
        | undefined;
      expect(ctor).toBeDefined();
      const stub = ctor!.getStubConfig?.();
      expect(stub?.summary_type).toBe('lights');
    });
  });
});
