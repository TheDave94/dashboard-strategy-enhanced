// ====================================================================
// ZONE PRESENCE CARD — Compact row of zone-presence indicators (LitElement)
// ====================================================================
// Use case: multi-zone presence sensors (Aqara FP1/FP2, ESP32-S3 mmWave,
// etc.) where each zone is exposed as a separate binary_sensor. The
// native HA pattern is one full-size tile per zone — for an apartment
// with desk + couch + bed + relax + bath that's 5 tiles eating ~⅓ of
// the overview vertical space. This card collapses them into a single
// row of small colored dots: same information, ~⅙ the space.
//
// Each dot:
//   - reflects the zone's binary_sensor state (on = active, off = idle)
//   - shows the zone's friendly name as label below
//   - opens the more-info dialog on tap
//
// Config (YAML for custom_cards / custom_views):
//   type: custom:simon42-zone-presence-card
//   name: Anwesenheit            # optional, hides heading when omitted
//   icon: mdi:account-multiple   # optional
//   entities:
//     - binary_sensor.desk_occupied
//     - { entity: binary_sensor.couch, name: Couch, color: light-blue }
//     - binary_sensor.relax_area
//     - binary_sensor.bed
//
// Each entity entry can be either a plain string or an object with
// optional `name`, `icon`, `color` (active-state color).
// ====================================================================

import { LitElement, html, css, type PropertyValues } from 'lit';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { debugLog } from '../utils/debug';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

interface ZoneEntry {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
}

interface ZonePresenceCardConfig {
  type: string;
  name?: string;
  icon?: string;
  entities: Array<string | ZoneEntry>;
}

const COLOR_MAP: Record<string, string> = {
  red: 'var(--red-color, #f44336)',
  orange: 'var(--orange-color, #ff9800)',
  amber: 'var(--amber-color, #ffc107)',
  yellow: 'var(--yellow-color, #ffeb3b)',
  green: 'var(--green-color, #4caf50)',
  'light-blue': 'var(--light-blue-color, #03a9f4)',
  blue: 'var(--blue-color, #2196f3)',
  indigo: 'var(--indigo-color, #3f51b5)',
  purple: 'var(--purple-color, #9c27b0)',
  pink: 'var(--pink-color, #e91e63)',
  accent: 'var(--accent-color)',
  primary: 'var(--primary-color)',
};

class Simon42ZonePresenceCard extends LitElement {
  static properties = {
    hass: { attribute: false },
  };

  public hass?: HomeAssistant;
  private _config!: ZonePresenceCardConfig;
  private _zones: ZoneEntry[] = [];

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 12px 16px;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      border-radius: var(--ha-card-border-radius, 12px);
      --ha-card-border-width: 0;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--primary-text-color);
      font-weight: 500;
      font-size: 14px;
    }
    .header ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .zones {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: stretch;
    }
    .zone {
      flex: 1 1 auto;
      min-width: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 6px 4px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .zone:hover {
      background: var(--secondary-background-color);
    }
    .zone:active {
      transform: scale(0.96);
      transition: transform 0.08s;
    }
    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--disabled-color, #bdbdbd);
      transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
    }
    .zone.active .dot {
      transform: scale(1.2);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--zone-color, var(--accent-color)) 25%, transparent);
      background: var(--zone-color, var(--accent-color));
    }
    .label {
      font-size: 11px;
      color: var(--secondary-text-color);
      text-align: center;
      line-height: 1.1;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zone.active .label {
      color: var(--primary-text-color);
      font-weight: 500;
    }
  `;

  setConfig(config: ZonePresenceCardConfig): void {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('simon42-zone-presence-card: `entities` (non-empty array) is required');
    }
    this._config = config;
    this._zones = config.entities.map((e) =>
      typeof e === 'string' ? { entity: e } : { ...e }
    );
    debugLog(`zone-presence-card: ${this._zones.length} zones configured`);
  }

  getCardSize(): number {
    return 1;
  }

  shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) return false;
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
      if (!oldHass) return true;
      // Only re-render when any tracked zone's state actually changed —
      // saves work when global state updates land for unrelated entities.
      for (const z of this._zones) {
        const oldS = oldHass.states[z.entity] as HassEntity | undefined;
        const newS = this.hass?.states[z.entity] as HassEntity | undefined;
        if (oldS?.state !== newS?.state) return true;
      }
      return false;
    }
    return true;
  }

  private _onZoneTap(entity: string): void {
    const event = new Event('hass-more-info', { bubbles: true, composed: true });
    (event as Event & { detail: { entityId: string } }).detail = { entityId: entity };
    this.dispatchEvent(event);
  }

  private _resolveName(zone: ZoneEntry): string {
    if (zone.name) return zone.name;
    const s = this.hass?.states[zone.entity] as HassEntity | undefined;
    return s?.attributes?.friendly_name || zone.entity.split('.')[1] || zone.entity;
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const name = this._config.name;
    const icon = this._config.icon || 'mdi:account-multiple';

    return html`
      <ha-card>
        ${name
          ? html`
              <div class="header">
                <ha-icon icon=${icon}></ha-icon>
                <span>${name}</span>
              </div>
            `
          : ''}
        <div class="zones">
          ${this._zones.map((z) => {
            const state = this.hass!.states[z.entity] as HassEntity | undefined;
            const active = state?.state === 'on';
            const color = COLOR_MAP[z.color || 'accent'] || COLOR_MAP['accent'];
            return html`
              <div
                class="zone ${active ? 'active' : ''}"
                style="--zone-color: ${color}"
                title=${this._resolveName(z)}
                @click=${() => this._onZoneTap(z.entity)}
              >
                <div class="dot"></div>
                <div class="label">${this._resolveName(z)}</div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }
}

customElements.define('simon42-zone-presence-card', Simon42ZonePresenceCard);

// Register with the HA custom-cards picker so it shows up in the UI
// "Add card" dialog with a description.
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'simon42-zone-presence-card')) {
  window.customCards.push({
    type: 'simon42-zone-presence-card',
    name: 'Simon42 Zone Presence',
    description: 'Compact row of zone-presence indicators (one dot per zone). Use for multi-zone presence sensors like Aqara FP1/FP2.',
  });
}
