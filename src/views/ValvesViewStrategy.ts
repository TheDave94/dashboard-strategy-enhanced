// ====================================================================
// VIEW STRATEGY — VALVES (Valve Overview)
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';

type GenerateConfig = { config?: Record<string, unknown> };

function isGenerateConfig(value: unknown): value is GenerateConfig {
  return typeof value === 'object' && value !== null;
}

function getStateByEntityId(hass: HomeAssistant, entityId: string): HassEntity | undefined {
  if (!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(entityId)) return undefined;
  const state = Reflect.get(hass.states, entityId);
  if (!state || typeof state !== 'object') return undefined;
  return state as HassEntity;
}

function buildSection(
  entities: string[],
  heading: string,
  icon: string,
  action: 'valve.open_valve' | 'valve.close_valve',
  actionIcon: string,
  actionLabel: string
): LovelaceSectionConfig | null {
  if (entities.length === 0) return null;

  return {
    type: 'grid',
    cards: [
      {
        type: 'heading',
        heading: `${heading} (${entities.length})`,
        heading_style: 'title',
        icon,
        badges: [
          {
            type: 'button',
            icon: actionIcon,
            text: actionLabel,
            tap_action: {
              action: 'perform-action',
              perform_action: action,
              target: { entity_id: entities },
            },
          },
        ],
      },
      ...entities.map((entityId) => ({
        type: 'tile',
        entity: entityId,
        vertical: false,
        features: [{ type: 'valve-open-close' }],
        features_position: 'inline',
        state_content: 'last_changed',
      })),
    ],
  };
}

class Simon42ViewValvesStrategy extends HTMLElement {
  static async generate(config: unknown, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    const dashboardConfig = isGenerateConfig(config) ? (config.config ?? {}) : {};
    Registry.initialize(hass, dashboardConfig);

    const valveIds = Registry.getVisibleEntityIdsForDomain('valve').filter(
      (entityId) => getStateByEntityId(hass, entityId) !== undefined
    );

    const open: string[] = [];
    const closed: string[] = [];

    for (const id of valveIds) {
      const state = getStateByEntityId(hass, id)?.state;
      if (state === 'open' || state === 'opening') {
        open.push(id);
      } else {
        closed.push(id);
      }
    }

    const sections: LovelaceSectionConfig[] = [];

    const openSection = buildSection(
      open,
      localize('valves.open'),
      'mdi:valve-open',
      'valve.close_valve',
      'mdi:arrow-down',
      localize('valves.close_all')
    );
    if (openSection) sections.push(openSection);

    const closedSection = buildSection(
      closed,
      localize('valves.closed'),
      'mdi:valve-closed',
      'valve.open_valve',
      'mdi:arrow-up',
      localize('valves.open_all')
    );
    if (closedSection) sections.push(closedSection);

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-valves', Simon42ViewValvesStrategy);
