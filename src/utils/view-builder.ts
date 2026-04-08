// ====================================================================
// View Builder - Creates View Definitions
// ====================================================================

import type { LovelaceViewConfig, LovelaceBadgeConfig, LovelaceSectionConfig } from '../types/lovelace';

/**
 * Creates the main overview view.
 *
 * - Badges and header are only included when personBadges has entries.
 * - Type "sections" with max 3 columns.
 */
export function createOverviewView(
  sections: LovelaceSectionConfig[],
  personBadges: LovelaceBadgeConfig[]
): LovelaceViewConfig {
  return {
    title: 'Übersicht',
    path: 'home',
    icon: 'mdi:home',
    type: 'sections',
    max_columns: 3,
    badges: personBadges.length > 0 ? personBadges : undefined,
    header:
      personBadges.length > 0
        ? {
            layout: 'center',
            badges_position: 'bottom',
            badges_wrap: 'wrap',
          }
        : undefined,
    sections,
  };
}
