// ====================================================================
// Section-card registry — auto-detected HACS alternatives (v4.2.0)
// ====================================================================
// Lets users swap the built-in card for a specific section (weather,
// energy, agenda, todos) with a popular HACS alternative, without
// touching YAML. The editor's section-presentation dropdown picks up
// every detected card automatically; the strategy emits the matching
// custom-card config when one is selected.
//
// Detection: a card is "available" when either
//   - `customElements.get(tag)` resolves (the plugin's element is
//     registered), OR
//   - the plugin appears in `window.customCards` (HA's central registry
//     that every HACS plugin pushes itself into on load).
//
// Adding a new card: append to `KNOWN_CARDS`. The detector + editor
// pick it up at the next page load — no per-card boilerplate.
// ====================================================================

export type SectionKind = 'weather' | 'energy' | 'agenda' | 'todos' | 'plants' | 'vacuums';

export interface KnownCard {
  /**
   * ID used as the `<section>_presentation` enum value. Stable; never
   * rename once published. Conventionally the element tag without the
   * `custom:` prefix.
   */
  id: string;
  /** Human-readable label shown in the editor dropdown. */
  label: string;
  /** Which section this card slots into. */
  section: SectionKind;
  /** Custom-element tag (used for runtime detection). */
  elementTag: string;
  /** HACS install metadata — surfaced as an install hint when missing. */
  hacs?: { name: string; repository: string };
  /**
   * Build the card config to emit. The strategy passes the canonical
   * section entity when one applies (e.g. weather entity for weather
   * cards). Cards that don't need it just ignore the argument.
   */
  buildConfig: (entity?: string | null) => Record<string, unknown>;
}

export const KNOWN_CARDS: KnownCard[] = [
  // ---------------- Weather ----------------
  {
    id: 'clock-weather-card',
    label: 'Clock Weather Card',
    section: 'weather',
    elementTag: 'clock-weather-card',
    hacs: { name: 'clock-weather-card', repository: 'pkissling/clock-weather-card' },
    buildConfig: (entity) => ({
      type: 'custom:clock-weather-card',
      ...(entity ? { entity } : {}),
    }),
  },
  {
    id: 'simple-weather-card',
    label: 'Simple Weather Card',
    section: 'weather',
    elementTag: 'simple-weather-card',
    hacs: { name: 'simple-weather-card', repository: 'kalkih/simple-weather-card' },
    buildConfig: (entity) => ({
      type: 'custom:simple-weather-card',
      ...(entity ? { entity } : {}),
    }),
  },
  {
    id: 'weather-card',
    label: 'Weather Card (bramkragten)',
    section: 'weather',
    elementTag: 'weather-card',
    hacs: { name: 'weather-card', repository: 'bramkragten/weather-card' },
    buildConfig: (entity) => ({
      type: 'custom:weather-card',
      ...(entity ? { entity } : {}),
    }),
  },
  {
    id: 'meteoalarm-card',
    label: 'Meteoalarm Card',
    section: 'weather',
    elementTag: 'meteoalarm-card',
    hacs: { name: 'meteoalarm-card', repository: 'MrBartusek/MeteoalarmCard' },
    buildConfig: () => ({ type: 'custom:meteoalarm-card' }),
  },

  // ---------------- Energy ----------------
  {
    id: 'power-flow-card-plus',
    label: 'Power Flow Card Plus',
    section: 'energy',
    elementTag: 'power-flow-card-plus',
    hacs: { name: 'power-flow-card-plus', repository: 'flixlix/power-flow-card-plus' },
    buildConfig: () => ({ type: 'custom:power-flow-card-plus' }),
  },
  {
    id: 'energy-flow-card-plus',
    label: 'Energy Flow Card Plus',
    section: 'energy',
    elementTag: 'energy-flow-card-plus',
    hacs: { name: 'energy-flow-card-plus', repository: 'flixlix/energy-flow-card-plus' },
    buildConfig: () => ({ type: 'custom:energy-flow-card-plus' }),
  },
  {
    id: 'tesla-style-solar-power-card',
    label: 'Tesla-style Solar Power Card',
    section: 'energy',
    elementTag: 'tesla-style-solar-power-card',
    hacs: { name: 'tesla-style-solar-power-card', repository: 'reptilex/tesla-style-solar-power-card' },
    buildConfig: () => ({ type: 'custom:tesla-style-solar-power-card' }),
  },
  {
    id: 'sankey-chart-card',
    label: 'Sankey Chart Card',
    section: 'energy',
    elementTag: 'sankey-chart-card',
    hacs: { name: 'sankey-chart-card', repository: 'MindFreeze/sankey-chart-card' },
    buildConfig: () => ({ type: 'custom:sankey-chart-card' }),
  },

  // ---------------- Agenda ----------------
  {
    id: 'atomic-calendar-revive',
    label: 'Atomic Calendar Revive',
    section: 'agenda',
    elementTag: 'atomic-calendar-revive',
    hacs: { name: 'atomic-calendar-revive', repository: 'totaldebug/atomic-calendar-revive' },
    buildConfig: () => ({ type: 'custom:atomic-calendar-revive' }),
  },
  {
    id: 'calendar-card-pro',
    label: 'Calendar Card Pro',
    section: 'agenda',
    elementTag: 'calendar-card-pro',
    hacs: { name: 'calendar-card-pro', repository: 'alexpfau/calendar-card-pro' },
    buildConfig: () => ({ type: 'custom:calendar-card-pro' }),
  },

  // ---------------- Todos ----------------
  {
    id: 'todo-list-card',
    label: 'Todo List Card (extended)',
    section: 'todos',
    elementTag: 'todo-list-card',
    hacs: { name: 'todo-list-card', repository: 'Yethal/todo-list-card' },
    buildConfig: () => ({ type: 'custom:todo-list-card' }),
  },

  // ---------------- Plants ----------------
  // Both flower-card variants are single-entity cards. The strategy
  // emits one per plant in the section.
  {
    id: 'flower-card',
    label: 'Flower Card',
    section: 'plants',
    elementTag: 'flower-card',
    hacs: { name: 'flower-card', repository: 'custom-cards/flower-card' },
    buildConfig: (entity) => ({
      type: 'custom:flower-card',
      ...(entity ? { entity } : {}),
    }),
  },

  // ---------------- Vacuums ----------------
  // Single-entity vacuum visualisations — strategy emits one per
  // vacuum / lawn_mower in the section.
  {
    id: 'xiaomi-vacuum-map-card',
    label: 'Xiaomi Vacuum Map Card',
    section: 'vacuums',
    elementTag: 'xiaomi-vacuum-map-card',
    hacs: { name: 'xiaomi-vacuum-map-card', repository: 'PiotrMachowski/lovelace-xiaomi-vacuum-map-card' },
    buildConfig: (entity) => ({
      type: 'custom:xiaomi-vacuum-map-card',
      ...(entity ? { entity } : {}),
    }),
  },
  {
    id: 'vacuum-card',
    label: 'Vacuum Card',
    section: 'vacuums',
    elementTag: 'vacuum-card',
    hacs: { name: 'vacuum-card', repository: 'denysdovhan/vacuum-card' },
    buildConfig: (entity) => ({
      type: 'custom:vacuum-card',
      ...(entity ? { entity } : {}),
    }),
  },
];

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

/**
 * True when a card's custom-element tag is registered OR the plugin has
 * announced itself in `window.customCards`.
 */
export function isCardInstalled(tag: string): boolean {
  try {
    if (typeof customElements !== 'undefined' && customElements.get(tag)) return true;
    if (typeof window !== 'undefined' && Array.isArray(window.customCards)) {
      return window.customCards.some(
        (c) => c.type === tag || c.type === `custom:${tag}`,
      );
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Return all known cards for the section that are currently installed. */
export function detectAvailable(section: SectionKind): KnownCard[] {
  return KNOWN_CARDS.filter((c) => c.section === section && isCardInstalled(c.elementTag));
}

/** Look up a card by id (across all sections). Null when not known. */
export function findKnownCard(id: string): KnownCard | null {
  return KNOWN_CARDS.find((c) => c.id === id) ?? null;
}
