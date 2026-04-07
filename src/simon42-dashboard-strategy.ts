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

const STRATEGY_VERSION = '1.2.0-beta.2';

// Track whether lazy modules have been loaded (only once)
let modulesLoaded = false;

async function ensureModulesLoaded(): Promise<void> {
  if (modulesLoaded) return;

  // Load all cards, views, and heavy dependencies in parallel.
  // Webpack automatically creates separate chunks for these dynamic imports.
  await Promise.all([
    // Custom cards (side-effect: registers custom elements)
    import('./cards/SummaryCard'),
    import('./cards/LightsGroupCard'),
    import('./cards/CoversGroupCard'),
    // View strategies (side-effect: registers custom elements)
    import('./views/OverviewViewStrategy'),
    import('./views/LightsViewStrategy'),
    import('./views/CoversViewStrategy'),
    import('./views/SecurityViewStrategy'),
    import('./views/BatteriesViewStrategy'),
    import('./views/RoomViewStrategy'),
  ]);

  modulesLoaded = true;
}

class Simon42DashboardStrategy extends HTMLElement {
  static async generate(
    config: Simon42StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    // Lazy-load cards, views, and dependencies on first generate() call
    await ensureModulesLoaded();

    // These imports are now available (loaded above)
    const { Registry } = await import('./Registry');
    const { getVisibleAreasFromHass } = await import('./utils/name-utils');
    const { createUtilityViews, createAreaViews } = await import('./utils/view-builder');
    const { timeStart, timeEnd, debugLog } = await import('./utils/debug');

    timeStart('strategy-generate');

    // Initialize Registry BEFORE returning views — ensures it's ready when
    // view strategies and custom cards start receiving hass updates.
    Registry.initialize(hass, config);

    // Read areas synchronously from hass (no WebSocket needed)
    const visibleAreas = getVisibleAreasFromHass(hass, config.areas_display);

    const showSummaryViews = config.show_summary_views === true;
    const showRoomViews = config.show_room_views === true;

    // Return lightweight view stubs — HA resolves all view strategies
    // concurrently via Promise.all, enabling progressive rendering
    const views: LovelaceViewConfig[] = [
      {
        title: 'Übersicht',
        path: 'home',
        icon: 'mdi:home',
        strategy: {
          type: 'custom:simon42-view-overview',
          dashboardConfig: config,
        },
      },
      ...createUtilityViews(showSummaryViews, config),
      ...createAreaViews(visibleAreas, showRoomViews, config.areas_options || {}, config),
    ];

    // Custom Views (user-defined YAML views)
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

    debugLog(`Generated ${views.length} view stubs for ${visibleAreas.length} areas`);
    timeEnd('strategy-generate');

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
