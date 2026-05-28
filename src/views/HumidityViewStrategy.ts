// ====================================================================
// VIEW STRATEGY — HUMIDITY (Humidity Overview)
// ====================================================================
// Mirrors BatteriesViewStrategy: a bucketed %-sensor overview. Unlike
// batteries (lower = worse), humidity has a comfortable middle band —
// both extremes are notable, so out-of-range buckets (Humid / Dry) are
// surfaced before the Comfortable band.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { getHumidityEntities } from '../utils/entity-filter';

interface HumidityViewStrategyParams {
  config?: OrielConfig;
}

function createHumiditySection(
  entities: string[],
  status: 'dry' | 'comfortable' | 'humid',
  rangeText: string,
): LovelaceSectionConfig | null {
  if (entities.length === 0) return null;

  const emoji = status === 'dry' ? '🟠' : status === 'humid' ? '🔵' : '🟢';
  const color = status === 'dry' ? 'orange' : status === 'humid' ? 'blue' : 'green';

  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: `${emoji} ${localize('humidity.' + status)} (${rangeText}) - ${entities.length} ${
          localize(entities.length === 1 ? 'humidity.sensor_one' : 'humidity.sensor_many')
        }`,
        heading_style: 'title',
      },
      ...entities.map((e) => {
        const tile: { type: string; [key: string]: unknown } = {
          type: 'tile',
          entity: e,
          vertical: false,
          state_content: ['state'],
          color,
        };
        return tile;
      }),
    ],
  };
}

class OrielViewHumidity extends HTMLElement {
  static async generate(
    config: HumidityViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const strategyConfig = config.config || {};
    const humidityEntities = getHumidityEntities(hass);
    const lowThreshold = strategyConfig.humidity_low_threshold ?? 30;
    const highThreshold = strategyConfig.humidity_high_threshold ?? 60;

    const dry: string[] = [];
    const comfortable: string[] = [];
    const humid: string[] = [];

    for (const entityId of humidityEntities) {
      const state = hass.states[entityId];
      if (!state) continue;
      const value = parseFloat(state.state);
      // Skip unavailable / unknown / non-numeric — not actionable as a
      // humidity reading, and bucketing them would just add noise.
      if (isNaN(value)) continue;
      if (value < lowThreshold) dry.push(entityId);
      else if (value > highThreshold) humid.push(entityId);
      else comfortable.push(entityId);
    }

    // Sort each group by humidity level (lowest first).
    const sortByLevel = (a: string, b: string): number => {
      const valA = parseFloat(hass.states[a]?.state ?? '');
      const valB = parseFloat(hass.states[b]?.state ?? '');
      if (isNaN(valA)) return 1;
      if (isNaN(valB)) return -1;
      return valA - valB;
    };
    dry.sort(sortByLevel);
    comfortable.sort(sortByLevel);
    humid.sort(sortByLevel);

    const sections: LovelaceSectionConfig[] = [];

    // Out-of-range buckets first (actionable), Comfortable last.
    const humidSection = createHumiditySection(humid, 'humid', `> ${highThreshold}%`);
    if (humidSection) sections.push(humidSection);

    const drySection = createHumiditySection(dry, 'dry', `< ${lowThreshold}%`);
    if (drySection) sections.push(drySection);

    const comfortableSection = createHumiditySection(
      comfortable,
      'comfortable',
      `${lowThreshold}% - ${highThreshold}%`,
    );
    if (comfortableSection) sections.push(comfortableSection);

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-view-oriel-humidity', OrielViewHumidity);
