// ====================================================================
// VIEW STRATEGY — OVERVIEW (main dashboard view)
// ====================================================================
// Extracted from the dashboard entry point so HA can resolve this view
// concurrently with other view strategies via Promise.all, enabling
// progressive rendering instead of blocking on Registry init.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig } from '../types/strategy';
import type { LovelaceViewConfig, LovelaceSectionConfig, LovelaceBadgeConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { collectPersons, findWeatherEntity, findDummySensor } from '../utils/entity-filter';
import { getVisibleAreas } from '../utils/name-utils';
import { createPersonBadges } from '../utils/badge-builder';
import { createOverviewSection, createCustomCardsSection } from '../sections/OverviewSection';
import { createAreasSection } from '../sections/AreasSection';
import { createWeatherEnergySection } from '../sections/WeatherEnergySection';
import { createOverviewView } from '../utils/view-builder';
import { timeStart, timeEnd, debugLog } from '../utils/debug';

class Simon42ViewOverviewStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    timeStart('overview-generate');
    const dashboardConfig: Simon42StrategyConfig = config.dashboardConfig || {};

    // Initialize Registry (idempotent — skips if already done by another view)
    Registry.initialize(hass, dashboardConfig);

    // Visible areas (filtered + sorted by config)
    const visibleAreas = getVisibleAreas(Registry.areas, dashboardConfig.areas_display, dashboardConfig.use_default_area_sort);

    // Collect data for overview
    const persons = collectPersons(hass, dashboardConfig);
    const weatherEntity = findWeatherEntity(hass);
    const someSensorId = findDummySensor(hass);

    // Person badges
    const personBadges = createPersonBadges(persons, hass);

    // Config flags
    const showWeather = dashboardConfig.show_weather !== false;
    const showEnergy = dashboardConfig.show_energy !== false;
    const showSearchCard = dashboardConfig.show_search_card === true;
    const groupByFloors = dashboardConfig.group_by_floors === true;

    // Build sections
    const areasSections = createAreasSection(visibleAreas, groupByFloors, hass);
    const weatherEnergySection = createWeatherEnergySection(
      weatherEntity ?? null,
      showWeather,
      showEnergy,
      groupByFloors
    );

    const overviewSection = createOverviewSection({ someSensorId, showSearchCard, config: dashboardConfig, hass });
    const customCardsSection = createCustomCardsSection(
      dashboardConfig.custom_cards || [],
      dashboardConfig.custom_cards_heading,
      dashboardConfig.custom_cards_icon
    );
    const overviewSections: LovelaceSectionConfig[] = [
      ...(overviewSection ? [overviewSection] : []),
      ...(customCardsSection ? [customCardsSection] : []),
      ...(Array.isArray(areasSections) ? areasSections : [areasSections]),
      ...(weatherEnergySection
        ? Array.isArray(weatherEnergySection)
          ? weatherEnergySection
          : [weatherEnergySection]
        : []),
    ];

    const totalCards = overviewSections.reduce((sum, s) => sum + (s.cards?.length || 0), 0);
    timeEnd('overview-generate');
    debugLog(`Overview: ${overviewSections.length} sections, ${totalCards} cards, ${personBadges.length} badges`);

    // Custom badges from YAML config
    const customBadges = (dashboardConfig.custom_badges || [])
      .filter((b) => b.parsed_config)
      .map((b) => b.parsed_config as LovelaceBadgeConfig);

    return createOverviewView(overviewSections, [...personBadges, ...customBadges]);
  }
}

customElements.define('ll-strategy-simon42-view-overview', Simon42ViewOverviewStrategy);
