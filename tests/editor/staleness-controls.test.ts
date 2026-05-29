// ============================================================================
// Tests — staleness editor controls (PRINCIPLES §1/§3: editor exposure)
// ============================================================================
// The novel editor surface for source-staleness is the shared
// `stale_after` threshold input in the Section-order tab: it appears
// only once staleness is enabled (badge or room marking), defaults to
// 60, reflects a configured value, and fires onStaleAfterChange with a
// number. The two toggles (show_staleness_alert_badge in BADGE_TOGGLE_KEYS,
// mark_stale_in_rooms in AreasTab) are mechanical copies of working
// siblings — the badge checkbox is asserted here too since it's cheap.
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { render, html } from 'lit';

import { renderSectionOrderTab, type SectionOrderTabContext } from '../../src/editor/tabs/SectionOrderTab';
import { makeHass } from '../fixtures/hass';
import type { OrielConfig } from '../../src/types/strategy';

const noop = (): void => undefined;

function renderTab(
  config: OrielConfig,
  overrides: Partial<SectionOrderTabContext> = {},
): HTMLDivElement {
  const host = document.createElement('div');
  const ctx: SectionOrderTabContext = {
    hass: makeHass({}),
    config,
    order: [],
    sectionMeta: new Map(),
    weatherEntities: [],
    powerSensorEntities: [],
    isSectionDisabled: () => false,
    isSectionToggleable: () => false,
    onToggleChange: noop,
    onSetWeatherPresentation: noop,
    onSetEnergyPresentation: noop,
    onSetPlantsPresentation: noop,
    onSetVacuumsPresentation: noop,
    onWeatherEntityChange: noop,
    onPowerBadgeEntityChange: noop,
    onToggleSectionVisibility: noop,
    onToggleHiddenHeading: noop,
    onStaleAfterChange: noop,
    onDragStart: noop,
    onDragEnd: noop,
    onDragOver: noop,
    onDragLeave: noop,
    onDrop: noop,
    onMoveSectionUp: noop,
    onMoveSectionDown: noop,
    ...overrides,
  };
  render(html`${renderSectionOrderTab(ctx)}`, host);
  return host;
}

describe('staleness editor controls — Section-order tab', () => {
  it('always renders the staleness alert-badge toggle (BADGE_TOGGLE_KEYS)', () => {
    const host = renderTab({});
    expect(host.querySelector('#show_staleness_alert_badge')).not.toBeNull();
  });

  it('reflects the badge toggle state', () => {
    const off = renderTab({}).querySelector<HTMLInputElement>('#show_staleness_alert_badge');
    const on = renderTab({ show_staleness_alert_badge: true }).querySelector<HTMLInputElement>(
      '#show_staleness_alert_badge',
    );
    expect(off!.checked).toBe(false);
    expect(on!.checked).toBe(true);
  });

  it('hides the threshold input when staleness is fully off', () => {
    const host = renderTab({});
    expect(host.querySelector('#stale-after')).toBeNull();
  });

  it('shows the threshold input (default 60) once the alert badge is on', () => {
    const host = renderTab({ show_staleness_alert_badge: true });
    const input = host.querySelector<HTMLInputElement>('#stale-after');
    expect(input).not.toBeNull();
    expect(input!.value).toBe('60');
  });

  it('shows the threshold input when only mark_stale_in_rooms is on', () => {
    const host = renderTab({ mark_stale_in_rooms: true });
    expect(host.querySelector('#stale-after')).not.toBeNull();
  });

  it('reflects a configured stale_after value', () => {
    const host = renderTab({ show_staleness_alert_badge: true, stale_after: 30 });
    const input = host.querySelector<HTMLInputElement>('#stale-after');
    expect(input!.value).toBe('30');
  });

  it('fires onStaleAfterChange with a number on input change', () => {
    let captured: number | undefined;
    const host = renderTab(
      { show_staleness_alert_badge: true },
      { onStaleAfterChange: (m) => (captured = m) },
    );
    const input = host.querySelector<HTMLInputElement>('#stale-after')!;
    input.value = '120';
    input.dispatchEvent(new Event('change'));
    expect(captured).toBe(120);
  });
});
