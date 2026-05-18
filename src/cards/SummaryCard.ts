// ====================================================================
// SUMMARY CARD — Reactive summary tile for lights/covers/security/batteries (LitElement)
// ====================================================================

import { LitElement, html, css, type PropertyValues } from 'lit';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { Registry } from '../Registry';
import { type BatteryStatus, type RecBatteryStatus, type BatteryStatusGroup,
  buildBatteryStatusGroups, getBatteryStatusDisplay, getBatteryStatusGroup } from '../utils/battery-utils';
import { trackHassUpdate, debugLog, timeStart, timeEnd } from '../utils/debug';
import { localize } from '../utils/localize';
import { SECURITY_EXCLUDED_PLATFORMS } from '../utils/entity-filter';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

type SummaryType = 'lights' | 'covers' | 'security' | 'batteries' | 'valves' | 'climate';

interface SummaryCardConfig {
  summary_type: SummaryType;
  hide_mobile_app_batteries?: boolean;
  show_unknown_battery_group?: boolean;
  battery_critical_threshold?: number;
  battery_low_threshold?: number;
}

interface DisplayConfig {
  icon: string;
  name: string;
  color: string;
  path: string;
}

const COVER_DEVICE_CLASSES = new Set(['awning', 'blind', 'curtain', 'shade', 'shutter', 'window']);

const SECURITY_COVER_CLASSES = new Set(['door', 'garage', 'gate', 'window']);
const SECURITY_BINARY_SENSOR_CLASSES = new Set(['door', 'window', 'garage_door', 'opening', 'smoke', 'gas']);

const COLOR_MAP: Record<string, string> = {
  orange: 'var(--orange-color, #ff9800)',
  purple: 'var(--purple-color, #9c27b0)',
  yellow: 'var(--yellow-color, #ffc107)',
  red: 'var(--red-color, #f44336)',
  blue: 'var(--blue-color, #03a9f4)',
  grey: 'var(--disabled-color, #bdbdbd)',
  white: 'var(--white-color, #eeeeee)',
};

const CSS_STYLES = css`
  :host {
    display: block;
    cursor: pointer;
  }
  ha-card {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
    height: 100%;
    box-sizing: border-box;
    --ha-card-border-width: 0;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
  }
  ha-card:active {
    transform: scale(0.97);
    transition: transform 0.1s;
  }
  .icon {
    --mdc-icon-size: 28px;
    transition: color 0.3s;
  }
  .name {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--primary-text-color);
  }
`;

class Simon42SummaryCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _count: { state: true },
  };

  public hass?: HomeAssistant;
  private _count = 0;
  private _config!: SummaryCardConfig;
  private _relevantEntityIds: Set<string> | null = null;
  private _batteryPair!: { status: BatteryStatus, group: BatteryStatusGroup };

  static styles = CSS_STYLES;

  setConfig(config: SummaryCardConfig): void {
    this._config = config;
    this._count = 0;
    this._relevantEntityIds = null;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;

    trackHassUpdate(`summary-${this._config.summary_type}`);
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    if (!oldHass || oldHass.entities !== this.hass.entities) {
      this._count = 0;
      this._relevantEntityIds = null;
      debugLog(`summary-${this._config.summary_type}: cache invalidated (registry changed)`);
    }

    this._getRelevantEntities();
    const newCount = this._calculateCount();
    if (this._count !== newCount) {
      this._count = newCount;
    }
  }

  private _isEntityRelevant(id: string, _state: HassEntity): boolean {
    return !Registry.isEntityExcludedWithStateCategory(id);
  }

  private _getRelevantEntities(): void {
    if (!this.hass || this._relevantEntityIds) return;
    if (!Registry.initialized) return;

    const type = this._config.summary_type;
    timeStart(`summary-getRelevant-${type}`);
    const hass = this.hass;
    let result: string[];

    switch (this._config.summary_type) {
      case 'lights':
        result = Registry.getVisibleEntityIdsForDomain('light').filter(
          (id) => hass.states[id] && this._isEntityRelevant(id, hass.states[id])
        );
        break;

      case 'covers':
        result = Registry.getVisibleEntityIdsForDomain('cover').filter((id) => {
          const state = hass.states[id];
          if (!state) return false;
          if (!this._isEntityRelevant(id, state)) return false;
          const coverDeviceClass = state.attributes?.device_class;
          if (coverDeviceClass && !COVER_DEVICE_CLASSES.has(coverDeviceClass)) return false;
          return true;
        });
        break;

      case 'security': {
        const lockIds = Registry.getVisibleEntityIdsForDomain('lock');
        const coverIds = Registry.getVisibleEntityIdsForDomain('cover');
        const binarySensorIds = Registry.getVisibleEntityIdsForDomain('binary_sensor');

        result = [];
        for (const id of lockIds) {
          if (hass.states[id] && this._isEntityRelevant(id, hass.states[id])) {
            result.push(id);
          }
        }
        for (const id of coverIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass !== undefined && SECURITY_COVER_CLASSES.has(deviceClass)) {
            result.push(id);
          }
        }
        for (const id of binarySensorIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const entry = Registry.getEntity(id);
          if (entry?.platform && SECURITY_EXCLUDED_PLATFORMS.has(entry.platform)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass !== undefined && SECURITY_BINARY_SENSOR_CLASSES.has(deviceClass)) {
            result.push(id);
          }
        }
        break;
      }

      case 'batteries': {
        const batteryGroups: RecBatteryStatus = buildBatteryStatusGroups(this.hass, this._config);
        const statusOrder: BatteryStatus[] = ['critical', 'unknown', 'good'];

        for (const status of statusOrder) {
          const group = getBatteryStatusGroup(batteryGroups, status);
          this._batteryPair = { status, group };
          if (group.entities.length > 0) break;
        }
        result = this._batteryPair.group.entities;
        break;
      }

      case 'valves':
        result = Registry.getVisibleEntityIdsForDomain('valve').filter(
          (id) => hass.states[id] && this._isEntityRelevant(id, hass.states[id])
        );
        break;

      case 'climate':
        result = Registry.getVisibleEntityIdsForDomain('climate').filter(
          (id) => hass.states[id] && this._isEntityRelevant(id, hass.states[id])
        );
        break;

      default:
        result = [];
    }

    this._relevantEntityIds = new Set(result);
    debugLog(`summary-${type}: ${result.length} relevant entities`);
    timeEnd(`summary-getRelevant-${type}`);
  }

  private _calculateCount(): number {

    if (!this.hass) return 0;
    if (!this._relevantEntityIds || this._relevantEntityIds.size === 0) return 0;

    const hass = this.hass;
    let count = 0;

    switch (this._config.summary_type) {
      case 'lights':
        for (const id of this._relevantEntityIds) {
          if (hass.states[id]?.state === 'on') count++;
        }
        return count;

      case 'covers':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s === 'open' || s === 'opening') count++;
        }
        return count;

      case 'security':
        for (const id of this._relevantEntityIds) {
          const state = hass.states[id];
          if (!state) continue;
          if (id.startsWith('lock.') && state.state === 'unlocked') count++;
          else if (id.startsWith('cover.') && state.state === 'open') count++;
          else if (id.startsWith('binary_sensor.') && state.state === 'on') count++;
        }
        return count;

      case 'batteries': {
        return this._relevantEntityIds.size;
      }

      case 'valves':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s === 'open' || s === 'opening') count++;
        }
        return count;

      case 'climate':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s && s !== 'off' && s !== 'unavailable' && s !== 'unknown') count++;
        }
        return count;

      default:
        return 0;
    }
  }

  private _getDisplayConfig(): DisplayConfig {
    const count = this._count;
    const hasItems = count > 0;

    switch (this._config.summary_type) {
      case 'lights':
        return {
          icon: 'mdi:lamps',
          name: hasItems
            ? `${count} ${count === 1 ? localize('summary.lights_on_one') : localize('summary.lights_on_many')}`
            : localize('summary.lights_off'),
          color: hasItems ? 'orange' : 'grey',
          path: 'lights',
        };

      case 'covers':
        return {
          icon: 'mdi:blinds-horizontal',
          name: hasItems
            ? `${count} ${count === 1 ? localize('summary.covers_open_one') : localize('summary.covers_open_many')}`
            : localize('summary.covers_closed'),
          color: hasItems ? 'purple' : 'grey',
          path: 'covers',
        };

      case 'security':
        return {
          icon: 'mdi:security',
          name: hasItems
            ? `${count} ${localize('summary.security_unsafe')}`
            : localize('summary.security_safe'),
          color: hasItems ? 'yellow' : 'grey',
          path: 'security',
        };

      case 'batteries': {
        const status = this._batteryPair.status;
        const display = getBatteryStatusDisplay(this._config, status);
        return {
          icon: display.icon,
          name: status !== 'good'
            ? `${count} ${count === 1? localize(`summary.batteries_${status}_one`) : localize(`summary.batteries_${status}_many`)}`
            : localize('summary.batteries_ok'),
          color: display.color,
          path: 'batteries',
        };
      }

      case 'valves':
        return {
          icon: 'mdi:valve',
          name: hasItems
            ? `${count} ${count === 1 ? localize('summary.valves_open_one') : localize('summary.valves_open_many')}`
            : localize('summary.valves_closed'),
          color: hasItems ? 'blue' : 'grey',
          path: 'valves',
        };

      case 'climate':
        return {
          icon: 'mdi:thermostat',
          name: hasItems
            ? `${count} ${count === 1 ? localize('summary.climate_active_one') : localize('summary.climate_active_many')}`
            : localize('summary.climate_off'),
          color: hasItems ? 'orange' : 'grey',
          path: 'climate',
        };

      default:
        return {
          icon: 'mdi:help-circle-outline',
          name: '',
          color: 'grey',
          path: '',
        };
    }
  }

  private _handleClick(): void {
    if (!this.hass) return;
    const displayConfig = this._getDisplayConfig();
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: {
          config: {
            tap_action: {
              action: 'navigate',
              navigation_path: displayConfig.path,
            },
          },
          action: 'tap',
        },
      })
    );
  }

  protected render() {
    const display = this._getDisplayConfig();
    const colorCss = COLOR_MAP[display.color] || COLOR_MAP.grey;

    return html`
      <ha-card @click=${() => this._handleClick()}>
        <ha-icon class="icon" .icon=${display.icon} style="color: ${colorCss}"></ha-icon>
        <div class="name">${display.name}</div>
      </ha-card>
    `;
  }

  getCardSize(): number {
    return 1;
  }
}

customElements.define('simon42-summary-card', Simon42SummaryCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'simon42-summary-card',
  name: 'Simon42 Summary Card',
  description: 'Reactive summary card that counts entities dynamically',
});
