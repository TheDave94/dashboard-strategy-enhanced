// ====================================================================
// VIEW STRATEGY — ROOM (Room detail with sensor badges + cameras)
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import type {
  LovelaceViewConfig,
  LovelaceCardConfig,
  LovelaceSectionConfig,
  LovelaceBadgeConfig,
} from '../types/lovelace';
import type { AreaRegistryEntry } from '../types/registries';
import type { RoomEntities, SensorEntities, RoomSectionKey } from '../types/strategy';
import { DEFAULT_ROOM_SECTION_ORDER } from '../types/strategy';
import { stripAreaName, tileName, sortByLastChanged } from '../utils/name-utils';
import { Registry } from '../Registry';
import { timeStart, timeEnd, debugLog } from '../utils/debug';
import { localize } from '../utils/localize';
import { resolveDensity } from '../utils/density';
import { BADGE_COLOR_MAP, getColorForEntity, isDefaultShowName, resolveShowName } from '../utils/badge-utils';
import { applyStateIcon } from '../utils/state-iconography';
import {
  extractCameraCompanions,
  hasAnyCompanion,
  sanitizeCompanionList,
} from '../utils/camera-companions';
import {
  isBubbleActionable,
  isBubbleCardInstalled,
  withBubbleTapAction,
} from '../utils/bubble-integration';

// HA supported_features bitmask values
const FAN_SET_SPEED = 1;
const MEDIA_PAUSE = 1;
const MEDIA_PLAY = 16384;
const MEDIA_STOP = 4096;

/** Check if a fan supports speed control */
function fanSupportsSpeed(state: HassEntity): boolean {
  return ((state.attributes?.supported_features as number) & FAN_SET_SPEED) !== 0;
}

/** Check if a media player supports playback controls */
function mediaPlayerSupportsPlayback(state: HassEntity): boolean {
  const f = (state.attributes?.supported_features as number) || 0;
  return (f & (MEDIA_PAUSE | MEDIA_PLAY | MEDIA_STOP)) !== 0;
}

class OrielViewRoom extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    const area: AreaRegistryEntry = config.area;
    debugLog(`room-generate-${area.area_id}: called at ${performance.now().toFixed(1)}ms after page load`);
    timeStart(`room-generate-${area.area_id}`);
    const dashboardConfig = config.dashboardConfig || {};

    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, dashboardConfig);
    const groupsOptions: Record<string, any> = config.groups_options || {};

    const roomEntities: RoomEntities = {
      lights: [],
      covers: [],
      covers_curtain: [],
      covers_window: [],
      scenes: [],
      climate: [],
      media_player: [],
      vacuum: [],
      fan: [],
      humidifier: [],
      valve: [],
      water_heater: [],
      switches: [],
      locks: [],
      automations: [],
      scripts: [],
      cameras: [],
    };

    const sensorEntities: SensorEntities = {
      temperature: [],
      humidity: [],
      pm1: [],
      pm25: [],
      pm10: [],
      co2: [],
      voc: [],
      motion: [],
      occupancy: [],
      illuminance: [],
      absolute_humidity: [],
      soil_moisture: [],
      battery: [],
      window: [],
      door: [],
      smoke: [],
      gas: [],
    };

    // Main categorization loop — use pre-filtered visible entities from Registry
    // (no hidden, no_dboard, config/diagnostic, config-hidden)
    const visibleEntities = Registry.getVisibleEntitiesForArea(area.area_id);

    // Filter unavailable entities from per-room domain lists / sensor badges.
    // Default true: unavailable items are noise in a room view (offline devices,
    // dead batteries surface elsewhere via the batteries view + alert badge).
    const hideUnavailable = dashboardConfig.hide_unavailable_in_rooms !== false;

    for (const entity of visibleEntities) {
      const entityId = entity.entity_id;

      // State check
      const state = hass.states[entityId];
      if (!state) continue;
      if (hideUnavailable && state.state === 'unavailable') continue;

      // Domain categorization
      const domain = entityId.split('.')[0];
      const deviceClass = state.attributes?.device_class as string | undefined;
      const unit = state.attributes?.unit_of_measurement as string | undefined;

      if (domain === 'light') {
        roomEntities.lights.push(entityId);
        continue;
      }
      if (domain === 'cover') {
        if (deviceClass === 'curtain') roomEntities.covers_curtain.push(entityId);
        else if (deviceClass === 'window' || deviceClass === 'door' || deviceClass === 'gate' || deviceClass === 'garage') roomEntities.covers_window.push(entityId);
        else roomEntities.covers.push(entityId);
        continue;
      }
      if (domain === 'scene') {
        roomEntities.scenes.push(entityId);
        continue;
      }
      if (domain === 'climate') {
        roomEntities.climate.push(entityId);
        continue;
      }
      if (domain === 'media_player') {
        roomEntities.media_player.push(entityId);
        continue;
      }
      if (domain === 'vacuum') {
        roomEntities.vacuum.push(entityId);
        continue;
      }
      if (domain === 'fan') {
        roomEntities.fan.push(entityId);
        continue;
      }
      if (domain === 'humidifier') {
        roomEntities.humidifier.push(entityId);
        continue;
      }
      if (domain === 'valve') {
        roomEntities.valve.push(entityId);
        continue;
      }
      if (domain === 'water_heater') {
        roomEntities.water_heater.push(entityId);
        continue;
      }
      if (domain === 'switch') {
        roomEntities.switches.push(entityId);
        continue;
      }
      if (domain === 'lock' && dashboardConfig.show_locks_in_rooms) {
        roomEntities.locks.push(entityId);
        continue;
      }
      if (domain === 'automation' && dashboardConfig.show_automations_in_rooms) {
        roomEntities.automations.push(entityId);
        continue;
      }
      if (domain === 'script' && dashboardConfig.show_scripts_in_rooms) {
        roomEntities.scripts.push(entityId);
        continue;
      }
      if (domain === 'camera' && dashboardConfig.show_cameras_in_rooms !== false) {
        roomEntities.cameras.push(entityId);
        continue;
      }

      // Sensors for badges
      if (domain === 'sensor') {
        if (entityId.includes('battery') || deviceClass === 'battery') {
          const val = parseFloat(state.state);
          if (!isNaN(val) && val < 20) sensorEntities.battery.push(entityId);
          continue;
        }
        // Temperature and humidity badges are only shown when explicitly
        // assigned in HA area settings (area.temperature_entity_id / humidity_entity_id).
        // No auto-detection — avoids wrong sensors (e.g. heater temperature).
        if (deviceClass === 'temperature' || unit === '°C' || unit === '°F') continue;
        // Soil/plant moisture sensors are auto-detected (device_class === 'moisture'
        // on sensor.* — distinct from binary_sensor.moisture which means a leak).
        // Check before the '%' fallthrough so we don't lose them.
        if (deviceClass === 'moisture') {
          sensorEntities.soil_moisture.push(entityId);
          continue;
        }
        if (deviceClass === 'humidity' || unit === '%') continue;
        if (unit === 'g/m³') {
          sensorEntities.absolute_humidity.push(entityId);
          continue;
        }
        if (deviceClass === 'pm1' || entityId.includes('pm_1') || /(^|_)pm1($|_)/.test(entityId)) {
          sensorEntities.pm1.push(entityId);
          continue;
        }
        if (deviceClass === 'pm25' || entityId.includes('pm_2_5') || entityId.includes('pm25')) {
          sensorEntities.pm25.push(entityId);
          continue;
        }
        if (deviceClass === 'pm10' || entityId.includes('pm_10') || entityId.includes('pm10')) {
          sensorEntities.pm10.push(entityId);
          continue;
        }
        if (deviceClass === 'carbon_dioxide' || entityId.includes('co2')) {
          sensorEntities.co2.push(entityId);
          continue;
        }
        if (deviceClass === 'volatile_organic_compounds' || entityId.includes('voc')) {
          sensorEntities.voc.push(entityId);
          continue;
        }
        if (deviceClass === 'illuminance' || unit === 'lx') {
          sensorEntities.illuminance.push(entityId);
          continue;
        }
      }
      if (domain === 'binary_sensor') {
        if (deviceClass === 'motion') {
          sensorEntities.motion.push(entityId);
          continue;
        }
        if (deviceClass === 'occupancy' || deviceClass === 'presence') {
          sensorEntities.occupancy.push(entityId);
          continue;
        }
        if (deviceClass === 'window') {
          sensorEntities.window.push(entityId);
          continue;
        }
        if (deviceClass === 'door') {
          sensorEntities.door.push(entityId);
          continue;
        }
        if (deviceClass === 'smoke') {
          sensorEntities.smoke.push(entityId);
          continue;
        }
        if (deviceClass === 'gas') {
          sensorEntities.gas.push(entityId);
          continue;
        }
      }
    }

    // Apply groups_options filters
    const applyGroupFilter = (groupKey: keyof RoomEntities): string[] => {
      const groupOpts = groupsOptions[groupKey];
      const baseList: string[] = roomEntities[groupKey] ?? [];
      if (!groupOpts) return baseList;
      let filtered: string[] = baseList;
      if (groupOpts.hidden?.length > 0) {
        const hiddenSet = new Set<string>(groupOpts.hidden);
        filtered = filtered.filter((e: string) => !hiddenSet.has(e));
      }
      if (groupOpts.order?.length > 0) {
        const orderMap = new Map<string, number>(groupOpts.order.map((id: string, i: number) => [id, i]));
        filtered.sort((a: string, b: string) => (orderMap.get(a) ?? 9999) - (orderMap.get(b) ?? 9999));
      }
      return filtered;
    };

    for (const key of Object.keys(roomEntities) as (keyof RoomEntities)[]) {
      roomEntities[key] = applyGroupFilter(key);
    }

    // === BADGES ===

    // Primary temp/humidity from area config (always shown, not filterable)
    let primaryTemp: string | null = null;
    let primaryHumidity: string | null = null;

    if (
      area.temperature_entity_id &&
      hass.states[area.temperature_entity_id] &&
      !Registry.isEntityExcluded(area.temperature_entity_id)
    ) {
      primaryTemp = area.temperature_entity_id;
    }
    if (
      area.humidity_entity_id &&
      hass.states[area.humidity_entity_id] &&
      !Registry.isEntityExcluded(area.humidity_entity_id)
    ) {
      primaryHumidity = area.humidity_entity_id;
    }

    // Build auto-detected badge candidates
    const badgeOpts = groupsOptions.badges;
    const hasBadgeConfig = !!badgeOpts;

    interface BadgeCandidate {
      entity: string;
      color: string;
      showName?: boolean;
    }

    const candidates: BadgeCandidate[] = [];

    // Auto-detected sensors (first match per type, except window/door which show all)
    // Colors from shared BADGE_COLOR_MAP, show_name from shared isDefaultShowName()
    const addCandidate = (entityId: string, colorKey: string, dcOverride?: string) => {
      const dc = dcOverride || (hass.states[entityId]?.attributes?.device_class as string | undefined);
      candidates.push({
        entity: entityId,
        color: BADGE_COLOR_MAP[colorKey] || 'grey',
        ...(isDefaultShowName(dc) ? { showName: true } : {}),
      });
    };

    // Single-match sensor types
    const singleTypes: Array<[string[], string]> = [
      [sensorEntities.pm1, 'pm1'],
      [sensorEntities.pm25, 'pm25'],
      [sensorEntities.pm10, 'pm10'],
      [sensorEntities.co2, 'carbon_dioxide'],
      [sensorEntities.voc, 'volatile_organic_compounds'],
      [sensorEntities.illuminance, 'illuminance'],
      [sensorEntities.battery, 'battery'],
      [sensorEntities.motion, 'motion'],
      [sensorEntities.occupancy, 'occupancy'],
      [sensorEntities.absolute_humidity, 'moisture'],
      [sensorEntities.soil_moisture, 'moisture'],
      [sensorEntities.smoke, 'smoke'],
      [sensorEntities.gas, 'gas'],
    ];
    for (const [entities, colorKey] of singleTypes) {
      if (entities[0]) addCandidate(entities[0], colorKey);
    }

    // Window/door: show ALL matches (not just first), users control via per-area hidden[]
    // Per-domain opt-out via show_window_contacts_in_rooms / show_door_contacts_in_rooms
    // (default true — preserves prior behavior; set false to silence the badge type).
    if (dashboardConfig.show_window_contacts_in_rooms !== false) {
      for (const id of sensorEntities.window) addCandidate(id, 'window', 'window');
    }
    if (dashboardConfig.show_door_contacts_in_rooms !== false) {
      for (const id of sensorEntities.door) addCandidate(id, 'door', 'door');
    }

    // Apply per-area badge config: filter hidden, append additional
    let filteredCandidates = candidates;
    if (hasBadgeConfig) {
      if (badgeOpts.hidden?.length) {
        const hiddenSet = new Set<string>(badgeOpts.hidden);
        filteredCandidates = filteredCandidates.filter((b) => !hiddenSet.has(b.entity));
      }
      if (badgeOpts.additional?.length) {
        for (const entityId of badgeOpts.additional) {
          if (hass.states[entityId] && !filteredCandidates.some((b) => b.entity === entityId)) {
            filteredCandidates.push({ entity: entityId, color: getColorForEntity(entityId, hass) });
          }
        }
      }
    }

    // Resolve show_name per badge: default + config overrides
    const namesVisible = hasBadgeConfig ? new Set<string>(badgeOpts.names_visible || []) : null;
    const namesHidden = hasBadgeConfig ? new Set<string>(badgeOpts.names_hidden || []) : null;

    // Convert to LovelaceBadgeConfig
    const badges: LovelaceBadgeConfig[] = [];
    if (primaryTemp) badges.push({ type: 'entity', entity: primaryTemp, color: 'red', tap_action: { action: 'more-info' } });
    if (primaryHumidity) badges.push({ type: 'entity', entity: primaryHumidity, color: 'indigo', tap_action: { action: 'more-info' } });
    for (const b of filteredCandidates) {
      const showName = resolveShowName(b.entity, !!b.showName, namesVisible, namesHidden);
      badges.push({
        type: 'entity',
        entity: b.entity,
        color: b.color,
        tap_action: { action: 'more-info' },
        ...(showName ? { show_name: true } : {}),
      });
    }

    // === SECTIONS ===
    const sections: LovelaceSectionConfig[] = [];
    // Reorderable entity-group sections (#293) are collected here by key
    // and appended in the configured order after the fixed-top sections
    // (camera-hero, cameras) and before the specials (pins/room-mode
    // unshift to the top, zone-presence pushes to the bottom). When
    // room_section_order is unset the default order reproduces the
    // canonical emit order, so output is byte-identical to before.
    const groupSections = new Map<RoomSectionKey, LovelaceSectionConfig>();

    // Resolve per-area options early — used by the camera hero block
    // below, and again later for room-mode tile resolution. Reading
    // it once at the top of the section-building flow keeps both
    // sites referring to the same shape.
    const areaOptsEarly: Record<string, unknown> =
      (dashboardConfig.areas_options?.[area.area_id] as Record<string, unknown>) || {};

    // Camera hero — when `areas_options.<area>.camera_hero: true`, emit
    // the first camera as a full-width live picture card at the top of
    // the room view, no heading, no other section chrome. The rest of
    // the cameras (if any) still render in the regular "Cameras"
    // section below.
    if (areaOptsEarly.camera_hero === true && roomEntities.cameras.length > 0) {
      const heroId = roomEntities.cameras[0];
      if (heroId && hass.states[heroId]) {
        sections.push({
          type: 'grid',
          cards: [
            {
              type: 'picture-entity',
              entity: heroId,
              camera_image: heroId,
              camera_view: 'live',
              fit_mode: 'cover',
              show_name: false,
              show_state: false,
              grid_options: { columns: 'full', rows: 4 },
            } as LovelaceCardConfig,
          ],
        });
      }
    }

    // Cameras
    if (roomEntities.cameras.length > 0) {
      // When camera_hero is set, the first camera already renders as
      // the hero above — exclude it from the regular Cameras section
      // to avoid duplicate emission. The Cameras section still
      // appears if there are additional cameras after the hero.
      const heroExclude =
        areaOptsEarly.camera_hero === true && roomEntities.cameras.length > 0
          ? roomEntities.cameras[0]
          : undefined;
      const cameraCards: LovelaceCardConfig[] = [];
      // Resolved once per area — applies to every camera in this room.
      // Default = all five companion kinds; the editor knob lets users
      // opt categories out (e.g. hide battery readouts but keep motion).
      const companionsEnabled = sanitizeCompanionList(
        dashboardConfig.room_camera_companions,
      );

      for (const cameraId of roomEntities.cameras) {
        if (cameraId === heroExclude) continue;
        if (!hass.states[cameraId]) continue;

        // Vendor-agnostic companion extraction. Replaced the v3.x
        // Reolink/Aqara hardcoded branches — the extraction logic is
        // pure HA device-class introspection, not vendor-specific.
        const companions = extractCameraCompanions(cameraId, hass, companionsEnabled);

        if (hasAnyCompanion(companions)) {
          const glanceEntities: Array<{ entity: string }> = [];
          // Stable ordering: light → motion → siren → battery → doorbell.
          // Matches the extractor's bucket order so the UI is consistent
          // across cards.
          if (companions.light) glanceEntities.push({ entity: companions.light });
          if (companions.motion) glanceEntities.push({ entity: companions.motion });
          if (companions.siren) glanceEntities.push({ entity: companions.siren });
          if (companions.battery) glanceEntities.push({ entity: companions.battery });
          if (companions.doorbell) glanceEntities.push({ entity: companions.doorbell });

          cameraCards.push({
            type: 'picture-glance',
            camera_image: cameraId,
            // Always 'auto' — battery-powered cams shouldn't stream
            // continuously and there's no reliable way to detect which
            // are wired vs battery from registry data alone. The
            // previous Aqara-specific 'live' override is dropped; users
            // who want continuous streaming can configure it via the
            // camera_hero per-area option instead.
            camera_view: 'auto',
            fit_mode: 'cover',
            title: stripAreaName(cameraId, area, hass),
            entities: glanceEntities,
          });
        } else {
          cameraCards.push({
            type: 'picture-entity',
            entity: cameraId,
            camera_image: cameraId,
            camera_view: 'auto',
            name: stripAreaName(cameraId, area, hass),
            show_name: true,
            show_state: false,
          });
        }
      }
      if (cameraCards.length > 0) {
        sections.push({
          type: 'grid',
          cards: [{ type: 'heading', heading: localize('room.cameras'), heading_style: 'title', icon: 'mdi:cctv' }, ...cameraCards],
        });
      }
    }

    // Sort lights by last_changed (unless custom order)
    if (!groupsOptions.lights?.order) {
      roomEntities.lights.sort((a, b) => sortByLastChanged(a, b, hass));
    }

    // Bubble Card tile rewiring — when `use_bubble_drawers: true` AND
    // bubble-card is installed, every actionable-domain tile's
    // tap_action is rewritten to navigate to the matching pop-up hash
    // (registered in OverviewViewStrategy). Computed once per room.
    const bubbleEnabled =
      dashboardConfig.use_bubble_drawers === true && isBubbleCardInstalled();
    const maybeBubble = <T extends Record<string, unknown>>(
      tile: T,
      entityId: string,
    ): T => (bubbleEnabled ? withBubbleTapAction(tile, entityId) : tile);

    // Helper: create a domain section, registered by key for ordered
    // assembly (#293) instead of pushed inline.
    const domainSection = (
      key: RoomSectionKey,
      entities: string[],
      heading: string,
      icon: string,
      tileConfig: (e: string) => LovelaceCardConfig
    ): void => {
      if (entities.length === 0) return;
      groupSections.set(key, {
        type: 'grid',
        cards: [{ type: 'heading', heading, heading_style: 'title', icon }, ...entities.map(tileConfig)],
      });
    };

    if (roomEntities.lights.length > 0) {
      const lightsDensity = resolveDensity(dashboardConfig);
      groupSections.set('lights', {
        type: 'grid',
        cards: [
          {
            type: 'custom:oriel-lights-group-card',
            entities: roomEntities.lights,
            group_type: 'all',
            heading_label: localize('room.lighting'),
            heading_icon: 'mdi:lightbulb',
            area,
            default_expanded: true,
            nested_groups: dashboardConfig.nested_light_groups === true,
            sort_by: dashboardConfig.lights_sort_by === 'name' ? 'name' : 'last_changed',
            ...(lightsDensity ? { density: lightsDensity } : {}),
            ...(bubbleEnabled ? { bubble_drawers: true } : {}),
          },
        ],
      });
    }

    domainSection('locks', roomEntities.locks, localize('room.locks'), 'mdi:lock', (e) =>
      applyStateIcon(
        {
          type: 'tile',
          entity: e,
          name: tileName(e, area, hass, dashboardConfig),
          features: [{ type: 'lock-commands' }],
          features_position: 'inline',
          vertical: false,
          state_content: 'last_changed',
        },
        hass,
        e,
      ),
    );

    domainSection('climate', roomEntities.climate, localize('room.climate'), 'mdi:thermostat', (e) =>
      maybeBubble(
        {
          type: 'tile',
          entity: e,
          name: tileName(e, area, hass, dashboardConfig),
          features: [{ type: 'climate-hvac-modes' }],
          features_position: 'inline',
          vertical: false,
          state_content: ['hvac_action', 'current_temperature'],
        },
        e,
      ),
    );

    domainSection('covers', roomEntities.covers, localize('room.covers'), 'mdi:window-shutter', (e) =>
      maybeBubble(
        applyStateIcon(
          {
            type: 'tile',
            entity: e,
            name: tileName(e, area, hass, dashboardConfig),
            features: [{ type: 'cover-open-close' }],
            vertical: false,
            features_position: 'inline',
            state_content: ['current_position', 'last_changed'],
          },
          hass,
          e,
        ),
        e,
      ),
    );

    domainSection('curtains', roomEntities.covers_curtain, localize('room.curtains'), 'mdi:curtains', (e) =>
      maybeBubble(
        applyStateIcon(
          {
            type: 'tile',
            entity: e,
            name: tileName(e, area, hass, dashboardConfig),
            features: [{ type: 'cover-open-close' }],
            vertical: false,
            features_position: 'inline',
            state_content: ['current_position', 'last_changed'],
          },
          hass,
          e,
        ),
        e,
      ),
    );

    domainSection('windows', roomEntities.covers_window, localize('room.windows'), 'mdi:window-open-variant', (e) =>
      maybeBubble(
        applyStateIcon(
          {
            type: 'tile',
            entity: e,
            name: tileName(e, area, hass, dashboardConfig),
            features: [{ type: 'cover-open-close' }],
            vertical: false,
            features_position: 'inline',
            state_content: ['current_position', 'last_changed'],
          },
          hass,
          e,
        ),
        e,
      ),
    );

    domainSection('media', roomEntities.media_player, localize('room.media'), 'mdi:speaker', (e) => {
      const state = hass.states[e];
      const hasPlayback = state && mediaPlayerSupportsPlayback(state);
      return maybeBubble(
        {
          type: 'tile',
          entity: e,
          name: tileName(e, area, hass, dashboardConfig),
          vertical: false,
          ...(hasPlayback ? { features: [{ type: 'media-player-playback' }], features_position: 'inline' } : {}),
          state_content: ['media_title', 'media_artist'],
        },
        e,
      );
    });

    domainSection('scenes', roomEntities.scenes, localize('room.scenes'), 'mdi:palette', (e) => ({
      type: 'tile',
      entity: e,
      name: tileName(e, area, hass, dashboardConfig),
      vertical: false,
      state_content: 'last_changed',
    }));

    // Misc (vacuum, fan, switches)
    const miscCards: LovelaceCardConfig[] = [];
    for (const e of roomEntities.vacuum)
      miscCards.push({
        type: 'tile',
        entity: e,
        name: tileName(e, area, hass, dashboardConfig),
        features: [{ type: 'vacuum-commands' }],
        features_position: 'inline',
        vertical: false,
        state_content: 'last_changed',
      });
    for (const e of roomEntities.fan) {
      const state = hass.states[e];
      const hasSpeed = state && fanSupportsSpeed(state);
      miscCards.push(
        maybeBubble(
          {
            type: 'tile',
            entity: e,
            name: tileName(e, area, hass, dashboardConfig),
            ...(hasSpeed ? { features: [{ type: 'fan-speed' }], features_position: 'inline' } : {}),
            vertical: false,
            state_content: 'last_changed',
          },
          e,
        ),
      );
    }
    for (const e of roomEntities.switches)
      miscCards.push({
        type: 'tile',
        entity: e,
        name: tileName(e, area, hass, dashboardConfig),
        vertical: false,
        state_content: 'last_changed',
      });
    for (const e of roomEntities.humidifier)
      miscCards.push({
        type: 'tile',
        entity: e,
        name: tileName(e, area, hass, dashboardConfig),
        features: [{ type: 'humidifier-toggle' }],
        features_position: 'inline',
        vertical: false,
        state_content: ['action', 'current_humidity'],
      });
    for (const e of roomEntities.valve)
      miscCards.push({
        type: 'tile',
        entity: e,
        name: tileName(e, area, hass, dashboardConfig),
        features: [{ type: 'valve-open-close' }],
        features_position: 'inline',
        vertical: false,
        state_content: 'last_changed',
      });
    for (const e of roomEntities.water_heater)
      miscCards.push({
        type: 'tile',
        entity: e,
        name: tileName(e, area, hass, dashboardConfig),
        features: [{ type: 'water-heater-operation-modes' }],
        features_position: 'inline',
        vertical: false,
        state_content: ['operation_mode', 'current_temperature'],
      });

    miscCards.sort((a, b) => {
      const sA = hass.states[a.entity];
      const sB = hass.states[b.entity];
      if (!sA || !sB) return 0;
      return new Date(sB.last_changed).getTime() - new Date(sA.last_changed).getTime();
    });

    if (miscCards.length > 0) {
      groupSections.set('misc', {
        type: 'grid',
        cards: [
          { type: 'heading', heading: localize('room.misc'), heading_style: 'title', icon: 'mdi:dots-horizontal' },
          ...miscCards,
        ],
      });
    }

    domainSection('automations', roomEntities.automations, localize('room.automations'), 'mdi:robot', (e) => ({
      type: 'tile',
      entity: e,
      name: tileName(e, area, hass, dashboardConfig),
      vertical: false,
      state_content: 'last_changed',
    }));

    domainSection('scripts', roomEntities.scripts, localize('room.scripts'), 'mdi:script-text', (e) => ({
      type: 'tile',
      entity: e,
      name: tileName(e, area, hass, dashboardConfig),
      vertical: false,
    }));

    // Append the reorderable entity-group sections in the configured
    // order (#293). Effective order = user keys (valid + deduped) then
    // any default keys they omitted — so a partial/unknown config never
    // drops a section. Unset → DEFAULT_ROOM_SECTION_ORDER → canonical order.
    const configuredOrder = Array.isArray(dashboardConfig.room_section_order)
      ? dashboardConfig.room_section_order
      : [];
    const seen = new Set<RoomSectionKey>();
    const effectiveOrder: RoomSectionKey[] = [];
    for (const key of [...configuredOrder, ...DEFAULT_ROOM_SECTION_ORDER]) {
      if (DEFAULT_ROOM_SECTION_ORDER.includes(key as RoomSectionKey) && !seen.has(key as RoomSectionKey)) {
        seen.add(key as RoomSectionKey);
        effectiveOrder.push(key as RoomSectionKey);
      }
    }
    for (const key of effectiveOrder) {
      const section = groupSections.get(key);
      if (section) sections.push(section);
    }

    // Room Pins
    const roomPinEntities: string[] = dashboardConfig.room_pin_entities || [];
    const pinsForArea = roomPinEntities.filter((entityId) => {
      const entity = Registry.getEntity(entityId);
      if (!entity) return false;
      if (entity.area_id === area.area_id) return true;
      if (entity.device_id) {
        const device = Registry.getDevice(entity.device_id);
        if (device?.area_id === area.area_id) return true;
      }
      return false;
    });

    if (pinsForArea.length > 0) {
      const pinsSection: LovelaceSectionConfig = {
        type: 'grid',
        cards: [
          { type: 'heading', heading: localize('room.room_pins'), heading_style: 'title', icon: 'mdi:pin' },
          ...pinsForArea.map((e) => {
            const pinStateContent: string[] = [];
            if (dashboardConfig.room_pins_show_state === true) pinStateContent.push('state');
            if (dashboardConfig.room_pins_hide_last_changed !== true) pinStateContent.push('last_changed');
            const tile: LovelaceCardConfig = {
              type: 'tile',
              entity: e,
              name: tileName(e, area, hass, dashboardConfig),
              vertical: false,
              ...(pinStateContent.length > 0 ? { state_content: pinStateContent } : {}),
            };
            return bubbleEnabled && isBubbleActionable(e) ? withBubbleTapAction(tile, e) : tile;
          }),
        ],
      };
      // Pin position: 'top' matches the documentation ("Spezielle Entitäten,
      // die ... ganz oben erscheinen") and the maintainer's video. Existing
      // dashboards rendered them at the bottom, so the explicit 'bottom'
      // setting is provided as an opt-in for users who relied on that.
      const pinsPosition = dashboardConfig.room_pins_position === 'bottom' ? 'bottom' : 'top';
      if (pinsPosition === 'top') {
        sections.unshift(pinsSection);
      } else {
        sections.push(pinsSection);
      }
    }

    // Room mode tile (opt-in). Renders at the very top of the room view
    // so the mode is the first thing the user sees / changes.
    //
    // Resolution order (no dashboard-wide fallback — that would bleed a
    // global "room_mode" entity into every room view, which is what we
    // explicitly don't want):
    //   1. Explicit per-area config: areas_options.<area>.room_mode_entity
    //   2. Auto-detect: a single `input_select.*` entity assigned to
    //      this area whose object_id contains "mode" (case-insensitive).
    //
    // Auto-detect intentionally skips when the heuristic finds 0 or
    // 2+ matches — silence is better than guessing wrong. Users who
    // want a non-matching entity, or have multiple candidates, set it
    // explicitly under areas_options.
    const areaOpts: Record<string, unknown> =
      (dashboardConfig.areas_options || {})[area.area_id] || {};
    let roomModeEntity = areaOpts.room_mode_entity as string | undefined;

    if (!roomModeEntity) {
      const candidates = Registry.getVisibleEntitiesForArea(area.area_id)
        .map((e) => e.entity_id)
        .filter((id) => {
          const objectId = id.split('.')[1];
          return id.startsWith('input_select.') && objectId !== undefined && /mode/i.test(objectId);
        });
      if (candidates.length === 1) roomModeEntity = candidates[0];
    }

    if (
      roomModeEntity &&
      Reflect.get(hass.states as Record<string, unknown>, roomModeEntity)
    ) {
      // Build the tile's `features:` array. The mode picker always
      // gets `select-options`. When a sticky entity is configured
      // (and present), we ALSO add our custom feature in the same
      // row — keeps the whole control in one tile, no extra height.
      const features: Array<Record<string, unknown>> = [{ type: 'select-options' }];
      const stickyEntity = areaOpts.room_mode_sticky_entity as string | undefined;
      if (
        stickyEntity &&
        Reflect.get(hass.states as Record<string, unknown>, stickyEntity)
      ) {
        features.push({
          type: 'custom:oriel-sticky-lock-feature',
          sticky_entity: stickyEntity,
        });
      }

      sections.unshift({
        type: 'grid',
        cards: [
          {
            type: 'tile',
            entity: roomModeEntity,
            name: localize('room.room_mode'),
            icon: dashboardConfig.room_mode_icon || 'mdi:home-account',
            color: 'accent',
            features,
            features_position: 'bottom',
            grid_options: { columns: 'full', rows: 'auto' },
          } as LovelaceCardConfig,
        ],
      });
    }

    // Auto-rendered zone-presence section. Two sources, priority order:
    //   1. Curated `areas_options.<area>.presence_entities` (string[] or
    //      `{ entity, name?, icon?, color? }` objects). Same field
    //      consulted by the favorites pin in OverviewSection, so a
    //      curated list shows identically in both places.
    //   2. Auto-detect: every visible binary_sensor in this area whose
    //      device_class is one of {occupancy, motion, presence}.
    //
    // Renders when ≥2 entities (curated or detected) — a single sensor
    // reads fine as a regular tile, the card adds value above that.
    //
    // Opt-out: areas_options.<area>.show_zone_presence === false, or
    // top-level show_zone_presence_in_rooms === false.
    // Hidden via the normal `no-dboard` label / Registry hide path on a
    // per-entity basis (visibleEntities already excludes those).
    const showZonePresence =
      areaOpts.show_zone_presence !== false &&
      dashboardConfig.show_zone_presence_in_rooms !== false;

    if (showZonePresence) {
      const curatedPresence = areaOpts.presence_entities;
      let zoneEntities: unknown[];
      if (Array.isArray(curatedPresence) && curatedPresence.length > 0) {
        zoneEntities = curatedPresence.filter((e) => {
          if (typeof e === 'string') return e.length > 0;
          return typeof (e as { entity?: unknown }).entity === 'string';
        });
      } else {
        const ZONE_CLASSES = new Set(['occupancy', 'motion', 'presence']);
        zoneEntities = visibleEntities
          .map((e) => e.entity_id)
          .filter((id) => {
            if (!id.startsWith('binary_sensor.')) return false;
            const s = hass.states[id];
            const dc = s?.attributes?.device_class as string | undefined;
            return dc !== undefined && ZONE_CLASSES.has(dc);
          });
      }

      if (zoneEntities.length >= 2) {
        sections.push({
          type: 'grid',
          cards: [
            {
              type: 'custom:oriel-zone-presence-card',
              entities: zoneEntities,
            } as LovelaceCardConfig,
          ],
        });
      }
    }

    // Per-area room view overrides (v3.4.0). When the user has set
    // `areas_options.<area>.room_view_overrides.sections`, either
    // append them to the auto-generated layout (`append_default: true`,
    // default) or replace it entirely (`append_default: false`).
    // Schema validation happens at editor time; here we trust the
    // parsed config and forward verbatim.
    const overrides = (areaOpts as { room_view_overrides?: {
      sections?: LovelaceSectionConfig[];
      append_default?: boolean;
    } }).room_view_overrides;

    let finalSections: LovelaceSectionConfig[] = sections;
    if (overrides && Array.isArray(overrides.sections) && overrides.sections.length > 0) {
      if (overrides.append_default === false) {
        finalSections = overrides.sections;
      } else {
        finalSections = [...sections, ...overrides.sections];
      }
    }

    debugLog(
      `Room ${area.area_id}: ${visibleEntities.length} visible entities, ${finalSections.length} sections, ${badges.length} badges${overrides ? ' (override)' : ''}`
    );
    timeEnd(`room-generate-${area.area_id}`);
    return { type: 'sections', header: { badges_position: 'bottom' }, sections: finalSections, badges };
  }
}

customElements.define('ll-strategy-view-oriel-room', OrielViewRoom);
