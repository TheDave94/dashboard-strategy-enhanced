// ====================================================================
// Weather & Energy Section Builders
// ====================================================================
// Independent section builders for weather forecast and energy
// distribution. Each returns a single section or null.
// ====================================================================

import type { LovelaceSectionConfig } from '../types/lovelace';
import type { WeatherSensorConfig } from '../types/strategy';
import { localize } from '../utils/localize';

/**
 * Build an inline markdown row of icon+value pairs from a weather_sensors
 * config array. Returns null if no sensors are configured.
 *
 * Each entry renders as `<ha-icon icon="..."></ha-icon> <value> <unit>`,
 * separated by non-breaking spaces. Uses text_only so the markdown blends
 * into the section without extra card chrome.
 */
function buildWeatherSensorRow(sensors: WeatherSensorConfig[]): any | null {
  if (!sensors || sensors.length === 0) return null;

  const parts = sensors.map((s) => {
    const icon = s.icon || 'mdi:gauge';
    const valueExpr =
      s.round !== undefined
        ? `{{ states("${s.entity}") | float | round(${s.round}) }}`
        : `{{ states("${s.entity}") }}`;
    const unit = s.unit ? ` ${s.unit}` : '';
    return `<ha-icon icon="${icon}"></ha-icon> ${valueExpr}${unit}`;
  });

  return {
    type: 'markdown',
    text_only: true,
    content: parts.join(' &nbsp;&nbsp;&nbsp; '),
  };
}

/**
 * Creates the weather forecast section.
 * Returns null if weather is disabled or no entity available.
 *
 * When `showForecastCard` is false, the built-in weather-forecast card is
 * omitted but the section (with heading) is still returned so custom_cards
 * targeted at `weather` can still be appended.
 */
export function createWeatherSection(
  weatherEntity: string | null,
  showWeather: boolean,
  showForecastCard: boolean = true,
  weatherSensors: WeatherSensorConfig[] = []
): LovelaceSectionConfig | null {
  if (!weatherEntity || !showWeather) return null;

  const cards: any[] = [
    {
      type: 'heading',
      heading: localize('sections.weather'),
      heading_style: 'title',
      icon: 'mdi:weather-partly-cloudy',
    },
  ];

  const sensorRow = buildWeatherSensorRow(weatherSensors);
  if (sensorRow) cards.push(sensorRow);

  if (showForecastCard) {
    cards.push({
      type: 'weather-forecast',
      entity: weatherEntity,
      forecast_type: 'daily',
    });
  }

  return { type: 'grid', cards };
}

/**
 * Creates the energy distribution section.
 * Returns null if energy is disabled.
 *
 * When `showDistributionCard` is false, the built-in energy-distribution card
 * is omitted but the section (with heading) is still returned so custom_cards
 * targeted at `energy` can still be appended.
 */
export function createEnergySection(
  showEnergy: boolean,
  linkDashboard: boolean = true,
  showDistributionCard: boolean = true
): LovelaceSectionConfig | null {
  if (!showEnergy) return null;

  const cards: any[] = [
    {
      type: 'heading',
      heading: localize('sections.energy'),
      heading_style: 'title',
      icon: 'mdi:lightning-bolt',
    },
  ];

  if (showDistributionCard) {
    cards.push({
      type: 'energy-distribution',
      link_dashboard: linkDashboard,
    });
  }

  return { type: 'grid', cards };
}
