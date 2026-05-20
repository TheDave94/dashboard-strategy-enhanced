// ====================================================================
// VIEW STRATEGY — LIGHTS (reactive group cards)
// ====================================================================

import type { LovelaceViewConfig } from '../types/lovelace';

class Simon42ViewLightsStrategy extends HTMLElement {
  static async generate(config: any, _hass: any): Promise<LovelaceViewConfig> {
    const dashboardConfig = config.dashboardConfig || config.config || {};
    const groupByFloors = dashboardConfig.group_lights_by_floors === true;
    const nestedGroups = dashboardConfig.nested_light_groups === true;
    const sortBy = dashboardConfig.lights_sort_by === 'name' ? 'name' : 'last_changed';
    // When the user enables nested light groups, default to expanded so
    // the members are visible without an extra click. Tapping the group
    // tile itself opens more-info (HA convention), so a chevron-only
    // expand wasn't discoverable. Matches RoomViewStrategy's behaviour
    // for its inline lights section. Users can override.
    const defaultExpanded = dashboardConfig.light_groups_default_expanded !== false;

    return {
      type: 'sections',
      sections: [
        {
          type: 'grid',
          cards: [
            {
              type: 'custom:simon42-lights-group-card',
              entities: config.entities,
              config: config.config,
              group_type: 'on',
              group_by_floors: groupByFloors,
              nested_groups: nestedGroups,
              default_expanded: defaultExpanded,
              sort_by: sortBy,
            },
            {
              type: 'custom:simon42-lights-group-card',
              entities: config.entities,
              config: config.config,
              group_type: 'off',
              group_by_floors: groupByFloors,
              nested_groups: nestedGroups,
              default_expanded: defaultExpanded,
              sort_by: sortBy,
            },
          ],
        },
      ],
    };
  }
}

customElements.define('ll-strategy-simon42-view-lights', Simon42ViewLightsStrategy);
