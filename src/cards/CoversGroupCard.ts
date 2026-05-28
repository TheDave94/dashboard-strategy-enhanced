// ====================================================================
// COVERS GROUP CARD — Reactive card for open/closed cover groups (LitElement)
// ====================================================================

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import type { AreaRegistryEntry } from '../types/registries';
import { Registry } from '../Registry';
import { trackHassUpdate } from '../utils/debug';
import { localize } from '../utils/localize';
import { withBubbleTapAction } from '../utils/bubble-integration';

interface LovelaceCardElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: Record<string, unknown>): void;
}

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

interface CoversGroupConfig {
  config?: any;
  group_type: 'open' | 'closed' | 'partially_open';
  show_partially_open?: boolean;
  device_classes?: string[];
  heading_open?: string;
  heading_closed?: string;
  heading_partial?: string;
  batch_open_text?: string;
  batch_close_text?: string;
  icon_open?: string;
  icon_closed?: string;
  icon_partial?: string;
  group_by_floors?: boolean;
  /** Density variant — drives the --oriel-* CSS tokens. */
  density?: 'comfortable' | 'compact';
  /**
   * Set by the parent strategy after gating on
   * `use_bubble_drawers && isBubbleCardInstalled()`. When true, the
   * card rewrites each emitted tile's tap_action to navigate to the
   * matching Bubble Card pop-up hash.
   */
  bubble_drawers?: boolean;
}

interface CoversFloorGroup {
  floorId: string | null;
  floorName: string;
  floorIcon: string;
  covers: string[];
}

// Pre-compiled RegExps for cover type name stripping
const COVER_TERMS = [
  'Rollo',
  'Rollladen',
  'Jalousie',
  'Vorhang',
  'Gardine',
  'Rolladen',
  'Beschattung',
  'Raffstore',
  'Fenster',
  'Cover',
  'Blind',
  'Curtain',
  'Shade',
  'Shutter',
  'Window',
  'Markise',
  'Awning',
];
const COVER_TERM_REGEXPS = COVER_TERMS.map((term) => new RegExp(`^${term}\\s+|\\s+${term}$`, 'gi'));

const DEFAULT_DEVICE_CLASSES = ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'];

/**
 * HA's HassEntity.attributes is typed `Record<string, any>` upstream;
 * narrow it locally for the cover-specific fields we read. Replaces
 * three `(state.attributes as any)?.foo` sites with one typed helper.
 */
interface CoverAttrs {
  device_class?: string;
  current_position?: number;
}
const coverAttrs = (state: { attributes?: Record<string, unknown> } | undefined): CoverAttrs =>
  (state?.attributes ?? {}) as CoverAttrs;

class OrielCoversGroupCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;

  private _config!: CoversGroupConfig;
  private _deviceClasses!: string[];
  private _cachedFilteredIds: Set<string> | null = null;
  private _cachedAreaForEntity: Map<string, string | null> | null = null;
  private _lastCoversList = '';

  // Reusable card pool
  private _tileCards: Map<string, any> = new Map();
  private _headingCard: any = null;
  private _floorHeadingCards: Map<string, LovelaceCardElement> = new Map();

  static styles = css`
    :host {
      display: block;
      container-type: inline-size;
      container-name: oriel-covers;
      --oriel-gap: var(--ha-space-2, 8px);
      --oriel-tile-min: 300px;
    }
    @container oriel-covers (max-width: 400px) {
      :host {
        --oriel-gap: var(--ha-space-1, 6px);
        --oriel-tile-min: 260px;
      }
    }
    :host([density="compact"]) {
      --oriel-gap: var(--ha-space-1, 6px) !important;
      --oriel-tile-min: 280px !important;
    }
    :host([density="comfortable"]) {
      --oriel-gap: var(--ha-space-2, 8px) !important;
      --oriel-tile-min: 300px !important;
    }
    :host([hidden]) {
      display: none;
    }
    .covers-section {
      display: flex;
      flex-direction: column;
      gap: var(--oriel-gap);
      width: 100%;
    }
    .cover-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--oriel-tile-min), 1fr));
      gap: var(--oriel-gap);
    }
    .floor-section {
      display: flex;
      flex-direction: column;
      gap: var(--oriel-gap);
    }
  `;

  setConfig(config: CoversGroupConfig): void {
    this._config = config;
    this._deviceClasses = config.device_classes || DEFAULT_DEVICE_CLASSES;
    if (config.density === 'compact') {
      this.setAttribute('density', 'compact');
    } else {
      this.removeAttribute('density');
    }
  }

  // Full-width, content-measured — see LightsGroupCard.getGridOptions. Two
  // half-width (columns:6) group cards overlap horizontally in HA's sections
  // grid, so the covers buckets stack full-width.
  getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns?: number;
    min_rows?: number;
    max_rows?: number;
  } {
    return { columns: 'full', rows: 'auto' };
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;

    trackHassUpdate('covers-group');
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    if (!oldHass || oldHass.entities !== this.hass.entities) {
      this._cachedFilteredIds = null;
      this._cachedAreaForEntity = null;
    }

    // Build cache if needed
    if (!this._cachedFilteredIds) {
      if (!Registry.initialized) return;
      this._cachedFilteredIds = new Set(this._getFilteredCoverEntities(this.hass));
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

  private _getFilteredCoverEntities(hass: HomeAssistant): string[] {
    return Registry.getVisibleEntityIdsForDomain('cover').filter((id) => {
      const state = hass.states[id];
      if (!state) return false;
      const deviceClass = coverAttrs(state).device_class;
      // Covers without device_class only match the main group (multiple classes), not specialized groups like awnings/windows
      if (!deviceClass) return this._deviceClasses.length > 1;
      return this._deviceClasses.includes(deviceClass);
    });
  }

  private _getRelevantCovers(): string[] {
    if (!this.hass || !this._cachedFilteredIds) return [];
    const groupType = this._config.group_type;
    const showPartiallyOpen = this._config.show_partially_open === true;

    const relevant: string[] = [];
    for (const id of this._cachedFilteredIds) {
      const state = this.hass.states[id];
      if (!state) continue;

      const position = coverAttrs(state).current_position;
      const hasPosition = typeof position === 'number';
      const isMoving = state.state === 'opening' || state.state === 'closing';

      if (groupType === 'partially_open') {
        // Partially open: position between 0 and 100 (open or currently moving)
        if (state.state === 'open' || isMoving) {
          if (hasPosition && position > 0 && position < 100) {
            relevant.push(id);
          }
        }
      } else if (groupType === 'open') {
        if (state.state === 'open' || state.state === 'opening') {
          if (showPartiallyOpen) {
            // Only fully open (100%) or covers without position attribute
            if (!hasPosition || position >= 100) {
              relevant.push(id);
            }
          } else {
            relevant.push(id);
          }
        }
      } else {
        if (state.state === 'closed') {
          relevant.push(id);
        } else if (state.state === 'closing') {
          // When partially_open is active, closing covers with position > 0 belong to partially_open
          if (showPartiallyOpen && hasPosition && position > 0) continue;
          relevant.push(id);
        }
      }
    }

    relevant.sort((a, b) => {
      const stateA = this.hass?.states[a];
      const stateB = this.hass?.states[b];
      if (!stateA || !stateB) return 0;
      return new Date(stateB.last_changed).getTime() - new Date(stateA.last_changed).getTime();
    });

    return relevant;
  }

  private _getAreaForEntity(entityId: string): string | null {
    if (!this._cachedAreaForEntity) this._cachedAreaForEntity = new Map();
    if (this._cachedAreaForEntity.has(entityId)) {
      return this._cachedAreaForEntity.get(entityId) ?? null;
    }
    const entity = Registry.getEntity(entityId);
    let areaId: string | null = entity?.area_id ?? null;
    if (!areaId && entity?.device_id) {
      const device = Registry.getDevice(entity.device_id);
      areaId = device?.area_id ?? null;
    }
    this._cachedAreaForEntity.set(entityId, areaId);
    return areaId;
  }

  private _groupByFloors(covers: string[]): CoversFloorGroup[] {
    if (!this.hass) return [];

    const areas: AreaRegistryEntry[] = Object.values(this.hass.areas);
    const areaFloorMap = new Map<string, string | null>();
    for (const area of areas) {
      areaFloorMap.set(area.area_id, area.floor_id ?? null);
    }

    const floorMap = new Map<string | null, string[]>();
    for (const id of covers) {
      const areaId = this._getAreaForEntity(id);
      const floorId = areaId ? (areaFloorMap.get(areaId) ?? null) : null;
      if (!floorMap.has(floorId)) floorMap.set(floorId, []);
      floorMap.get(floorId)?.push(id);
    }

    // HA's floor registry order preserves the user-defined "Reorder areas and floors" sequence
    const floors = this.hass.floors;
    const floorOrder = Object.keys(floors);
    const sortedKeys: (string | null)[] = [
      ...floorOrder.filter((id) => floorMap.has(id)),
      ...(floorMap.has(null) ? [null] : []),
    ];

    return sortedKeys.map((floorId) => {
      const floor = floorId ? floors[floorId] : null;
      return {
        floorId,
        floorName: floor?.name || localize('lights.floor_other'),
        floorIcon: floor?.icon || 'mdi:home-outline',
        covers: floorMap.get(floorId) ?? [],
      };
    });
  }

  private _getFloorDomKey(floorId: string | null): string {
    return floorId ?? '_none';
  }

  private _stripCoverType(entityId: string): string {
    const state = this.hass?.states[entityId];
    if (!state) return entityId;

    let name = state.attributes.friendly_name || entityId;

    for (const regex of COVER_TERM_REGEXPS) {
      regex.lastIndex = 0;
      name = name.replace(regex, '');
    }

    return name.trim() || state.attributes.friendly_name || entityId;
  }

  private _buildHeadingConfig(covers: string[], floorLabel?: string, floorIcon?: string): Record<string, unknown> {
    const groupType = this._config.group_type;
    const openText = this._config.batch_open_text || localize('covers.open_all');
    const closeText = this._config.batch_close_text || localize('covers.close_all');

    if (groupType === 'partially_open') {
      const headingLabel = floorLabel || this._config.heading_partial || localize('covers.partially_open');
      return {
        type: 'heading',
        heading: `${headingLabel} (${covers.length})`,
        icon: floorIcon || this._config.icon_partial || 'mdi:blinds-horizontal',
        badges: [
          {
            type: 'button',
            icon: 'mdi:arrow-up',
            text: openText,
            tap_action: {
              action: 'perform-action',
              perform_action: 'cover.open_cover',
              target: { entity_id: covers },
            },
          },
          {
            type: 'button',
            icon: 'mdi:arrow-down',
            text: closeText,
            tap_action: {
              action: 'perform-action',
              perform_action: 'cover.close_cover',
              target: { entity_id: covers },
            },
          },
        ],
      };
    }

    const isOpen = groupType === 'open';
    const headingLabel = floorLabel || (isOpen
      ? (this._config.heading_open || localize('covers.open'))
      : (this._config.heading_closed || localize('covers.closed')));
    const defaultIcon = isOpen ? 'mdi:blinds-horizontal' : 'mdi:blinds';
    const headingIcon = floorIcon || (isOpen
      ? (this._config.icon_open || defaultIcon)
      : (this._config.icon_closed || defaultIcon));
    return {
      type: 'heading',
      heading: `${headingLabel} (${covers.length})`,
      icon: headingIcon,
      badges: [
        {
          type: 'button',
          icon: isOpen ? 'mdi:arrow-down' : 'mdi:arrow-up',
          text: isOpen ? closeText : openText,
          tap_action: {
            action: 'perform-action',
            perform_action: isOpen ? 'cover.close_cover' : 'cover.open_cover',
            target: { entity_id: covers },
          },
        },
      ],
    };
  }

  private _getOrCreateTileCard(entityId: string): any {
    let card = this._tileCards.get(entityId);
    if (card) return card;

    card = document.createElement('hui-tile-card');
    card.hass = this.hass;
    let tileConfig: Record<string, unknown> = {
      type: 'tile',
      entity: entityId,
      name: this._stripCoverType(entityId),
      features: [{ type: 'cover-open-close' }],
      vertical: false,
      features_position: 'inline',
      state_content: ['current_position', 'last_changed'],
    };
    if (this._config.bubble_drawers === true) {
      tileConfig = withBubbleTapAction(tileConfig, entityId);
    }
    card.setConfig(tileConfig);
    this._tileCards.set(entityId, card);
    return card;
  }

  private _calculateRenderKey(covers: string[]): string {
    return covers
      .map((id) => {
        const state = this.hass?.states[id];
        if (!state) return id;
        const position = coverAttrs(state).current_position;
        if (typeof position === 'number') {
          return `${id}:${state.state}:${position}`;
        }
        return `${id}:${state.state}`;
      })
      .join(',');
  }

  protected render() {
    if (!this.hass || !this._cachedFilteredIds) return nothing;

    const covers = this._getRelevantCovers();
    this.hidden = covers.length === 0;

    if (this._config.group_by_floors && covers.length > 0) {
      const floorGroups = this._groupByFloors(covers);
      return html`
        <div class="covers-section">
          <div id="heading"></div>
          ${floorGroups.map((group) => {
            const key = this._getFloorDomKey(group.floorId);
            return html`
              <div class="floor-section">
                <div id=${`floor-heading-${key}`}></div>
                <div class="cover-grid" id=${`floor-grid-${key}`}></div>
              </div>
            `;
          })}
        </div>
      `;
    }

    return html`
      <div class="covers-section">
        <div id="heading"></div>
        <div class="cover-grid" id="grid"></div>
      </div>
    `;
  }

  private _getOrCreateFloorHeadingCard(key: string): LovelaceCardElement {
    let card = this._floorHeadingCards.get(key);
    if (card) return card;
    card = document.createElement('hui-heading-card') as LovelaceCardElement;
    this._floorHeadingCards.set(key, card);
    return card;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this.hass || !this._cachedFilteredIds) return;

    const covers = this._getRelevantCovers();
    const coversKey = this._calculateRenderKey(covers);
    if (this._lastCoversList === coversKey) return;
    this._lastCoversList = coversKey;

    if (covers.length === 0) {
      const headingSlot = this.shadowRoot?.getElementById('heading');
      if (headingSlot) headingSlot.innerHTML = '';
      const grid = this.shadowRoot?.getElementById('grid');
      if (grid) grid.innerHTML = '';
      this._headingCard = null;
      this._floorHeadingCards.clear();
      this._tileCards.clear();
      this._lastCoversList = '';
      return;
    }

    if (this._config.group_by_floors) {
      const floorGroups = this._groupByFloors(covers);

      // Reconcile main heading (total count)
      const headingSlot = this.shadowRoot?.getElementById('heading');
      if (headingSlot) {
        if (!this._headingCard) {
          this._headingCard = document.createElement('hui-heading-card');
          headingSlot.appendChild(this._headingCard);
        }
        this._headingCard.hass = this.hass;
        this._headingCard.setConfig(this._buildHeadingConfig(covers));
      }

      const activeIds = new Set(covers);
      const activeFloorKeys = new Set<string>();

      // Reconcile per-floor sections
      for (const group of floorGroups) {
        const key = this._getFloorDomKey(group.floorId);
        activeFloorKeys.add(key);
        const floorHeadingSlot = this.shadowRoot?.getElementById(`floor-heading-${key}`);
        if (floorHeadingSlot) {
          const headingCard = this._getOrCreateFloorHeadingCard(key);
          if (!headingCard.parentNode) floorHeadingSlot.appendChild(headingCard);
          headingCard.hass = this.hass;
          headingCard.setConfig(this._buildHeadingConfig(group.covers, group.floorName, group.floorIcon));
        }

        const grid = this.shadowRoot?.getElementById(`floor-grid-${key}`);
        if (!grid) continue;

        let prevNode: Node | null = null;
        for (const entityId of group.covers) {
          const card = this._getOrCreateTileCard(entityId);
          const nextSibling = prevNode ? prevNode.nextSibling : grid.firstChild;
          if (card !== nextSibling) grid.insertBefore(card, nextSibling);
          prevNode = card;
        }
        while (prevNode && prevNode.nextSibling) {
          grid.removeChild(prevNode.nextSibling);
        }
      }

      // Clean up tile cards no longer in any floor
      for (const [id, card] of this._tileCards) {
        if (!activeIds.has(id)) {
          if (card.parentNode) card.parentNode.removeChild(card);
          this._tileCards.delete(id);
        }
      }
      // Clean up floor heading cards for floors no longer present
      for (const [k, card] of this._floorHeadingCards) {
        if (!activeFloorKeys.has(k)) {
          if (card.parentNode) card.parentNode.removeChild(card);
          this._floorHeadingCards.delete(k);
        }
      }
      return;
    }

    // Flat mode (no floor grouping)
    const headingSlot = this.shadowRoot?.getElementById('heading');
    if (headingSlot) {
      if (!this._headingCard) {
        this._headingCard = document.createElement('hui-heading-card');
        headingSlot.appendChild(this._headingCard);
      }
      this._headingCard.hass = this.hass;
      this._headingCard.setConfig(this._buildHeadingConfig(covers));
    }

    const grid = this.shadowRoot?.getElementById('grid');
    if (!grid) return;

    const activeIds = new Set(covers);

    for (const [id, card] of this._tileCards) {
      if (!activeIds.has(id)) {
        if (card.parentNode === grid) grid.removeChild(card);
        this._tileCards.delete(id);
      }
    }

    let prevNode: Node | null = null;
    for (const entityId of covers) {
      const card = this._getOrCreateTileCard(entityId);
      const nextSibling = prevNode ? prevNode.nextSibling : grid.firstChild;
      if (card !== nextSibling) {
        grid.insertBefore(card, nextSibling);
      }
      prevNode = card;
    }

    while (prevNode && prevNode.nextSibling) {
      grid.removeChild(prevNode.nextSibling);
    }
  }

  getCardSize(): number {
    const covers = this._getRelevantCovers();
    return Math.ceil(covers.length / 3) + 1;
  }

  public static getStubConfig(): { group_type: 'open' | 'closed' | 'partially_open' } {
    return { group_type: 'open' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    const { createSimpleConfigEditor } = await import('./SimpleConfigEditor');
    return createSimpleConfigEditor(
      [
        {
          name: 'group_type',
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
                { value: 'partially_open', label: 'Partially open' },
              ],
            },
          },
        },
        { name: 'show_partially_open', selector: { boolean: {} } },
        { name: 'group_by_floors', selector: { boolean: {} } },
      ],
      'card.oriel-covers-group-card',
    );
  }
}

customElements.define('oriel-covers-group-card', OrielCoversGroupCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-covers-group-card')) {
  window.customCards.push({
    type: 'oriel-covers-group-card',
    name: 'Oriel Covers Group',
    description: 'Grouped open/closed cover tiles with optional partially-open bucket, awnings, and windows.',
    preview: true,
  } as { type: string; name: string; description: string });
}
