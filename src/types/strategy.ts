// ====================================================================
// Simon42 Dashboard Strategy Types
// ====================================================================
// All configuration and data types specific to the simon42 strategy.
// These types cover the YAML config schema and internal data structures
// used throughout the strategy codebase.
// ====================================================================

import type { LovelaceCardConfig } from './lovelace';

// -- Section Ordering -------------------------------------------------

export type SectionKey =
  | 'overview'
  | 'custom_cards'
  | 'areas'
  | 'weather'
  | 'energy'
  | 'plants'
  | 'agenda'
  | 'todos'
  | 'persons'
  | 'vacuums'
  | 'maintenance'
  | 'presence';

export const DEFAULT_SECTIONS_ORDER: SectionKey[] = [
  'overview',
  'custom_cards',
  'areas',
  'weather',
  'energy',
  'plants',
];

/** Keys for section headings that can be hidden via hidden_section_headings */
export type HeadingKey =
  | 'overview'
  | 'summaries'
  | 'favorites'
  | 'custom_cards'
  | 'areas'
  | 'areas_other'
  | 'weather'
  | 'energy'
  | 'agenda'
  | 'todos'
  | 'persons'
  | 'vacuums'
  | 'maintenance'
  | 'presence';

export const ALL_HEADING_KEYS: HeadingKey[] = [
  'overview',
  'summaries',
  'favorites',
  'custom_cards',
  'areas',
  'areas_other',
  'weather',
  'energy',
  'agenda',
  'todos',
  'persons',
  'vacuums',
  'maintenance',
  'presence',
];

// -- Main Strategy Config ---------------------------------------------

export interface Simon42StrategyConfig {
  // Global toggles
  show_weather?: boolean; // default: true
  show_weather_forecast_card?: boolean; // (legacy) default: true — set false
  // to keep the `weather` section + heading but omit the built-in card.
  // Equivalent to `weather_presentation: 'none'`; superseded by it but still
  // honoured for backwards-compatibility when no explicit weather_presentation
  // is set.
  weather_presentation?: WeatherPresentation; // default: 'forecast_daily'.
  // Picks which built-in weather card the section renders. Use 'none' to omit
  // the built-in card and supply your own via custom_cards target=weather
  // (e.g. clock-weather-card, mini-weather, custom radar widget).
  weather_sensors?: WeatherSensorConfig[]; // optional inline icon+value row
  // rendered at the top of the weather section. Useful for displaying local
  // outdoor sensors (temperature, humidity, wind, pressure...) alongside or
  // in place of the built-in forecast card.
  show_energy?: boolean; // default: true
  show_energy_distribution_card?: boolean; // default: true — same behaviour for
  // the energy section: false keeps the section so custom_cards can render
  // here without the built-in energy-distribution card alongside
  show_search_card?: boolean; // default: false
  /**
   * Which kind of search affordance to render when show_search_card is true.
   * - 'custom' (default): the existing custom:search-card from HACS — true
   *   inline search input, but needs custom:search-card + card-tools installed.
   * - 'tip': a small HA-native markdown card hinting the global search shortcut
   *   (Cmd/Ctrl+E). No HACS dependency. Less powerful but works out of the box.
   */
  search_card_variant?: 'custom' | 'tip';
  show_summary_views?: boolean; // default: false
  show_room_views?: boolean; // default: false
  group_by_floors?: boolean; // default: false
  show_covers_summary?: boolean; // default: true
  show_partially_open_covers?: boolean; // default: false
  group_covers_by_floors?: boolean; // default: false
  awning_icon_open?: string;
  awning_icon_closed?: string;
  awning_icon_partial?: string;
  show_clock_card?: boolean; // default: true
  show_light_summary?: boolean; // default: true
  group_lights_by_floors?: boolean; // default: false
  nested_light_groups?: boolean; // default: false
  /**
   * When nested_light_groups is true, whether group tiles start
   * expanded (members visible) or collapsed (chevron-to-reveal) in
   * the dedicated Lights view. Default true — matches the room
   * view's behaviour and avoids the "tap-the-tile-does-nothing"
   * surprise. Set false to keep group children collapsed by default.
   */
  light_groups_default_expanded?: boolean;
  lights_sort_by?: 'last_changed' | 'name'; // default: 'last_changed'
  show_security_summary?: boolean; // default: true
  show_battery_summary?: boolean; // default: true
  show_climate_summary?: boolean; // default: false
  hide_mobile_app_batteries?: boolean; // default: false
  hide_battery_notes_entities?: boolean; // default: false
  battery_critical_threshold?: number; // default: 20
  battery_low_threshold?: number; // default: 50
  show_area_in_battery_view?: boolean; // default: false
  unavailable_batteries_bucket?: 'critical' | 'good'; // default: 'good'
  show_locks_in_rooms?: boolean; // default: false
  show_automations_in_rooms?: boolean; // default: false
  show_scripts_in_rooms?: boolean; // default: false
  show_cameras_in_rooms?: boolean; // default: true
  show_window_contacts_in_rooms?: boolean; // default: true (opt-out — set false to hide window contact badges)
  show_door_contacts_in_rooms?: boolean; // default: true (opt-out — set false to hide door contact badges)
  show_switches_on_areas?: boolean; // default: false
  show_alerts_on_areas?: boolean; // default: false
  show_person_badges?: boolean; // default: true — set false to suppress the
  // auto-generated person chip badges (useful when supplying replacement
  // badges via custom_badges)
  show_window_alerts_on_areas?: boolean; // default: false
  energy_link_dashboard?: boolean; // default: true
  show_plants_section?: boolean; // default: false (auto-hides anyway if no plants)
  show_agenda_section?: boolean; // default: false (auto-hides when no calendars)
  agenda_calendar_entities?: string[]; // default: [] → all visible calendars
  show_todos_section?: boolean; // default: false (auto-hides when no todos)
  todos_entities?: string[]; // default: [] → all visible todo.* entities
  show_persons_section?: boolean; // default: false (auto-hides when no persons)
  power_badge_entity?: string; // default: unset (no badge). Pick a sensor (e.g. main grid power in W).
  /**
   * Optional house-mode badge in the overview header. Typically an
   * `input_select.house_mode` (At Home / Away / Holiday) so users can
   * see and change it without opening a submenu. Auto-hides when the
   * entity does not exist. Set `house_mode_icon` to override the
   * default icon (`mdi:home-account`).
   */
  house_mode_entity?: string;
  house_mode_icon?: string;
  /**
   * Icon used on the room-mode tile when it renders. The room-mode tile
   * itself is opted into per-area via
   * `areas_options.<area_id>.room_mode_entity`, or auto-detected when an
   * area has exactly one `input_select.*` entity whose object_id
   * contains "mode". There is intentionally no dashboard-wide
   * `room_mode_entity` fallback: a global input_select shouldn't appear
   * on every room view.
   */
  room_mode_icon?: string;
  /**
   * Density of the summary tiles (lights / covers / security / batteries /
   * climate) on the overview. 'comfortable' (default) keeps the original
   * stacked icon + label layout. 'compact' switches to a horizontal
   * single-row layout for ~½ the vertical footprint.
   */
  /**
   * Manual density override. By default, every custom card scales
   * dynamically to its actual rendered width via CSS container
   * queries — no flag needed. Set this to force `compact` or
   * `comfortable` sizing regardless of the container width. HA
   * built-in cards (tile, area, weather-forecast) are unaffected.
   */
  dashboard_density?: 'compact' | 'comfortable';
  /**
   * Strategy-wide layout density preset. Distinct from
   * `dashboard_density` (which is the per-card token override):
   * `density` controls the *grid sizing* the strategy emits —
   * sections column count, gap between sections, minimum tile
   * width. Three presets:
   *
   *   - `compact`     — 4 columns, tight gaps, 200px tile-min.
   *                    Fits ~8 tiles on a phone in landscape.
   *   - `cozy`        — 3 columns, medium gaps, 280px tile-min.
   *                    Balanced; works well on tablets.
   *   - `comfortable` — HA defaults; spacious, 360px+ tile-min.
   *
   * Default `comfortable` (HA's standard). Editor surfaces it as
   * a segmented control on the Overview tab.
   */
  density?: 'compact' | 'cozy' | 'comfortable';
  /**
   * Globally enable / disable the auto-rendered zone-presence card in
   * room views. Default true: each room view picks up its
   * binary_sensors with device_class ∈ {occupancy, motion, presence}
   * and renders them as one compact `simon42-zone-presence-card`
   * (only when ≥2 such sensors are present in the area — a single
   * sensor reads fine as a normal tile). Set false to suppress
   * across the whole dashboard.
   */
  show_zone_presence_in_rooms?: boolean;
  /**
   * Optional curated zone-presence card for the overview. When set,
   * the strategy renders a `simon42-zone-presence-card` in its own
   * 'presence' section on the overview with the listed entities.
   * The list is opaque to the strategy — each entry is forwarded to
   * the card as-is, so all per-entry overrides (name, icon, color,
   * tap_action) work. Auto-hides when the list is empty or omitted.
   */
  presence_zones?: Array<string | PresenceZoneEntry>;
  presence_zones_name?: string;
  presence_zones_icon?: string;
  /**
   * Opaque list of LovelaceCardConfig objects rendered inside the
   * overview's favorites subsection, immediately after the favorite
   * entity tiles (and after any pin_*_to_favorites cards). The escape
   * hatch for "I want X card inside favorites" when neither the
   * favorite_entities tile-list nor the pin_*_to_favorites flags fit.
   * Cards are forwarded verbatim — anything HA can render is valid.
   */
  favorites_cards?: LovelaceCardConfig[];
  show_unavailable_alert_badge?: boolean; // default: false (auto-hides at zero)
  show_now_playing_badge?: boolean; // default: false (auto-hides when nothing's playing)
  show_vacuums_section?: boolean; // default: false (auto-hides without vacuum/mower)
  show_sun_badge?: boolean; // default: false (requires HA sun integration / sun.sun entity)
  show_maintenance_section?: boolean; // default: false (auto-hides when nothing pending)
  hide_unavailable_in_rooms?: boolean; // default: true (skip unavailable in room views)
  person_badge_layout?: 'minimal' | 'with_state' | 'with_state_and_time'; // default: 'with_state'
  /**
   * Per-section conditional visibility. Keyed by SectionKey. When set, the
   * section is only rendered when hass.states[entity].state === state.
   * Example: { agenda: { entity: 'calendar.workday_sensor', state: 'on' } }
   * → agenda section only on workdays.
   */
  section_visibility?: Record<string, { entity: string; state: string }>;
  show_updates_badge?: boolean; // default: false (auto-hides at zero pending)
  /**
   * Per-room conditional visibility. Keyed by area_id. When set, the room
   * view (and its corresponding nav tab) is only rendered when
   * hass.states[entity].state === state. Useful for guest-mode rooms,
   * seasonal rooms (garden in winter), etc.
   *
   * The overview's area cards section is NOT affected — only the per-area
   * room views and nav tabs.
   */
  room_visibility?: Record<string, { entity: string; state: string }>;

  // Layout
  sections_order?: SectionKey[]; // default: DEFAULT_SECTIONS_ORDER
  summaries_columns?: 2 | 4; // default: 2
  hidden_section_headings?: HeadingKey[]; // default: []

  // Favorites display
  favorites_show_state?: boolean; // default: false
  favorites_hide_last_changed?: boolean; // default: false
  room_pins_show_state?: boolean; // default: false
  room_pins_hide_last_changed?: boolean; // default: false
  room_pins_position?: 'top' | 'bottom'; // default: 'top' (matches docs)

  // Special entities
  alarm_entity?: string;
  weather_entity?: string; // explicit weather entity for the weather section;
  // defaults to the first visible weather.* entity when omitted. Falls back
  // to auto-discovery if the configured entity is unavailable at render time.
  favorite_entities?: string[];
  room_pin_entities?: string[];
  security_extra_entities?: string[];
  light_favorite_entities?: string[]; // light.* glance row on overview (#176)

  // Area management
  use_default_area_sort?: boolean; // default: false
  areas_display?: AreasDisplay;
  areas_options?: Record<string, AreaOptions>;

  // Custom views
  custom_views?: CustomView[];

  // Custom cards (shown as own section on overview)
  custom_cards?: CustomCard[];
  custom_cards_heading?: string;
  custom_cards_icon?: string;

  // Custom sections — user-declared section blocks with their own heading
  // and card list. Each entry's `key` becomes a valid sections_order entry
  // and a valid custom_cards.target_section value. Auto-hides when empty.
  custom_sections?: CustomSection[];

  // Custom badges (shown in header next to person chips)
  custom_badges?: CustomBadge[];
}

// -- Area Management --------------------------------------------------

export interface AreasDisplay {
  hidden?: string[];
  order?: string[];
}

/**
 * Single entry in `presence_zones[]`. Mirrors the shape the
 * simon42-zone-presence-card accepts so the strategy can forward
 * values verbatim. All fields besides `entity` are optional.
 */
export interface PresenceZoneEntry {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  tap_action?: Record<string, unknown>;
  hold_action?: Record<string, unknown>;
  double_tap_action?: Record<string, unknown>;
}

export interface AreaOptions {
  groups_options?: Record<string, GroupOptions>;
  /**
   * Opt this area into the room-mode tile by picking the entity. When
   * not set, the room view auto-detects: if the area has exactly one
   * `input_select.*` entity whose object_id contains "mode", that one
   * is used. The tile is omitted when neither path resolves an entity.
   */
  room_mode_entity?: string;
  /**
   * Optional sticky-lock companion rendered next to the room-mode
   * tile in the room view. Typically `input_boolean.<area>_sticky` —
   * when on, your room automation suppresses auto-mode-changes. The
   * companion tile is only rendered when this is set AND the
   * room-mode tile itself rendered.
   */
  room_mode_sticky_entity?: string;
  /**
   * Per-area opt-out for the auto-rendered zone-presence card in the
   * room view. Defaults to true. Set to false to skip the auto-render
   * for this area only — useful when an area has many occupancy/motion
   * sensors that you don't want grouped into a card.
   */
  show_zone_presence?: boolean;
  /**
   * Pin this area's auto-rendered room-mode tile into the overview's
   * favorites subsection. The tile is identical to the one at the top
   * of the room view (mode picker + sticky-lock feature when
   * configured). Default false. Useful when the user lives in one
   * room and wants its mode controls visible at a glance on the
   * overview without manually setting up a custom_cards entry.
   */
  pin_room_mode_to_favorites?: boolean;
  /**
   * Pin this area's auto-rendered zone-presence card into the
   * overview's favorites subsection. Same auto-detection rules as
   * the room view (≥2 binary_sensors with device_class ∈
   * {occupancy, motion, presence}). Default false.
   */
  pin_zone_presence_to_favorites?: boolean;
  /**
   * Single source of truth for the area's zone-presence card.
   * When set, BOTH the Room view's auto-rendered presence card AND
   * the favorites pin use this list verbatim instead of the
   * device-class auto-detect.
   *
   * Each entry can be a string (entity ID) or an object
   * `{ entity, name?, icon?, color?, tap_action?, ... }` — the same
   * shape the zone-presence card itself accepts. Useful when an
   * area has many occupancy sensors but you want the strategy to
   * surface only a few, with consistent icons/colors across every
   * surface it appears on.
   *
   * When unset, both surfaces auto-detect by device_class ∈
   * {occupancy, motion, presence}.
   */
  presence_entities?: Array<string | PresenceZoneEntry>;
}

export interface GroupOptions {
  hidden?: string[];
  order?: string[];
  additional?: string[]; // Extra entities to include (used by badges group)
  names_visible?: string[]; // Override show_name to true (used by badges group)
  names_hidden?: string[]; // Override show_name to false (used by badges group)
  [key: string]: unknown;
}

// -- Weather Presentation ---------------------------------------------

/**
 * Selects the built-in weather card variant rendered in the weather
 * section. Setting 'none' suppresses the built-in card entirely so a
 * custom_cards entry with target_section='weather' can stand alone.
 *
 * - `forecast_daily`       — `weather-forecast` with `forecast_type: daily`
 * - `forecast_hourly`      — `weather-forecast` with `forecast_type: hourly`
 * - `forecast_twice_daily` — `weather-forecast` with `forecast_type: twice_daily`
 * - `tile`                 — HA core `tile` card bound to the weather entity
 * - `none`                 — omit built-in card; section keeps heading + slot
 */
export type WeatherPresentation =
  | 'forecast_daily'
  | 'forecast_hourly'
  | 'forecast_twice_daily'
  | 'tile'
  | 'none';

// -- Weather Sensors --------------------------------------------------

/**
 * Inline sensor display in the weather section header. Rendered as an
 * icon + value (+ optional unit) using a markdown card with text_only.
 * The value is read via a template, so the entity's live state is used.
 */
export interface WeatherSensorConfig {
  /** Entity id, e.g. `sensor.outdoor_temperature`. Required. */
  entity: string;
  /** MDI icon to show before the value. Default: `mdi:gauge`. */
  icon?: string;
  /** Unit string appended to the value, e.g. `"°C"` or `"km/h"`. */
  unit?: string;
  /** Round the numeric value to N decimals. Omit to show raw state. */
  round?: number;
}

// -- Custom Views -----------------------------------------------------

export interface CustomView {
  /** View title shown in the navigation */
  title?: string;
  /** URL path for the view */
  path?: string;
  /** MDI icon for the view tab */
  icon?: string;
  /** Raw YAML string entered by the user in the editor */
  yaml?: string;
  /** Parsed Lovelace view config (generated from yaml) */
  parsed_config?: Record<string, any> | null;
  /** YAML parse error message, if any */
  _yaml_error?: string;
}

// -- Custom Badges ----------------------------------------------------

export interface CustomBadge {
  /** Raw YAML string entered by the user in the editor */
  yaml?: string;
  /** Parsed Lovelace badge config (generated from yaml) */
  parsed_config?: Record<string, any> | null;
  /** YAML parse error message, if any */
  _yaml_error?: string;
}

// -- Custom Cards -----------------------------------------------------

export interface CustomCard {
  /** Optional title shown as heading above the card */
  title?: string;
  /** Target section where this card appears (default: 'custom_cards').
   *  Accepts built-in SectionKeys OR a user-defined custom_sections[].key. */
  target_section?: SectionKey | string;
  /** Raw YAML string entered by the user in the editor */
  yaml?: string;
  /** Parsed Lovelace card config (generated from yaml) */
  parsed_config?: Record<string, any> | null;
  /** YAML parse error message, if any */
  _yaml_error?: string;
}

// -- Custom Sections --------------------------------------------------
// User-declared sections that render alongside built-ins. Lighter-weight
// extension hook than full plugin/extension API — users get their own
// heading + card list in YAML without forking. The section can be
// positioned via `sections_order` (its `key` is a valid order entry),
// custom_cards can target it via `target_section`, and it auto-hides
// when `cards` is empty.

export interface CustomSection {
  /** Required unique key (must not collide with a built-in SectionKey).
   *  Used as the entry in sections_order and as custom_cards.target_section. */
  key: string;
  /** Heading text shown at the top of the section */
  heading?: string;
  /** Optional MDI icon for the heading */
  icon?: string;
  /** Raw YAML string entered by the user in the editor — a Lovelace card
   *  config array, e.g. `- type: markdown\n  content: ...` */
  yaml?: string;
  /** Parsed array of Lovelace card configs (derived from yaml) */
  parsed_config?: Record<string, any>[] | null;
  /** YAML parse error message, if any */
  _yaml_error?: string;
}

// -- Room Entities (entity collections per area) ----------------------

export interface RoomEntities {
  lights: string[];
  covers: string[];
  covers_curtain: string[];
  covers_window: string[];
  scenes: string[];
  climate: string[];
  media_player: string[];
  vacuum: string[];
  fan: string[];
  /** humidifier domain — covers both humidifier and dehumidifier devices */
  humidifier: string[];
  /** valve domain (HA 2024+) — irrigation, gas, water shutoff */
  valve: string[];
  /** water_heater domain — boilers, heat pumps */
  water_heater: string[];
  switches: string[];
  locks: string[];
  automations: string[];
  scripts: string[];
  cameras: string[];
  [key: string]: string[];
}

// -- Sensor Entities (sensor types discovered per area) ---------------

export interface SensorEntities {
  temperature: string[];
  humidity: string[];
  pm1: string[];
  pm25: string[];
  pm10: string[];
  co2: string[];
  voc: string[];
  motion: string[];
  occupancy: string[];
  illuminance: string[];
  absolute_humidity: string[];
  soil_moisture: string[];
  battery: string[];
  window: string[];
  door: string[];
  smoke: string[];
  gas: string[];
}

// -- Person Data (used in overview badges) ----------------------------

export interface PersonData {
  entity_id: string;
  name: string;
  state: string;
  isHome: boolean;
}

// -- Summary Types (used by summary cards) ----------------------------

export type SummaryType = 'lights' | 'covers' | 'security' | 'batteries' | 'climate';

// -- Resolved Area (internal, enriched area for rendering) ------------

export interface ResolvedArea {
  area_id: string;
  name: string;
  icon: string | null;
  floor_id: string | null;
  floor_name: string | null;
  floor_level: number | null;
  entities: RoomEntities;
  sensors: SensorEntities;
  temperature_entity_id: string | null;
  humidity_entity_id: string | null;
}

// -- Floor Group (areas grouped by floor) -----------------------------

export interface FloorGroup {
  floor_id: string | null;
  floor_name: string;
  floor_level: number | null;
  floor_icon: string | null;
  areas: ResolvedArea[];
}

// -- Strategy Generate Result -----------------------------------------

export interface StrategyDashboardConfig {
  title?: string;
  views: StrategyViewConfig[];
}

export interface StrategyViewConfig {
  title?: string;
  path?: string;
  icon?: string;
  type?: string;
  subview?: boolean;
  max_columns?: number;
  dense_section_placement?: boolean;
  badges?: Record<string, any>[];
  header?: Record<string, any>;
  sections?: Record<string, any>[];
  cards?: Record<string, any>[];
  strategy?: { type: string; [key: string]: any };
}
