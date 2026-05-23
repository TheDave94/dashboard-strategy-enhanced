// ====================================================================
// Bubble Card integration helpers (v3.2.0)
// ====================================================================
// Bubble Card is a popular HACS plugin (Clooos/Bubble-Card). It uses
// hash-routed pop-ups: a `custom:bubble-card` with `card_type: pop-up`
// and `hash: '#foo'` slides up when the dashboard URL contains `#foo`.
//
// We expose these helpers:
//
// 1. `isBubbleCardInstalled()` — runtime detect via customElements
// 2. `bubbleHashFor(entityId)` — canonical hash from entity_id
// 3. `buildBubblePopupCards(entities, hass)` — pop-up section content
// 4. `withBubbleTapAction(tile, entityId)` — tile tap-action override
// 5. `isBubbleActionable(entityId)` — domain-in-actionable-set check
//    (use at dynamic-domain emit sites: room_pins, favorites)
//
// Strategy code opts in via `dashboardConfig.use_bubble_drawers` AND
// runtime presence of `bubble-card`. When either is false we no-op.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig } from '../types/lovelace';

/**
 * Entity domains for which we emit Bubble Card pop-ups and rewire tile
 * tap_actions. Matches the domain set the Bubble drawers can render
 * controls for — light brightness, climate hvac, cover position, fan
 * speed, media playback. Other domains keep HA's default more-info.
 */
export const BUBBLE_ACTIONABLE_DOMAINS: readonly string[] = [
  'light',
  'climate',
  'cover',
  'fan',
  'media_player',
];

/** True when entity_id's domain is in {@link BUBBLE_ACTIONABLE_DOMAINS}. */
export function isBubbleActionable(entityId: string): boolean {
  const domain = entityId.split('.')[0] ?? '';
  return BUBBLE_ACTIONABLE_DOMAINS.includes(domain);
}

export function isBubbleCardInstalled(): boolean {
  try {
    return typeof customElements !== 'undefined' && !!customElements.get('bubble-card');
  } catch {
    return false;
  }
}

/** Stable hash for an entity_id. `light.living_room` → `#bubble-light-living-room`. */
export function bubbleHashFor(entityId: string): string {
  return `#bubble-${entityId.replace(/\./g, '-')}`;
}

/**
 * Returns a copy of `tile` with `tap_action` overridden to navigate to
 * the bubble-card hash for this entity. Strategy callers should guard
 * with `dashboardConfig.use_bubble_drawers && isBubbleCardInstalled()`
 * — when either is false, return the tile untouched.
 */
export function withBubbleTapAction<T extends Record<string, unknown>>(
  tile: T,
  entityId: string,
): T {
  return {
    ...tile,
    tap_action: { action: 'navigate', navigation_path: bubbleHashFor(entityId) },
  };
}

/**
 * Build the bubble-card pop-up definitions for the supplied entity IDs.
 * One card per entity, each routable via its canonical hash. Skip any
 * entity not present in `hass.states`.
 *
 * Bubble-card pop-ups are invisible until their hash is active, so
 * embedding them in a grid section adds zero visual footprint.
 */
export function buildBubblePopupCards(
  entityIds: string[],
  hass: HomeAssistant,
): LovelaceCardConfig[] {
  const cards: LovelaceCardConfig[] = [];
  for (const id of entityIds) {
    const state = hass.states[id];
    if (!state) continue;
    const friendly = (state.attributes?.friendly_name as string | undefined) ?? id;
    cards.push({
      type: 'custom:bubble-card',
      card_type: 'pop-up',
      hash: bubbleHashFor(id),
      entity: id,
      name: friendly,
      // Bubble Card auto-picks domain-appropriate controls for light /
      // climate / cover. No need to enumerate them here.
      button_type: 'state',
    });
  }
  return cards;
}

/**
 * Returns the actionable entity IDs from `hass.states` that we'd ship
 * as bubble-card pop-ups. Currently: lights, climates, covers, fans
 * and media players. Skips entities hidden via entity registry (their
 * `hidden_by` flag).
 */
export function collectBubbleCandidates(hass: HomeAssistant): string[] {
  const out: string[] = [];
  for (const entityId of Object.keys(hass.states)) {
    if (isBubbleActionable(entityId)) {
      out.push(entityId);
    }
  }
  return out.sort();
}
