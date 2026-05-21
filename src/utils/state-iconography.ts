// ====================================================================
// State-iconography registry (v3.3.1)
// ====================================================================
// Maps `(domain, device_class, state)` → MDI icon. HA core ships
// state-aware icons for many entities, but the coverage is patchy and
// users frequently override them. This module centralises a curated
// table that the strategy auto-applies at tile emission time.
//
// Returns `undefined` when no mapping is known — callers fall back to
// HA's default icon resolution (which usually does the right thing).
// ====================================================================

import type { HassEntity, HomeAssistant } from '../types/homeassistant';

type IconMap = Record<string, string>;

/**
 * Per-state icon overrides keyed by `${domain}.${device_class}`.
 * `_` is a fallback device_class used when the entity has no
 * device_class attribute set.
 *
 * Keep this list short: only entries where HA's default is
 * ambiguous or misses a useful state-distinct glyph.
 */
const STATE_ICONS: Record<string, IconMap> = {
  // Covers — HA uses one icon per device_class, this gives state-distinct glyphs.
  'cover.garage': { open: 'mdi:garage-open', closed: 'mdi:garage', opening: 'mdi:garage-alert', closing: 'mdi:garage-alert' },
  'cover.gate': { open: 'mdi:gate-open', closed: 'mdi:gate', opening: 'mdi:gate-arrow-right', closing: 'mdi:gate-arrow-right' },
  'cover.door': { open: 'mdi:door-open', closed: 'mdi:door-closed' },
  'cover.window': { open: 'mdi:window-open', closed: 'mdi:window-closed' },
  'cover.blind': { open: 'mdi:blinds-open', closed: 'mdi:blinds' },
  'cover.shade': { open: 'mdi:roller-shade', closed: 'mdi:roller-shade-closed' },
  'cover.curtain': { open: 'mdi:curtains', closed: 'mdi:curtains-closed' },
  'cover.shutter': { open: 'mdi:window-shutter-open', closed: 'mdi:window-shutter' },
  'cover.awning': { open: 'mdi:window-open-variant', closed: 'mdi:window-closed-variant' },

  // Binary contacts
  'binary_sensor.door': { on: 'mdi:door-open', off: 'mdi:door-closed' },
  'binary_sensor.window': { on: 'mdi:window-open', off: 'mdi:window-closed' },
  'binary_sensor.garage_door': { on: 'mdi:garage-open', off: 'mdi:garage' },
  'binary_sensor.opening': { on: 'mdi:door-open', off: 'mdi:door-closed' },
  'binary_sensor.lock': { on: 'mdi:lock-open-variant', off: 'mdi:lock' },

  // Locks
  'lock._': { locked: 'mdi:lock', unlocked: 'mdi:lock-open-variant', jammed: 'mdi:lock-alert' },
  'lock.lock': { locked: 'mdi:lock', unlocked: 'mdi:lock-open-variant', jammed: 'mdi:lock-alert' },
};

/**
 * Look up the icon for the entity's current state, or undefined when
 * no override applies (caller falls back to HA defaults).
 */
export function pickIconForState(entity: HassEntity | undefined): string | undefined {
  if (!entity) return undefined;
  const entityId = entity.entity_id;
  const domain = entityId.split('.')[0] ?? '';
  const deviceClass = (entity.attributes?.device_class as string | undefined) ?? '_';
  const state = entity.state;
  const map = STATE_ICONS[`${domain}.${deviceClass}`] ?? STATE_ICONS[`${domain}._`];
  if (!map) return undefined;
  return map[state] ?? undefined;
}

/**
 * Convenience: look up an icon by entity_id, reading the current
 * state from `hass.states`. Returns undefined when the entity is
 * missing or has no mapped icon.
 */
export function pickIconForEntityId(
  hass: HomeAssistant,
  entityId: string,
): string | undefined {
  return pickIconForState(hass.states[entityId]);
}

/**
 * Apply state-iconography to a tile config — if a state-aware icon
 * exists for the entity, set it. If the tile already has an `icon`
 * key, leave it alone (user override wins).
 */
export function applyStateIcon<T extends Record<string, unknown>>(
  tile: T,
  hass: HomeAssistant,
  entityId: string,
): T {
  if ('icon' in tile && tile.icon !== undefined) return tile;
  const icon = pickIconForEntityId(hass, entityId);
  if (!icon) return tile;
  return { ...tile, icon };
}
