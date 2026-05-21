// ====================================================================
// SIMON42 DASHBOARD STRATEGY — Main Entry Point
// ====================================================================
// Minimal entry point for fast custom element registration.
// Cards, views, and heavy dependencies are lazy-loaded in generate().
// This ensures customElements.define() runs before HA's 5s timeout.
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type { DashboardEnhancedStrategyConfig } from './types/strategy';
import type { LovelaceConfig, LovelaceViewConfig } from './types/lovelace';

// Injected at build time by webpack DefinePlugin from package.json#version.
// `as unknown as string` keeps TS happy since the value isn't declared
// in any .d.ts (an alternative is a global.d.ts; this is cheaper).
// Install the plugin extension entry point (v3.5.0). Runs at module
// load, before any HA strategy lifecycle method — so plugins can call
// `window.dashboardEnhanced.registerSection(...)` from their own
// `customElements.define()`-time modules.
import { installExtensionEntryPoint } from './extension/registry';
installExtensionEntryPoint();

// Usage tracking (v3.5.1) — listen for HA's "hass-more-info" events
// at document level, the standard dispatch that fires when any tile
// or card is tapped. Counts are local-only (localStorage) and feed
// the editor's "suggested layout" banner.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'hass-more-info' as keyof DocumentEventMap,
    (ev: Event) => {
      const detail = (ev as CustomEvent<{ entityId?: string }>).detail;
      if (!detail?.entityId) return;
      void import('./utils/usage-tracker').then(({ trackTap }) =>
        trackTap(detail.entityId),
      );
    },
    { passive: true },
  );
}

declare const __STRATEGY_VERSION__: string;
const STRATEGY_VERSION =
  typeof __STRATEGY_VERSION__ !== 'undefined'
    ? __STRATEGY_VERSION__
    : 'dev';

const DEBUG = new URLSearchParams(window.location.search).has('de_debug');
const T0 = performance.now();
const t = (label: string) => {
  if (DEBUG) console.log(`[de-timing] ${label}: ${(performance.now() - T0).toFixed(0)}ms`);
};
let generateCallCount = 0;

// Start loading all chunks IMMEDIATELY
const modulesPromise = Promise.all([
  import('./cards/SummaryCard'),
  import('./cards/LightsGroupCard'),
  import('./cards/CoversGroupCard'),
  import('./cards/ZonePresenceCard'),
  import('./cards/LazyCard'),
  import('./cards/ScreensaverCard'),
  import('./cards/NotificationCard'),
  import('./cards/SparklineCard'),
  import('./cards/RoutinesCard'),
  import('./cards/VoiceFabCard'),
  import('./features/StickyLockFeature'),
  import('./features/CostOverlayFeature'),
  import('./views/OverviewViewStrategy'),
  import('./views/LightsViewStrategy'),
  import('./views/CoversViewStrategy'),
  import('./views/SecurityViewStrategy'),
  import('./views/BatteriesViewStrategy'),
  import('./views/ClimateViewStrategy'),
  import('./views/RoomViewStrategy'),
]);

void modulesPromise.then(() => { t('all chunks loaded'); });

class DashboardEnhancedDashboardStrategy extends HTMLElement {
  static async generate(rawConfig: DashboardEnhancedStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
    generateCallCount++;
    t(`generate() called (#${generateCallCount})`);

    await modulesPromise;
    t('modules ready');

    const { Registry } = await import('./Registry');
    const { getVisibleAreasFromHass } = await import('./utils/name-utils');
    const { localize } = await import('./utils/localize');
    const { getDensityPresetSpec } = await import('./utils/density-presets');
    const { resolveUserConfig } = await import('./utils/user-overrides');

    // v3.0: resolve per-user / per-role overrides on top of the base
    // config. When `users` / `users_by_role` are unset, this is a
    // no-op and `config` is identical to `rawConfig`. See
    // src/utils/user-overrides.ts for the merge rules.
    const config = resolveUserConfig(rawConfig, hass);
    if (config !== rawConfig) {
      t('user-overrides applied');
    }

    // Swipe-nav (v3.5.4) — install once when the config opts in. The
    // listener is module-level + idempotent, so re-running generate
    // doesn't re-add it.
    if (config.swipe_nav === true) {
      void import('./utils/swipe-nav').then(({ installSwipeNav }) => installSwipeNav());
    }
    t('imports done');

    const getStrategy = (tag: string): any => customElements.get(tag);

    Registry.initialize(hass, config);
    t('registry initialized');

    const allVisibleAreas = getVisibleAreasFromHass(hass, config.areas_display, config.use_default_area_sort);

    // Per-room conditional visibility: filter the area list used to build
    // room views / nav tabs. The overview's area cards section is NOT
    // filtered — it uses Registry.areas via OverviewViewStrategy and the
    // user can already hide individual area cards via areas_display.hidden.
    //
    // Visibility rules support the legacy { entity, state } shape PLUS
    // the composable v2.3.4 shape (role / time_after / time_before /
    // mode_entity / mode_is / any / all). See src/utils/visibility.ts.
    const { getRoomVisibilityChecker } = await import('./utils/visibility');
    const roomVisible = getRoomVisibilityChecker(config, hass);
    const visibleAreas = allVisibleAreas.filter((area) => roomVisible(area.area_id));

    const showSummaryViews = config.show_summary_views === true;
    const showRoomViews = config.show_room_views === true;
    const showLights = config.show_light_summary !== false;
    const showCovers = config.show_covers_summary !== false;
    const showSecurity = config.show_security_summary !== false;
    const showBatteries = config.show_battery_summary !== false;
    const showClimate = config.show_climate_summary === true;

    // Pre-resolve ALL views upfront (like HA's Home Panel does)
    const overviewConfig = await getStrategy('ll-strategy-view-dashboard-enhanced-view-overview').generate(
      { dashboardConfig: config },
      hass
    );
    t('overview resolved');

    // Only resolve utility views for enabled summaries
    const utilityViewDefs = [
      { enabled: showLights, title: localize('views.lights'), path: 'lights', icon: 'mdi:lamps',
        resolve: () => getStrategy('ll-strategy-view-dashboard-enhanced-view-lights').generate({ config }, hass) },
      { enabled: showCovers, title: localize('views.covers'), path: 'covers', icon: 'mdi:blinds-horizontal',
        resolve: () => getStrategy('ll-strategy-view-dashboard-enhanced-view-covers').generate(
          { device_classes: ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'], config }, hass) },
      { enabled: showSecurity, title: localize('views.security'), path: 'security', icon: 'mdi:security',
        resolve: () => getStrategy('ll-strategy-view-dashboard-enhanced-view-security').generate({ config }, hass) },
      { enabled: showBatteries, title: localize('views.batteries'), path: 'batteries', icon: 'mdi:battery-alert',
        resolve: () => getStrategy('ll-strategy-view-dashboard-enhanced-view-batteries').generate({ config }, hass) },
      { enabled: showClimate, title: localize('views.climate'), path: 'climate', icon: 'mdi:thermostat',
        resolve: () => getStrategy('ll-strategy-view-dashboard-enhanced-view-climate').generate({ config }, hass) },
    ];

    const enabledDefs = utilityViewDefs.filter((d) => d.enabled);
    const utilityConfigs = await Promise.all(enabledDefs.map((d) => d.resolve()));
    t('utility views resolved');

    const roomStrategy = getStrategy('ll-strategy-view-dashboard-enhanced-view-room');
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

    // Floorplan view (v3.2.3) — emit a dedicated view containing a
    // single `custom:floorplan-card`. The view auto-hides when
    // floorplan-card isn't installed (HA shows a "card type doesn't
    // exist" placeholder, which is the standard signal that a HACS
    // plugin is missing). The view is always emitted; the strategy
    // doesn't probe for the plugin so users can configure ahead of
    // installing.
    if (config.floorplan_view && config.floorplan_view.config) {
      const fp = config.floorplan_view;
      views.push(densityOverlay({
        title: fp.title ?? 'Floorplan',
        path: fp.path ?? 'floorplan',
        icon: fp.icon ?? 'mdi:floor-plan',
        type: 'panel',
        cards: [
          {
            type: 'custom:floorplan-card',
            ...fp.config,
          },
        ],
      } as LovelaceViewConfig));
    }

    t(`generate() done — ${views.length} views`);

    // Top-level decluttering-card templates (v3.2.2). HA's lovelace
    // root supports the `decluttering_templates` key directly; we
    // forward it verbatim so users can reference templates by name
    // from custom_cards / custom_views.
    const decluttering = config.decluttering_templates;
    return {
      title: localize('dashboard.title'),
      views,
      ...(decluttering && Object.keys(decluttering).length > 0
        ? { decluttering_templates: decluttering }
        : {}),
    } as LovelaceConfig;
  }

  static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor/StrategyEditor');
    await customElements.whenDefined('dashboard-enhanced-strategy-editor');
    return document.createElement('dashboard-enhanced-strategy-editor');
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
        strategy_config: { type: 'custom:dashboard-enhanced' },
      },
      {
        title: 'Minimal',
        description: 'Just clock + area cards. No summaries, no extra sections.',
        icon: 'mdi:home-minus-outline',
        strategy_config: {
          type: 'custom:dashboard-enhanced',
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
          type: 'custom:dashboard-enhanced',
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
customElements.define('ll-strategy-dashboard-dashboard-enhanced', DashboardEnhancedDashboardStrategy);

console.log(`Dashboard Enhanced Strategy v${STRATEGY_VERSION} loaded`);
