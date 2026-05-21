// ====================================================================
// Dashboard health check (v4.6.0)
// ====================================================================
// Pure detection of common config-drift problems:
//
//   - Orphaned entity references (room pins / favorites / triggers /
//     weather_entity / power_badge_entity / house_mode_entity pointing
//     at entities that no longer exist in HA)
//   - Custom-YAML parse errors (_yaml_error set on custom_views /
//     custom_cards / custom_sections / custom_badges entries)
//   - areas_options entries for areas that no longer exist
//
// Every issue surfaces with a one-click fix — `issue.fix(config)`
// returns a patched config that the HealthTab pipes into the editor's
// _fireConfigChanged. Issues with no auto-fix (YAML parse errors that
// require user input) carry `fix === undefined` and just inform.
//
// Detection is pure: it never mutates input, never touches localStorage,
// and never invokes hass methods. Pinned by unit tests so future config
// shape changes don't silently regress the check set.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';

export type HealthSeverity = 'error' | 'warning' | 'info';

export interface HealthIssue {
  /** Stable id used as the React-style key + dismiss tracking. */
  id: string;
  /** Severity ranks display order; errors first. */
  severity: HealthSeverity;
  /**
   * Title used as a translation key under `editor.health.<id>_title`
   * AND as a fallback English string when localize returns the key
   * unchanged. Each entry's id+title pair is keyed in en.json + de.json.
   */
  titleKey: string;
  /** Same convention — `editor.health.<id>_desc`. */
  descKey: string;
  /** Optional details (e.g. the list of stale entity IDs). Plain text. */
  detail?: string;
  /** When set, apply produces the patched config. Caller wires
   *  through _fireConfigChanged. */
  fix?: (config: OrielConfig) => OrielConfig;
  /** Optional CTA label. Defaults to `editor.health.fix` / 'Fix'. */
  ctaKey?: string;
}

// -- Helpers ----------------------------------------------------------

function entityExists(hass: HomeAssistant, entityId: string): boolean {
  return !!(hass.states && hass.states[entityId]);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** All entity IDs reachable through `favorite_entities`, which may be
 *  either an array or a viewport-keyed map. Returns the set keyed by
 *  the viewport so callers can build a per-viewport fix. */
function favoriteEntitiesByViewport(
  config: OrielConfig,
): Array<{ viewport: 'default' | 'phone' | 'tablet' | 'wall' | 'flat'; entities: string[] }> {
  const fav = config.favorite_entities as unknown;
  if (!fav) return [];
  if (isStringArray(fav)) return [{ viewport: 'flat', entities: fav }];
  if (fav && typeof fav === 'object') {
    const out: Array<{ viewport: 'default' | 'phone' | 'tablet' | 'wall'; entities: string[] }> = [];
    for (const key of ['default', 'phone', 'tablet', 'wall'] as const) {
      const v = (fav as Record<string, unknown>)[key];
      if (isStringArray(v)) out.push({ viewport: key, entities: v });
    }
    return out;
  }
  return [];
}

// -- Detection --------------------------------------------------------

/**
 * Main entry. Returns the (possibly empty) list of issues. Caller
 * decides what to render — when empty the editor hides the Health
 * tab entirely.
 */
export function detectHealthIssues(
  config: OrielConfig,
  hass: HomeAssistant,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // ----- Orphaned weather / power-badge / house-mode entities -----
  if (config.weather_entity && !entityExists(hass, config.weather_entity)) {
    const stale = config.weather_entity;
    issues.push({
      id: 'orphan-weather-entity',
      severity: 'warning',
      titleKey: 'editor.health.orphan_weather_entity_title',
      descKey: 'editor.health.orphan_weather_entity_desc',
      detail: stale,
      fix: (c) => {
        const next = { ...c };
        delete next.weather_entity;
        return next;
      },
    });
  }

  if (config.power_badge_entity && !entityExists(hass, config.power_badge_entity)) {
    const stale = config.power_badge_entity;
    issues.push({
      id: 'orphan-power-badge-entity',
      severity: 'warning',
      titleKey: 'editor.health.orphan_power_badge_entity_title',
      descKey: 'editor.health.orphan_power_badge_entity_desc',
      detail: stale,
      fix: (c) => {
        const next = { ...c };
        delete next.power_badge_entity;
        return next;
      },
    });
  }

  if (config.house_mode_entity && !entityExists(hass, config.house_mode_entity)) {
    const stale = config.house_mode_entity;
    issues.push({
      id: 'orphan-house-mode-entity',
      severity: 'warning',
      titleKey: 'editor.health.orphan_house_mode_entity_title',
      descKey: 'editor.health.orphan_house_mode_entity_desc',
      detail: stale,
      fix: (c) => {
        const next = { ...c };
        delete next.house_mode_entity;
        return next;
      },
    });
  }

  // ----- Orphaned room_pin_entities -----
  if (isStringArray(config.room_pin_entities)) {
    const stale = config.room_pin_entities.filter((id) => !entityExists(hass, id));
    if (stale.length > 0) {
      issues.push({
        id: 'orphan-room-pins',
        severity: 'warning',
        titleKey: 'editor.health.orphan_room_pins_title',
        descKey: 'editor.health.orphan_room_pins_desc',
        detail: stale.join(', '),
        fix: (c) => {
          if (!isStringArray(c.room_pin_entities)) return c;
          const filtered = c.room_pin_entities.filter((id) => !stale.includes(id));
          const next: OrielConfig = { ...c, room_pin_entities: filtered };
          if (filtered.length === 0) {
            delete (next as { room_pin_entities?: string[] }).room_pin_entities;
          }
          return next;
        },
      });
    }
  }

  // ----- Orphaned light_favorite_entities -----
  if (isStringArray(config.light_favorite_entities)) {
    const stale = config.light_favorite_entities.filter((id) => !entityExists(hass, id));
    if (stale.length > 0) {
      issues.push({
        id: 'orphan-light-favorites',
        severity: 'warning',
        titleKey: 'editor.health.orphan_light_favorites_title',
        descKey: 'editor.health.orphan_light_favorites_desc',
        detail: stale.join(', '),
        fix: (c) => {
          if (!isStringArray(c.light_favorite_entities)) return c;
          const filtered = c.light_favorite_entities.filter((id) => !stale.includes(id));
          const next: OrielConfig = { ...c, light_favorite_entities: filtered };
          if (filtered.length === 0) {
            delete (next as { light_favorite_entities?: string[] }).light_favorite_entities;
          }
          return next;
        },
      });
    }
  }

  // ----- Orphaned favorite_entities (flat or viewport-keyed) -----
  const favByViewport = favoriteEntitiesByViewport(config);
  for (const { viewport, entities } of favByViewport) {
    const stale = entities.filter((id) => !entityExists(hass, id));
    if (stale.length === 0) continue;
    issues.push({
      id: `orphan-favorite-entities-${viewport}`,
      severity: 'warning',
      titleKey: 'editor.health.orphan_favorite_entities_title',
      descKey: 'editor.health.orphan_favorite_entities_desc',
      detail: `${viewport}: ${stale.join(', ')}`,
      fix: (c) => {
        const fav = c.favorite_entities as unknown;
        if (viewport === 'flat' && isStringArray(fav)) {
          const filtered = fav.filter((id) => !stale.includes(id));
          return { ...c, favorite_entities: filtered } as OrielConfig;
        }
        if (fav && typeof fav === 'object' && !Array.isArray(fav)) {
          const list = (fav as Record<string, unknown>)[viewport];
          if (isStringArray(list)) {
            const filtered = list.filter((id) => !stale.includes(id));
            return {
              ...c,
              favorite_entities: {
                ...(fav as Record<string, unknown>),
                [viewport]: filtered,
              },
            } as OrielConfig;
          }
        }
        return c;
      },
    });
  }

  // ----- Orphaned notification_triggers entities -----
  const triggers = config.notification_triggers as
    | Array<{ entity?: string }>
    | undefined;
  if (Array.isArray(triggers)) {
    const stale = triggers
      .map((t, i) => ({ entity: t.entity, index: i }))
      .filter((x) => typeof x.entity === 'string' && !entityExists(hass, x.entity));
    if (stale.length > 0) {
      issues.push({
        id: 'orphan-notification-triggers',
        severity: 'warning',
        titleKey: 'editor.health.orphan_notification_triggers_title',
        descKey: 'editor.health.orphan_notification_triggers_desc',
        detail: stale.map((s) => s.entity).join(', '),
        fix: (c) => {
          const list = c.notification_triggers as Array<{ entity?: string }> | undefined;
          if (!Array.isArray(list)) return c;
          const filtered = list.filter(
            (t) => typeof t.entity === 'string' && entityExists(hass, t.entity),
          );
          if (filtered.length === 0) {
            const next = { ...c };
            delete next.notification_triggers;
            return next;
          }
          return {
            ...c,
            notification_triggers: filtered as OrielConfig['notification_triggers'],
          };
        },
      });
    }
  }

  // ----- areas_options entries for missing areas -----
  const areasOptions = config.areas_options;
  if (areasOptions && typeof areasOptions === 'object') {
    const hassAreas = (hass as unknown as { areas?: Record<string, unknown> }).areas ?? {};
    const orphan = Object.keys(areasOptions).filter((id) => !(id in hassAreas));
    if (orphan.length > 0) {
      issues.push({
        id: 'orphan-areas-options',
        severity: 'info',
        titleKey: 'editor.health.orphan_areas_options_title',
        descKey: 'editor.health.orphan_areas_options_desc',
        detail: orphan.join(', '),
        fix: (c) => {
          const next = { ...(c.areas_options ?? {}) };
          for (const id of orphan) delete (next as Record<string, unknown>)[id];
          if (Object.keys(next).length === 0) {
            const out = { ...c };
            delete out.areas_options;
            return out;
          }
          return { ...c, areas_options: next };
        },
      });
    }
  }

  // ----- Camera companions muted while cameras exist -----
  // Informational only: the user has a non-default `room_camera_companions`
  // value AND there are camera entities in HA. The detector doesn't try
  // to figure out per-camera whether companion entities exist — that's
  // more work than the signal warrants. Just flags that the knob is
  // active so users who muted categories accidentally (e.g. by clicking
  // through the checkboxes) can notice + restore the default with a
  // single Fix.
  if (Array.isArray(config.room_camera_companions)) {
    const hasCameraEntities = Object.keys(hass.states ?? {}).some((id) =>
      id.startsWith('camera.'),
    );
    if (hasCameraEntities) {
      const enabled = config.room_camera_companions;
      const all = ['light', 'motion', 'siren', 'battery', 'doorbell'];
      const muted = all.filter((k) => !enabled.includes(k as 'light'));
      if (muted.length > 0) {
        issues.push({
          id: 'muted-camera-companions',
          severity: 'info',
          titleKey: 'editor.health.muted_camera_companions_title',
          descKey: 'editor.health.muted_camera_companions_desc',
          detail: muted.join(', '),
          ctaKey: 'editor.health.restore_defaults',
          fix: (c) => {
            const next = { ...c };
            delete next.room_camera_companions;
            return next;
          },
        });
      }
    }
  }

  // ----- YAML parse errors on custom_* entries -----
  // These don't have an auto-fix — the user needs to edit the YAML.
  // We surface them so users notice rather than only seeing the inline
  // error inside the relevant tab.
  const yamlSurfaces: Array<[keyof OrielConfig, string]> = [
    ['custom_views', 'orphan_custom_views_yaml'],
    ['custom_cards', 'orphan_custom_cards_yaml'],
    ['custom_sections', 'orphan_custom_sections_yaml'],
    ['custom_badges', 'orphan_custom_badges_yaml'],
  ];
  for (const [key, idStem] of yamlSurfaces) {
    const list = config[key] as Array<{ _yaml_error?: string }> | undefined;
    if (!Array.isArray(list)) continue;
    const broken = list
      .map((entry, i) => ({ entry, i }))
      .filter((x) => typeof x.entry?._yaml_error === 'string');
    if (broken.length > 0) {
      issues.push({
        id: idStem,
        severity: 'error',
        titleKey: `editor.health.${idStem}_title`,
        descKey: `editor.health.${idStem}_desc`,
        detail: broken
          .map((b) => `#${b.i + 1}: ${(b.entry._yaml_error ?? '').slice(0, 60)}`)
          .join('; '),
      });
    }
  }

  // Order: errors first, then warnings, then info — stable within group.
  const rank: Record<HealthSeverity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return issues;
}
