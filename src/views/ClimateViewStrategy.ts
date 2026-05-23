// ====================================================================
// VIEW STRATEGY — CLIMATE (Climate/Thermostat Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { isBubbleCardInstalled, withBubbleTapAction } from '../utils/bubble-integration';

interface ClimateViewStrategyParams {
  config?: OrielConfig;
}

class OrielViewClimate extends HTMLElement {
  static async generate(
    config: ClimateViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    const dashboardConfig: OrielConfig = config.config || {};
    Registry.initialize(hass, dashboardConfig);

    const bubbleEnabled =
      dashboardConfig.use_bubble_drawers === true && isBubbleCardInstalled();

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
      if (!state) continue;
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
          ...entities.map((e) => {
            const tile = {
              type: 'tile',
              entity: e,
              vertical: false,
              features: [{ type: 'climate-hvac-modes' }],
              features_position: 'inline',
              state_content: ['hvac_action', 'current_temperature'],
            };
            return bubbleEnabled ? withBubbleTapAction(tile, e) : tile;
          }),
        ],
      });
    };

    buildSection(heating, localize('climate.heating'), 'mdi:fire');
    buildSection(cooling, localize('climate.cooling'), 'mdi:snowflake');
    buildSection(idle, localize('climate.idle'), 'mdi:thermostat');
    buildSection(off, localize('climate.off'), 'mdi:power-off');

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-view-oriel-climate', OrielViewClimate);
