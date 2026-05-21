// ====================================================================
// VIEW STRATEGY — LIGHTS (reactive group cards)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig } from '../types/lovelace';
import type { DashboardEnhancedStrategyConfig } from '../types/strategy';
import { resolveDensity } from '../utils/density';

interface LightsViewStrategyParams {
  entities?: string[];
  /** Legacy field — strategy entrypoint passes `dashboardConfig`. */
  config?: DashboardEnhancedStrategyConfig;
  dashboardConfig?: DashboardEnhancedStrategyConfig;
}

class DashboardEnhancedViewLightsStrategy extends HTMLElement {
  static async generate(
    config: LightsViewStrategyParams,
    _hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    const dashboardConfig: DashboardEnhancedStrategyConfig = config.dashboardConfig || config.config || {};
    const groupByFloors = dashboardConfig.group_lights_by_floors === true;
    const nestedGroups = dashboardConfig.nested_light_groups === true;
    const sortBy = dashboardConfig.lights_sort_by === 'name' ? 'name' : 'last_changed';
    // When the user enables nested light groups, default to expanded so
    // the members are visible without an extra click. Tapping the group
    // tile itself opens more-info (HA convention), so a chevron-only
    // expand wasn't discoverable. Matches RoomViewStrategy's behaviour
    // for its inline lights section. Users can override.
    const defaultExpanded = dashboardConfig.light_groups_default_expanded !== false;
    const density = resolveDensity(dashboardConfig);

    const card = (group_type: 'on' | 'off') => ({
      type: 'custom:dashboard-enhanced-lights-group-card',
      entities: config.entities,
      config: config.config,
      group_type,
      group_by_floors: groupByFloors,
      nested_groups: nestedGroups,
      default_expanded: defaultExpanded,
      sort_by: sortBy,
      ...(density ? { density } : {}),
    });

    return {
      type: 'sections',
      sections: [
        {
          type: 'grid',
          cards: [card('on'), card('off')],
        },
      ],
    };
  }
}

customElements.define('ll-strategy-view-dashboard-enhanced-view-lights', DashboardEnhancedViewLightsStrategy);
