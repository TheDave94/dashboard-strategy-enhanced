// ====================================================================
// Weather & Energy Section Builders
// ====================================================================
// Independent section builders for weather forecast and energy
// distribution. Each returns a single section or null.
// ====================================================================

import type { LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import type { WeatherPresentation, WeatherSensorConfig } from '../types/strategy';
import { localize } from '../utils/localize';
import { findKnownCard, isCardInstalled } from '../utils/section-card-registry';

// Entity ids follow `domain.object_id` where each part is lowercase
// letters/digits/underscores. Anything else is a malformed config value
// that we silently drop to avoid breaking markdown templates downstream.
const ENTITY_ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;

// MDI / similar icon ids: `set:slug` with lowercase letters/digits/hyphens.
// Anything outside this set could break out of the HTML attribute below.
const ICON_RE = /^[a-z]+:[a-z0-9-]+$/;

/**
 * HTML-escape a string so it can be safely embedded in markdown content.
 * Markdown card with `text_only: true` strips card chrome but the renderer
 * still interprets inline HTML, so user-controlled values must be escaped.
 */
function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

/**
 * Build an inline markdown row of icon+value pairs from a weather_sensors
 * config array. Returns null if no sensors are configured or if every
 * entry is invalid.
 *
 * Each entry renders as `<ha-icon icon="..."></ha-icon> <value> <unit>`,
 * separated by non-breaking spaces. Uses text_only so the markdown blends
 * into the section without extra card chrome.
 *
 * Defensive normalization on every field:
 *   - `entity`: required and must match ENTITY_ID_RE; entries with bad
 *     ids are dropped (they would otherwise let a poisoned config inject
 *     into the Jinja template).
 *   - `icon`: must match ICON_RE; falls back to `mdi:gauge` otherwise.
 *     Prevents attribute break-out inside `<ha-icon icon="...">`.
 *   - `unit`: free text, HTML-escaped before concatenation.
 *   - `round`: must be a finite non-negative integer; ignored otherwise.
 *
 * The strategy generates Lovelace YAML — the config is trusted in the
 * single-user case, but we still validate so that copy-pasted community
 * templates can't smuggle in HTML or template injection.
 */
function buildWeatherSensorRow(sensors: WeatherSensorConfig[]): LovelaceCardConfig | null {
  if (sensors.length === 0) return null;

  const parts: string[] = [];
  for (const s of sensors) {
    if (typeof s.entity !== 'string' || !ENTITY_ID_RE.test(s.entity)) continue;

    const icon = typeof s.icon === 'string' && ICON_RE.test(s.icon) ? s.icon : 'mdi:gauge';
    const round =
      typeof s.round === 'number' && Number.isInteger(s.round) && s.round >= 0
        ? s.round
        : undefined;

    const valueExpr =
      round !== undefined
        ? `{{ states("${s.entity}") | float(0) | round(${round}) }}`
        : `{{ states("${s.entity}") }}`;

    const unit = typeof s.unit === 'string' && s.unit.length > 0 ? ` ${escapeHtml(s.unit)}` : '';

    parts.push(`<ha-icon icon="${icon}"></ha-icon> ${valueExpr}${unit}`);
  }

  if (parts.length === 0) return null;

  return {
    type: 'markdown',
    text_only: true,
    content: parts.join(' &nbsp;&nbsp;&nbsp; '),
  };
}

/**
 * Map a WeatherPresentation enum value to the corresponding built-in card.
 * Returns null for `none` — caller emits no built-in card and the section
 * relies entirely on appended custom_cards.
 */
function buildPresentationCard(
  weatherEntity: string,
  presentation: WeatherPresentation
): LovelaceCardConfig | null {
  switch (presentation) {
    case 'forecast_daily':
      return { type: 'weather-forecast', entity: weatherEntity, forecast_type: 'daily' };
    case 'forecast_hourly':
      return { type: 'weather-forecast', entity: weatherEntity, forecast_type: 'hourly' };
    case 'forecast_twice_daily':
      return { type: 'weather-forecast', entity: weatherEntity, forecast_type: 'twice_daily' };
    case 'tile':
      return { type: 'tile', entity: weatherEntity };
    case 'none':
      return null;
    default: {
      // Open-enum extension (v4.2+): the value may be a known custom-card
      // id registered in src/utils/section-card-registry.ts. When the
      // user has the matching HACS plugin installed, the editor surfaces
      // it as a dropdown option and stores its `id` as the presentation
      // value. We hand off to the registry's buildConfig to produce the
      // emitted card.
      // Graceful fallback: emit registry card only when the plugin is
      // actually installed. Otherwise drop back to the safe built-in
      // forecast-daily and warn so users notice. Principle 2: HACS
      // plugins are enhancement, never required.
      const known = findKnownCard(presentation as unknown as string);
      if (known && known.section === 'weather') {
        if (isCardInstalled(known.elementTag)) {
          return known.buildConfig(weatherEntity) as LovelaceCardConfig;
        }
        console.warn(
          `[oriel] weather_presentation="${presentation}" requires HACS plugin ` +
          `'${known.hacs?.name ?? known.elementTag}' which isn't installed. ` +
          `Falling back to forecast-daily.`,
        );
        return { type: 'weather-forecast', entity: weatherEntity, forecast_type: 'daily' };
      }
      return null;
    }
  }
}

/**
 * Creates the weather section.
 * Returns null if weather is disabled or no entity available.
 *
 * Card rendered in the section is chosen via `presentation`:
 *   - `forecast_daily` (default) — built-in weather-forecast (daily)
 *   - `forecast_hourly`          — built-in weather-forecast (hourly)
 *   - `forecast_twice_daily`     — built-in weather-forecast (twice-daily)
 *   - `tile`                     — HA core tile card
 *   - `none`                     — no built-in card; section keeps heading
 *                                  and any custom_cards targeted at `weather`
 *                                  appended by the caller.
 *
 * Legacy `showForecastCard=false` is honoured when `presentation` is left
 * undefined — it maps to `none`. Any explicit presentation overrides.
 */
export function createWeatherSection(
  weatherEntity: string | null,
  showWeather: boolean,
  showForecastCard: boolean = true,
  weatherSensors: WeatherSensorConfig[] = [],
  presentation?: WeatherPresentation,
  hideHeading: boolean = false,
): LovelaceSectionConfig | null {
  if (!weatherEntity || !showWeather) return null;

  const resolvedPresentation: WeatherPresentation =
    presentation ?? (showForecastCard ? 'forecast_daily' : 'none');

  const cards: LovelaceCardConfig[] = [];
  if (!hideHeading) {
    cards.push({
      type: 'heading',
      heading: localize('sections.weather'),
      heading_style: 'title',
      icon: 'mdi:weather-partly-cloudy',
    });
  }

  const sensorRow = buildWeatherSensorRow(weatherSensors);
  if (sensorRow) cards.push(sensorRow);

  const card = buildPresentationCard(weatherEntity, resolvedPresentation);
  if (card) cards.push(card);

  return { type: 'grid', cards };
}

/**
 * Creates the energy distribution section.
 * Returns null if energy is disabled.
 *
 * When `showDistributionCard` is false, the built-in energy-distribution card
 * is omitted but the section (with heading) is still returned so custom_cards
 * targeted at `energy` can still be appended.
 */
export function createEnergySection(
  showEnergy: boolean,
  linkDashboard: boolean = true,
  showDistributionCard: boolean = true,
  hideHeading: boolean = false,
  presentation?: string,
): LovelaceSectionConfig | null {
  if (!showEnergy) return null;

  const cards: LovelaceCardConfig[] = [];
  if (!hideHeading) {
    cards.push({
      type: 'heading',
      heading: localize('sections.energy'),
      heading_style: 'title',
      icon: 'mdi:lightning-bolt',
    });
  }

  // If the user picked a HACS-detected energy card via the registry,
  // emit it instead of the built-in distribution card. `distribution`
  // + undefined both fall through to legacy behaviour gated on
  // `showDistributionCard`. Graceful fallback: registry card emitted
  // only when actually installed; otherwise the built-in distribution
  // card stays and a console warning fires.
  if (presentation && presentation !== 'distribution' && presentation !== 'none') {
    const known = findKnownCard(presentation);
    if (known && known.section === 'energy') {
      if (isCardInstalled(known.elementTag)) {
        cards.push(known.buildConfig() as LovelaceCardConfig);
        return { type: 'grid', cards };
      }
      console.warn(
        `[oriel] energy_presentation="${presentation}" requires HACS plugin ` +
        `'${known.hacs?.name ?? known.elementTag}' which isn't installed. ` +
        `Falling back to built-in energy-distribution card.`,
      );
      // fall through to the built-in path
    }
  }

  if (presentation === 'none') {
    return { type: 'grid', cards };
  }

  if (showDistributionCard) {
    cards.push({
      type: 'energy-distribution',
      link_dashboard: linkDashboard,
    });
  }

  return { type: 'grid', cards };
}
