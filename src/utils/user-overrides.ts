// ====================================================================
// Per-user / per-role config overrides
// ====================================================================
// Resolves the strategy config for the currently-viewing HA user.
// HA exposes `hass.user.id` (UUID), `hass.user.is_admin` (boolean),
// and `hass.user.name` (display name). We use these to look up
// per-user / per-role overrides and deep-merge them on top of the
// base config.
//
// Addresses community pain point #1 (per-user / per-device default
// dashboards). The configuration shape is forward-compatible:
//   - `users`        — map keyed by user ID (UUID)
//   - `users_by_role`— map keyed by 'admin' / 'guest' / a label
// Both are optional; when both match a user, `users` wins.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig } from '../types/strategy';

/**
 * Deep-merge two plain objects. Arrays are REPLACED (not concatenated)
 * — overrides commonly want to specify a fresh list, not append.
 * Returns a new object; inputs are not mutated.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  if (!override || typeof override !== 'object') return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const b = (base as Record<string, unknown>)[key];
    const o = (override as Record<string, unknown>)[key];
    if (
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b) &&
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o)
    ) {
      out[key] = deepMerge(b as Record<string, unknown>, o as Record<string, unknown>);
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out as T;
}

interface HassUser {
  id?: string;
  name?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  labels?: string[];
}

/**
 * Resolve the effective strategy config for the viewing user.
 * Reads `hass.user` and applies overrides:
 *
 *   1. Start with the base config (everything except `users` and
 *      `users_by_role`).
 *   2. If `users_by_role` is set, for each role this user matches
 *      (admin / labels), deep-merge that role's override.
 *   3. If `users` has a key matching `hass.user.id`, deep-merge
 *      that user's override last (user-specific wins over role).
 *
 * Returns the base config unchanged when no `users` /
 * `users_by_role` is configured. Forward-compatible: existing
 * dashboards aren't affected.
 */
export function resolveUserConfig(
  config: Simon42StrategyConfig,
  hass: HomeAssistant,
): Simon42StrategyConfig {
  const users = (config as { users?: Record<string, { override?: Simon42StrategyConfig }> }).users;
  const usersByRole = (config as {
    users_by_role?: Record<string, { override?: Simon42StrategyConfig }>;
  }).users_by_role;
  if (!users && !usersByRole) return config;

  // Strip the user-config keys so they don't leak into resolved
  // generated views.
  const { users: _u, users_by_role: _r, ...base } =
    config as Simon42StrategyConfig & {
      users?: unknown;
      users_by_role?: unknown;
    };
  void _u;
  void _r;

  let resolved: Simon42StrategyConfig = base as Simon42StrategyConfig;

  const user = (hass as unknown as { user?: HassUser }).user;
  if (!user) return resolved;

  // Role-level overrides first (broadest)
  if (usersByRole) {
    if (user.is_admin === true && usersByRole.admin?.override) {
      resolved = deepMerge(
        resolved as Record<string, unknown>,
        usersByRole.admin.override as Record<string, unknown>,
      ) as Simon42StrategyConfig;
    }
    const labels = (user.labels ?? []).map((l) => l.toLowerCase());
    for (const label of labels) {
      const entry = usersByRole[label];
      if (entry?.override) {
        resolved = deepMerge(
          resolved as Record<string, unknown>,
          entry.override as Record<string, unknown>,
        ) as Simon42StrategyConfig;
      }
    }
  }

  // User-specific override (narrowest, applies last)
  if (users && user.id) {
    const entry = users[user.id];
    if (entry?.override) {
      resolved = deepMerge(
        resolved as Record<string, unknown>,
        entry.override as Record<string, unknown>,
      ) as Simon42StrategyConfig;
    }
  }

  return resolved;
}
