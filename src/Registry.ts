// ====================================================================
// SIMON42 DASHBOARD STRATEGY - Registry (Singleton)
// ====================================================================
// Central data access layer. Replaces scattered entity filtering across
// multiple JS files with pre-computed Maps and Sets for O(1) lookups.
//
// Usage:
//   Registry.initialize(hass, config);   // once at strategy start
//   Registry.getEntitiesForArea('bad');   // anywhere afterwards
//   Registry.isEntityExcluded('light.x'); // full exclusion check
// ====================================================================

import type { HomeAssistant } from './types/homeassistant';
import type {
  EntityRegistryDisplayEntry,
  DeviceRegistryEntry,
  AreaRegistryEntry,
  FloorRegistryEntry,
} from './types/registries';
import type { Simon42StrategyConfig } from './types/strategy';

/**
 * Static singleton registry that holds all HA registry data and provides
 * fast lookups. Must be initialized once via Registry.initialize() before
 * any other access.
 *
 * Design mirrors Mushroom Strategy's Registry pattern: no instance creation,
 * all members are static, all maps are built once on initialize().
 */
class Registry {
  // Prevent instantiation
  private constructor() {}

  // === Raw data references ===

  private static _hass: HomeAssistant;
  private static _config: Simon42StrategyConfig;

  // === Fetched registry arrays (from WebSocket) ===

  /** Full entity registry entries fetched via callWS */
  private static _fetchedEntities: EntityRegistryDisplayEntry[];

  /** Full device registry entries fetched via callWS */
  private static _fetchedDevices: DeviceRegistryEntry[];

  /** Full area registry entries fetched via callWS */
  private static _fetchedAreas: AreaRegistryEntry[];

  // === Pre-computed Maps for O(1) lookups ===

  /** Entity registry entry by entity_id */
  private static _entityById: Map<string, EntityRegistryDisplayEntry>;

  /** Device registry entry by device id */
  private static _deviceById: Map<string, DeviceRegistryEntry>;

  /** Entity IDs grouped by device_id */
  private static _entitiesByDevice: Map<string, string[]>;

  /** Entity registry entries grouped by resolved area_id (entity.area_id || device.area_id) */
  private static _entitiesByArea: Map<string, EntityRegistryDisplayEntry[]>;

  /** Entity IDs grouped by domain prefix (e.g. "light", "sensor") */
  private static _entitiesByDomain: Map<string, string[]>;

  // === Pre-computed exclusion Sets ===

  /** Entities with the "no_dboard" label — excluded from all dashboard views */
  private static _excludeSet: Set<string>;

  /** Entities hidden via areas_options.*.groups_options.*.hidden in config */
  private static _hiddenFromConfig: Set<string>;

  /** Initialization flag */
  private static _initialized: boolean = false;

  // =====================================================================
  // Initialization
  // =====================================================================

  /**
   * Initialize the registry from HA data and strategy config.
   * Fetches full registry data via WebSocket (like Mushroom Strategy),
   * then builds pre-computed lookup maps and exclusion sets.
   * Must be called once before accessing any other Registry members.
   */
  static async initialize(hass: HomeAssistant, config: Simon42StrategyConfig): Promise<void> {
    Registry._hass = hass;
    Registry._config = config;

    // Fetch full registries via WebSocket API (official HA approach)
    await Registry._fetchRegistries();

    // Build pre-computed Maps/Sets for O(1) lookups
    Registry._buildEntityMaps();
    Registry._buildDeviceMaps();
    Registry._buildExclusionSets();

    Registry._initialized = true;
  }

  // =====================================================================
  // WebSocket registry fetch (like Mushroom Strategy)
  // =====================================================================

  /**
   * Fetch entity, device, and area registries from HA via WebSocket API.
   * This is the official approach used by Mushroom Strategy and HA frontend.
   * Falls back to hass object properties if WebSocket calls fail.
   */
  private static async _fetchRegistries(): Promise<void> {
    try {
      [Registry._fetchedEntities, Registry._fetchedDevices, Registry._fetchedAreas] =
        await Promise.all([
          Registry._hass.callWS<EntityRegistryDisplayEntry[]>({
            type: 'config/entity_registry/list',
          }),
          Registry._hass.callWS<DeviceRegistryEntry[]>({
            type: 'config/device_registry/list',
          }),
          Registry._hass.callWS<AreaRegistryEntry[]>({
            type: 'config/area_registry/list',
          }),
        ]);
    } catch (e) {
      console.warn(
        'Simon42 Strategy: WebSocket registry fetch failed, falling back to hass objects',
        e
      );
      // Fallback to hass object properties (pre-loaded by HA frontend)
      Registry._fetchedEntities = Object.values(Registry._hass.entities || {});
      Registry._fetchedDevices = Object.values(Registry._hass.devices || {});
      Registry._fetchedAreas = Object.values(Registry._hass.areas || {});
    }
  }

  // =====================================================================
  // Map building (private)
  // =====================================================================

  /**
   * Build entity lookup maps from fetched registry data and hass.states.
   *
   * - _entityById: O(1) lookup by entity_id
   * - _entitiesByDomain: entity IDs grouped by domain (from hass.states keys)
   * - _entitiesByDevice: entity IDs grouped by device_id
   * - _entitiesByArea: entity entries grouped by resolved area_id
   */
  private static _buildEntityMaps(): void {
    const entities = Registry._fetchedEntities;

    // Entity by ID
    Registry._entityById = new Map();
    for (const e of entities) {
      Registry._entityById.set(e.entity_id, e);
    }

    // Entities by domain (from hass.states keys, grouped by domain prefix)
    Registry._entitiesByDomain = new Map();
    for (const entityId of Object.keys(Registry._hass.states)) {
      const dotIndex = entityId.indexOf('.');
      const domain = entityId.substring(0, dotIndex);
      if (!Registry._entitiesByDomain.has(domain)) {
        Registry._entitiesByDomain.set(domain, []);
      }
      Registry._entitiesByDomain.get(domain)!.push(entityId);
    }

    // Entities by device
    Registry._entitiesByDevice = new Map();
    for (const e of entities) {
      if (e.device_id) {
        if (!Registry._entitiesByDevice.has(e.device_id)) {
          Registry._entitiesByDevice.set(e.device_id, []);
        }
        Registry._entitiesByDevice.get(e.device_id)!.push(e.entity_id);
      }
    }

    // Entities by area (resolving device->area for entities without direct area_id)
    Registry._entitiesByArea = new Map();
    const deviceAreaMap = new Map<string, string>();
    for (const d of Registry._fetchedDevices) {
      if (d.area_id) deviceAreaMap.set(d.id, d.area_id);
    }

    for (const e of entities) {
      const areaId =
        e.area_id || (e.device_id ? deviceAreaMap.get(e.device_id) : undefined);
      if (areaId) {
        if (!Registry._entitiesByArea.has(areaId)) {
          Registry._entitiesByArea.set(areaId, []);
        }
        Registry._entitiesByArea.get(areaId)!.push(e);
      }
    }
  }

  /** Build device lookup map from fetched device registry. */
  private static _buildDeviceMaps(): void {
    Registry._deviceById = new Map();
    for (const d of Registry._fetchedDevices) {
      Registry._deviceById.set(d.id, d);
    }
  }

  /**
   * Build exclusion sets from labels and config.
   *
   * Exclusion pipeline (matches the JS data-collectors logic):
   * 1. no_dboard label -> _excludeSet
   * 2. areas_options.*.groups_options.*.hidden -> _hiddenFromConfig
   */
  private static _buildExclusionSets(): void {
    // no_dboard label exclusion
    Registry._excludeSet = new Set();
    for (const e of Registry._fetchedEntities) {
      if (e.labels?.includes('no_dboard')) {
        Registry._excludeSet.add(e.entity_id);
      }
    }

    // Hidden from config (areas_options.{areaId}.groups_options.{domain}.hidden)
    Registry._hiddenFromConfig = new Set();
    const areasOptions = Registry._config.areas_options;
    if (areasOptions) {
      for (const areaOpts of Object.values(areasOptions)) {
        if (areaOpts.groups_options) {
          for (const groupOpts of Object.values(areaOpts.groups_options)) {
            if (groupOpts.hidden && Array.isArray(groupOpts.hidden)) {
              for (const id of groupOpts.hidden) {
                Registry._hiddenFromConfig.add(id);
              }
            }
          }
        }
      }
    }
  }

  // =====================================================================
  // Public accessors — raw data
  // =====================================================================

  /** The Home Assistant instance. */
  static get hass(): HomeAssistant {
    return Registry._hass;
  }

  /** The strategy configuration. */
  static get config(): Simon42StrategyConfig {
    return Registry._config;
  }

  /** Whether initialize() has been called. */
  static get initialized(): boolean {
    return Registry._initialized;
  }

  // =====================================================================
  // Entity lookups
  // =====================================================================

  /** Get entity registry entry by entity_id. O(1). */
  static getEntity(entityId: string): EntityRegistryDisplayEntry | undefined {
    return Registry._entityById.get(entityId);
  }

  /** Get all entity IDs for a given domain (e.g. "light", "sensor"). O(1). */
  static getEntityIdsForDomain(domain: string): string[] {
    return Registry._entitiesByDomain.get(domain) || [];
  }

  /**
   * Get all entity registry entries assigned to an area.
   * Includes entities whose device resolves to that area.
   * O(1).
   */
  static getEntitiesForArea(areaId: string): EntityRegistryDisplayEntry[] {
    return Registry._entitiesByArea.get(areaId) || [];
  }

  /** Get all entity IDs belonging to a device. O(1). */
  static getEntityIdsForDevice(deviceId: string): string[] {
    return Registry._entitiesByDevice.get(deviceId) || [];
  }

  // =====================================================================
  // Device lookups
  // =====================================================================

  /** Get device registry entry by device id. O(1). */
  static getDevice(deviceId: string): DeviceRegistryEntry | undefined {
    return Registry._deviceById.get(deviceId);
  }

  // =====================================================================
  // Area / Floor accessors
  // =====================================================================

  /** All area registry entries (from WebSocket fetch). */
  static get areas(): AreaRegistryEntry[] {
    return Registry._fetchedAreas || [];
  }

  /** All floor registry entries (from hass — no WS endpoint needed). */
  static get floors(): FloorRegistryEntry[] {
    return Object.values(Registry._hass.floors || {});
  }

  // =====================================================================
  // Exclusion checks
  // =====================================================================

  /** Check if entity is excluded by the "no_dboard" label. */
  static isExcludedByLabel(entityId: string): boolean {
    return Registry._excludeSet.has(entityId);
  }

  /** Check if entity is hidden via areas_options config. */
  static isHiddenByConfig(entityId: string): boolean {
    return Registry._hiddenFromConfig.has(entityId);
  }

  /**
   * Full exclusion check combining all filtering criteria.
   *
   * Matches the JS data-collectors pipeline:
   * 1. no_dboard label
   * 2. areas_options hidden
   * 3. hidden_by (user/integration) from entity registry
   * 4. disabled_by (user/integration) from entity registry
   * 5. entity_category "config" or "diagnostic" from entity registry
   */
  static isEntityExcluded(entityId: string): boolean {
    if (Registry._excludeSet.has(entityId)) return true;
    if (Registry._hiddenFromConfig.has(entityId)) return true;

    const entry = Registry._entityById.get(entityId);
    if (!entry) return false; // Entity not in registry — don't exclude

    if (entry.hidden_by) return true;
    if (entry.disabled_by) return true;
    if (entry.entity_category === 'config' || entry.entity_category === 'diagnostic')
      return true;

    return false;
  }

  /**
   * Extended exclusion check that also checks entity_category from
   * state attributes as a fallback.
   *
   * Use this for the summary card which works with hass.states keys
   * and may encounter entities where entity_category is only available
   * in state attributes, not the registry.
   */
  static isEntityExcludedWithStateCategory(entityId: string): boolean {
    if (Registry.isEntityExcluded(entityId)) return true;

    // Fallback: check entity_category from state attributes
    const state = Registry._hass.states[entityId];
    if (
      state?.attributes?.entity_category === 'config' ||
      state?.attributes?.entity_category === 'diagnostic'
    ) {
      return true;
    }

    return false;
  }

  // =====================================================================
  // Per-group hidden entities
  // =====================================================================

  /**
   * Get set of entity IDs hidden for a specific group key across all areas.
   *
   * Used by summary cards that need per-domain/group filtering from
   * areas_options.*.groups_options.{groupKey}.hidden.
   */
  static getHiddenForGroup(groupKey: string): Set<string> {
    const hidden = new Set<string>();
    const areasOptions = Registry._config.areas_options;
    if (!areasOptions) return hidden;

    for (const areaOpts of Object.values(areasOptions)) {
      const groupOpts = areaOpts.groups_options?.[groupKey];
      if (groupOpts?.hidden && Array.isArray(groupOpts.hidden)) {
        for (const id of groupOpts.hidden) {
          hidden.add(id);
        }
      }
    }
    return hidden;
  }

  /**
   * Get set of entity IDs hidden for a specific group in a specific area.
   *
   * Used by room views for area-scoped entity filtering.
   */
  static getHiddenForAreaGroup(areaId: string, groupKey: string): Set<string> {
    const hidden = new Set<string>();
    const groupOpts = Registry._config.areas_options?.[areaId]?.groups_options?.[groupKey];
    if (groupOpts?.hidden && Array.isArray(groupOpts.hidden)) {
      for (const id of groupOpts.hidden) {
        hidden.add(id);
      }
    }
    return hidden;
  }
}

export { Registry };
