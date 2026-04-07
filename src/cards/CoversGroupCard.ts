// ====================================================================
// COVERS GROUP CARD — Reactive card for open/closed cover groups
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import { Registry } from '../Registry';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

interface CoversGroupConfig {
  config?: any;
  group_type: 'open' | 'closed';
  device_classes?: string[];
}

// Pre-compiled RegExps for cover type name stripping
const COVER_TERMS = [
  'Rollo', 'Rollladen', 'Jalousie', 'Vorhang', 'Gardine',
  'Rolladen', 'Beschattung', 'Raffstore', 'Fenster',
  'Cover', 'Blind', 'Curtain', 'Shade', 'Shutter', 'Window',
];
const COVER_TERM_REGEXPS = COVER_TERMS.map(
  term => new RegExp(`^${term}\\s+|\\s+${term}$`, 'gi'),
);

const DEFAULT_DEVICE_CLASSES = ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'];

class Simon42CoversGroupCard extends HTMLElement {
  private _hass: HomeAssistant | null = null;
  private _config!: CoversGroupConfig;
  private _deviceClasses!: string[];
  private _cachedFilteredIds: Set<string> | null = null;
  private _lastCoversList = '';

  setConfig(config: CoversGroupConfig): void {
    if (!config.group_type) throw new Error('You need to define group_type (open/closed)');
    this._config = config;
    this._deviceClasses = config.device_classes || DEFAULT_DEVICE_CLASSES;
  }

  set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!oldHass || oldHass.entities !== hass.entities) {
      this._cachedFilteredIds = null;
    }

    if (oldHass && oldHass.states === hass.states) return;

    // Fast path: only check cover entities for changes
    if (oldHass && this._cachedFilteredIds) {
      let hasChange = false;
      for (const id of this._cachedFilteredIds) {
        if (oldHass.states[id] !== hass.states[id]) { hasChange = true; break; }
      }
      if (!hasChange) return;
    }

    if (!this._cachedFilteredIds) {
      this._cachedFilteredIds = new Set(this._getFilteredCoverEntities());
    }

    const currentCovers = this._getRelevantCovers();
    const coversKey = this._calculateRenderKey(currentCovers);

    if (!oldHass || this._lastCoversList !== coversKey) {
      this._lastCoversList = coversKey;
      this._render();
    }
  }

  get hass(): HomeAssistant | null { return this._hass; }

  private _calculateRenderKey(covers: string[]): string {
    // Key changes when:
    // 1. The cover list changes
    // 2. A cover is opening/closing (include position for continuous updates)
    return covers.map(id => {
      const state = this._hass!.states[id];
      if (!state) return id;

      if (state.state === 'opening' || state.state === 'closing') {
        const position = (state.attributes as any).current_position || 0;
        return `${id}:${state.state}:${position}`;
      }

      return `${id}:${state.state}`;
    }).join(',');
  }

  private _getFilteredCoverEntities(): string[] {
    if (!this._hass) return [];
    // Use pre-filtered Registry data: already excludes hidden/disabled/labeled entities
    return Registry.getVisibleEntityIdsForDomain('cover')
      .filter(id => {
        const state = this._hass!.states[id];
        if (!state) return false;
        // Device class filter for cover types (awning, blind, curtain, etc.)
        const deviceClass = (state.attributes as any)?.device_class as string | undefined;
        return this._deviceClasses.includes(deviceClass!) || !deviceClass;
      });
  }

  private _getRelevantCovers(): string[] {
    const allCovers = this._getFilteredCoverEntities();

    const relevant = allCovers.filter(id => {
      const state = this._hass!.states[id];
      if (!state) return false;

      if (this._config.group_type === 'open') {
        return state.state === 'open' || state.state === 'opening';
      }
      return state.state === 'closed' || state.state === 'closing';
    });

    relevant.sort((a, b) => {
      const stateA = this._hass!.states[a];
      const stateB = this._hass!.states[b];
      if (!stateA || !stateB) return 0;
      return new Date(stateB.last_changed).getTime() - new Date(stateA.last_changed).getTime();
    });

    return relevant;
  }

  private _stripCoverType(entityId: string): string {
    const state = this._hass!.states[entityId];
    if (!state) return entityId;

    let name = state.attributes.friendly_name || entityId;

    for (const regex of COVER_TERM_REGEXPS) {
      regex.lastIndex = 0;
      name = name.replace(regex, '');
    }

    return name.trim() || state.attributes.friendly_name || entityId;
  }

  private _render(): void {
    if (!this._hass) return;
    const covers = this._getRelevantCovers();
    const isOpen = this._config.group_type === 'open';

    if (covers.length === 0) {
      this.style.display = 'none';
      return;
    }
    this.style.display = 'block';

    const icon = isOpen ? '🪟' : '🔒';
    const title = isOpen ? 'Offene Rollos & Vorhänge' : 'Geschlossene Rollos & Vorhänge';
    const actionIcon = isOpen ? 'mdi:arrow-down' : 'mdi:arrow-up';
    const actionService = isOpen ? 'close_cover' : 'open_cover';

    this.innerHTML = `
      <style>
        .covers-section { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .section-heading { font-size: ${isOpen ? '20px' : '16px'}; font-weight: ${isOpen ? '500' : '400'}; margin: 0; display: flex; align-items: center; gap: 8px; }
        .batch-button { padding: 8px 12px; border-radius: 18px; background: var(--primary-color); color: var(--text-primary-color); border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 14px; }
        .batch-button:hover { background: var(--primary-color-dark); }
        .batch-button ha-icon { --mdc-icon-size: 18px; }
        .cover-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px; }
      </style>
      <div class="covers-section">
        <div class="section-header">
          <h${isOpen ? '2' : '3'} class="section-heading">${icon} ${title} (${covers.length})</h${isOpen ? '2' : '3'}>
          <button class="batch-button" id="batch-action">
            <ha-icon icon="${actionIcon}"></ha-icon>
            Alle ${isOpen ? 'schließen' : 'öffnen'}
          </button>
        </div>
        <div class="cover-grid" id="cover-grid"></div>
      </div>
    `;

    const batchButton = this.querySelector('#batch-action');
    if (batchButton) {
      batchButton.addEventListener('click', () => {
        this._hass!.callService('cover', actionService, { entity_id: covers });
      });
    }

    const grid = this.querySelector('#cover-grid')!;
    for (const entityId of covers) {
      const card = document.createElement('hui-tile-card') as any;
      card.hass = this._hass;
      card.setConfig({
        type: 'tile',
        entity: entityId,
        name: this._stripCoverType(entityId),
        features: [{ type: 'cover-open-close' }],
        vertical: false,
        features_position: 'inline',
        state_content: ['current_position', 'last_changed'],
      });
      grid.appendChild(card);
    }
  }

  getCardSize(): number {
    const covers = this._getRelevantCovers();
    return Math.ceil(covers.length / 3) + 1;
  }
}

customElements.define('simon42-covers-group-card', Simon42CoversGroupCard);
