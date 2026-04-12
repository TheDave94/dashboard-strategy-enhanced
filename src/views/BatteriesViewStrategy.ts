// ====================================================================
// VIEW STRATEGY — BATTERIES (Battery Status Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { getBatteryEntities } from '../utils/entity-filter';

class Simon42ViewBatteriesStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const batteryEntities = getBatteryEntities(hass, config.config);

    // Group by status
    const strategyConfig = config.config || {};
    const criticalThreshold = strategyConfig.battery_critical_threshold ?? 20;
    const lowThreshold = strategyConfig.battery_low_threshold ?? 50;
    const critical: string[] = [];
    const low: string[] = [];
    const good: string[] = [];

    for (const entityId of batteryEntities) {
      const state = hass.states[entityId];
      if (entityId.startsWith('binary_sensor.')) {
        (state.state === 'on' ? critical : good).push(entityId);
        continue;
      }
      const value = parseFloat(state.state);
      const unit = state.attributes?.unit_of_measurement;
      // Only apply percentage thresholds to %-based sensors.
      // Voltage sensors (V, mV) have device-specific ranges and cannot be
      // meaningfully compared against percentage thresholds (e.g. 3V would
      // be "critical" at < 20 which is wrong). Skip them entirely.
      if (unit && unit !== '%') continue;
      if (isNaN(value)) critical.push(entityId);
      else if (value < criticalThreshold) critical.push(entityId);
      else if (value <= lowThreshold) low.push(entityId);
      else good.push(entityId);
    }

    // Sort each group by battery level (lowest first)
    const sortByLevel = (a: string, b: string): number => {
      const valA = parseFloat(hass.states[a]?.state);
      const valB = parseFloat(hass.states[b]?.state);
      if (isNaN(valA)) return -1;
      if (isNaN(valB)) return 1;
      return valA - valB;
    };
    critical.sort(sortByLevel);
    low.sort(sortByLevel);
    good.sort(sortByLevel);

    const sections: LovelaceSectionConfig[] = [];

    if (critical.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: `🔴 ${localize('batteries.critical')} (< ${criticalThreshold}%) - ${critical.length} ${critical.length === 1 ? localize('batteries.battery_one') : localize('batteries.battery_many')}`,
            heading_style: 'title',
          },
          ...critical.map((e) => ({
            type: 'tile',
            entity: e,
            vertical: false,
            state_content: ['state', 'last_changed'],
            color: 'red',
          })),
        ],
      });
    }

    if (low.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: `🟡 ${localize('batteries.low')} (${criticalThreshold}-${lowThreshold}%) - ${low.length} ${low.length === 1 ? localize('batteries.battery_one') : localize('batteries.battery_many')}`,
            heading_style: 'title',
          },
          ...low.map((e) => ({
            type: 'tile',
            entity: e,
            vertical: false,
            state_content: ['state', 'last_changed'],
            color: 'yellow',
          })),
        ],
      });
    }

    if (good.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: `🟢 ${localize('batteries.good')} (> ${lowThreshold}%) - ${good.length} ${good.length === 1 ? localize('batteries.battery_one') : localize('batteries.battery_many')}`,
            heading_style: 'title',
          },
          ...good.map((e) => ({
            type: 'tile',
            entity: e,
            vertical: false,
            state_content: ['state', 'last_changed'],
            color: 'green',
          })),
        ],
      });
    }

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-batteries', Simon42ViewBatteriesStrategy);
