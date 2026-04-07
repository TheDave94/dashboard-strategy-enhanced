// ====================================================================
// SUMMARY CARD — Reactive summary tile for lights/covers/security/batteries
// ====================================================================

import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { Registry } from '../Registry';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

type SummaryType = 'lights' | 'covers' | 'security' | 'batteries';

interface SummaryCardConfig {
  summary_type: SummaryType;
  hide_mobile_app_batteries?: boolean;
}

interface DisplayConfig {
  icon: string;
  name: string;
  color: string;
  path: string;
}

const COVER_DEVICE_CLASSES = new Set(['awning', 'blind', 'curtain', 'shade', 'shutter', 'window']);

const SECURITY_COVER_CLASSES = new Set(['door', 'garage', 'gate']);
const SECURITY_BINARY_SENSOR_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);

const DOMAIN_PREFIXES_MAP: Record<SummaryType, string[]> = {
  lights: ['light.'],
  covers: ['cover.'],
  security: ['lock.', 'cover.', 'binary_sensor.'],
  batteries: ['sensor.', 'binary_sensor.'],
};

class Simon42SummaryCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config!: SummaryCardConfig;
  private _count = 0;
  private _relevantEntityIds: Set<string> | null = null;
  private _dummyEntity: string | null = null;
  private _card: any = null;

  setConfig(config: SummaryCardConfig): void {
    if (!config.summary_type) {
      throw new Error('You need to define a summary_type');
    }
    this._config = config;
    this._relevantEntityIds = null;
  }

  set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    // Invalidate entity set cache only when registry changes (entities added/removed).
    // State changes don't affect WHICH entities are relevant — only the count changes.
    if (!oldHass || oldHass.entities !== hass.entities) {
      this._relevantEntityIds = null;
      this._dummyEntity = null;
    }

    // Recalculate count (uses cached entity set, just recounts based on current states)
    const newCount = this._calculateCount();

    // Only render when count changed or first render
    if (oldHass === null || this._count !== newCount) {
      this._count = newCount;
      this._render();
    }
  }

  get hass(): HomeAssistant | null {
    return this._hass;
  }

  private _getRelevantDomainPrefixes(): string[] {
    return DOMAIN_PREFIXES_MAP[this._config.summary_type] ?? [];
  }

  private _isEntityRelevant(id: string, _state: HassEntity): boolean {
    // Single Registry call: no_dboard label + config hidden + hidden_by +
    // disabled_by + entity_category (registry + state attribute fallback)
    return !Registry.isEntityExcludedWithStateCategory(id);
  }

  private _getRelevantEntities(): string[] {
    if (!this._hass) return [];

    // Return cached set if available
    if (this._relevantEntityIds) return [...this._relevantEntityIds];

    const hass = this._hass;
    const allEntityIds = Object.keys(hass.states);
    const prefixes = this._getRelevantDomainPrefixes();
    let result: string[];

    switch (this._config.summary_type) {
      case 'lights':
        result = allEntityIds.filter(id => {
          if (!id.startsWith('light.')) return false;
          const state = hass.states[id];
          if (!state) return false;
          return this._isEntityRelevant(id, state);
        });
        break;

      case 'covers':
        result = allEntityIds.filter(id => {
          if (!id.startsWith('cover.')) return false;
          const state = hass.states[id];
          if (!state) return false;
          if (!this._isEntityRelevant(id, state)) return false;

          // Device class filter: only awning/blind/curtain/shade/shutter/window
          const coverDeviceClass = state.attributes?.device_class;
          if (coverDeviceClass && !COVER_DEVICE_CLASSES.has(coverDeviceClass)) return false;

          return true;
        });
        break;

      case 'security':
        result = allEntityIds.filter(id => {
          const isLock = id.startsWith('lock.');
          const isCover = id.startsWith('cover.');
          const isBinarySensor = id.startsWith('binary_sensor.');

          if (!isLock && !isCover && !isBinarySensor) return false;

          const state = hass.states[id];
          if (!state) return false;
          if (!this._isEntityRelevant(id, state)) return false;

          if (isLock) return true;

          if (isCover) {
            const deviceClass = state.attributes?.device_class;
            return deviceClass !== undefined && SECURITY_COVER_CLASSES.has(deviceClass);
          }

          if (isBinarySensor) {
            const deviceClass = state.attributes?.device_class;
            return deviceClass !== undefined && SECURITY_BINARY_SENSOR_CLASSES.has(deviceClass);
          }

          return false;
        });
        break;

      case 'batteries': {
        const batteryEntities = allEntityIds.filter(id => {
          const state = hass.states[id];
          if (!state) return false;

          // Battery check: sensor/binary_sensor with battery device_class or "battery" in name
          const isBatterySensor =
            (id.includes('battery') || state.attributes?.device_class === 'battery') &&
            (id.startsWith('sensor.') || id.startsWith('binary_sensor.'));
          if (!isBatterySensor) return false;

          if (!this._isEntityRelevant(id, state)) return false;

          // Mobile app platform filter
          const registryEntry = hass.entities?.[id];
          if (this._config.hide_mobile_app_batteries && registryEntry?.platform === 'mobile_app') return false;

          return true;
        });

        // Deduplication: remove binary_sensor if a %-sensor from the same device exists
        const sensorDeviceIds = new Set<string>();
        for (const id of batteryEntities) {
          if (id.startsWith('sensor.')) {
            const deviceId = hass.entities?.[id]?.device_id;
            if (deviceId) sensorDeviceIds.add(deviceId);
          }
        }

        result = batteryEntities.filter(id => {
          if (!id.startsWith('binary_sensor.')) return true;
          const deviceId = hass.entities?.[id]?.device_id;
          return !deviceId || !sensorDeviceIds.has(deviceId);
        });
        break;
      }

      default:
        result = [];
    }

    this._relevantEntityIds = new Set(result);
    return result;
  }

  private _calculateCount(): number {
    if (!this._hass) return 0;

    const relevantEntities = this._getRelevantEntities();
    const hass = this._hass;

    switch (this._config.summary_type) {
      case 'lights':
        return relevantEntities.filter(id => hass.states[id]?.state === 'on').length;

      case 'covers':
        return relevantEntities.filter(id => {
          const s = hass.states[id]?.state;
          return s === 'open' || s === 'opening';
        }).length;

      case 'security':
        return relevantEntities.filter(id => {
          const state = hass.states[id];
          if (!state) return false;
          if (id.startsWith('lock.') && state.state === 'unlocked') return true;
          if (id.startsWith('cover.') && state.state === 'open') return true;
          if (id.startsWith('binary_sensor.') && state.state === 'on') return true;
          return false;
        }).length;

      case 'batteries':
        return relevantEntities.filter(id => {
          const state = hass.states[id];
          if (!state) return false;
          if (id.startsWith('binary_sensor.')) return state.state === 'on';
          const value = parseFloat(state.state);
          return !isNaN(value) && value < 20;
        }).length;

      default:
        return 0;
    }
  }

  private _getDisplayConfig(): DisplayConfig {
    const count = this._count;
    const hasItems = count > 0;

    const configs: Record<SummaryType, DisplayConfig> = {
      lights: {
        icon: 'mdi:lamps',
        name: hasItems ? `${count} ${count === 1 ? 'Licht an' : 'Lichter an'}` : 'Alle Lichter aus',
        color: hasItems ? 'orange' : 'grey',
        path: 'lights',
      },
      covers: {
        icon: 'mdi:blinds-horizontal',
        name: hasItems ? `${count} ${count === 1 ? 'Rollo offen' : 'Rollos offen'}` : 'Alle Rollos geschlossen',
        color: hasItems ? 'purple' : 'grey',
        path: 'covers',
      },
      security: {
        icon: 'mdi:security',
        name: hasItems ? `${count} unsicher` : 'Alles gesichert',
        color: hasItems ? 'yellow' : 'grey',
        path: 'security',
      },
      batteries: {
        icon: hasItems ? 'mdi:battery-alert' : 'mdi:battery-charging',
        name: hasItems ? `${count} ${count === 1 ? 'Batterie' : 'Batterien'} kritisch` : 'Alle Batterien OK',
        color: hasItems ? 'red' : 'grey',
        path: 'batteries',
      },
    };

    return configs[this._config.summary_type];
  }

  private _findDummyEntity(): string {
    if (this._dummyEntity) return this._dummyEntity;

    if (!this._hass) return 'sun.sun';

    // Find any available sensor to use as dummy entity
    for (const id of Object.keys(this._hass.states)) {
      if (!id.startsWith('sensor.')) continue;
      const state = this._hass.states[id];
      if (state.state !== 'unavailable' && state.state !== 'unknown') {
        this._dummyEntity = id;
        return id;
      }
    }

    // Fallback
    this._dummyEntity = 'sun.sun';
    return 'sun.sun';
  }

  private _render(): void {
    if (!this._hass || !this._config) return;

    const displayConfig = this._getDisplayConfig();
    const dummyEntity = this._findDummyEntity();

    const tileConfig = {
      type: 'tile' as const,
      entity: dummyEntity,
      icon: displayConfig.icon,
      name: displayConfig.name,
      color: displayConfig.color,
      hide_state: true,
      vertical: true,
      tap_action: {
        action: 'navigate',
        navigation_path: displayConfig.path,
      },
      icon_tap_action: {
        action: 'none',
      },
    };

    if (!this._card) {
      this._card = document.createElement('hui-tile-card');
      this.appendChild(this._card);
    }

    // Set hass BEFORE setConfig so the card initializes correctly
    this._card.hass = this._hass;
    this._card.setConfig(tileConfig);

    if (this._card.requestUpdate) {
      this._card.requestUpdate();
    }
  }

  getCardSize(): number {
    return 1;
  }
}

customElements.define('simon42-summary-card', Simon42SummaryCard);

// Register for card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'simon42-summary-card',
  name: 'Simon42 Summary Card',
  description: 'Reactive summary card that counts entities dynamically',
});
