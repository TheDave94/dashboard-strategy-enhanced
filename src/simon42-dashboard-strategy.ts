// ====================================================================
// SIMON42 DASHBOARD STRATEGY — Main Entry Point
// ====================================================================
// TypeScript rewrite with Webpack bundling for performance + type safety.
// Single bundled output file replaces 14+ ES module HTTP requests.
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type { Simon42StrategyConfig } from './types/strategy';
import type { LovelaceConfig, LovelaceViewConfig, LovelaceSectionConfig } from './types/lovelace';
import { Registry } from './Registry';
import { collectPersons, findWeatherEntity, findDummySensor } from './utils/entity-filter';
import { getVisibleAreas } from './utils/name-utils';
import { createPersonBadges } from './utils/badge-builder';
import { createOverviewSection } from './sections/OverviewSection';
import { createAreasSection } from './sections/AreasSection';
import { createWeatherEnergySection } from './sections/WeatherEnergySection';
import { createOverviewView, createUtilityViews, createAreaViews } from './utils/view-builder';

// Import custom cards (side-effect: registers custom elements)
import './cards/SummaryCard';
import './cards/LightsGroupCard';
import './cards/CoversGroupCard';

// Import view strategies (side-effect: registers custom elements)
import './views/LightsViewStrategy';
import './views/CoversViewStrategy';
import './views/SecurityViewStrategy';
import './views/BatteriesViewStrategy';
import './views/RoomViewStrategy';

const STRATEGY_VERSION = '2.0.0';

class Simon42DashboardStrategy extends HTMLElement {
  static async generate(
    config: Simon42StrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    // Initialize Registry — fetches registries via WebSocket, builds Maps/Sets
    await Registry.initialize(hass, config);

    const entities = Object.values(hass.entities || {});
    const devices = Object.values(hass.devices || {});

    // Visible areas (filtered + sorted by config)
    const visibleAreas = getVisibleAreas(Registry.areas, config.areas_display);

    // Collect data for overview (only what generate() needs — summary cards are self-reactive)
    const persons = collectPersons(hass, config);
    const weatherEntity = findWeatherEntity(hass);
    const someSensorId = findDummySensor(hass);

    // Person badges
    const personBadges = createPersonBadges(persons, hass);

    // Config flags
    const showWeather = config.show_weather !== false;
    const showEnergy = config.show_energy !== false;
    const showSearchCard = config.show_search_card === true;
    const showSummaryViews = config.show_summary_views === true;
    const showRoomViews = config.show_room_views === true;
    const groupByFloors = config.group_by_floors === true;

    // Build sections
    const areasSections = createAreasSection(visibleAreas, groupByFloors, hass);
    const weatherEnergySection = createWeatherEnergySection(
      weatherEntity ?? null, showWeather, showEnergy, groupByFloors
    );

    const overviewSections: LovelaceSectionConfig[] = [
      createOverviewSection({ someSensorId, showSearchCard, config, hass }),
      ...(Array.isArray(areasSections) ? areasSections : [areasSections]),
      ...(weatherEnergySection
        ? (Array.isArray(weatherEnergySection) ? weatherEnergySection : [weatherEnergySection])
        : [])
    ];

    // Build all views
    const views: LovelaceViewConfig[] = [
      createOverviewView(overviewSections, personBadges),
      ...createUtilityViews(entities, showSummaryViews, config),
      ...createAreaViews(visibleAreas, devices, entities, showRoomViews, config.areas_options || {}, config),
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
