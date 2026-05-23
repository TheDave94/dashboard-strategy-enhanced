// ============================================================================
// Tests — RoomOverridesTab camera_hero toggle (ROADMAP §2)
// ============================================================================
// Two pins:
//   1. Mutator (`setCameraHero`) produces the same YAML the manual
//      config path produces — `areas_options.<area>.camera_hero: true`
//      when on, absent when off — and cleans up empty area entries.
//      Matches the read at `RoomViewStrategy.ts:401` so existing YAML
//      users see no behavior change.
//   2. Conditional surfacing — the toggle only renders for areas that
//      actually have at least one `camera.*` entity assigned (either
//      directly or via the device's area).
// ============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import { render, html } from 'lit';

import {
  getAreasWithCameras,
  renderRoomOverridesTab,
  setCameraHero,
  type RoomOverridesTabContext,
} from '../../src/editor/tabs/RoomOverridesTab';
import { makeHass } from '../fixtures/hass';
import type { OrielConfig } from '../../src/types/strategy';
import type { AreaRegistryEntry } from '../../src/types/registries';

describe('setCameraHero mutator', () => {
  it('writes areas_options.<area>.camera_hero: true when toggled on', () => {
    const next = setCameraHero({}, 'living_room', true);
    expect(next).toEqual({ living_room: { camera_hero: true } });
  });

  it('omits the camera_hero key when toggled off, preserving sibling keys', () => {
    const prior: NonNullable<OrielConfig['areas_options']> = {
      living_room: {
        camera_hero: true,
        room_view_overrides: { sections: [{ type: 'grid' }] },
      } as any,
    };
    const next = setCameraHero(prior, 'living_room', false);
    expect(next).toEqual({
      living_room: {
        room_view_overrides: { sections: [{ type: 'grid' }] },
      },
    });
  });

  it('drops the area entry entirely when toggling off removes the last key', () => {
    const prior: NonNullable<OrielConfig['areas_options']> = {
      living_room: { camera_hero: true } as any,
    };
    const next = setCameraHero(prior, 'living_room', false);
    expect(next).toEqual({});
  });

  it('does not mutate the input opts object', () => {
    const prior: NonNullable<OrielConfig['areas_options']> = {
      living_room: { camera_hero: true } as any,
    };
    const snapshot = JSON.parse(JSON.stringify(prior));
    setCameraHero(prior, 'living_room', false);
    expect(prior).toEqual(snapshot);
  });

  it('is a no-op (writes false) when toggling off an area with no prior entry', () => {
    const next = setCameraHero({}, 'never_seen', false);
    expect(next).toEqual({});
  });

  it('matches the YAML shape the renderer reads at RoomViewStrategy.ts:401', () => {
    // The renderer guards on `areaOptsEarly.camera_hero === true`. The
    // mutator must write boolean `true` (not the string 'true' nor 1)
    // so existing YAML users see no diff in behavior.
    const next = setCameraHero({}, 'kitchen', true);
    expect((next.kitchen as any).camera_hero).toBe(true);
  });
});

describe('getAreasWithCameras', () => {
  it('includes areas where a camera entity is directly assigned', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'camera.front_door', area_id: 'porch' }],
      areas: [{ area_id: 'porch', name: 'Porch' }],
    });
    expect(getAreasWithCameras(hass)).toEqual(new Set(['porch']));
  });

  it('includes areas where the camera lives on a device assigned to the area', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'camera.driveway', device_id: 'dev_1' }],
      devices: [{ id: 'dev_1', area_id: 'driveway' }],
      areas: [{ area_id: 'driveway', name: 'Driveway' }],
    });
    expect(getAreasWithCameras(hass)).toEqual(new Set(['driveway']));
  });

  it('excludes areas with only non-camera entities', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'light.living', area_id: 'living_room' },
        { entity_id: 'sensor.temp', area_id: 'living_room' },
      ],
      areas: [{ area_id: 'living_room', name: 'Living Room' }],
    });
    expect(getAreasWithCameras(hass)).toEqual(new Set());
  });

  it('skips cameras with no resolvable area', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'camera.orphan' }],
    });
    expect(getAreasWithCameras(hass)).toEqual(new Set());
  });
});

describe('RoomOverridesTab — conditional camera-hero toggle', () => {
  function renderTab(
    areas: AreaRegistryEntry[],
    hass: ReturnType<typeof makeHass>,
    config: OrielConfig,
  ): HTMLDivElement {
    const host = document.createElement('div');
    const ctx: RoomOverridesTabContext = {
      hass,
      config,
      areas,
      onChange: () => undefined,
    };
    render(html`${renderRoomOverridesTab(ctx)}`, host);
    return host;
  }

  it('renders the toggle only for areas with at least one camera entity', () => {
    const hass = makeHass({
      entities: [
        { entity_id: 'camera.porch_cam', area_id: 'porch' },
        { entity_id: 'light.living', area_id: 'living_room' },
      ],
      areas: [
        { area_id: 'porch', name: 'Porch' },
        { area_id: 'living_room', name: 'Living Room' },
      ],
    });
    const areas: AreaRegistryEntry[] = [
      { area_id: 'porch', name: 'Porch' } as AreaRegistryEntry,
      { area_id: 'living_room', name: 'Living Room' } as AreaRegistryEntry,
    ];
    const host = renderTab(areas, hass, {});
    const porchToggle = host.querySelector(
      'label.camera-hero-toggle[data-area-id="porch"]',
    );
    const livingToggle = host.querySelector(
      'label.camera-hero-toggle[data-area-id="living_room"]',
    );
    expect(porchToggle, 'porch (has camera) → toggle present').not.toBeNull();
    expect(livingToggle, 'living_room (no camera) → toggle absent').toBeNull();
  });

  it('reflects the existing camera_hero state in the checkbox', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'camera.porch_cam', area_id: 'porch' }],
      areas: [{ area_id: 'porch', name: 'Porch' }],
    });
    const areas: AreaRegistryEntry[] = [
      { area_id: 'porch', name: 'Porch' } as AreaRegistryEntry,
    ];
    const config: OrielConfig = {
      areas_options: { porch: { camera_hero: true } as any },
    };
    const host = renderTab(areas, hass, config);
    const checkbox = host.querySelector<HTMLInputElement>(
      'label.camera-hero-toggle[data-area-id="porch"] input[type="checkbox"]',
    );
    expect(checkbox).not.toBeNull();
    expect(checkbox!.checked).toBe(true);
  });

  it('does not render the toggle when no areas have cameras', () => {
    const hass = makeHass({
      entities: [{ entity_id: 'light.kitchen', area_id: 'kitchen' }],
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
    });
    const areas: AreaRegistryEntry[] = [
      { area_id: 'kitchen', name: 'Kitchen' } as AreaRegistryEntry,
    ];
    const host = renderTab(areas, hass, {});
    expect(host.querySelectorAll('label.camera-hero-toggle').length).toBe(0);
  });
});
