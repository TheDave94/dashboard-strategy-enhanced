// ============================================================================
// Tests — floorplan_view emission (HACS-uninstalled fallback)
// ============================================================================
// PRINCIPLES.md §6 (CI-tested tier): src/oriel.ts:248-279 gates the panel-view
// emission on `customElements.get('floorplan-card')`. The failure mode if the
// guard ever silently flips to truthy (e.g. a refactor drops the check, or
// extracts a helper that always returns true) is panel-sized dead UI — HA
// renders the entire panel view as "Custom element doesn't exist."
//
// The current fallback (skip the view + console.warn) is correct per §2;
// this file pins it so regressions are caught at CI rather than at user
// install time.
// ============================================================================

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

import { Registry } from '../../src/Registry';
import type { HomeAssistant } from '../../src/types/homeassistant';
import type { OrielConfig } from '../../src/types/strategy';
import type { LovelaceViewConfig, LovelaceCardConfig } from '../../src/types/lovelace';
import { makeHass } from '../fixtures/hass';

interface OrielStrategyClass {
  generate: (
    cfg: OrielConfig,
    hass: HomeAssistant,
  ) => Promise<{ title: string; views: LovelaceViewConfig[] }>;
}

/** Find a view that contains a `custom:floorplan-card` body. */
function findFloorplanView(views: LovelaceViewConfig[]): LovelaceViewConfig | undefined {
  return views.find((v) => {
    const cards = (v as { cards?: LovelaceCardConfig[] }).cards;
    if (!Array.isArray(cards)) return false;
    return cards.some((c) => c?.type === 'custom:floorplan-card');
  });
}

describe('floorplan_view emission — HACS-uninstalled fallback', () => {
  let strategyClass: OrielStrategyClass | undefined;

  beforeAll(async () => {
    // Importing the strategy module triggers customElements.define for
    // every Oriel custom element (strategy class + view strategies + cards).
    await import('../../src/oriel');
    strategyClass = customElements.get('ll-strategy-dashboard-oriel') as unknown as
      | OrielStrategyClass
      | undefined;
  });

  let getSpy: ReturnType<typeof vi.spyOn> | undefined;
  let warnSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    getSpy?.mockRestore();
    warnSpy?.mockRestore();
    getSpy = undefined;
    warnSpy = undefined;
    Registry.resetForTesting();
  });

  it('emits no floorplan view + warns when floorplan-card is unregistered', async () => {
    if (!strategyClass) {
      console.warn('[floorplan-fallback] strategy class not registered — skipping');
      return;
    }
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: OrielConfig = {
      floorplan_view: {
        title: 'Floorplan',
        path: 'floorplan',
        icon: 'mdi:floor-plan',
        config: { image: '/local/floor.svg' },
      },
    };
    const result = await strategyClass.generate(config, makeHass());

    expect(findFloorplanView(result.views)).toBeUndefined();

    // console.warn fired with the install-hint message
    const calls = warnSpy.mock.calls.map((c) => (c[0] as unknown as string) ?? '');
    const floorplanWarning = calls.find(
      (msg) => typeof msg === 'string' && msg.includes('floorplan-card'),
    );
    expect(floorplanWarning).toBeDefined();
    expect(floorplanWarning).toMatch(/install pkozul\/ha-floorplan/i);
  });

  it('emits the floorplan view + no install-warn when floorplan-card IS registered', async () => {
    if (!strategyClass) return;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Bind the original BEFORE creating the spy so the passthrough call
    // doesn't recurse into the spy.
    const originalGet = customElements.get.bind(customElements);
    class StubFloorplan extends HTMLElement {}
    getSpy = vi.spyOn(customElements, 'get').mockImplementation((tag) => {
      if (tag === 'floorplan-card') {
        return StubFloorplan as unknown as CustomElementConstructor;
      }
      return originalGet(tag);
    });

    const config: OrielConfig = {
      floorplan_view: {
        title: 'My Floor Plan',
        path: 'floor',
        icon: 'mdi:floor-plan',
        config: { image: '/local/floor.svg', stylesheet: '/local/floor.css' },
      },
    };
    const result = await strategyClass.generate(config, makeHass());

    const view = findFloorplanView(result.views);
    expect(view).toBeDefined();
    expect((view as { title?: string }).title).toBe('My Floor Plan');
    expect((view as { path?: string }).path).toBe('floor');
    expect((view as { type?: string }).type).toBe('panel');

    const cards = (view as { cards?: LovelaceCardConfig[] }).cards!;
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      type: 'custom:floorplan-card',
      image: '/local/floor.svg',
      stylesheet: '/local/floor.css',
    });

    // No floorplan-related warning on the happy path
    const floorplanWarnings = warnSpy.mock.calls
      .map((c) => (c[0] as unknown as string) ?? '')
      .filter((msg) => typeof msg === 'string' && msg.includes('floorplan-card'));
    expect(floorplanWarnings).toHaveLength(0);
  });

  it('emits no floorplan view when floorplan_view is unset', async () => {
    if (!strategyClass) return;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: OrielConfig = {};
    const result = await strategyClass.generate(config, makeHass());

    expect(findFloorplanView(result.views)).toBeUndefined();

    // No floorplan-related warning when no floorplan_view was requested
    const floorplanWarnings = warnSpy.mock.calls
      .map((c) => (c[0] as unknown as string) ?? '')
      .filter((msg) => typeof msg === 'string' && msg.includes('floorplan-card'));
    expect(floorplanWarnings).toHaveLength(0);
  });

  it('emits no floorplan view when floorplan_view.config is missing', async () => {
    if (!strategyClass) return;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Strategy gates on `config.floorplan_view && config.floorplan_view.config`
    // (oriel.ts:254). A floorplan_view with only metadata + no config bag is
    // treated as "not requested" rather than "broken" — no warning either.
    const config: OrielConfig = {
      floorplan_view: { title: 'Half-configured' } as OrielConfig['floorplan_view'],
    };
    const result = await strategyClass.generate(config, makeHass());

    expect(findFloorplanView(result.views)).toBeUndefined();
  });
});
