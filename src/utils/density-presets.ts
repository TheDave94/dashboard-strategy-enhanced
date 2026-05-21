// ====================================================================
// Density presets — grid sizing applied at the view level
// ====================================================================
// Distinct from `dashboard_density` (the per-card token override).
// This module controls how many columns the sections-view targets
// and the column-min-width / column-gap CSS variables that HA's
// sections-view consumes.
//
// Three presets:
//   - compact     — 4 columns, 200px min, 8px gap. Phone-friendly.
//   - cozy        — 3 columns, 280px min, 16px gap. Tablet-friendly.
//   - comfortable — HA's defaults. Default behaviour.
// ====================================================================

import type { Simon42StrategyConfig } from '../types/strategy';

export type DensityPreset = 'compact' | 'cozy' | 'comfortable';

export interface DensityPresetSpec {
  /** `max_columns` value HA's sections-view reads. undefined = HA default. */
  max_columns?: number;
  /** Inline-style CSS to apply to the view root. Sets HA's view-level
   *  custom properties. Empty string for the comfortable default. */
  inline_style: string;
}

export const DENSITY_PRESETS: Record<DensityPreset, DensityPresetSpec> = {
  compact: {
    max_columns: 4,
    inline_style:
      '--ha-view-sections-column-min-width: 200px;' +
      '--ha-view-sections-column-gap: 8px;' +
      '--ha-view-sections-row-gap: 8px;',
  },
  cozy: {
    max_columns: 3,
    inline_style:
      '--ha-view-sections-column-min-width: 280px;' +
      '--ha-view-sections-column-gap: 16px;' +
      '--ha-view-sections-row-gap: 16px;',
  },
  comfortable: {
    // No overrides — let HA apply its native defaults.
    max_columns: undefined,
    inline_style: '',
  },
};

/**
 * Read the configured density preset from strategy config. Returns
 * `comfortable` (HA defaults) when unset or invalid.
 */
export function resolveDensityPreset(
  config: Simon42StrategyConfig | undefined,
): DensityPreset {
  const v = config?.density;
  return v === 'compact' || v === 'cozy' || v === 'comfortable' ? v : 'comfortable';
}

/**
 * Get the spec block for the configured preset.
 */
export function getDensityPresetSpec(
  config: Simon42StrategyConfig | undefined,
): DensityPresetSpec {
  return DENSITY_PRESETS[resolveDensityPreset(config)];
}
