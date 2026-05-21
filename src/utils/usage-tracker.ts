// ====================================================================
// Usage tracker (v3.5.1)
// ====================================================================
// Counts taps per entity in localStorage. After a threshold of total
// interactions, the editor surfaces a "suggested layout" banner that
// proposes a `sections_order` derived from where the user actually
// taps. Per-browser; never sent anywhere.
//
// Privacy: all data stays in the user's browser localStorage. Reset
// via `orielUsageReset()` from devtools or by deleting the
// `oriel_usage_v1` key.
// ====================================================================

const STORAGE_KEY = 'oriel_usage_v1';
const THRESHOLD = 50; // taps before suggestion surfaces
const MAX_ENTRIES = 500;

interface UsageEntry {
  /** Domain count, e.g. "light" → 12 */
  domains: Record<string, number>;
  /** Per-entity-id count */
  entities: Record<string, number>;
  /** Total taps across all entities */
  total: number;
  /** ISO date of last tick — used to age out abandoned data */
  lastTick: string;
}

const empty = (): UsageEntry => ({
  domains: {},
  entities: {},
  total: 0,
  lastTick: new Date().toISOString(),
});

function read(): UsageEntry {
  if (typeof localStorage === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return empty();
    return {
      domains: parsed.domains ?? {},
      entities: parsed.entities ?? {},
      total: parsed.total ?? 0,
      lastTick: parsed.lastTick ?? new Date().toISOString(),
    };
  } catch {
    return empty();
  }
}

function write(entry: UsageEntry): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* quota exceeded or storage disabled */
  }
}

/**
 * Record a tap on the given entity. Idempotent and silent on failure
 * — never throws back into the host card.
 */
export function trackTap(entityId: string | undefined): void {
  if (!entityId || typeof entityId !== 'string') return;
  const entry = read();
  if (Object.keys(entry.entities).length >= MAX_ENTRIES && !(entityId in entry.entities)) {
    return; // cap pathological cases
  }
  const domain = entityId.split('.')[0] ?? 'unknown';
  entry.entities[entityId] = (entry.entities[entityId] ?? 0) + 1;
  entry.domains[domain] = (entry.domains[domain] ?? 0) + 1;
  entry.total += 1;
  entry.lastTick = new Date().toISOString();
  write(entry);
}

/** Reset tracker. Available via window for users who want to clear it. */
export function reset(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

if (typeof window !== 'undefined') {
  (window as unknown as { orielUsageReset?: () => void }).orielUsageReset = reset;
}

/** Has the user crossed the suggestion threshold? */
export function hasEnoughData(): boolean {
  return read().total >= THRESHOLD;
}

/**
 * Compute a recommended sections_order based on observed usage.
 * Sections that map to high-tap domains float to the top. Sections
 * without observed taps keep their default position.
 */
export function recommendSectionsOrder(
  currentOrder: string[],
): { order: string[]; rationale: string[] } | null {
  const entry = read();
  if (entry.total < THRESHOLD) return null;
  // Map each section key to a domain score.
  const sectionWeight: Record<string, number> = {};
  const domainsForSection: Record<string, string[]> = {
    overview: ['light', 'switch', 'fan'],
    areas: ['light', 'cover', 'climate'],
    energy: ['sensor'], // mapped via heuristic, not reliable
    weather: ['weather'],
    plants: ['plant'],
    agenda: ['calendar'],
    todos: ['todo'],
    persons: ['person'],
    vacuums: ['vacuum'],
    maintenance: [],
    presence: ['binary_sensor'],
    custom_cards: [], // user-controlled, no signal
  };
  for (const [key, doms] of Object.entries(domainsForSection)) {
    sectionWeight[key] = doms.reduce(
      (sum, d) => sum + (entry.domains[d] ?? 0),
      0,
    );
  }
  const sorted = [...currentOrder].sort(
    (a, b) => (sectionWeight[b] ?? 0) - (sectionWeight[a] ?? 0),
  );
  // If no change, return null (no suggestion needed).
  const same = sorted.every((k, i) => k === currentOrder[i]);
  if (same) return null;
  const rationale = sorted.map((k) => {
    const weight = sectionWeight[k] ?? 0;
    return weight > 0 ? `${k}: ${weight} taps` : `${k}: unchanged`;
  });
  return { order: sorted, rationale };
}

/** Current total tap count, for the banner copy. */
export function getTotalTaps(): number {
  return read().total;
}
