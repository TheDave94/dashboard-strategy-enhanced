// ====================================================================
// LIGHTS GROUP CARD — Reactive card for on/off light groups
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { Registry } from '../Registry';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
    cardTools?: unknown;
  }
}

interface LightsGroupConfig {
  config?: any;
  group_type: 'on' | 'off';
}

class Simon42LightsGroupCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config!: LightsGroupConfig;
  private _cachedFilteredIds: Set<string> | null = null;
  private _lastLightsList = '';
  private _card: any = null;

  setConfig(config: LightsGroupConfig): void {
    if (!config.group_type) throw new Error('You need to define group_type (on/off)');
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!oldHass || oldHass.entities !== hass.entities) {
      this._cachedFilteredIds = null;
    }

    if (oldHass && oldHass.states === hass.states) return;

    // Fast path: only check light entities for changes
    if (oldHass && this._cachedFilteredIds) {
      let hasChange = false;
      for (const id of this._cachedFilteredIds) {
        if (oldHass.states[id] !== hass.states[id]) { hasChange = true; break; }
      }
      if (!hasChange) return;
    }

    if (!this._cachedFilteredIds) {
      this._cachedFilteredIds = new Set(this._getFilteredLightEntities());
    }

    const currentLights = this._getRelevantLights();
    const lightsKey = currentLights.join(',');

    if (!oldHass || this._lastLightsList !== lightsKey) {
      this._lastLightsList = lightsKey;
      this._render();
    }
  }

  get hass(): HomeAssistant | null { return this._hass; }

  private _getFilteredLightEntities(): string[] {
    if (!this._hass) return [];
    // Use pre-filtered Registry data: already excludes hidden/disabled/labeled entities
    return Registry.getVisibleEntityIdsForDomain('light')
      .filter(id => this._hass!.states[id] !== undefined);
  }

  private _getRelevantLights(): string[] {
    const allLights = this._getFilteredLightEntities();
    const targetState = this._config.group_type === 'on' ? 'on' : 'off';

    const relevant = allLights.filter(id => {
      const state = this._hass!.states[id];
      return state && state.state === targetState;
    });

    relevant.sort((a, b) => {
      const stateA = this._hass!.states[a];
      const stateB = this._hass!.states[b];
      if (!stateA || !stateB) return 0;
      return new Date(stateB.last_changed).getTime() - new Date(stateA.last_changed).getTime();
    });

    return relevant;
  }

  private _render(): void {
    if (!this._hass) return;
    const lights = this._getRelevantLights();
    const isOn = this._config.group_type === 'on';

    if (lights.length === 0) {
      this.style.display = 'none';
      return;
    }
    this.style.display = 'block';

    const icon = isOn ? '💡' : '🌙';
    const title = isOn ? 'Eingeschaltete Lichter' : 'Ausgeschaltete Lichter';
    const actionIcon = isOn ? 'mdi:lightbulb-off' : 'mdi:lightbulb-on';

    this.innerHTML = `
      <style>
        .lights-section { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .section-heading { font-size: ${isOn ? '20px' : '16px'}; font-weight: ${isOn ? '500' : '400'}; margin: 0; display: flex; align-items: center; gap: 8px; }
        .batch-button { padding: 8px 12px; border-radius: 18px; background: var(--primary-color); color: var(--text-primary-color); border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 14px; }
        .batch-button:hover { background: var(--primary-color-dark); }
        .batch-button ha-icon { --mdc-icon-size: 18px; }
        .light-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px; }
      </style>
      <div class="lights-section">
        <div class="section-header">
          <h${isOn ? '2' : '3'} class="section-heading">${icon} ${title} (${lights.length})</h${isOn ? '2' : '3'}>
          <button class="batch-button" id="batch-action">
            <ha-icon icon="${actionIcon}"></ha-icon>
            Alle ${isOn ? 'ausschalten' : 'einschalten'}
          </button>
        </div>
        <div class="light-grid" id="light-grid"></div>
      </div>
    `;

    const batchButton = this.querySelector('#batch-action');
    if (batchButton) {
      batchButton.addEventListener('click', () => {
        this._hass!.callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: lights });
      });
    }

    const grid = this.querySelector('#light-grid')!;
    for (const entityId of lights) {
      const card = document.createElement('hui-tile-card') as any;
      card.hass = this._hass;
      const cardConfig: any = { type: 'tile', entity: entityId, vertical: false, state_content: 'last_changed' };
      if (isOn) {
        cardConfig.features = [{ type: 'light-brightness' }];
        cardConfig.features_position = 'inline';
      }
      card.setConfig(cardConfig);
      grid.appendChild(card);
    }
  }

  getCardSize(): number {
    const lights = this._getRelevantLights();
    return Math.ceil(lights.length / 3) + 1;
  }
}

customElements.define('simon42-lights-group-card', Simon42LightsGroupCard);
