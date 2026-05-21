// ====================================================================
// Anomaly detection helpers (v3.5.2)
// ====================================================================
// Lightweight client-side detector for "this entity is in an unusual
// state right now". Uses a 7-day history window + per-hour state mode
// (the most-common state for this entity at this hour-of-day).
//
// Not a full statistical model — Z-scores against tiny sample sizes
// produce more false positives than signal. The mode-deviation
// heuristic is good enough to be useful and cheap enough to run on
// every dashboard load.
//
// Public API:
//   - fetchAnomalyHistory(hass, entityId): refresh the 7-day cache
//   - isAnomalous(entityId, currentState): boolean for the current hour
//
// State is cached in module-level memory + localStorage for fast
// resume across dashboard reloads.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';

interface HourlyStats {
  /** Map of state → count, keyed by hour 0-23. */
  histograms: Array<Record<string, number>>;
  /** Last fetch timestamp (ms). */
  lastFetch: number;
}

const STORAGE_KEY = 'oriel_anomaly_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // refetch daily
const cache = new Map<string, HourlyStats>();

function readCache(): Record<string, HourlyStats> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(all: Record<string, HourlyStats>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / disabled */
  }
}

/** Refresh the 7-day stats for `entityId`. Returns the cached entry. */
export async function fetchAnomalyHistory(
  hass: HomeAssistant,
  entityId: string,
): Promise<HourlyStats | null> {
  const cached = cache.get(entityId) ?? readCache()[entityId];
  if (cached && Date.now() - cached.lastFetch < TTL_MS) {
    cache.set(entityId, cached);
    return cached;
  }
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date().toISOString();
  try {
    const callApi = (hass as unknown as {
      callApi: <T>(method: string, path: string) => Promise<T>;
    }).callApi;
    const path =
      `history/period/${start}` +
      `?end_time=${encodeURIComponent(end)}` +
      `&filter_entity_id=${encodeURIComponent(entityId)}` +
      `&minimal_response&no_attributes`;
    const result = await callApi<Array<Array<{ state: string; last_changed: string }>>>('GET', path);
    const histograms: Array<Record<string, number>> = Array.from({ length: 24 }, () => ({}));
    for (const series of result || []) {
      for (const point of series) {
        const hour = new Date(point.last_changed).getHours();
        const bucket = histograms[hour];
        if (bucket) bucket[point.state] = (bucket[point.state] ?? 0) + 1;
      }
    }
    const stats: HourlyStats = { histograms, lastFetch: Date.now() };
    cache.set(entityId, stats);
    const all = readCache();
    all[entityId] = stats;
    writeCache(all);
    return stats;
  } catch {
    return null;
  }
}

/**
 * Decide whether `currentState` for `entityId` is unusual for the
 * current local hour. "Unusual" = the modal state at this hour over
 * the last 7 days occurred >= 80% of the time AND the current state
 * disagrees with it.
 */
export function isAnomalous(entityId: string, currentState: string): boolean {
  const stats = cache.get(entityId) ?? readCache()[entityId];
  if (!stats) return false;
  const hour = new Date().getHours();
  const bucket = stats.histograms[hour];
  if (!bucket) return false;
  const total = Object.values(bucket).reduce((s, n) => s + n, 0);
  if (total < 5) return false; // not enough data this hour
  let modeState = '';
  let modeCount = 0;
  for (const [state, count] of Object.entries(bucket)) {
    if (count > modeCount) {
      modeState = state;
      modeCount = count;
    }
  }
  if (modeCount / total < 0.8) return false; // mode isn't dominant
  return currentState !== modeState;
}
