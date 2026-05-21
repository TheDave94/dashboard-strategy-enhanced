// ====================================================================
// Visibility predicate evaluator
// ====================================================================
// Lightweight rule engine for "should this section/area show right
// now?". Composable: rules combine entity state, role membership,
// time-of-day, and house mode. Backwards-compatible with the legacy
// `{entity, state}` shape — any rule with `entity` is treated as a
// single legacy predicate.
//
// Roadmap C5. Closes community pain points #5 + #8 (role-based
// visibility + visual editor for visibility).
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig } from '../types/strategy';

/**
 * One visibility predicate. Any subset of fields may be set; all
 * fields that ARE set must match for the rule to pass. (logical AND
 * within a rule). Use the `any: [...]` array form for OR.
 */
export interface VisibilityRule {
  /** Legacy single-entity predicate. Equivalent to `state_is: {entity, state}`. */
  entity?: string;
  state?: string;
  /** Entity-state OR over multiple predicates. */
  any?: VisibilityRule[];
  /** All predicates must match (default — the rule itself is AND). */
  all?: VisibilityRule[];
  /** HA user role. 'admin' matches hass.user?.is_admin === true.
   *  'resident' / 'guest' / 'kid' are user-defined tags that must
   *  exist on hass.user.labels (or fall back to a config-defined
   *  user-to-role map; not implemented here — keep it simple). */
  role?: string | string[];
  /** Time-of-day windows. Both are HH:MM (24h). Inclusive of start,
   *  exclusive of end. Crossing midnight is supported (e.g.
   *  time_after=22:00, time_before=06:00 matches 22:00–05:59). */
  time_after?: string;
  time_before?: string;
  /** Match against an arbitrary mode entity (typically a house_mode
   *  input_select). String match is case- and underscore-insensitive. */
  mode_entity?: string;
  mode_is?: string;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalize(s: string | undefined): string {
  return (s ?? '').toLowerCase().replace(/[\s_-]+/g, '_');
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseMinutes(hhmm: string | undefined): number | null {
  if (!hhmm) return null;
  const m = HHMM.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function isInTimeWindow(after?: string, before?: string): boolean {
  const a = parseMinutes(after);
  const b = parseMinutes(before);
  const now = nowMinutes();
  if (a === null && b === null) return true;
  if (a === null) return now < (b as number);
  if (b === null) return now >= a;
  if (a <= b) return now >= a && now < b;
  // Crosses midnight: e.g. 22:00 .. 06:00.
  return now >= a || now < b;
}

function userMatches(hass: HomeAssistant, role: string | string[]): boolean {
  const roles = Array.isArray(role) ? role : [role];
  // hass.user isn't in the local type but exists at runtime on the
  // HA frontend. Access defensively.
  const user = (hass as unknown as { user?: { is_admin?: boolean; labels?: string[] } })
    .user;
  const userLabels = new Set((user?.labels ?? []).map((l) => l.toLowerCase()));
  for (const r of roles) {
    const lc = r.toLowerCase();
    if (lc === 'admin' && user?.is_admin === true) return true;
    if (userLabels.has(lc)) return true;
  }
  return false;
}

/**
 * Evaluate a visibility rule. Returns true (show), false (hide).
 * Empty / null / undefined rule → always true.
 */
export function evaluateVisibility(
  rule: VisibilityRule | undefined | null,
  hass: HomeAssistant,
): boolean {
  if (!rule || typeof rule !== 'object') return true;

  // OR (`any: [...]`)
  if (Array.isArray(rule.any) && rule.any.length > 0) {
    for (const r of rule.any) {
      if (evaluateVisibility(r, hass)) return true;
    }
    return false;
  }

  // AND (`all: [...]`)
  if (Array.isArray(rule.all) && rule.all.length > 0) {
    for (const r of rule.all) {
      if (!evaluateVisibility(r, hass)) return false;
    }
    // fall through to single-rule predicates (which AND with .all)
  }

  // Single-rule predicates (each set field must match):

  if (rule.entity) {
    const state = hass.states[rule.entity]?.state;
    if (state !== rule.state) return false;
  }

  if (rule.role) {
    if (!userMatches(hass, rule.role)) return false;
  }

  if (rule.time_after || rule.time_before) {
    if (!isInTimeWindow(rule.time_after, rule.time_before)) return false;
  }

  if (rule.mode_entity && rule.mode_is) {
    const state = hass.states[rule.mode_entity]?.state;
    if (normalize(state) !== normalize(rule.mode_is)) return false;
  }

  return true;
}

/**
 * Resolve the visibility map for a config block (section_visibility
 * or room_visibility). Returns a function that, given a section/room
 * key, says whether to show.
 */
export function makeVisibilityChecker(
  visibility: Record<string, VisibilityRule> | undefined,
  hass: HomeAssistant,
): (key: string) => boolean {
  if (!visibility) return () => true;
  return (key: string) => evaluateVisibility(visibility[key], hass);
}

/**
 * Read the strategy's section_visibility from config. Handles the
 * old shape (each entry was `{entity, state}` only) transparently.
 */
export function getSectionVisibilityChecker(
  config: Simon42StrategyConfig,
  hass: HomeAssistant,
): (key: string) => boolean {
  return makeVisibilityChecker(
    config.section_visibility as Record<string, VisibilityRule> | undefined,
    hass,
  );
}

/**
 * Same for per-room visibility.
 */
export function getRoomVisibilityChecker(
  config: Simon42StrategyConfig,
  hass: HomeAssistant,
): (key: string) => boolean {
  return makeVisibilityChecker(
    config.room_visibility as Record<string, VisibilityRule> | undefined,
    hass,
  );
}
