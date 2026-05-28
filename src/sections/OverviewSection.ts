// ====================================================================
// Overview Section Builder
// ====================================================================
// Ported from dist/utils/oriel-section-builder.js (createOverviewSection)
// with full TypeScript types.
// Creates the "Übersicht" section with clock, alarm, search, summaries,
// and favorites.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig, CustomCard, FavoriteEntityEntry, FavoriteEntityConfig } from '../types/strategy';
import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import { densityProp, resolveDensity } from '../utils/density';
import {
  isBubbleActionable,
  isBubbleCardInstalled,
  withBubbleTapAction,
} from '../utils/bubble-integration';

// --------------------------------------------------------------------
// Helpers to surface room-section cards inside the favorites grid.
// --------------------------------------------------------------------
// These mirror the resolution rules used in RoomViewStrategy so a card
// pinned to favorites looks and behaves identically to the one rendered
// at the top of the room view. We deliberately duplicate the rules
// here (rather than importing from RoomViewStrategy) — the room view
// is in a lazy-loaded chunk and pulling it into the overview chunk
// would balloon initial bundle size.

const ZONE_DEVICE_CLASSES = new Set(['occupancy', 'motion', 'presence']);

/**
 * Build the room-mode tile pinned into the favorites grid.
 *
 * Same shape as RoomViewStrategy's emit — select-options inline picker
 * plus the sticky-lock custom tile feature — but narrower
 * (columns:6) so a sibling pinned card sits beside it. The mode tile
 * tends to be the taller of the two when many input_select options
 * wrap the chip row; the favorites grid keeps row alignment via
 * rows:'auto'.
 *
 * Returns null when neither explicit areas_options config nor the
 * auto-detect heuristic resolves an entity.
 */
function buildRoomModeCard(
  areaId: string,
  config: OrielConfig,
  hass: HomeAssistant,
): LovelaceCardConfig | null {
  const areaOpts = (config.areas_options || {})[areaId] || {};
  let roomModeEntity = areaOpts.room_mode_entity;
  if (!roomModeEntity) {
    const candidates = Registry.getVisibleEntitiesForArea(areaId)
      .map((e) => e.entity_id)
      .filter((id) => {
        const objectId = id.split('.')[1];
        return id.startsWith('input_select.') && objectId !== undefined && /mode/i.test(objectId);
      });
    if (candidates.length === 1) roomModeEntity = candidates[0];
  }
  if (!roomModeEntity || !hass.states[roomModeEntity]) return null;

  const features: Array<Record<string, unknown>> = [{ type: 'select-options' }];
  const stickyEntity = areaOpts.room_mode_sticky_entity;
  if (stickyEntity && hass.states[stickyEntity]) {
    features.push({
      type: 'custom:oriel-sticky-lock-feature',
      sticky_entity: stickyEntity,
    });
  }

  return {
    type: 'tile',
    entity: roomModeEntity,
    name: localize('room.room_mode'),
    icon: config.room_mode_icon || 'mdi:home-account',
    color: 'accent',
    features,
    features_position: 'bottom',
    grid_options: { columns: 6, rows: 'auto' },
  };
}

/**
 * Build a zone-presence card for the given area.
 *
 * Entity source priority:
 *   1. Explicit `areas_options.<area>.pin_zone_presence_to_favorites_entities`
 *      — a curated subset of entity IDs (each forwarded verbatim to
 *      the card, so users can supply objects with name/icon/color
 *      overrides too). Useful when the area has many occupancy
 *      sensors but only a few are interesting at a glance.
 *   2. Auto-detect by device_class — same rule used by the room view
 *      (≥2 `binary_sensor.*` with device_class ∈
 *      {occupancy, motion, presence} tagged to the area).
 *
 * Returns null when neither path produces ≥1 entity. (The auto-detect
 * path still requires ≥2 — a single sensor reads fine as a regular
 * tile.)
 */
function buildZonePresenceCard(
  areaId: string,
  config: OrielConfig,
  hass: HomeAssistant,
): LovelaceCardConfig | null {
  const areaOpts = (config.areas_options || {})[areaId] || {};
  // Single source of truth — same field consulted by the Room view's
  // auto-render in RoomViewStrategy.
  const curated = areaOpts.presence_entities;

  let entities: unknown[];
  if (Array.isArray(curated) && curated.length > 0) {
    // Trust the user's list — the card itself defends against
    // malformed entries. Pass through verbatim so per-entry
    // overrides (name/icon/color) work.
    entities = curated.filter((e) => {
      if (typeof e === 'string') return e.length > 0;
      return typeof (e as { entity?: unknown }).entity === 'string';
    });
    if (entities.length === 0) return null;
  } else {
    const zoneEntities = Registry.getVisibleEntitiesForArea(areaId)
      .map((e) => e.entity_id)
      .filter((id) => {
        if (!id.startsWith('binary_sensor.')) return false;
        const s = hass.states[id];
        const dc = s?.attributes?.device_class as string | undefined;
        return dc !== undefined && ZONE_DEVICE_CLASSES.has(dc);
      });
    if (zoneEntities.length < 2) return null;
    entities = zoneEntities;
  }

  return {
    type: 'custom:oriel-zone-presence-card',
    entities,
    ...densityProp(config),
    grid_options: { columns: 6, rows: 'auto' },
  };
}

export interface OverviewSectionParams {
  someSensorId: string | null;
  showSearchCard: boolean;
  config: OrielConfig;
  hass: HomeAssistant;
  /** Custom cards targeting 'overview_top' — prepended above clock/search (#63). */
  topCards?: LovelaceCardConfig[];
  /** Custom cards targeting 'summaries' — inserted right after the summary tiles (#153). */
  summariesCards?: LovelaceCardConfig[];
}

/**
 * Creates the overview section with summaries, clock, optional alarm,
 * optional search card, and favorites.
 */
export function createOverviewSection(data: OverviewSectionParams): LovelaceSectionConfig | null {
  const { showSearchCard, config, hass, topCards, summariesCards } = data;
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
  // Density: container queries scale cards to their actual cell size
  // by default. `dashboard_density` is the manual override.
  const density = resolveDensity(config);

  if (showLightSummary) {
    summaryCards.push({
      type: 'custom:oriel-summary-card',
      summary_type: 'lights',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showCoversSummary) {
    summaryCards.push({
      type: 'custom:oriel-summary-card',
      summary_type: 'covers',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showSecuritySummary) {
    summaryCards.push({
      type: 'custom:oriel-summary-card',
      summary_type: 'security',
      areas_options: config.areas_options || {},
      density,
    });
  }

  if (showBatterySummary) {
    summaryCards.push({
      type: 'custom:oriel-summary-card',
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
      type: 'custom:oriel-summary-card',
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

  // Custom cards targeting 'summaries' — render right after the summary
  // tiles, before light-favorites/favorites (#153).
  if (summariesCards && summariesCards.length > 0) {
    cards.push(...summariesCards);
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

  // Favorites section — three sources feed cards in here, in this order:
  //   1. `favorite_entities[]`   — list of entity IDs rendered as tiles
  //   2. `areas_options.<area>.pin_room_mode_to_favorites` /
  //      `pin_zone_presence_to_favorites` — per-area flags that mirror the
  //      Room view's auto-rendered cards into the favorites grid.
  //   3. `favorites_cards[]`     — opaque LovelaceCardConfig list, the
  //      "anything goes" escape hatch.
  // The section auto-hides only when all three are empty.
  //
  // v3.5.5: `favorite_entities` now accepts a viewport-keyed map
  // ({ phone: [...], tablet: [...], wall: [...], default: [...] }).
  // The legacy string[] shape still works. Detection runs once at
  // generate() time using window.innerWidth.
  const rawFavorites = config.favorite_entities;
  let favoriteList: FavoriteEntityEntry[];
  if (Array.isArray(rawFavorites)) {
    favoriteList = rawFavorites;
  } else if (rawFavorites && typeof rawFavorites === 'object') {
    // Viewport-keyed map — pick the matching list at generate() time.
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vp = w < 640 ? 'phone' : w < 1280 ? 'tablet' : 'wall';
    const rec = rawFavorites as Record<string, FavoriteEntityEntry[]>;
    favoriteList = rec[vp] ?? rec.default ?? [];
  } else {
    favoriteList = [];
  }
  // Normalize bare ids → { entity }; drop entries whose entity doesn't exist.
  const favoriteEntities: FavoriteEntityConfig[] = favoriteList
    .map((e) => (typeof e === 'string' ? { entity: e } : e))
    .filter((e): e is FavoriteEntityConfig =>
      !!e && typeof e.entity === 'string' && hass.states[e.entity] !== undefined);

  const pinnedCards: LovelaceCardConfig[] = [];
  for (const [areaId, areaOpts] of Object.entries(config.areas_options || {})) {
    if (areaOpts.pin_room_mode_to_favorites === true) {
      const card = buildRoomModeCard(areaId, config, hass);
      if (card) pinnedCards.push(card);
    }
    if (areaOpts.pin_zone_presence_to_favorites === true) {
      const card = buildZonePresenceCard(areaId, config, hass);
      if (card) pinnedCards.push(card);
    }
  }

  const userFavoriteCards = (config.favorites_cards || []).filter(
    (c): c is LovelaceCardConfig => !!c && typeof (c as { type?: unknown }).type === 'string',
  );

  if (favoriteEntities.length + pinnedCards.length + userFavoriteCards.length > 0) {
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

    const bubbleEnabled =
      config.use_bubble_drawers === true && isBubbleCardInstalled();

    for (const fav of favoriteEntities) {
      const entityId = fav.entity;
      const tile: LovelaceCardConfig = {
        type: 'tile',
        entity: entityId,
        show_entity_picture: true,
        vertical: false,
        ...(stateContent.length > 0 ? { state_content: stateContent } : {}),
      };
      // State-gated favorites (simon42#131): raw `visibility` wins; otherwise
      // `show_when` becomes a self-state condition. HA evaluates `visibility`
      // reactively, so the tile shows/hides itself without any custom code.
      const visibility = fav.visibility
        ?? (fav.show_when !== undefined
          ? [{ condition: 'state', entity: entityId, state: fav.show_when }]
          : undefined);
      if (visibility) (tile as { visibility?: unknown }).visibility = visibility;
      cards.push(
        bubbleEnabled && isBubbleActionable(entityId)
          ? withBubbleTapAction(tile, entityId)
          : tile,
      );
    }
    cards.push(...pinnedCards);
    cards.push(...userFavoriteCards);
  }

  // Custom cards targeting 'overview_top' — prepend above everything else
  // (above the Übersicht heading / clock / search) (#63). Counted toward the
  // visibility check below so a top-cards-only overview still renders.
  if (topCards && topCards.length > 0) {
    cards.unshift(...topCards);
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
 * conditional leaves an orphaned title visible (original analysis:
 * upstream simon42#224).
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
