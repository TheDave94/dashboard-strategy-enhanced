// ====================================================================
// SIMON42 DASHBOARD STRATEGY — Main Entry Point
// ====================================================================
// Minimal entry point for fast custom element registration.
// Cards, views, and heavy dependencies are lazy-loaded in generate().
// This ensures customElements.define() runs before HA's 5s timeout.
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type { Simon42StrategyConfig } from './types/strategy';
import type { LovelaceConfig, LovelaceViewConfig } from './types/lovelace';

// Injected at build time by webpack DefinePlugin from package.json#version.
// `as unknown as string` keeps TS happy since the value isn't declared
// in any .d.ts (an alternative is a global.d.ts; this is cheaper).
declare const __SIMON42_VERSION__: string;
const STRATEGY_VERSION =
  typeof __SIMON42_VERSION__ !== 'undefined'
    ? __SIMON42_VERSION__
    : 'dev';

const DEBUG = new URLSearchParams(window.location.search).has('s42_debug');
const T0 = performance.now();
const t = (label: string) => {
  if (DEBUG) console.log(`[s42-timing] ${label}: ${(performance.now() - T0).toFixed(0)}ms`);
};
let generateCallCount = 0;

// Start loading all chunks IMMEDIATELY
const modulesPromise = Promise.all([
  import('./cards/SummaryCard'),
  import('./cards/LightsGroupCard'),
  import('./cards/CoversGroupCard'),
  import('./cards/ZonePresenceCard'),
  import('./cards/LazyCard'),
  import('./features/StickyLockFeature'),
  import('./views/OverviewViewStrategy'),
  import('./views/LightsViewStrategy'),
  import('./views/CoversViewStrategy'),
  import('./views/SecurityViewStrategy'),
  import('./views/BatteriesViewStrategy'),
  import('./views/ClimateViewStrategy'),
  import('./views/RoomViewStrategy'),
]);

void modulesPromise.then(() => { t('all chunks loaded'); });

class Simon42DashboardStrategy extends HTMLElement {
  static async generate(config: Simon42StrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
    generateCallCount++;
    t(`generate() called (#${generateCallCount})`);

    await modulesPromise;
    t('modules ready');

    const { Registry } = await import('./Registry');
    const { getVisibleAreasFromHass } = await import('./utils/name-utils');
    const { localize } = await import('./utils/localize');
    const { getDensityPresetSpec } = await import('./utils/density-presets');
    t('imports done');

    const getStrategy = (tag: string): any => customElements.get(tag);

    Registry.initialize(hass, config);
    t('registry initialized');

    const allVisibleAreas = getVisibleAreasFromHass(hass, config.areas_display, config.use_default_area_sort);

    // Per-room conditional visibility: filter the area list used to build
    // room views / nav tabs. The overview's area cards section is NOT
    // filtered — it uses Registry.areas via OverviewViewStrategy and the
    // user can already hide individual area cards via areas_display.hidden.
    const roomVisibility = config.room_visibility || {};
    const visibleAreas = allVisibleAreas.filter((area) => {
      const rule = Reflect.get(roomVisibility, area.area_id) as { entity?: string; state?: string } | undefined;
      if (!rule?.entity) return true;
      const st = Reflect.get(hass.states as Record<string, unknown>, rule.entity) as { state?: string } | undefined;
      return !!st && st.state === rule.state;
    });

    const showSummaryViews = config.show_summary_views === true;
    const showRoomViews = config.show_room_views === true;
    const showLights = config.show_light_summary !== false;
    const showCovers = config.show_covers_summary !== false;
    const showSecurity = config.show_security_summary !== false;
    const showBatteries = config.show_battery_summary !== false;
    const showClimate = config.show_climate_summary === true;

    // Pre-resolve ALL views upfront (like HA's Home Panel does)
    const overviewConfig = await getStrategy('ll-strategy-view-simon42-view-overview').generate(
      { dashboardConfig: config },
      hass
    );
    t('overview resolved');

    // Only resolve utility views for enabled summaries
    const utilityViewDefs = [
      { enabled: showLights, title: localize('views.lights'), path: 'lights', icon: 'mdi:lamps',
        resolve: () => getStrategy('ll-strategy-view-simon42-view-lights').generate({ config }, hass) },
      { enabled: showCovers, title: localize('views.covers'), path: 'covers', icon: 'mdi:blinds-horizontal',
        resolve: () => getStrategy('ll-strategy-view-simon42-view-covers').generate(
          { device_classes: ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'], config }, hass) },
      { enabled: showSecurity, title: localize('views.security'), path: 'security', icon: 'mdi:security',
        resolve: () => getStrategy('ll-strategy-view-simon42-view-security').generate({ config }, hass) },
      { enabled: showBatteries, title: localize('views.batteries'), path: 'batteries', icon: 'mdi:battery-alert',
        resolve: () => getStrategy('ll-strategy-view-simon42-view-batteries').generate({ config }, hass) },
      { enabled: showClimate, title: localize('views.climate'), path: 'climate', icon: 'mdi:thermostat',
        resolve: () => getStrategy('ll-strategy-view-simon42-view-climate').generate({ config }, hass) },
    ];

    const enabledDefs = utilityViewDefs.filter((d) => d.enabled);
    const utilityConfigs = await Promise.all(enabledDefs.map((d) => d.resolve()));
    t('utility views resolved');

    const roomStrategy = getStrategy('ll-strategy-view-simon42-view-room');
    const roomConfigs = await Promise.all(
      visibleAreas.map((area) => {
        const areaOptions = config.areas_options?.[area.area_id];
        return roomStrategy.generate(
          {
            area,
            groups_options: areaOptions?.groups_options || {},
            dashboardConfig: config,
          },
          hass
        );
      })
    );
    t(`${visibleAreas.length} room views resolved`);

    // Apply density preset to every emitted view. Comfortable
    // (default) is a no-op — only compact/cozy add max_columns +
    // CSS-variable overrides.
    const densitySpec = getDensityPresetSpec(config);
    const densityOverlay = (v: LovelaceViewConfig): LovelaceViewConfig => {
      if (densitySpec.max_columns === undefined && !densitySpec.inline_style) return v;
      const out: LovelaceViewConfig = { ...v };
      if (densitySpec.max_columns !== undefined) {
        (out as { max_columns?: number }).max_columns = densitySpec.max_columns;
      }
      // HA sections-view honors inline `style` on the view config; this
      // sets per-view CSS custom properties without touching the
      // global theme.
      if (densitySpec.inline_style) {
        (out as { style?: string }).style = densitySpec.inline_style;
      }
      return out;
    };

    const views: LovelaceViewConfig[] = [
      densityOverlay({
        title: localize('views.overview'),
        path: 'home',
        icon: 'mdi:home',
        ...overviewConfig,
      }),
      ...enabledDefs.map((def, i) => densityOverlay({
        title: def.title,
        path: def.path,
        icon: def.icon,
        subview: !showSummaryViews,
        ...utilityConfigs[i],
      })),
      ...visibleAreas.map((area, i) => densityOverlay({
        title: area.name,
        path: area.area_id,
        icon: area.icon || 'mdi:floor-plan',
        subview: !showRoomViews,
        ...roomConfigs[i],
      })),
    ];

    const customViews = config.custom_views || [];
    for (const cv of customViews) {
      if (cv.parsed_config && cv.title && cv.path) {
        views.push({
          ...cv.parsed_config,
          title: cv.title,
          path: cv.path,
          icon: cv.icon || 'mdi:card-text-outline',
        });
      }
    }

    t(`generate() done — ${views.length} views`);

    return {
      title: localize('dashboard.title'),
      views,
    };
  }

  static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor/StrategyEditor');
    await customElements.whenDefined('simon42-dashboard-strategy-editor');
    return document.createElement('simon42-dashboard-strategy-editor');
  }

  /**
   * Surfaces curated "starting points" in HA's New Dashboard wizard
   * (added in HA 2025.5+ as `LovelaceDashboardStrategyGetCreateSuggestions`).
   * Each suggestion becomes a one-click preset; the user picks one and HA
   * seeds the dashboard config with the returned `strategy_config`.
   *
   * Three presets surface today:
   *   - Standard      — sensible defaults for most homes (HA built-ins on)
   *   - Minimal       — just clock + areas, no summaries or extras
   *   - Power-user    — everything on (all sections, all badges)
   *
   * Returning an empty array hides the suggestions UI; HA falls back to
   * the manual YAML editor flow that's always existed.
   */
  static async getCreateSuggestions(): Promise<
    Array<{
      title: string;
      description?: string;
      icon?: string;
      strategy_config: Record<string, unknown>;
    }>
  > {
    return [
      {
        title: 'Standard',
        description: 'Defaults for most homes — overview, summaries, areas, weather, energy.',
        icon: 'mdi:home-outline',
        strategy_config: { type: 'custom:simon42-dashboard' },
      },
      {
        title: 'Minimal',
        description: 'Just clock + area cards. No summaries, no extra sections.',
        icon: 'mdi:home-minus-outline',
        strategy_config: {
          type: 'custom:simon42-dashboard',
          show_light_summary: false,
          show_covers_summary: false,
          show_security_summary: false,
          show_battery_summary: false,
          show_weather: false,
          show_energy: false,
        },
      },
      {
        title: 'Power-user',
        description: 'All sections + all header badges enabled. Easy to disable later.',
        icon: 'mdi:home-lightning-bolt',
        strategy_config: {
          type: 'custom:simon42-dashboard',
          show_climate_summary: true,
          show_plants_section: true,
          show_agenda_section: true,
          show_todos_section: true,
          show_persons_section: true,
          show_vacuums_section: true,
          show_maintenance_section: true,
          show_unavailable_alert_badge: true,
          show_now_playing_badge: true,
          show_sun_badge: true,
          show_updates_badge: true,
        },
      },
    ];
  }
}

// Register the strategy custom element under HA's current naming
// convention (`ll-strategy-<type>-<name>`). HA 2026.5+ enforces this
// strictly and the fork no longer carries a pre-2025 fallback.
customElements.define('ll-strategy-dashboard-simon42-dashboard', Simon42DashboardStrategy);

console.log(`Simon42 Dashboard Strategy v${STRATEGY_VERSION} loaded`);
