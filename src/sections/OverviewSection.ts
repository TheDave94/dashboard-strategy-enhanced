// ====================================================================
// Overview Section Builder
// ====================================================================
// Ported from dist/utils/simon42-section-builder.js (createOverviewSection)
// with full TypeScript types.
// Creates the "Übersicht" section with clock, alarm, search, summaries,
// and favorites.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig } from '../types/strategy';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';

export interface OverviewSectionParams {
  someSensorId: string | null;
  showSearchCard: boolean;
  config: Simon42StrategyConfig;
  hass: HomeAssistant;
}

/**
 * Creates the overview section with summaries, clock, optional alarm,
 * optional search card, and favorites.
 */
export function createOverviewSection(data: OverviewSectionParams): LovelaceSectionConfig {
  const { showSearchCard, config, hass } = data;

  const cards: LovelaceCardConfig[] = [
    {
      type: 'heading',
      heading: 'Übersicht',
      heading_style: 'title',
      icon: 'mdi:overscan',
    },
  ];

  // Check if alarm entity is configured
  const alarmEntity = config.alarm_entity;

  if (alarmEntity) {
    // Clock and alarm panel side-by-side
    cards.push({
      type: 'clock',
      clock_size: 'small',
      show_seconds: false,
    });
    cards.push({
      type: 'tile',
      entity: alarmEntity,
      vertical: false,
    });
  } else {
    // Clock only, full width
    cards.push({
      type: 'clock',
      clock_size: 'small',
      show_seconds: false,
      grid_options: {
        columns: 'full',
      },
    });
  }

  // Add search card if enabled
  if (showSearchCard) {
    cards.push({
      type: 'custom:search-card',
      grid_options: {
        columns: 'full',
      },
    });
  }

  // Summaries columns (default: 2)
  const summariesColumns = config.summaries_columns || 2;
  const showCoversSummary = config.show_covers_summary !== false;

  // Add summaries heading
  cards.push({
    type: 'heading',
    heading: 'Zusammenfassungen',
  });

  // Build summary cards based on config
  const summaryCards: LovelaceCardConfig[] = [
    {
      type: 'custom:simon42-summary-card',
      summary_type: 'lights',
      areas_options: config.areas_options || {},
    },
  ];

  // Covers optional
  if (showCoversSummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'covers',
      areas_options: config.areas_options || {},
    });
  }

  summaryCards.push(
    {
      type: 'custom:simon42-summary-card',
      summary_type: 'security',
      areas_options: config.areas_options || {},
    },
    {
      type: 'custom:simon42-summary-card',
      summary_type: 'batteries',
      areas_options: config.areas_options || {},
      hide_mobile_app_batteries: config.hide_mobile_app_batteries,
    }
  );

  // Layout logic: adapt to number of cards
  if (summariesColumns === 4) {
    // 4 columns: all cards in a single row
    cards.push({
      type: 'horizontal-stack',
      cards: summaryCards,
    });
  } else {
    // 2 columns: split into rows of 2
    for (let i = 0; i < summaryCards.length; i += 2) {
      const rowCards = summaryCards.slice(i, i + 2);
      cards.push({
        type: 'horizontal-stack',
        cards: rowCards,
      });
    }
  }

  // Favorites section
  const favoriteEntities = (config.favorite_entities || []).filter((entityId) => hass.states[entityId] !== undefined);

  if (favoriteEntities.length > 0) {
    cards.push({
      type: 'heading',
      heading: 'Favoriten',
    });

    for (const entityId of favoriteEntities) {
      cards.push({
        type: 'tile',
        entity: entityId,
        show_entity_picture: true,
        vertical: false,
        state_content: 'last_changed',
      });
    }
  }

  return {
    type: 'grid',
    cards,
  };
}
