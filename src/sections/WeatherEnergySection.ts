// ====================================================================
// Weather & Energy Section Builder
// ====================================================================
// Ported from dist/utils/simon42-section-builder.js
// (createWeatherEnergySection) with full TypeScript types.
// Creates weather forecast and/or energy distribution sections.
// ====================================================================

import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';

/**
 * Creates the weather & energy section(s).
 *
 * - With `groupByFloors`: returns separate sections (array), one for
 *   weather and one for energy.
 * - Without `groupByFloors`: returns a single combined section.
 * - Returns `null` if neither weather nor energy cards are shown.
 */
export function createWeatherEnergySection(
  weatherEntity: string | null,
  showWeather: boolean,
  showEnergy: boolean,
  groupByFloors: boolean = false
): LovelaceSectionConfig | LovelaceSectionConfig[] | null {
  // Floor grouping active: return separate sections
  if (groupByFloors) {
    const sections: LovelaceSectionConfig[] = [];

    // Weather section (if entity exists AND enabled)
    if (weatherEntity && showWeather) {
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: 'Wetter',
            heading_style: 'title',
            icon: 'mdi:weather-partly-cloudy',
          },
          {
            type: 'weather-forecast',
            entity: weatherEntity,
            forecast_type: 'daily',
          },
        ],
      });
    }

    // Energy section (if enabled)
    if (showEnergy) {
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: 'Energie',
            heading_style: 'title',
            icon: 'mdi:lightning-bolt',
          },
          {
            type: 'energy-distribution',
            link_dashboard: true,
          },
        ],
      });
    }

    // Return array (may be empty)
    return sections;
  }

  // Standard: combine everything into a single section
  const cards: LovelaceCardConfig[] = [];

  // Weather forecast (if entity exists AND enabled)
  if (weatherEntity && showWeather) {
    cards.push({
      type: 'heading',
      heading: 'Wetter',
      heading_style: 'title',
      icon: 'mdi:weather-partly-cloudy',
    });
    cards.push({
      type: 'weather-forecast',
      entity: weatherEntity,
      forecast_type: 'daily',
    });
  }

  // Energy distribution (if enabled)
  if (showEnergy) {
    cards.push({
      type: 'heading',
      heading: 'Energie',
      heading_style: 'title',
      icon: 'mdi:lightning-bolt',
    });
    cards.push({
      type: 'energy-distribution',
      link_dashboard: true,
    });
  }

  // Return null if no cards (prevents empty section)
  if (cards.length === 0) {
    return null;
  }

  return {
    type: 'grid',
    cards,
  };
}
