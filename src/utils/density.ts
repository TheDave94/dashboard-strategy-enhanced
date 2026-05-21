// ====================================================================
// Strategy density resolver
// ====================================================================
// Single source of truth for "should this emitted card get
// `density: 'compact'` set in its YAML config". Was previously
// duplicated at five emission sites with subtle drift — extracted
// here so the rule is described exactly once.
//
// Rules:
//   - If the strategy config has `dashboard_density: 'compact'` →
//     forward compact to every emitted custom card.
//   - If `dashboard_density: 'comfortable'` → forward comfortable.
//   - Otherwise → return undefined (omit the prop, let the card's
//     container queries handle scaling dynamically).
//
// HA built-in cards (`tile`, `area`, `weather-forecast`) are NOT
// passed the density prop — they ignore unknown config keys and
// would surface a schema warning in the visual editor.
// ====================================================================

import type { DashboardEnhancedStrategyConfig } from '../types/strategy';

export type DensityValue = 'compact' | 'comfortable';

/**
 * Resolve which density to attach to a strategy-emitted custom card.
 * Returns `undefined` to mean "don't set density at all", letting the
 * card's CSS container queries pick the right size automatically.
 */
export function resolveDensity(
  config: DashboardEnhancedStrategyConfig | undefined,
): DensityValue | undefined {
  const v = config?.dashboard_density;
  if (v === 'compact' || v === 'comfortable') return v;
  return undefined;
}

/**
 * Convenience: returns a partial card config (`{}` or `{ density }`)
 * suitable for spreading into a `LovelaceCardConfig`. Keeps emission
 * sites clean:
 *
 *     return {
 *       type: 'custom:dashboard-enhanced-zone-presence-card',
 *       entities,
 *       ...densityProp(config),
 *     };
 */
export function densityProp(
  config: DashboardEnhancedStrategyConfig | undefined,
): { density?: DensityValue } {
  const v = resolveDensity(config);
  return v ? { density: v } : {};
}
