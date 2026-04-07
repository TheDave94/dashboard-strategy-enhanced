// ====================================================================
// View Builder - Creates View Definitions
// ====================================================================
// Ported from dist/utils/simon42-view-builder.js with full TypeScript types.
// Generates LovelaceViewConfig objects for the overview, utility views
// (lights, covers, security, batteries), and per-area room views.
// ====================================================================

import type {
  AreaRegistryEntry,
} from '../types/registries';
import type { Simon42StrategyConfig } from '../types/strategy';
import type {
  LovelaceViewConfig,
  LovelaceBadgeConfig,
  LovelaceSectionConfig,
} from '../types/lovelace';

/**
 * Creates the main overview view.
 *
 * - Badges and header are only included when personBadges has entries.
 * - Type "sections" with max 3 columns.
 */
export function createOverviewView(
  sections: LovelaceSectionConfig[],
  personBadges: LovelaceBadgeConfig[],
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

/**
 * Creates the utility views (Lichter, Covers, Security, Batterien).
 *
 * Each view delegates to a custom view strategy and passes through the
 * full entity registry plus dashboard config for filtering.
 * When showSummaryViews is false the views are marked as subviews
 * (hidden from the navigation bar).
 */
export function createUtilityViews(
  showSummaryViews: boolean = false,
  config: Simon42StrategyConfig = {},
): LovelaceViewConfig[] {
  return [
    {
      title: 'Lichter',
      path: 'lights',
      icon: 'mdi:lamps',
      subview: !showSummaryViews,
      strategy: { type: 'custom:simon42-view-lights', config },
    },
    {
      title: 'Rollos & Vorhänge',
      path: 'covers',
      icon: 'mdi:blinds-horizontal',
      subview: !showSummaryViews,
      strategy: {
        type: 'custom:simon42-view-covers',
        device_classes: ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'],
        config,
      },
    },
    {
      title: 'Sicherheit',
      path: 'security',
      icon: 'mdi:security',
      subview: !showSummaryViews,
      strategy: { type: 'custom:simon42-view-security', config },
    },
    {
      title: 'Batterien',
      path: 'batteries',
      icon: 'mdi:battery-alert',
      subview: !showSummaryViews,
      strategy: { type: 'custom:simon42-view-batteries', config },
    },
  ];
}

/**
 * Creates one view per visible area.
 *
 * Each view delegates to the custom room view strategy and receives
 * the area, device/entity registries, per-area group options, and
 * the full dashboard config (needed for room pins).
 * When showRoomViews is false the views are marked as subviews.
 */
export function createAreaViews(
  visibleAreas: AreaRegistryEntry[],
  showRoomViews: boolean = false,
  areasOptions: Record<string, { groups_options?: Record<string, any> }> = {},
  dashboardConfig: Simon42StrategyConfig = {},
): LovelaceViewConfig[] {
  return visibleAreas.map((area) => {
    const areaOptions = areasOptions[area.area_id] || {};

    return {
      title: area.name,
      path: area.area_id,
      icon: area.icon || 'mdi:floor-plan',
      subview: !showRoomViews,
      strategy: {
        type: 'custom:simon42-view-room',
        area,
        groups_options: areaOptions.groups_options || {},
        dashboardConfig,
      },
    };
  });
}
