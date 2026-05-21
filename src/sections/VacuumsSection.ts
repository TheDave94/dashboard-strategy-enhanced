// ====================================================================
// Vacuums Section Builder
// ====================================================================
// Renders vacuum.* and lawn_mower.* entities as tiles. Auto-hides when
// none exist.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { findKnownCard, isCardInstalled } from '../utils/section-card-registry';

export function createVacuumsSection(
  hass: HomeAssistant,
  enabled: boolean,
  hideHeading: boolean = false,
  presentation?: string,
): LovelaceSectionConfig | null {
  if (!enabled) return null;

  const vacuumIds = Registry.getVisibleEntityIdsForDomain('vacuum').filter(
    (id) => hass.states[id] !== undefined
  );
  const mowerIds = Registry.getVisibleEntityIdsForDomain('lawn_mower').filter(
    (id) => hass.states[id] !== undefined
  );
  const entities = [...vacuumIds, ...mowerIds];
  if (entities.length === 0) return null;

  const cards: LovelaceCardConfig[] = [];
  if (!hideHeading) {
    cards.push({
      type: 'heading',
      heading_style: 'title',
      heading: localize('sections.vacuums'),
      icon: 'mdi:robot-vacuum',
    });
  }

  // Registry swap — emit one HACS card per vacuum entity. Graceful
  // fallback: keep the default tile layout when the plugin isn't
  // installed.
  const known = presentation ? findKnownCard(presentation) : null;
  if (known && known.section === 'vacuums') {
    if (isCardInstalled(known.elementTag)) {
      for (const entityId of entities) {
        cards.push(known.buildConfig(entityId) as LovelaceCardConfig);
      }
      return { type: 'grid', cards };
    }
    console.warn(
      `[oriel] vacuums_presentation="${presentation}" requires HACS plugin ` +
      `'${known.hacs?.name ?? known.elementTag}' which isn't installed. ` +
      `Falling back to default tile-per-vacuum layout.`,
    );
  }

  for (const entityId of entities) {
    cards.push({
      type: 'tile',
      entity: entityId,
      vertical: false,
      state_content: ['state', 'last_changed'],
    });
  }

  return { type: 'grid', cards };
}
