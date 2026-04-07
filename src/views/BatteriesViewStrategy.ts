// ====================================================================
// VIEW STRATEGY — BATTERIES (Battery Status Overview)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';

class Simon42ViewBatteriesStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    await Registry.initialize(hass, config.config || {});

    // Use pre-filtered visible entity IDs from Registry (no hidden/disabled/excluded)
    const sensorIds = Registry.getVisibleEntityIdsForDomain('sensor');
    const binarySensorIds = Registry.getVisibleEntityIdsForDomain('binary_sensor');

    // Filter battery entities from pre-filtered sets
    const batteryEntities = [...sensorIds, ...binarySensorIds].filter(entityId => {
      const state = hass.states[entityId];
      if (!state) return false;

      const isBattery = entityId.includes('battery') || state.attributes?.device_class === 'battery';
      if (!isBattery) return false;

      // Platform-specific filter: hide mobile_app batteries if configured
      if (config.config?.hide_mobile_app_batteries) {
        const registryEntry = Registry.getEntity(entityId);
        if (registryEntry?.platform === 'mobile_app') return false;
      }

      if (entityId.startsWith('binary_sensor.')) return true;
      const value = parseFloat(state.state);
      return !isNaN(value);
    });

    // Deduplication: remove binary_sensor if %-sensor exists on same device
    const sensorDeviceIds = new Set<string>();
    for (const id of batteryEntities) {
      if (id.startsWith('sensor.')) {
        const deviceId = Registry.getEntity(id)?.device_id;
        if (deviceId) sensorDeviceIds.add(deviceId);
      }
    }
    const dedupedEntities = batteryEntities.filter(id => {
      if (!id.startsWith('binary_sensor.')) return true;
      const deviceId = Registry.getEntity(id)?.device_id;
      return !deviceId || !sensorDeviceIds.has(deviceId);
    });

    // Group by status
    const critical: string[] = [];
    const low: string[] = [];
    const good: string[] = [];

    for (const entityId of dedupedEntities) {
      const state = hass.states[entityId];
      if (entityId.startsWith('binary_sensor.')) {
        (state.state === 'on' ? critical : good).push(entityId);
        continue;
      }
      const value = parseFloat(state.state);
      if (value < 20) critical.push(entityId);
      else if (value <= 50) low.push(entityId);
      else good.push(entityId);
    }

    const sections: LovelaceSectionConfig[] = [];

    if (critical.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🔴 Kritisch (< 20%) - ${critical.length} ${critical.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...critical.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'red' })),
        ],
      });
    }

    if (low.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🟡 Niedrig (20-50%) - ${low.length} ${low.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...low.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'yellow' })),
        ],
      });
    }

    if (good.length > 0) {
      sections.push({
        type: 'grid',
        cards: [
          { type: 'heading', heading: `🟢 Gut (> 50%) - ${good.length} ${good.length === 1 ? 'Batterie' : 'Batterien'}`, heading_style: 'title' },
          ...good.map(e => ({ type: 'tile', entity: e, vertical: false, state_content: ['state', 'last_changed'], color: 'green' })),
        ],
      });
    }

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-batteries', Simon42ViewBatteriesStrategy);
