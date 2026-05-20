// ====================================================================
// Presence Zones Section Builder
// ====================================================================
// Renders the curated `presence_zones` list as one
// `simon42-zone-presence-card` in its own section on the overview.
// Auto-hides when the list is empty / unset. The list is forwarded to
// the card as-is, so all per-entry overrides (name, icon, color,
// tap_action, …) accepted by the card work here too.
// ====================================================================

import type { LovelaceSectionConfig, LovelaceCardConfig } from '../types/lovelace';
import type { PresenceZoneEntry } from '../types/strategy';

export function createPresenceZonesSection(
  entries: Array<string | PresenceZoneEntry> | undefined,
  name?: string,
  icon?: string,
): LovelaceSectionConfig | null {
  if (!entries || entries.length === 0) return null;

  // Drop any entries that aren't a non-empty string or an object with a
  // string `entity` field — the card itself does the same defensive
  // check, but doing it here keeps the section auto-hide accurate.
  const cleaned = entries.filter((e) => {
    if (typeof e === 'string') return e.length > 0;
    return typeof (e as PresenceZoneEntry).entity === 'string';
  });
  if (cleaned.length === 0) return null;

  const card: LovelaceCardConfig = {
    type: 'custom:simon42-zone-presence-card',
    entities: cleaned,
    ...(name !== undefined ? { name } : {}),
    ...(icon !== undefined ? { icon } : {}),
  };

  return {
    type: 'grid',
    cards: [card],
  };
}
