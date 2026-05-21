// ====================================================================
// Migration registry (v3.4.3)
// ====================================================================
// Per-version transformations applied at editor mount + offered as
// "one-tap apply" via a banner. Migrations are pure functions on the
// strategy config — they MUST be idempotent (running twice = running
// once) so the banner can re-show after rejected migration.
// ====================================================================

import type { DashboardEnhancedStrategyConfig } from '../types/strategy';

export interface Migration {
  /** Stable id; used to suppress already-applied migrations. */
  id: string;
  /** Display label shown in the banner. */
  label: string;
  /** Human-readable description of what changes. */
  description: string;
  /** Return true if the config has the deprecated shape. */
  detect: (config: DashboardEnhancedStrategyConfig) => boolean;
  /** Return a new config with the migration applied. */
  apply: (config: DashboardEnhancedStrategyConfig) => DashboardEnhancedStrategyConfig;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 'weather-presentation',
    label: 'Migrate weather forecast flag',
    description:
      'Replace the deprecated `show_weather_forecast_card` boolean with `weather_presentation`. ' +
      'Equivalent meaning, clearer name, matches the field surfaced in the editor.',
    detect: (config) => 'show_weather_forecast_card' in config,
    apply: (config) => {
      const out = { ...config } as DashboardEnhancedStrategyConfig & {
        show_weather_forecast_card?: boolean;
      };
      // Only set weather_presentation if not already explicit — explicit
      // user choice wins over the deprecated flag.
      if (out.weather_presentation === undefined) {
        out.weather_presentation =
          out.show_weather_forecast_card === false ? 'none' : 'forecast_daily';
      }
      delete out.show_weather_forecast_card;
      return out;
    },
  },
  {
    id: 'onboarding-default-collapsed',
    label: 'Mark onboarding wizard as seen',
    description:
      'You have an existing dashboard configuration — the Setup wizard auto-collapses on subsequent edits. ' +
      'This migration is one-tap apply: it sets `_onboarding_seen: true` so the wizard stays collapsed by default. ' +
      'You can always re-open it by clicking the header.',
    detect: (config) =>
      !('_onboarding_seen' in config) && Object.keys(config).length > 5,
    apply: (config) => ({ ...config, _onboarding_seen: true }),
  },
];

/** Return migrations whose `detect` matches the current config. */
export function detectMigrations(config: DashboardEnhancedStrategyConfig): Migration[] {
  return MIGRATIONS.filter((m) => m.detect(config));
}

/** Apply every detected migration in registry order. Returns new config. */
export function applyAllMigrations(config: DashboardEnhancedStrategyConfig): DashboardEnhancedStrategyConfig {
  let out = config;
  for (const m of MIGRATIONS) {
    if (m.detect(out)) out = m.apply(out);
  }
  return out;
}
