// ====================================================================
// Overview Section Builder
// ====================================================================
// Ported from dist/utils/simon42-section-builder.js (createOverviewSection)
// with full TypeScript types.
// Creates the "Übersicht" section with clock, alarm, search, summaries,
// and favorites.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, CustomCard } from '../types/strategy';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { localize } from '../utils/localize';

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
export function createOverviewSection(data: OverviewSectionParams): LovelaceSectionConfig | null {
  const { showSearchCard, config, hass } = data;
  const showClockCard = config.show_clock_card !== false;
  const hidden = new Set(config.hidden_section_headings || []);

  // Check if alarm entity is configured
  const alarmEntity = config.alarm_entity;

  const cards: LovelaceCardConfig[] = [];

  // Only show "Übersicht" heading if clock or alarm is visible
  if ((showClockCard || alarmEntity) && !hidden.has('overview')) {
    cards.push({
      type: 'heading',
      heading: localize('sections.overview'),
      heading_style: 'title',
      icon: 'mdi:overscan',
    });
  }

  if (showClockCard) {
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
  } else if (alarmEntity) {
    // No clock, but alarm panel full width
    cards.push({
      type: 'tile',
      entity: alarmEntity,
      vertical: false,
      grid_options: {
        columns: 'full',
      },
    });
  }

  // Add search card if enabled. Two variants: the HACS-installed
  // custom:search-card (default, inline input) or a native markdown hint
  // pointing at HA's built-in global search (no external dependency).
  if (showSearchCard) {
    const variant = config.search_card_variant === 'tip' ? 'tip' : 'custom';
    if (variant === 'tip') {
      cards.push({
        type: 'markdown',
        content:
          '### 🔍 ' + localize('editor.search_card_tip_title') + '\n\n' +
          localize('editor.search_card_tip_body'),
        grid_options: { columns: 'full' },
      });
    } else {
      cards.push({
        type: 'custom:search-card',
        grid_options: { columns: 'full' },
      });
    }
  }

  // Summaries columns (default: 2)
  const summariesColumns = config.summaries_columns || 2;
  const showCoversSummary = config.show_covers_summary !== false;
  const showLightSummary = config.show_light_summary !== false;
  const showSecuritySummary = config.show_security_summary !== false;
  const showBatterySummary = config.show_battery_summary !== false;
  const showClimateSummary = config.show_climate_summary === true;

  // Build summary cards based on config
  const summaryCards: LovelaceCardConfig[] = [];
  // 'comfortable' default keeps the original layout; 'compact' switches each
  // summary tile to a horizontal single-row layout (~½ the vertical space).
  const density = config.summary_card_density === 'compact' ? 'compact' : 'comfortable';

  if (showLightSummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'lights',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showCoversSummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'covers',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showSecuritySummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'security',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showBatterySummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'batteries',
      areas_options: config.areas_options || {},
      hide_mobile_app_batteries: config.hide_mobile_app_batteries,
      hide_battery_notes_entities: config.hide_battery_notes_entities,
      battery_critical_threshold: config.battery_critical_threshold,
      density,
    });
  }

  if (showClimateSummary) {
    summaryCards.push({
      type: 'custom:simon42-summary-card',
      summary_type: 'climate',
      areas_options: config.areas_options || {},
      density,
    });
  }

  // Only show summaries heading and cards if at least one is enabled
  if (summaryCards.length > 0) {
    if (!hidden.has('summaries')) {
      cards.push({
        type: 'heading',
        heading: localize('sections.summaries'),
      });
    }

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
  }

  // Light favorites — quick toggle row using HA's native glance card
  const lightFavs = (config.light_favorite_entities || []).filter(
    (id) => id.startsWith('light.') && Reflect.get(hass.states as Record<string, unknown>, id) !== undefined
  );
  if (lightFavs.length > 0) {
    cards.push({
      type: 'heading',
      heading: localize('sections.light_favorites'),
      icon: 'mdi:lightbulb-group',
    });
    cards.push({
      type: 'glance',
      show_name: true,
      show_icon: true,
      show_state: false,
      columns: Math.min(lightFavs.length, 5),
      entities: lightFavs.map((entityId) => ({
        entity: entityId,
        tap_action: { action: 'toggle' },
        hold_action: { action: 'more-info' },
      })),
      grid_options: { columns: 'full' },
    });
  }

  // Favorites section
  const favoriteEntities = (config.favorite_entities || []).filter((entityId) => hass.states[entityId] !== undefined);

  if (favoriteEntities.length > 0) {
    if (!hidden.has('favorites')) {
      cards.push({
        type: 'heading',
        heading: localize('sections.favorites'),
      });
    }

    const showState = config.favorites_show_state === true;
    const hideLastChanged = config.favorites_hide_last_changed === true;
    const stateContent: string[] = [];
    if (showState) stateContent.push('state');
    if (!hideLastChanged) stateContent.push('last_changed');

    for (const entityId of favoriteEntities) {
      cards.push({
        type: 'tile',
        entity: entityId,
        show_entity_picture: true,
        vertical: false,
        ...(stateContent.length > 0 ? { state_content: stateContent } : {}),
      });
    }
  }

  // If nothing is visible, skip the entire section
  if (cards.length === 0) {
    return null;
  }

  return {
    type: 'grid',
    cards,
  };
}

/**
 * Creates a section for user-defined custom cards (from YAML config).
 * Returns null if no valid custom cards are configured.
 */
export function createCustomCardsSection(
  customCards: CustomCard[],
  heading?: string,
  icon?: string,
  hideHeading?: boolean
): LovelaceSectionConfig | null {
  const validCards = customCards.filter((c) => c.parsed_config);
  if (validCards.length === 0) return null;

  const cards: LovelaceCardConfig[] = hideHeading
    ? []
    : [{ type: 'heading', heading: heading || localize('sections.custom_cards'), icon: icon || 'mdi:cards' }];

  for (const card of validCards) {
    if (Array.isArray(card.parsed_config)) {
      cards.push(...card.parsed_config);
    } else {
      if (card.title) {
        cards.push(buildTitleHeading(card.title, card.parsed_config));
      }
      cards.push(card.parsed_config as LovelaceCardConfig);
    }
  }

  return { type: 'grid', cards };
}

/**
 * Build a `heading` card for a custom_cards entry's title. If the user's
 * card is a `conditional` card (or carries its own `visibility:` block),
 * the same conditions are mirrored onto the heading so the heading
 * hides/shows together with the user's card — otherwise a hidden
 * conditional leaves an orphaned title visible (issue #224).
 */
function buildTitleHeading(title: string, parsedConfig: unknown): LovelaceCardConfig {
  const heading: LovelaceCardConfig = { type: 'heading', heading: title };
  const inherited = inheritVisibilityFromCard(parsedConfig);
  if (inherited) (heading as { visibility?: unknown }).visibility = inherited;
  return heading;
}

/**
 * Returns the condition list a custom card uses to gate its own visibility:
 *   - `conditional` cards: their `conditions:` array
 *   - any card with an explicit `visibility:` array
 * Otherwise undefined (no gating to mirror).
 */
function inheritVisibilityFromCard(parsedConfig: unknown): unknown[] | undefined {
  if (!parsedConfig || typeof parsedConfig !== 'object') return undefined;
  const pc = parsedConfig as { type?: string; conditions?: unknown; visibility?: unknown };
  if (pc.type === 'conditional' && Array.isArray(pc.conditions)) return pc.conditions;
  if (Array.isArray(pc.visibility)) return pc.visibility;
  return undefined;
}
