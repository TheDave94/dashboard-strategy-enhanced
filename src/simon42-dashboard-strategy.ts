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

const STRATEGY_VERSION = '1.2.0-beta.3';

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
  import('./views/OverviewViewStrategy'),
  import('./views/LightsViewStrategy'),
  import('./views/CoversViewStrategy'),
  import('./views/SecurityViewStrategy'),
  import('./views/BatteriesViewStrategy'),
  import('./views/RoomViewStrategy'),
]);

modulesPromise.then(() => t('all chunks loaded'));

class Simon42DashboardStrategy extends HTMLElement {
  static async generate(config: Simon42StrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
    generateCallCount++;
    t(`generate() called (#${generateCallCount})`);

    await modulesPromise;
    t('modules ready');

    const { Registry } = await import('./Registry');
    const { getVisibleAreasFromHass } = await import('./utils/name-utils');
    t('imports done');

    const getStrategy = (tag: string): any => customElements.get(tag);

    Registry.initialize(hass, config);
    t('registry initialized');

    const visibleAreas = getVisibleAreasFromHass(hass, config.areas_display);

    const showSummaryViews = config.show_summary_views === true;
    const showRoomViews = config.show_room_views === true;

    // Pre-resolve ALL views upfront (like HA's Home Panel does)
    const overviewConfig = await getStrategy('ll-strategy-simon42-view-overview').generate(
      { dashboardConfig: config },
      hass
    );
    t('overview resolved');

    const utilityConfigs = await Promise.all([
      getStrategy('ll-strategy-simon42-view-lights').generate({ config }, hass),
      getStrategy('ll-strategy-simon42-view-covers').generate(
        {
          device_classes: ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'],
          config,
        },
        hass
      ),
      getStrategy('ll-strategy-simon42-view-security').generate({ config }, hass),
      getStrategy('ll-strategy-simon42-view-batteries').generate({ config }, hass),
    ]);
    t('utility views resolved');

    const roomStrategy = getStrategy('ll-strategy-simon42-view-room');
    const roomConfigs = await Promise.all(
      visibleAreas.map((area) => {
        const areaOptions = (config.areas_options || {})[area.area_id] || {};
        return roomStrategy.generate(
          {
            area,
            groups_options: areaOptions.groups_options || {},
            dashboardConfig: config,
          },
          hass
        );
      })
    );
    t(`${visibleAreas.length} room views resolved`);

    const views: LovelaceViewConfig[] = [
      {
        title: 'Übersicht',
        path: 'home',
        icon: 'mdi:home',
        ...overviewConfig,
      },
      {
        title: 'Lichter',
        path: 'lights',
        icon: 'mdi:lamps',
        subview: !showSummaryViews,
        ...utilityConfigs[0],
      },
      {
        title: 'Rollos & Vorhänge',
        path: 'covers',
        icon: 'mdi:blinds-horizontal',
        subview: !showSummaryViews,
        ...utilityConfigs[1],
      },
      {
        title: 'Sicherheit',
        path: 'security',
        icon: 'mdi:security',
        subview: !showSummaryViews,
        ...utilityConfigs[2],
      },
      {
        title: 'Batterien',
        path: 'batteries',
        icon: 'mdi:battery-alert',
        subview: !showSummaryViews,
        ...utilityConfigs[3],
      },
      ...visibleAreas.map((area, i) => ({
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
      title: 'Dynamisches Dashboard',
      views,
    };
  }

  static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor/StrategyEditor');
    await customElements.whenDefined('simon42-dashboard-strategy-editor');
    return document.createElement('simon42-dashboard-strategy-editor');
  }
}

// Register strategy custom element IMMEDIATELY — no heavy imports needed.
// This ensures HA's 5-second timeout is satisfied even on slow networks.
customElements.define('ll-strategy-simon42-dashboard', Simon42DashboardStrategy);

console.log(`Simon42 Dashboard Strategy v${STRATEGY_VERSION} loaded`);
