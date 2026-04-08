// ====================================================================
// LIGHTS GROUP CARD — Reactive card for on/off light groups (LitElement)
// ====================================================================

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import type { HomeAssistant } from '../types/homeassistant';
import { Registry } from '../Registry';
import { trackHassUpdate } from '../utils/debug';

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

class Simon42LightsGroupCard extends LitElement {
  static properties = {
    hass: { attribute: false },
  };

  public hass?: HomeAssistant;
  private _config!: LightsGroupConfig;
  private _cachedFilteredIds: Set<string> | null = null;
  private _lastLightsList = '';

  // Reusable tile card pool (keyed by entity_id)
  private _tileCards: Map<string, any> = new Map();
  private _headingCard: any = null;

  static styles = css`
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    .lights-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }
    .light-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 8px;
    }
  `;

  setConfig(config: LightsGroupConfig): void {
    if (!config.group_type) throw new Error('You need to define group_type (on/off)');
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;

    trackHassUpdate('lights-group');
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    if (!oldHass || oldHass.entities !== this.hass.entities) {
      this._cachedFilteredIds = null;
    }

    // Build cache if needed
    if (!this._cachedFilteredIds) {
      if (!Registry.initialized) return;
      this._cachedFilteredIds = new Set(this._getFilteredLightEntities(this.hass));
    }

    // Always propagate hass to child cards
    this._propagateHass(this.hass);
  }

  private _propagateHass(hass: HomeAssistant): void {
    if (this._headingCard) this._headingCard.hass = hass;
    for (const card of this._tileCards.values()) {
      card.hass = hass;
    }
  }

  private _getFilteredLightEntities(hass: HomeAssistant): string[] {
    return Registry.getVisibleEntityIdsForDomain('light').filter((id) => hass.states[id] !== undefined);
  }

  private _getRelevantLights(): string[] {
    if (!this.hass || !this._cachedFilteredIds) return [];
    const targetState = this._config.group_type === 'on' ? 'on' : 'off';

    const relevant: string[] = [];
    for (const id of this._cachedFilteredIds) {
      const state = this.hass.states[id];
      if (state && state.state === targetState) relevant.push(id);
    }

    relevant.sort((a, b) => {
      const stateA = this.hass!.states[a];
      const stateB = this.hass!.states[b];
      if (!stateA || !stateB) return 0;
      return new Date(stateB.last_changed).getTime() - new Date(stateA.last_changed).getTime();
    });

    return relevant;
  }

  private _buildHeadingConfig(lights: string[]): any {
    const isOn = this._config.group_type === 'on';
    return {
      type: 'heading',
      heading: `${isOn ? 'Eingeschaltete Lichter' : 'Ausgeschaltete Lichter'} (${lights.length})`,
      icon: isOn ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-off',
      badges: [
        {
          type: 'button',
          icon: isOn ? 'mdi:lightbulb-off' : 'mdi:lightbulb-on',
          text: isOn ? 'Alle aus' : 'Alle ein',
          tap_action: {
            action: 'perform-action',
            perform_action: isOn ? 'light.turn_off' : 'light.turn_on',
            target: { entity_id: lights },
          },
        },
      ],
    };
  }

  private _getOrCreateTileCard(entityId: string): any {
    let card = this._tileCards.get(entityId);
    if (card) return card;

    const isOn = this._config.group_type === 'on';
    card = document.createElement('hui-tile-card');
    card.hass = this.hass;
    const cardConfig: any = { type: 'tile', entity: entityId, vertical: false, state_content: 'last_changed' };
    if (isOn) {
      // Only add brightness slider if the light actually supports it
      const state = this.hass?.states[entityId];
      const modes = state?.attributes?.supported_color_modes as string[] | undefined;
      const hasBrightness = modes?.some((m: string) =>
        ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white'].includes(m)
      );
      if (hasBrightness) {
        cardConfig.features = [{ type: 'light-brightness' }];
        cardConfig.features_position = 'inline';
      }
    }
    card.setConfig(cardConfig);
    this._tileCards.set(entityId, card);
    return card;
  }

  protected render() {
    if (!this.hass || !this._cachedFilteredIds) return nothing;

    const lights = this._getRelevantLights();
    if (lights.length === 0) {
      this.hidden = true;
      return nothing;
    }
    this.hidden = false;

    return html`
      <div class="lights-section">
        <div id="heading"></div>
        <div class="light-grid" id="grid"></div>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.hass || !this._cachedFilteredIds) return;

    const lights = this._getRelevantLights();
    const lightsKey = lights.join(',');
    if (this._lastLightsList === lightsKey) return;
    this._lastLightsList = lightsKey;

    if (lights.length === 0) return;

    // Reconcile heading card
    const headingSlot = this.shadowRoot!.getElementById('heading');
    if (headingSlot) {
      if (!this._headingCard) {
        this._headingCard = document.createElement('hui-heading-card');
        headingSlot.appendChild(this._headingCard);
      }
      this._headingCard.hass = this.hass;
      this._headingCard.setConfig(this._buildHeadingConfig(lights));
    }

    // Reconcile tile cards in grid
    const grid = this.shadowRoot!.getElementById('grid');
    if (!grid) return;

    const activeIds = new Set(lights);

    // Remove cards for entities no longer in the list
    for (const [id, card] of this._tileCards) {
      if (!activeIds.has(id)) {
        if (card.parentNode === grid) grid.removeChild(card);
        this._tileCards.delete(id);
      }
    }

    // Add/reorder cards to match the desired order
    let prevNode: Node | null = null;
    for (const entityId of lights) {
      const card = this._getOrCreateTileCard(entityId);
      const nextSibling = prevNode ? prevNode.nextSibling : grid.firstChild;
      if (card !== nextSibling) {
        grid.insertBefore(card, nextSibling);
      }
      prevNode = card;
    }

    // Remove trailing stale nodes
    while (prevNode && prevNode.nextSibling) {
      grid.removeChild(prevNode.nextSibling);
    }
  }

  getCardSize(): number {
    const lights = this._getRelevantLights();
    return Math.ceil(lights.length / 3) + 1;
  }
}

customElements.define('simon42-lights-group-card', Simon42LightsGroupCard);
