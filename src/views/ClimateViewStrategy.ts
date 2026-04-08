// ====================================================================
// VIEW STRATEGY — CLIMATE (Climate/Thermostat Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';

class Simon42ViewClimateStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const climateIds = Registry.getVisibleEntityIdsForDomain('climate').filter(
      (id) => hass.states[id] !== undefined
    );

    // Group by hvac_action or state
    const heating: string[] = [];
    const cooling: string[] = [];
    const idle: string[] = [];
    const off: string[] = [];

    for (const id of climateIds) {
      const state = hass.states[id];
      const hvacAction = state.attributes?.hvac_action as string | undefined;
      const hvacState = state.state;

      if (hvacState === 'off' || hvacState === 'unavailable' || hvacState === 'unknown') {
        off.push(id);
      } else if (hvacAction === 'heating' || (!hvacAction && hvacState === 'heat')) {
        heating.push(id);
      } else if (hvacAction === 'cooling' || (!hvacAction && hvacState === 'cool')) {
        cooling.push(id);
      } else {
        // idle, drying, fan, auto without action, etc.
        idle.push(id);
      }
    }

    const sections: LovelaceSectionConfig[] = [];

    const buildSection = (
      entities: string[],
      heading: string,
      icon: string
    ): void => {
      if (entities.length === 0) return;
      sections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: `${heading} (${entities.length})`,
            heading_style: 'title',
            icon,
          },
          ...entities.map((e) => ({
            type: 'tile',
            entity: e,
            vertical: false,
            features: [{ type: 'climate-hvac-modes' }],
            features_position: 'inline',
            state_content: ['hvac_action', 'current_temperature'],
          })),
        ],
      });
    };

    buildSection(heating, 'Heizen', 'mdi:fire');
    buildSection(cooling, 'Kühlen', 'mdi:snowflake');
    buildSection(idle, 'Bereitschaft', 'mdi:thermostat');
    buildSection(off, 'Aus', 'mdi:power-off');

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-climate', Simon42ViewClimateStrategy);
