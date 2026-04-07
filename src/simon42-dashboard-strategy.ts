// ====================================================================
// SIMON42 DASHBOARD STRATEGY — Main Entry Point
// ====================================================================
// TypeScript rewrite with Webpack bundling for performance + type safety.
// Single bundled output file replaces 14+ ES module HTTP requests.
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type { Simon42StrategyConfig } from './types/strategy';
import type { LovelaceConfig, LovelaceViewConfig } from './types/lovelace';
import { getVisibleAreasFromHass } from './utils/name-utils';
import { createUtilityViews, createAreaViews } from './utils/view-builder';
import { timeStart, timeEnd, debugLog } from './utils/debug';

// Import custom cards (side-effect: registers custom elements)
import './cards/SummaryCard';
import './cards/LightsGroupCard';
import './cards/CoversGroupCard';

// Import view strategies (side-effect: registers custom elements)
import './views/OverviewViewStrategy';
import './views/LightsViewStrategy';
import './views/CoversViewStrategy';
import './views/SecurityViewStrategy';
import './views/BatteriesViewStrategy';
import './views/RoomViewStrategy';

const STRATEGY_VERSION = '1.2.0-beta.2';

class Simon42DashboardStrategy extends HTMLElement {
  static async generate(
    config: Simon42StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    timeStart('strategy-generate');

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

// Register strategy custom element
customElements.define('ll-strategy-simon42-dashboard', Simon42DashboardStrategy);

console.log(`Simon42 Dashboard Strategy v${STRATEGY_VERSION} loaded`);
