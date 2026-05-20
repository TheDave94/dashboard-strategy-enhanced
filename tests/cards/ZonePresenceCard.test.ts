// ====================================================================
// ZonePresenceCard — unit tests
// ====================================================================

import { describe, it, expect, beforeEach } from 'vitest';

import '../../src/cards/ZonePresenceCard';

type ZonePresenceCardEl = HTMLElement & {
  setConfig(cfg: Record<string, unknown>): void;
  getCardSize(): number;
  getGridOptions(): Record<string, unknown>;
};

function mount(): ZonePresenceCardEl {
  return document.createElement('simon42-zone-presence-card') as ZonePresenceCardEl;
}

describe('simon42-zone-presence-card', () => {
  describe('setConfig', () => {
    let el: ZonePresenceCardEl;
    beforeEach(() => {
      el = mount();
    });

    it('throws when entities is missing', () => {
      expect(() => el.setConfig({})).toThrow(/entities/);
    });

    it('throws on empty entities array', () => {
      expect(() => el.setConfig({ entities: [] })).toThrow(/entities/);
    });

    it('accepts string entity entries', () => {
      expect(() =>
        el.setConfig({ entities: ['binary_sensor.foo', 'binary_sensor.bar'] }),
      ).not.toThrow();
    });

    it('accepts object entity entries with overrides', () => {
      expect(() =>
        el.setConfig({
          entities: [
            { entity: 'binary_sensor.foo', name: 'Foo', icon: 'mdi:desk', color: 'red' },
          ],
        }),
      ).not.toThrow();
    });

    it('reflects density="compact" to host attribute', () => {
      el.setConfig({ entities: ['binary_sensor.foo'], density: 'compact' });
      expect(el.getAttribute('density')).toBe('compact');
    });
  });

  describe('LovelaceCard contract', () => {
    it('getCardSize returns 1', () => {
      const el = mount();
      el.setConfig({ entities: ['binary_sensor.foo'] });
      expect(el.getCardSize()).toBe(1);
    });

    it('getGridOptions reflects icon-strip shape', () => {
      const el = mount();
      el.setConfig({ entities: ['binary_sensor.foo'] });
      const opts = el.getGridOptions();
      expect(opts).toMatchObject({
        columns: 6,
        rows: 'auto',
        min_columns: 3,
        min_rows: 1,
      });
    });
  });

  describe('picker integration', () => {
    it('registers with window.customCards including preview:true', () => {
      const entry = (window.customCards || []).find(
        (c: { type: string }) => c.type === 'simon42-zone-presence-card',
      ) as { preview?: boolean } | undefined;
      expect(entry).toBeDefined();
      expect(entry?.preview).toBe(true);
    });

    it('getStubConfig seeds with binary_sensor.* entities', () => {
      const ctor = customElements.get('simon42-zone-presence-card') as
        | (typeof HTMLElement & { getStubConfig?: (hass: unknown) => unknown })
        | undefined;
      expect(ctor).toBeDefined();
      const stub = ctor!.getStubConfig?.({
        states: {
          'binary_sensor.a': {},
          'binary_sensor.b': {},
          'sensor.skip': {},
        },
      }) as { entities: string[] };
      expect(stub.entities.every((e) => e.startsWith('binary_sensor.'))).toBe(true);
    });
  });
});
