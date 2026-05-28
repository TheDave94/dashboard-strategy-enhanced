// ====================================================================
// VIEW STRATEGY — CAMERAS (Camera Overview)
// ====================================================================
// Aggregates every camera onto one screen, grouped by area. The
// picture-glance / picture-entity construction is intentionally
// DUPLICATED from RoomViewStrategy rather than shared — RoomViewStrategy
// is a documented complexity hotspot, and a v1 copy avoids refactor
// regression risk there. Companion discovery reuses camera-companions.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceSectionConfig, LovelaceCardConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { Registry } from '../Registry';
import { localize } from '../utils/localize';
import {
  extractCameraCompanions,
  hasAnyCompanion,
  sanitizeCompanionList,
} from '../utils/camera-companions';

interface CameraViewStrategyParams {
  config?: OrielConfig;
}

function getAreaIdForEntity(entityId: string): string | null {
  const entity = Registry.getEntity(entityId);
  let areaId: string | null = entity?.area_id ?? null;
  if (!areaId && entity?.device_id) {
    const device = Registry.getDevice(entity.device_id);
    areaId = device?.area_id ?? null;
  }
  return areaId;
}

function buildCameraCard(
  cameraId: string,
  hass: HomeAssistant,
  companionsEnabled: ReturnType<typeof sanitizeCompanionList>,
  title: string,
): LovelaceCardConfig {
  const companions = extractCameraCompanions(cameraId, hass, companionsEnabled);

  if (hasAnyCompanion(companions)) {
    const glanceEntities: Array<{ entity: string }> = [];
    // Stable ordering: light → motion → siren → battery → doorbell.
    if (companions.light) glanceEntities.push({ entity: companions.light });
    if (companions.motion) glanceEntities.push({ entity: companions.motion });
    if (companions.siren) glanceEntities.push({ entity: companions.siren });
    if (companions.battery) glanceEntities.push({ entity: companions.battery });
    if (companions.doorbell) glanceEntities.push({ entity: companions.doorbell });

    return {
      type: 'picture-glance',
      camera_image: cameraId,
      camera_view: 'auto',
      fit_mode: 'cover',
      title,
      entities: glanceEntities,
    };
  }

  return {
    type: 'picture-entity',
    entity: cameraId,
    camera_image: cameraId,
    camera_view: 'auto',
    name: title,
    show_name: true,
    show_state: false,
  };
}

class OrielViewCamera extends HTMLElement {
  static async generate(
    config: CameraViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    const strategyConfig = config.config || {};
    const cameraIds = Registry.getVisibleEntityIdsForDomain('camera').filter(
      (id) => hass.states[id] !== undefined,
    );
    const companionsEnabled = sanitizeCompanionList(strategyConfig.room_camera_companions);

    // Group by area; area-less cameras trail in an "unassigned" section.
    const byArea = new Map<string, string[]>();
    const ungrouped: string[] = [];
    for (const cameraId of cameraIds) {
      const areaId = getAreaIdForEntity(cameraId);
      if (areaId && hass.areas?.[areaId]) {
        const list = byArea.get(areaId) || [];
        list.push(cameraId);
        byArea.set(areaId, list);
      } else {
        ungrouped.push(cameraId);
      }
    }

    const sections: LovelaceSectionConfig[] = [];
    const pushSection = (heading: string, ids: string[]): void => {
      if (ids.length === 0) return;
      const cameraCards = ids.map((id) =>
        buildCameraCard(
          id,
          hass,
          companionsEnabled,
          (hass.states[id]?.attributes?.friendly_name as string | undefined) || id,
        ),
      );
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading, heading_style: 'title', icon: 'mdi:cctv' },
          ...cameraCards,
        ],
      });
    };

    // Areas sorted by name for stable, scannable output.
    const areaIds = [...byArea.keys()].sort((a, b) =>
      (hass.areas?.[a]?.name || '').localeCompare(hass.areas?.[b]?.name || ''),
    );
    for (const areaId of areaIds) {
      pushSection(hass.areas?.[areaId]?.name || areaId, byArea.get(areaId)!);
    }
    pushSection(localize('camera.no_area'), ungrouped);

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-view-oriel-camera', OrielViewCamera);
