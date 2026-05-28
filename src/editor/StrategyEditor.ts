// ====================================================================
// ORIEL - EDITOR (LitElement)
// ====================================================================
// Single-file LitElement editor replacing the previous 4-file
// vanilla HTMLElement + innerHTML pattern.
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { state } from 'lit/decorators.js';
import { renderLocalized } from '../utils/safe-localize';
import yaml from 'js-yaml';

import type { HomeAssistant } from '../types/homeassistant';
import type {
  OrielConfig,
  CustomView,
  CustomCard,
  CustomBadge,
  CustomSection,
  RoomEntities,
  SectionKey,
  WeatherPresentation,
  EnergyPresentation,
  WeatherSensorConfig,
} from '../types/strategy';
import { DEFAULT_SECTIONS_ORDER } from '../types/strategy';
import type { AreaRegistryEntry, EntityRegistryEntry } from '../types/registries';
import { localize } from '../utils/localize';
import { isBadgeCandidate, isDefaultShowName, resolveShowName } from '../utils/badge-utils';
import { swapAdjacentUp, swapAdjacentDown } from '../utils/array-reorder';
import { renderViewsTab } from './tabs/ViewsTab';
import { renderOverviewTab } from './tabs/OverviewTab';
import { renderSummariesTab } from './tabs/SummariesTab';
import { renderSectionOrderTab } from './tabs/SectionOrderTab';
import { renderAreasTab } from './tabs/AreasTab';
import { renderRoomPinsTab } from './tabs/RoomPinsTab';
import { renderLightFavoritesTab } from './tabs/LightFavoritesTab';
import {
  renderFavoritesTab,
  isViewportKeyedFavorites,
  type FavoritesViewport,
} from './tabs/FavoritesTab';
import { renderWeatherSensorsTab } from './tabs/WeatherSensorsTab';
import { renderCustomCardsTab } from './tabs/CustomCardsTab';
import { renderCustomSectionsTab } from './tabs/CustomSectionsTab';
import { renderCustomBadgesTab } from './tabs/CustomBadgesTab';
import { renderCustomViewsTab } from './tabs/CustomViewsTab';
import { renderPerUserTab } from './tabs/PerUserTab';
import { renderNotificationsTab } from './tabs/NotificationsTab';
import { renderModeOrderTab } from './tabs/ModeOrderTab';
import { renderFloorplanTab } from './tabs/FloorplanTab';
import { renderRoomOverridesTab } from './tabs/RoomOverridesTab';
import { renderHealthTab } from './tabs/HealthTab';
import { onActivateKey } from '../utils/keyboard-activation';
import {
  LivePreviewRunner,
  renderLivePreviewPanel,
  renderLivePreviewToggle,
  type LivePreviewState,
} from './LivePreview';
import { renderSetupTab, SETUP_TAB_CSS } from './tabs/SetupTab';
import { unsafeCSS } from 'lit';
import { FEATURE_REGISTRY, findFeature } from '../onboarding/features';
import { detectMigrations, applyAllMigrations, type Migration } from '../utils/migrations';
import {
  hasEnoughData as usageHasEnough,
  recommendSectionsOrder,
  getTotalTaps,
} from '../utils/usage-tracker';

// -- Supporting types for the editor ------------------------------------

interface AlarmEntityOption {
  entity_id: string;
  name: string;
}

interface EntitySelectOption {
  entity_id: string;
  name: string;
  area_id?: string | null;
  device_area_id?: string | null;
}

interface DomainGroup {
  key: string;
  label: string;
  icon: string;
}

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
    cardTools?: unknown;
  }
}

// ====================================================================
// Editor Class
// ====================================================================

class OrielEditor extends LitElement {
  @state() accessor _config: OrielConfig = {};
  @state() accessor _expandedAreas = new Set<string>();
  @state() accessor _expandedGroups = new Map<string, Set<string>>();
  // Setup wizard expanded/collapsed UI state. Starts inverse of
  // _onboarding_seen on each mount; _onboarding_seen persists with
  // dashboard config so the panel auto-collapses on subsequent edits.
  @state() accessor _setupCollapsedOverride: boolean | undefined = undefined;
  // Discovered HA users for the per-user editor. Empty when the WS
  // call fails (e.g. non-admin session). Populated lazily on first
  // editor mount via `config/auth/list`.
  @state() accessor _haUsers: Array<{ id: string; name: string; is_admin?: boolean; is_owner?: boolean }> = [];
  /** Currently-selected viewport in the favorites editor when
   *  favorite_entities is in viewport-keyed shape (F-8). Default
   *  matches the most-common edit target. */
  @state() accessor _favoritesActiveViewport: FavoritesViewport = 'default';
  /** Live-preview state (F-5). Default-off so users opt in. */
  @state() accessor _livePreviewState: LivePreviewState = { visible: false, busy: false };
  /** Owned LivePreviewRunner — created on demand when the panel
   *  first goes visible. Cleared on disconnectedCallback. */
  private _livePreviewRunner: LivePreviewRunner | undefined;

  // hass is set externally by HA — use a setter, not a Lit property
  private _hass: HomeAssistant | null = null;
  private _isUpdatingConfig = false;

  // Entity search state (NOT @state — we call requestUpdate manually)
  private _favoriteSearch = '';
  private _roomPinSearch = '';
  private _weatherSensorSearch = '';
  private _securityExtraSearch = '';
  private _lightFavSearch = '';

  // Cache for loaded area entities (avoid re-fetching on every render)
  private _areaEntitiesCache = new Map<string, {
    groupedEntities: Record<string, string[]>;
    hiddenEntities: Record<string, string[]>;
    entityOrders: Record<string, string[]>;
    badgeCandidates: string[];
    additionalBadges: string[];
    availableEntities: Array<{ entity_id: string; name: string }>;
    defaultShowNames: Set<string>;
    namesVisible: string[];
    namesHidden: string[];
  }>();
  /**
   * Identity of the `hass.entities` snapshot the cache was built
   * against. HA replaces the entity-registry map wholesale on
   * registry updates (entity renames, area assignments, hidden_by
   * flips), so an identity comparison catches every real change.
   * Without this, the editor would show stale entity lists until
   * the user closed and reopened it. Mirrors the Registry-level
   * invalidation pattern.
   */
  private _areaEntitiesCacheKey: unknown = null;

  // Drag state (not reactive — no render needed)
  private _draggedElement: HTMLElement | null = null;
  private _sectionDraggedElement: HTMLElement | null = null;

  // -- Lifecycle --------------------------------------------------------

  set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;
    // Invalidate the area-entities cache when HA replaces the entity
    // registry. Without this, renames / area moves done in HA while
    // the editor is open don't appear until the editor reloads.
    // Trigger an explicit requestUpdate() — clearing the cache alone
    // doesn't queue a render because no @state field changed
    // (review §CQ-3).
    if (hass.entities !== this._areaEntitiesCacheKey) {
      this._areaEntitiesCache.clear();
      this._areaEntitiesCacheKey = hass.entities;
      this.requestUpdate();
    }
    if (!oldHass) this.requestUpdate();
  }

  setConfig(config: OrielConfig): void {
    if (this._isUpdatingConfig) return;
    this._config = config;
  }

  // -- Dependency check -------------------------------------------------

  private _checkSearchCardDependencies(): boolean {
    const hasSearchCard = customElements.get('search-card') !== undefined;
    const hasCardTools = customElements.get('card-tools') !== undefined;
    return hasSearchCard && hasCardTools;
  }

  // -- Entity helpers ---------------------------------------------------

  private _getAllEntitiesForSelect(): EntitySelectOption[] {
    if (!this._hass) return [];

    const entities = Object.values(this._hass.entities);
    const devices = Object.values(this._hass.devices);

    // Build device-to-area lookup
    const deviceAreaMap = new Map<string, string>();
    devices.forEach((device) => {
      if (device.area_id) {
        deviceAreaMap.set(device.id, device.area_id);
      }
    });

    const hass = this._hass;
    return Object.keys(hass.states)
      .map((entityId) => {
        const stateObj = hass.states[entityId];
        const entity = entities.find((e) => e.entity_id === entityId);

        let areaId = entity?.area_id;
        if (!areaId && entity?.device_id) {
          areaId = deviceAreaMap.get(entity.device_id) ?? null;
        }

        return {
          entity_id: entityId,
          name: stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' '),
          area_id: areaId,
          device_area_id: areaId,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _getAlarmEntities(): AlarmEntityOption[] {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter((entityId) => entityId.startsWith('alarm_control_panel.'))
      .map((entityId) => {
        const stateObj = this._hass!.states[entityId];
        return {
          entity_id: entityId,
          name: stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' '),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _getWeatherEntities(): AlarmEntityOption[] {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter((entityId) => entityId.startsWith('weather.'))
      .map((entityId) => {
        const stateObj = this._hass!.states[entityId];
        return {
          entity_id: entityId,
          name: stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' '),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Sensor entities reporting power (W / kW). For the optional live power badge. */
  private _getPowerSensorEntities(): AlarmEntityOption[] {
    if (!this._hass) return [];
    return Object.keys(this._hass.states)
      .filter((entityId) => {
        if (!entityId.startsWith('sensor.')) return false;
        const stateObj = this._hass!.states[entityId];
        const dc = stateObj?.attributes?.device_class;
        const unit = stateObj?.attributes?.unit_of_measurement;
        return dc === 'power' || unit === 'W' || unit === 'kW';
      })
      .map((entityId) => {
        const stateObj = this._hass!.states[entityId];
        return {
          entity_id: entityId,
          name: stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' '),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _getFilteredEntities(query: string, filterWithArea = false): EntitySelectOption[] {
    if (!this._hass || query.length < 2) return [];
    const q = query.toLowerCase();
    const all = this._getAllEntitiesForSelect();
    const filtered = all.filter((entity) => {
      if (filterWithArea && !entity.area_id && !entity.device_area_id) return false;
      return entity.name.toLowerCase().includes(q) || entity.entity_id.toLowerCase().includes(q);
    });
    // Prioritize: exact match > starts-with > contains
    filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aId = a.entity_id.toLowerCase();
      const bId = b.entity_id.toLowerCase();
      const aExact = aName === q || aId === q;
      const bExact = bName === q || bId === q;
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aStarts = aName.startsWith(q) || aId.startsWith(q) || aId.split('.')[1]?.startsWith(q);
      const bStarts = bName.startsWith(q) || bId.startsWith(q) || bId.split('.')[1]?.startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return aName.localeCompare(bName);
    });
    return filtered.slice(0, 21);
  }

  // -- Styles -----------------------------------------------------------

  static styles = css`
    /* -- Base layout --------------------------------------------------- */
    .card-config {
      padding: 16px;
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      font-size: var(--mdc-typography-body1-font-size, 14px);
      color: var(--primary-text-color);
    }
    .section {
      margin-bottom: 16px;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e8e8e8);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      transition: box-shadow 0.2s ease;
    }
    .section-title {
      font-size: 15px;
      font-weight: 500;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, #e8e8e8);
      color: var(--primary-text-color);
      letter-spacing: 0.01em;
    }

    /* -- Form rows ----------------------------------------------------- */
    .form-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      margin-right: 8px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .form-row input[type="checkbox"]:disabled,
    .form-row input[type="radio"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row label {
      cursor: pointer;
      user-select: none;
      font-size: 14px;
      color: var(--primary-text-color);
    }
    .form-row label.disabled-label {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row .alarm-select {
      flex: 1;
      max-width: 300px;
    }
    .description {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin: 2px 0 12px 26px;
      line-height: 1.4;
    }
    .description strong {
      font-weight: 600;
      color: var(--primary-text-color);
    }

    /* -- Native <select> — HA-like ------------------------------------- */
    select,
    .form-row select {
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      padding: 10px 32px 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236e6e6e' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 16px;
      transition: border-color 0.2s ease;
    }
    select:focus,
    .form-row select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    select:hover,
    .form-row select:hover {
      border-color: var(--primary-color);
    }

    /* -- Native <input type="text/number"> — HA-like ------------------- */
    input[type="text"],
    input[type="number"] {
      font-family: inherit;
      font-size: 14px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }
    input[type="text"]:focus,
    input[type="number"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    input[type="text"]:hover,
    input[type="number"]:hover {
      border-color: var(--primary-color);
    }
    input[type="text"]::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    /* -- Native <textarea> — YAML editors ------------------------------ */
    textarea {
      font-family: "Roboto Mono", "SFMono-Regular", "Consolas", "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      tab-size: 2;
    }
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    textarea:hover {
      border-color: var(--primary-color);
    }
    textarea::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
      font-family: inherit;
    }

    /* -- Buttons — HA-like --------------------------------------------- */
    button {
      font-family: inherit;
      font-size: 14px;
    }
    .btn-primary {
      padding: 10px 20px;
      border-radius: var(--ha-card-border-radius, 12px);
      border: none;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s ease, box-shadow 0.2s ease;
      white-space: nowrap;
    }
    .btn-primary:hover {
      opacity: 0.85;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .btn-primary:active {
      opacity: 0.75;
    }
    .btn-remove {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--secondary-text-color);
      cursor: pointer;
      font-size: 14px;
      transition: color 0.2s ease, border-color 0.2s ease;
      line-height: 1;
    }
    .btn-remove:hover {
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }

    /* -- Area list ----------------------------------------------------- */
    .area-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .area-item {
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .area-item:last-child {
      border-bottom: none;
    }
    .area-item.dragging {
      opacity: 0.5;
    }
    .area-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .area-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
    }
    .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .area-checkbox {
      margin-right: 12px;
      accent-color: var(--primary-color);
    }
    .area-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .area-icon {
      margin-left: 8px;
      margin-right: 12px;
      color: var(--secondary-text-color);
    }
    .expand-button {
      background: none;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      color: var(--secondary-text-color);
      transition: transform 0.2s;
    }
    .expand-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .expand-button.expanded .expand-icon {
      transform: rotate(90deg);
    }
    .expand-icon {
      display: inline-block;
      transition: transform 0.2s;
    }
    .area-content {
      padding: 0 12px 12px 48px;
      background: var(--secondary-background-color);
    }
    .loading-placeholder {
      padding: 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Section order list --------------------------------------------- */
    .section-order-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .section-order-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: opacity 0.2s;
    }
    .section-order-item:last-child {
      border-bottom: none;
    }
    .section-order-item.dragging {
      opacity: 0.4;
    }
    .section-order-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .section-order-item.disabled {
      opacity: 0.5;
    }
    .section-order-item .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .section-order-item .drag-handle:active {
      cursor: grabbing;
    }
    .section-order-item .section-icon {
      margin-right: 10px;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
    }
    .section-order-item .section-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .section-order-item .section-hidden-tag {
      font-size: 12px;
      color: var(--secondary-text-color);
      font-style: italic;
      margin-left: 8px;
    }
    .section-order-item .section-toggle {
      margin-left: 8px;
      cursor: pointer;
    }
    .section-order-item .section-toggle input {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
    .section-order-item .section-move-btn {
      margin-left: 4px;
      background: transparent;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 14px;
      line-height: 1;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .section-order-item .section-move-btn:first-of-type {
      margin-left: auto;
    }
    .section-order-item .section-move-btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }
    .section-order-item .section-move-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .section-order-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px 8px 56px;
      border-bottom: 1px solid var(--divider-color);
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .section-order-sub input {
      cursor: pointer;
    }
    .section-order-sub label {
      cursor: pointer;
    }

    /* -- Entity groups ------------------------------------------------- */
    .entity-groups {
      padding-top: 8px;
    }
    .entity-group {
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      overflow: hidden;
    }
    .entity-group-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
    }
    .entity-group-header:hover {
      background: var(--secondary-background-color);
    }
    .group-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .group-checkbox[data-indeterminate="true"] {
      opacity: 0.6;
    }
    .entity-group-header ha-icon {
      margin-right: 8px;
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .group-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }
    .entity-count {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin-right: 8px;
    }
    .expand-button-small {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .expand-button-small.expanded .expand-icon-small {
      transform: rotate(90deg);
    }
    .expand-icon-small {
      display: inline-block;
      font-size: 12px;
      transition: transform 0.2s;
    }

    /* -- Entity list --------------------------------------------------- */
    .entity-list {
      padding: 8px 12px 8px 36px;
      border-top: 1px solid var(--divider-color);
    }
    .entity-item {
      display: flex;
      align-items: center;
      padding: 6px 0;
    }
    .entity-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .entity-name {
      flex: 1;
      font-size: 14px;
    }
    .entity-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-left: 8px;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Badge entity management --------------------------------------- */
    .badge-separator {
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      border-top: 1px dashed var(--divider-color);
      margin-top: 4px;
    }
    .badge-additional-item {
      padding-left: 0;
    }
    .badge-remove-btn {
      background: none;
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      color: var(--error-color, #db4437);
      font-size: 14px;
      margin-left: 8px;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }
    .badge-remove-btn:hover {
      background: var(--secondary-background-color);
    }
    .badge-add-section {
      display: flex;
      gap: 8px;
      padding: 8px 0 4px;
      align-items: center;
    }
    .badge-entity-picker {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .badge-add-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }
    .badge-add-button:hover {
      opacity: 0.85;
    }
    .badge-name-checkbox {
      margin-left: auto;
      margin-right: 2px;
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .badge-name-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-right: 8px;
      white-space: nowrap;
    }

    /* -- Entity search picker ------------------------------------------ */
    .entity-search-picker {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .entity-search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }
    .entity-search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .entity-search-input::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }
    .entity-search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 10;
      margin-top: 4px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      max-height: 320px;
      overflow-y: auto;
    }
    .entity-search-result {
      display: flex;
      flex-direction: column;
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color 0.1s ease;
      border-bottom: 1px solid var(--divider-color);
    }
    .entity-search-result:last-child {
      border-bottom: none;
    }
    .entity-search-result:hover {
      background: var(--secondary-background-color);
    }
    .entity-search-result .entity-search-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-search-result .entity-search-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-top: 2px;
    }
    .entity-search-no-results {
      padding: 12px 14px;
      color: var(--secondary-text-color);
      font-style: italic;
      font-size: 13px;
    }

    /* -- Favorites / Room Pins list items ------------------------------ */
    .entity-list-container {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .entity-list-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: background-color 0.1s ease;
    }
    .entity-list-item:last-child {
      border-bottom: none;
    }
    .entity-list-item:hover {
      background: var(--secondary-background-color);
    }
    .entity-list-item .drag-icon {
      margin-right: 12px;
      color: var(--secondary-text-color);
      font-size: 16px;
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .entity-list-item .drag-icon:active {
      cursor: grabbing;
    }
    .entity-list-item.dragging {
      opacity: 0.5;
    }
    .entity-list-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .entity-list-item .item-info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
    }
    .entity-list-item .item-name {
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-list-item .item-entity-id {
      margin-left: 8px;
      font-size: 12px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
    }
    .entity-list-item .item-area {
      display: block;
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }

    /* -- Custom view/card/badge items ---------------------------------- */
    .custom-item {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      margin-bottom: 12px;
      background: var(--card-background-color);
    }
    .custom-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .custom-item-header strong {
      font-size: 14px;
      font-weight: 500;
    }
    .custom-item-fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .custom-card-target {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .custom-card-target label {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .custom-card-target select {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .custom-item-row {
      display: flex;
      gap: 8px;
    }
    .custom-item-validation {
      font-size: 12px;
      min-height: 16px;
    }

    /* -- Section dividers ---------------------------------------------- */
    .section-divider {
      margin: 28px 0 12px;
      padding: 0;
    }
    .section-divider-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
    }

    /* -- Mobile responsive --------------------------------------------- */
    @media (max-width: 600px) {
      .card-config {
        padding: 12px 8px;
      }
      .section {
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 15px;
        margin-bottom: 8px;
      }
      .form-row {
        flex-wrap: wrap;
        gap: 4px;
      }
      .form-row label {
        font-size: 13px;
      }
      .description {
        margin-left: 26px;
        margin-bottom: 12px;
        font-size: 11px;
      }

      select,
      .form-row select {
        width: 100%;
        min-width: 0;
        font-size: 13px;
        padding: 8px 28px 8px 10px;
      }
      input[type="text"],
      input[type="number"] {
        width: 100%;
        font-size: 13px;
        padding: 8px 10px;
      }
      textarea {
        font-size: 11px;
        padding: 10px;
        min-height: 60px;
      }

      .entity-search-picker {
        width: 100%;
      }
      .entity-search-results {
        max-height: 240px;
      }
      .entity-search-result {
        padding: 8px 10px;
      }

      .area-header {
        padding: 10px 12px;
      }
      .area-content {
        padding: 0 8px 8px 24px;
      }
      .entity-list {
        padding: 6px 8px 6px 16px;
      }

      .custom-item {
        padding: 12px;
      }
      .custom-item-row {
        flex-direction: column;
      }

      .entity-list-item {
        padding: 8px 10px;
      }
      .entity-list-item .item-entity-id {
        display: block;
        margin-left: 0;
        margin-top: 2px;
      }

      .badge-add-section {
        flex-wrap: wrap;
      }

      .btn-primary {
        padding: 8px 16px;
        font-size: 13px;
      }
    }

    /* -- Setup wizard (v3.1.0) ----------------------------------------- */
    ${unsafeCSS(SETUP_TAB_CSS)}

    /* -- Migration banner (v3.4.3) ------------------------------------- */
    .oriel-migration-banner {
      background: color-mix(in srgb, var(--info-color, #2196f3) 12%, transparent);
      border: 1px solid var(--info-color, #2196f3);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .oriel-migration-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .oriel-migration-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid color-mix(in srgb, var(--info-color, #2196f3) 30%, transparent);
    }
    .oriel-migration-label { font-weight: 500; }
    .oriel-migration-desc {
      color: var(--secondary-text-color);
      font-size: 0.85rem;
      margin-top: 2px;
    }
    .oriel-migration-apply, .oriel-migration-applyall {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
      white-space: nowrap;
    }
    .oriel-migration-footer {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    /* -- Usage suggestion banner (v3.5.1) ------------------------------ */
    .oriel-usage-banner {
      background: color-mix(in srgb, var(--accent-color, #ff9800) 12%, transparent);
      border: 1px solid var(--accent-color, #ff9800);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .oriel-usage-title { display: flex; align-items: center; gap: 8px; }
    .oriel-usage-stats { color: var(--secondary-text-color); font-size: 0.85rem; }
    .oriel-usage-body {
      margin: 8px 0;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
    .oriel-usage-order { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .oriel-usage-chip {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.85rem;
    }
    .oriel-usage-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .oriel-usage-apply {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }
    .oriel-usage-dismiss {
      background: transparent;
      color: var(--secondary-text-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }
  `;

  // -- Main render ------------------------------------------------------

  /**
   * Open the current dashboard URL in a new tab so the user can see
   * the effects of their config without manually navigating. Tries
   * to derive the dashboard URL from the editor's location — the
   * editor opens inside HA's dashboard editor modal, so the
   * referrer URL contains the dashboard's storage URL path. Falls
   * back to opening / which lands on HA's default dashboard.
   *
   * Roadmap A3 (lighter): can't render a live preview without an
   * iframe sandbox, but eliminating the "navigate manually to see
   * the result" friction is the bulk of the UX win.
   */
  /**
   * Toggle the live-preview side panel. First-time enable lazy-
   * instantiates the runner + kicks off an initial generate(). Disable
   * cancels any pending timer and clears state. The runner is reused
   * across visible/hidden cycles within the same editor lifetime to
   * avoid re-importing the strategy module on every toggle.
   */
  private _toggleLivePreview(): void {
    if (this._livePreviewState.visible) {
      this._livePreviewRunner?.cancel();
      this._livePreviewState = { ...this._livePreviewState, visible: false };
      return;
    }
    if (!this._livePreviewRunner) {
      this._livePreviewRunner = new LivePreviewRunner(
        (result, error) => {
          this._livePreviewState = {
            ...this._livePreviewState,
            result,
            error,
          };
        },
        (busy) => {
          this._livePreviewState = { ...this._livePreviewState, busy };
        },
      );
    }
    this._livePreviewState = { ...this._livePreviewState, visible: true };
    if (this._hass) {
      this._livePreviewRunner.schedule(this._config, this._hass);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._livePreviewRunner?.cancel();
  }

  private _openPreview = (): void => {
    // Try to extract the dashboard path. HA's edit-dashboard URL
    // looks like /lovelace/0 or /<url_path>/0 — we strip the
    // trailing view index to get the dashboard root.
    let url = '/';
    try {
      const referrer = document.referrer || window.location.pathname;
      const m = referrer.match(/\/([a-z0-9_-]+)(?:\/\d+)?(?:\?.*)?$/i);
      if (m && m[1]) {
        url = `/${m[1]}/0`;
      }
    } catch {
      /* ignore */
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  protected render() {
    if (!this._hass) return nothing;

    return html`
      <div class="card-config">
        <div class="preview-action" style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px;">
          ${renderLivePreviewToggle({
            hass: this._hass,
            config: this._config,
            state: this._livePreviewState,
            onTogglePanel: () => this._toggleLivePreview(),
          })}
          <button
            class="btn-primary"
            @click=${this._openPreview}
            title=${localize('editor.preview_dashboard') || 'Open the dashboard in a new tab to preview your changes'}
          >
            ${localize('editor.preview_dashboard') || '👁  Preview dashboard'}
          </button>
        </div>
        ${renderLivePreviewPanel({
          hass: this._hass,
          config: this._config,
          state: this._livePreviewState,
          onTogglePanel: () => this._toggleLivePreview(),
        })}
        ${this._renderMigrationBanner()}
        ${this._renderUsageSuggestion()}
        ${this._renderHealthSection()}
        ${this._renderSetupSection()}
        ${this._renderOverviewSection()}
        ${this._renderSummariesSection()}
        ${this._renderFavoritesSection()}
        ${this._renderLightFavoritesSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${localize('editor.section_areas_rooms')}
          </div>
        </div>

        ${this._renderAreasSection()}
        ${this._renderRoomPinsSection()}
        ${this._renderViewsSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${localize('editor.section_advanced')}
          </div>
        </div>

        ${this._renderSectionOrderPanel()}
        ${this._renderWeatherSensorsSection()}
        ${this._renderCustomCardsSection()}
        ${this._renderCustomSectionsSection()}
        ${this._renderCustomBadgesSection()}
        ${this._renderCustomViewsSection()}
        ${this._renderPerUserSection()}
        ${this._renderNotificationsSection()}
        ${this._renderModeOrderSection()}
        ${this._renderRoomOverridesSection()}
        ${this._renderFloorplanSection()}
      </div>
    `;
  }

  /**
   * Render the dashboard health-check tab. Returns nothing when there
   * are no detected issues (the tab hides entirely — per F-4 spec, the
   * absence of problems should not consume visual space).
   */
  private _renderHealthSection(): TemplateResult | typeof nothing {
    if (!this._hass) return nothing;
    return renderHealthTab({
      hass: this._hass,
      config: this._config,
      onApplyFix: (patched) => {
        this._config = patched;
        this._fireConfigChanged(patched);
      },
    });
  }

  private _renderNotificationsSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderNotificationsTab({
      hass: this._hass,
      config: this._config,
      onChange: (triggers) => {
        const newConfig: OrielConfig = { ...this._config };
        if (triggers.length === 0) delete newConfig.notification_triggers;
        else newConfig.notification_triggers = triggers as OrielConfig['notification_triggers'];
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  private _renderModeOrderSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderModeOrderTab({
      hass: this._hass,
      config: this._config,
      onChange: (next) => {
        const newConfig: OrielConfig = { ...this._config };
        if (Object.keys(next).length === 0) delete newConfig.sections_order_by_mode;
        else newConfig.sections_order_by_mode = next;
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  private _renderFloorplanSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderFloorplanTab({
      hass: this._hass,
      config: this._config,
      onChange: (next) => {
        const newConfig: OrielConfig = { ...this._config };
        if (next === undefined) delete newConfig.floorplan_view;
        else newConfig.floorplan_view = next;
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  private _renderRoomOverridesSection(): TemplateResult {
    if (!this._hass) return html``;
    const areas = Object.values(
      (this._hass as unknown as { areas?: Record<string, AreaRegistryEntry> }).areas ?? {},
    ) as AreaRegistryEntry[];
    return renderRoomOverridesTab({
      hass: this._hass,
      config: this._config,
      areas,
      onChange: (areasOptions) => {
        const newConfig: OrielConfig = { ...this._config };
        if (Object.keys(areasOptions).length === 0) delete newConfig.areas_options;
        else newConfig.areas_options = areasOptions;
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  // ====================================================================
  // SECTION RENDERERS
  // ====================================================================

  // -- Usage-aware section ordering banner (v3.5.1) ---------------------

  private _renderUsageSuggestion(): TemplateResult {
    if (!this._hass) return html``;
    if (!usageHasEnough()) return html``;
    // Skip the banner if user explicitly dismissed it for this config.
    if ((this._config as { _usage_suggestion_dismissed?: boolean })._usage_suggestion_dismissed) {
      return html``;
    }
    const currentOrder = this._getSectionsOrder();
    const recommendation = recommendSectionsOrder(currentOrder as string[]);
    if (!recommendation) return html``;
    const totalTaps = getTotalTaps();
    return html`
      <div class="oriel-usage-banner">
        <div class="oriel-usage-title">
          <ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>
          <strong>Suggested layout from your usage</strong>
          <span class="oriel-usage-stats">(based on ${totalTaps} taps)</span>
        </div>
        <div class="oriel-usage-body">
          Your most-used sections aren't currently at the top. Apply the
          suggested order or dismiss to keep the current layout.
        </div>
        <div class="oriel-usage-order">
          ${recommendation.order.map(
            (k, i) => html`<span class="oriel-usage-chip">${i + 1}. ${k}</span>`,
          )}
        </div>
        <div class="oriel-usage-actions">
          <button class="oriel-usage-apply"
                  @click=${() => this._applyUsageSuggestion(recommendation.order)}>
            Apply
          </button>
          <button class="oriel-usage-dismiss" @click=${this._dismissUsageSuggestion}>
            Dismiss
          </button>
        </div>
      </div>
    `;
  }

  private _applyUsageSuggestion(order: string[]): void {
    // Cast as SectionKey[] — the recommender preserves the existing
    // section keys, so the runtime types match.
    this._updateSectionsOrder(order as unknown as SectionKey[]);
  }

  private _dismissUsageSuggestion = (): void => {
    const newConfig = { ...this._config, _usage_suggestion_dismissed: true } as OrielConfig;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  };

  // -- Migration banner (v3.4.3) ----------------------------------------

  private _renderMigrationBanner(): TemplateResult {
    if (!this._hass) return html``;
    const pending = detectMigrations(this._config);
    if (pending.length === 0) return html``;
    return html`
      <div class="oriel-migration-banner">
        <div class="oriel-migration-title">
          <ha-icon icon="mdi:update"></ha-icon>
          <strong>${pending.length} config update${pending.length === 1 ? '' : 's'} available</strong>
        </div>
        ${pending.map(
          (m: Migration) => html`
            <div class="oriel-migration-row">
              <div>
                <div class="oriel-migration-label">${m.label}</div>
                <div class="oriel-migration-desc">${m.description}</div>
              </div>
              <button class="oriel-migration-apply" @click=${() => this._applyMigration(m)}>
                Apply
              </button>
            </div>
          `,
        )}
        <div class="oriel-migration-footer">
          <button class="oriel-migration-applyall" @click=${this._applyAllMigrations}>
            Apply all
          </button>
        </div>
      </div>
    `;
  }

  private _applyMigration(m: Migration): void {
    const newConfig = m.apply(this._config);
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _applyAllMigrations = (): void => {
    const newConfig = applyAllMigrations(this._config);
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  };

  // -- Setup wizard ------------------------------------------------------

  private _renderSetupSection(): TemplateResult {
    if (!this._hass) return html``;
    const seen = (this._config as { _onboarding_seen?: boolean })._onboarding_seen === true;
    const collapsed = this._setupCollapsedOverride ?? seen;
    return renderSetupTab({
      hass: this._hass,
      config: this._config,
      collapsed,
      onToggleCollapsed: () => {
        // When the user manually toggles, override the persisted state
        // for this session — but don't mutate _onboarding_seen on every
        // chevron click (only "Hide this section" persists).
        this._setupCollapsedOverride = !collapsed;
        this.requestUpdate();
      },
      onDismiss: () => {
        const newConfig: OrielConfig = {
          ...this._config,
          _onboarding_seen: true,
        } as OrielConfig;
        this._config = newConfig;
        this._setupCollapsedOverride = true;
        this._fireConfigChanged(newConfig);
      },
      onFeatureToggle: (id, enabled) => this._onFeatureToggle(id, enabled),
      onApplyPersona: (personaId) => this._applyPersonaFromSetup(personaId),
      onApplyHint: (hint) => this._applyHint(hint),
      onDismissHint: (hintId) => this._dismissHint(hintId),
      onRerunSetup: () => this._rerunSetup(),
    });
  }

  /** Apply a persona's config patch + record which persona is active. */
  private async _applyPersonaFromSetup(personaId: string): Promise<void> {
    const { applyPersona } = await import('../onboarding/personas');
    const newConfig = applyPersona(personaId, this._config);
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  /** Apply an adaptive hint's config patch. */
  private async _applyHint(
    hint: {
      apply: (c: OrielConfig, hass: HomeAssistant) => OrielConfig | null;
      id: string;
    },
  ): Promise<void> {
    // The hint itself patches; we also dismiss it so it doesn't reappear.
    if (!this._hass) return;
    const { dismissHint } = await import('../onboarding/hints');
    const patched = hint.apply(this._config, this._hass);
    // `null` signals "did not apply" — the prerequisite the hint
    // promised to act on isn't actually there at apply time (race
    // between detect and click, or an entity that exists but doesn't
    // carry the attributes the hint needs). Still dismiss so the
    // card disappears; the hint itself logs a console.warn for
    // debuggability.
    const base = patched ?? this._config;
    const dismissed = dismissHint(base, hint.id);
    this._config = dismissed;
    this._fireConfigChanged(dismissed);
  }

  /** Dismiss an adaptive hint without applying it. */
  private async _dismissHint(hintId: string): Promise<void> {
    const { dismissHint } = await import('../onboarding/hints');
    const newConfig = dismissHint(this._config, hintId);
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  /** Reset onboarding state so the wizard surfaces again. */
  private _rerunSetup(): void {
    const newConfig: OrielConfig = { ...this._config };
    delete newConfig._onboarding_seen;
    delete newConfig._dismissed_hints;
    this._config = newConfig;
    this._setupCollapsedOverride = false;
    this._fireConfigChanged(newConfig);
  }

  /**
   * Apply a feature registry toggle. The feature's `toggle(enabled)`
   * returns a config patch; we merge it into `_config` and fire the
   * change event. Features without a `toggle` handler are read-only in
   * the wizard (the user configures them elsewhere).
   */
  private _onFeatureToggle(id: string, enabled: boolean): void {
    const f = findFeature(id);
    if (!f || !f.toggle) return;
    const patch = f.toggle(enabled);
    const newConfig: OrielConfig = { ...this._config } as OrielConfig;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete (newConfig as Record<string, unknown>)[key];
      } else {
        (newConfig as Record<string, unknown>)[key] = value;
      }
    }
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Section order panel -----------------------------------------------

  private _getSectionsOrder(): SectionKey[] {
    return this._config.sections_order || [...DEFAULT_SECTIONS_ORDER];
  }

  private _updateSectionsOrder(newOrder: SectionKey[]): void {
    const newConfig: OrielConfig = {
      ...this._config,
      sections_order: newOrder,
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _moveSectionUp(idx: number): void {
    const order = this._getSectionsOrder();
    const next = swapAdjacentUp(order, idx);
    if (next === order) return;
    this._updateSectionsOrder(next as SectionKey[]);
  }

  private _moveSectionDown(idx: number): void {
    const order = this._getSectionsOrder();
    const next = swapAdjacentDown(order, idx);
    if (next === order) return;
    this._updateSectionsOrder(next as SectionKey[]);
  }

  private _isSectionDisabled(key: SectionKey): boolean {
    switch (key) {
      case 'custom_cards':
        return (this._config.custom_cards || []).length === 0;
      case 'weather':
        return this._config.show_weather === false;
      case 'energy':
        return this._config.show_energy === false;
      case 'plants':
        return this._config.show_plants_section !== true;
      case 'agenda':
        return this._config.show_agenda_section !== true;
      case 'todos':
        return this._config.show_todos_section !== true;
      case 'persons':
        return this._config.show_persons_section !== true;
      case 'vacuums':
        return this._config.show_vacuums_section !== true;
      case 'maintenance':
        return this._config.show_maintenance_section !== true;
      default:
        return false;
    }
  }

  private static _sectionMeta = new Map<SectionKey, { icon: string; labelKey: string }>([
    ['overview', { icon: 'mdi:home-outline', labelKey: 'sections.overview' }],
    ['custom_cards', { icon: 'mdi:cards', labelKey: 'sections.custom_cards' }],
    ['areas', { icon: 'mdi:floor-plan', labelKey: 'sections.areas' }],
    ['weather', { icon: 'mdi:weather-partly-cloudy', labelKey: 'sections.weather' }],
    ['energy', { icon: 'mdi:lightning-bolt', labelKey: 'sections.energy' }],
    ['plants', { icon: 'mdi:flower-tulip', labelKey: 'sections.plants' }],
    ['agenda', { icon: 'mdi:calendar', labelKey: 'sections.agenda' }],
    ['todos', { icon: 'mdi:format-list-checks', labelKey: 'sections.todos' }],
    ['persons', { icon: 'mdi:account-group', labelKey: 'sections.persons' }],
    ['vacuums', { icon: 'mdi:robot-vacuum', labelKey: 'sections.vacuums' }],
    ['maintenance', { icon: 'mdi:update', labelKey: 'sections.maintenance' }],
  ]);

  private _isSectionToggleable(key: SectionKey): boolean {
    return key === 'weather' || key === 'energy'
      || key === 'plants' || key === 'agenda' || key === 'todos'
      || key === 'persons' || key === 'vacuums' || key === 'maintenance';
  }

  private _toggleSectionVisibility(key: SectionKey, visible: boolean): void {
    if (key === 'weather') {
      this._toggleChanged('show_weather', visible, true);
    } else if (key === 'energy') {
      this._toggleChanged('show_energy', visible, true);
    } else if (key === 'plants') {
      this._toggleChanged('show_plants_section', visible, false);
    } else if (key === 'agenda') {
      this._toggleChanged('show_agenda_section', visible, false);
    } else if (key === 'todos') {
      this._toggleChanged('show_todos_section', visible, false);
    } else if (key === 'persons') {
      this._toggleChanged('show_persons_section', visible, false);
    } else if (key === 'vacuums') {
      this._toggleChanged('show_vacuums_section', visible, false);
    } else if (key === 'maintenance') {
      this._toggleChanged('show_maintenance_section', visible, false);
    }
  }

  /**
   * Persist a weather_presentation pick. Migrates off the legacy boolean:
   * sets weather_presentation explicitly and deletes the deprecated
   * `show_weather_forecast_card` field so the YAML reflects user intent.
   */
  private _setWeatherPresentation(presentation: WeatherPresentation): void {
    const newConfig: OrielConfig = {
      ...this._config,
      weather_presentation: presentation,
    };
    delete newConfig.show_weather_forecast_card;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  /**
   * Persist an energy_presentation pick. Mirrors the weather variant —
   * the explicit `energy_presentation` field supersedes the legacy
   * `show_energy_distribution_card` boolean.
   */
  private _setEnergyPresentation(presentation: EnergyPresentation): void {
    const newConfig: OrielConfig = {
      ...this._config,
      energy_presentation: presentation,
    };
    delete newConfig.show_energy_distribution_card;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Per-user / per-role overrides ------------------------------------

  private _renderPerUserSection(): TemplateResult {
    if (!this._hass) return html``;
    // Lazy-fetch HA users on first render. Cached afterwards in
    // _haUsers state so subsequent renders are instant.
    if (this._haUsers.length === 0 && !this._haUsersFetchAttempted) {
      this._haUsersFetchAttempted = true;
      void this._fetchHaUsers();
    }
    return renderPerUserTab({
      hass: this._hass,
      config: this._config,
      users: this._haUsers,
      onUsersConfigChange: (users) => {
        const newConfig: OrielConfig = { ...this._config };
        if (Object.keys(users).length === 0) delete newConfig.users;
        else newConfig.users = users;
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
      onUsersByRoleChange: (usersByRole) => {
        const newConfig: OrielConfig = { ...this._config };
        if (Object.keys(usersByRole).length === 0) delete newConfig.users_by_role;
        else newConfig.users_by_role = usersByRole;
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  private _haUsersFetchAttempted = false;

  /**
   * Fetch HA's user list via the admin-only `config/auth/list` WS
   * command. Silently fails on non-admin sessions — the editor falls
   * back to "type the user ID manually".
   */
  private async _fetchHaUsers(): Promise<void> {
    if (!this._hass) return;
    try {
      const result = await this._hass.callWS<Array<{ id: string; name: string; is_admin?: boolean; is_owner?: boolean }>>({
        type: 'config/auth/list',
      });
      if (Array.isArray(result)) this._haUsers = result;
    } catch {
      // Non-admin or transient — keep empty list, editor falls back to manual entry.
    }
  }

  /**
   * Persist plants_presentation / vacuums_presentation. Empty string
   * means "default tile layout" — strip the key to keep YAML sparse.
   */
  private _setPlantsPresentation(value: string): void {
    const newConfig: OrielConfig = { ...this._config };
    if (value) newConfig.plants_presentation = value;
    else delete newConfig.plants_presentation;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _setVacuumsPresentation(value: string): void {
    const newConfig: OrielConfig = { ...this._config };
    if (value) newConfig.vacuums_presentation = value;
    else delete newConfig.vacuums_presentation;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _renderSectionOrderPanel(): TemplateResult {
    // Section-order render template lives in a per-tab module; drag-drop
    // state + every mutator stays on the editor class. See
    // src/editor/tabs/SectionOrderTab.ts.
    if (!this._hass) return html``;
    return renderSectionOrderTab({
      hass: this._hass,
      config: this._config,
      order: this._getSectionsOrder(),
      sectionMeta: OrielEditor._sectionMeta,
      weatherEntities: this._getWeatherEntities(),
      powerSensorEntities: this._getPowerSensorEntities(),
      isSectionDisabled: (k) => this._isSectionDisabled(k),
      isSectionToggleable: (k) => this._isSectionToggleable(k),
      onToggleChange: (k, v, d) => this._toggleChanged(k, v, d),
      onSetWeatherPresentation: (v) => this._setWeatherPresentation(v),
      onSetEnergyPresentation: (v) => this._setEnergyPresentation(v),
      onSetPlantsPresentation: (v) => this._setPlantsPresentation(v),
      onSetVacuumsPresentation: (v) => this._setVacuumsPresentation(v),
      onWeatherEntityChange: (e) => this._weatherEntityChanged(e),
      onPowerBadgeEntityChange: (e) => this._powerBadgeEntityChanged(e),
      onToggleSectionVisibility: (k, v) => this._toggleSectionVisibility(k, v),
      onToggleHiddenHeading: (k, h) => this._toggleHiddenHeading(k, h),
      onSectionVisibilityChange: (k, f, v) => this._sectionVisibilityChanged(k, f, v),
      onDragStart: this._handleSectionDragStart,
      onDragEnd: this._handleSectionDragEnd,
      onDragOver: this._handleSectionDragOver,
      onDragLeave: this._handleSectionDragLeave,
      onDrop: this._handleSectionDrop,
      onMoveSectionUp: (idx) => this._moveSectionUp(idx),
      onMoveSectionDown: (idx) => this._moveSectionDown(idx),
    });
  }

  private _toggleHiddenHeading(key: string, hide: boolean): void {
    const current = new Set(this._config.hidden_section_headings || []);
    if (hide) {
      current.add(key as any);
    } else {
      current.delete(key as any);
    }
    const next = [...current];
    const updated: OrielConfig = { ...this._config };
    if (next.length === 0) {
      delete updated.hidden_section_headings;
    } else {
      updated.hidden_section_headings = next;
    }
    this._fireConfigChanged(updated);
  }

  private _sectionVisibilityChanged(
    sectionKey: string,
    field: 'entity' | 'state' | 'role' | 'time_after' | 'time_before' | 'mode_entity' | 'mode_is',
    value: string,
  ): void {
    const updated: OrielConfig = { ...this._config };
    const current = {
      ...(updated.section_visibility || {}),
    } as Record<string, Record<string, unknown>>;
    const rule = { ...(current[sectionKey] || {}) };
    const trimmed = value.trim();
    if (trimmed) {
      rule[field] = trimmed;
    } else {
      delete rule[field];
    }
    // Drop the rule entirely when every field is empty — keeps YAML sparse
    if (Object.keys(rule).length === 0) {
      delete current[sectionKey];
    } else {
      current[sectionKey] = rule;
    }
    if (Object.keys(current).length === 0) {
      delete updated.section_visibility;
    } else {
      updated.section_visibility = current as OrielConfig['section_visibility'];
    }
    this._fireConfigChanged(updated);
  }

  // -- Section order drag & drop -----------------------------------------

  private _handleSectionDragStart = (ev: DragEvent): void => {
    const dragHandle = (ev.target as HTMLElement).closest('.drag-handle');
    if (!dragHandle) { ev.preventDefault(); return; }

    const item = (ev.target as HTMLElement).closest('.section-order-item') as HTMLElement | null;
    if (!item) { ev.preventDefault(); return; }

    item.classList.add('dragging');
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', item.dataset.sectionKey || '');
    }
    this._sectionDraggedElement = item;
  };

  private _handleSectionDragEnd = (ev: DragEvent): void => {
    const item = (ev.target as HTMLElement).closest('.section-order-item') as HTMLElement | null;
    if (item) item.classList.remove('dragging');

    const list = this.shadowRoot?.querySelector('#section-order-list');
    if (list) {
      list.querySelectorAll('.section-order-item').forEach((el) => {
        el.classList.remove('drag-over');
      });
    }
    this._sectionDraggedElement = null;
  };

  private _handleSectionDragOver = (ev: DragEvent): void => {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';

    const item = ev.currentTarget as HTMLElement;
    if (item !== this._sectionDraggedElement) {
      item.classList.add('drag-over');
    }
  };

  private _handleSectionDragLeave = (ev: DragEvent): void => {
    (ev.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  private _handleSectionDrop = (ev: DragEvent): void => {
    ev.stopPropagation();
    ev.preventDefault();

    const dropTarget = ev.currentTarget as HTMLElement;
    dropTarget.classList.remove('drag-over');

    if (!this._sectionDraggedElement || this._sectionDraggedElement === dropTarget) return;

    const draggedKey = this._sectionDraggedElement.dataset.sectionKey as SectionKey | undefined;
    const dropKey = dropTarget.dataset.sectionKey as SectionKey | undefined;
    if (!draggedKey || !dropKey) return;

    const currentOrder = this._getSectionsOrder();
    const draggedIndex = currentOrder.indexOf(draggedKey);
    const dropIndex = currentOrder.indexOf(dropKey);
    if (draggedIndex === -1 || dropIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedKey);

    this._updateSectionsOrder(newOrder);
  };

  // -- Overview section --------------------------------------------------

  private _renderOverviewSection(): TemplateResult {
    // Overview tab is ha-form-driven. The "search card deps missing"
    // warning is preserved as a sibling block — it's a pure
    // informational notice, not a form input. ha-form drives every
    // actual config field via the schema.
    if (!this._hass) return html``;
    const hasSearchCardDeps = this._checkSearchCardDependencies();
    const showSearchCard = this._config.show_search_card === true;
    return html`
      ${renderOverviewTab({
        hass: this._hass,
        config: this._config,
        onChange: (patch) => {
          const newConfig: OrielConfig = { ...this._config, ...patch };
          for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
            if (patch[key] === undefined) {
              delete (newConfig as Record<string, unknown>)[key as string];
            }
          }
          this._config = newConfig;
          this._fireConfigChanged(newConfig);
        },
      })}
      ${showSearchCard && !hasSearchCardDeps
        ? html`<div class="description" style="margin-top: -8px;">
            <span>&#x26A0;&#xFE0F; ${renderLocalized(localize('editor.show_search_card_missing'))}</span>
          </div>`
        : nothing}
    `;
  }

  private _searchCardVariantChanged(variant: 'custom' | 'tip'): void {
    const updated: OrielConfig = { ...this._config };
    if (variant === 'custom') {
      delete updated.search_card_variant;
    } else {
      updated.search_card_variant = variant;
    }
    this._fireConfigChanged(updated);
  }

  private _renderSummariesSection(): TemplateResult {
    // Summaries tab is ha-form-driven. Security extras passed as a
    // slot since it's a stateful searchable picker — converting it
    // to a `selector: { entity: { multiple: true } }` is a future
    // cleanup.
    if (!this._hass) return html``;
    return renderSummariesTab({
      hass: this._hass,
      config: this._config,
      securityExtraSlot: this._renderSecurityExtraEntitiesPicker(),
      onChange: (patch) => {
        const newConfig: OrielConfig = { ...this._config, ...patch };
        for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
          if (patch[key] === undefined) {
            delete (newConfig as Record<string, unknown>)[key as string];
          }
        }
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }


  private _renderSecurityExtraEntitiesPicker(): TemplateResult {
    const extras = this._config.security_extra_entities || [];
    const allEntities = this._getAllEntitiesForSelect();
    const entityMap = new Map(allEntities.map((e) => [e.entity_id, e.name]));
    const filtered = this._getFilteredEntities(this._securityExtraSearch);
    return html`
      <div style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; margin-bottom: 4px;">
        ${localize('editor.security_extra_entities')}
      </div>
      <div class="description" style="margin-left: 0; margin-bottom: 8px;">
        ${localize('editor.security_extra_entities_desc')}
      </div>
      ${extras.length > 0 ? html`
        <div class="entity-list-container" style="margin-bottom: 8px;">
          ${extras.map((entityId) => {
            const name = entityMap.get(entityId) || entityId;
            return html`
              <div class="entity-list-item" data-entity-id=${entityId}>
                <span class="item-info">
                  <span class="item-name">${name}</span>
                  <span class="item-entity-id">${entityId}</span>
                </span>
                <button class="btn-remove" @click=${() => this._removeSecurityExtraEntity(entityId)}>&#x2715;</button>
              </div>
            `;
          })}
        </div>
      ` : nothing}
      <div class="entity-search-picker">
        <input type="text" class="entity-search-input"
          placeholder=${localize('editor.select_entity') + '...'}
          .value=${this._securityExtraSearch}
          @input=${(e: Event) => { this._securityExtraSearch = (e.target as HTMLInputElement).value; this.requestUpdate(); }}
          @blur=${() => { setTimeout(() => { this._securityExtraSearch = ''; this.requestUpdate(); }, 200); }}
        />
        ${this._securityExtraSearch.length >= 2 ? html`
          <div class="entity-search-results">
            ${filtered.length > 0
              ? filtered.map((entity) => html`
                <div class="entity-search-result" @mousedown=${(e: Event) => { e.preventDefault(); this._addSecurityExtraEntity(entity.entity_id); this._securityExtraSearch = ''; this.requestUpdate(); }}>
                  <span class="entity-search-name">${entity.name}</span>
                  <span class="entity-search-id">${entity.entity_id}</span>
                </div>
              `)
              : html`<div class="entity-search-no-results">${localize('editor.no_results')}</div>`
            }
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _addSecurityExtraEntity(entityId: string): void {
    const current = this._config.security_extra_entities || [];
    if (current.includes(entityId)) return;
    const updated: OrielConfig = { ...this._config, security_extra_entities: [...current, entityId] };
    this._fireConfigChanged(updated);
  }

  private _removeSecurityExtraEntity(entityId: string): void {
    const current = this._config.security_extra_entities || [];
    const next = current.filter((e) => e !== entityId);
    const updated: OrielConfig = { ...this._config };
    if (next.length === 0) delete updated.security_extra_entities;
    else updated.security_extra_entities = next;
    this._fireConfigChanged(updated);
  }

  private _renderLightFavoritesSection(): TemplateResult {
    if (!this._hass) return html``;
    const allEntities = this._getAllEntitiesForSelect();
    return renderLightFavoritesTab({
      config: this._config,
      search: this._lightFavSearch,
      entityNameMap: new Map(allEntities.map((e) => [e.entity_id, e.name])),
      filteredEntities: this._getFilteredEntities(this._lightFavSearch).filter((e) =>
        e.entity_id.startsWith('light.'),
      ),
      onSearchChange: (value) => {
        this._lightFavSearch = value;
        this.requestUpdate();
      },
      onAddEntity: (entityId) => this._addLightFavorite(entityId),
      onRemoveEntity: (entityId) => this._removeLightFavorite(entityId),
    });
  }

  private _unavailableBatteriesBucketChanged(bucket: 'critical' | 'good'): void {
    const updated: OrielConfig = { ...this._config };
    // 'good' is now the default → omit the key when matching default
    if (bucket === 'good') {
      delete updated.unavailable_batteries_bucket;
    } else {
      updated.unavailable_batteries_bucket = bucket;
    }
    this._fireConfigChanged(updated);
  }

  private _lightsSortByChanged(sortBy: 'last_changed' | 'name'): void {
    const updated: OrielConfig = { ...this._config };
    if (sortBy === 'last_changed') {
      delete updated.lights_sort_by;
    } else {
      updated.lights_sort_by = sortBy;
    }
    this._fireConfigChanged(updated);
  }

  private _addLightFavorite(entityId: string): void {
    const current = this._config.light_favorite_entities || [];
    if (current.includes(entityId)) return;
    const updated: OrielConfig = { ...this._config, light_favorite_entities: [...current, entityId] };
    this._fireConfigChanged(updated);
  }

  private _removeLightFavorite(entityId: string): void {
    const current = this._config.light_favorite_entities || [];
    const next = current.filter((e) => e !== entityId);
    const updated: OrielConfig = { ...this._config };
    if (next.length === 0) delete updated.light_favorite_entities;
    else updated.light_favorite_entities = next;
    this._fireConfigChanged(updated);
  }

  private _renderFavoritesSection(): TemplateResult {
    if (!this._hass) return html``;
    const allEntities = this._getAllEntitiesForSelect();
    return renderFavoritesTab({
      config: this._config,
      search: this._favoriteSearch,
      entityNameMap: new Map(allEntities.map((e) => [e.entity_id, e.name])),
      filteredEntities: this._getFilteredEntities(this._favoriteSearch),
      activeViewport: this._favoritesActiveViewport,
      renderCheckbox: (id, label, checked, onChange) =>
        this._renderCheckbox(id, label, checked, onChange),
      onSearchChange: (value) => {
        this._favoriteSearch = value;
        this.requestUpdate();
      },
      onAddEntity: (entityId) => this._addFavoriteEntity(entityId),
      onRemoveEntity: (entityId) => this._removeFavoriteEntity(entityId),
      onToggleChange: (k, v, d) => this._toggleChanged(k, v, d),
      onDragStart: (ev) => this._handleEntityDragStart(ev, 'favorites'),
      onDragEnd: this._handleEntityDragEnd,
      onDragOver: this._handleEntityDragOver,
      onDragLeave: this._handleEntityDragLeave,
      onDrop: (ev) => this._handleEntityDrop(ev, 'favorites'),
      onViewportChange: (vp) => {
        this._favoritesActiveViewport = vp;
        this.requestUpdate();
      },
      onSplitByViewport: () => this._splitFavoritesByViewport(),
      onMergeViewports: () => this._mergeFavoriteViewports(),
    });
  }

  // -- Weather sensors editor -------------------------------------------
  //
  // Per-row structured editor for the `weather_sensors` config array.
  // Each row binds to a WeatherSensorConfig and exposes inline inputs for
  // icon / unit / round. Adding a row uses the same entity-search picker
  // pattern as favorites; removal is a single-click button.

  private _renderWeatherSensorsSection(): TemplateResult {
    if (!this._hass) return html``;
    const allEntities = this._getAllEntitiesForSelect();
    return renderWeatherSensorsTab({
      config: this._config,
      search: this._weatherSensorSearch,
      entityNameMap: new Map(allEntities.map((e) => [e.entity_id, e.name])),
      filteredEntities: this._getFilteredEntities(this._weatherSensorSearch),
      onSearchChange: (value) => {
        this._weatherSensorSearch = value;
        this.requestUpdate();
      },
      onAddSensor: (entityId) => this._addWeatherSensor(entityId),
      onRemoveSensor: (index) => this._removeWeatherSensor(index),
      onUpdateSensor: (index, field, value) => this._updateWeatherSensor(index, field, value),
    });
  }

  // Per device-class defaults used when adding a sensor via the picker.
  // Each entry covers:
  //   icon    — MDI fallback when the entity has no explicit attributes.icon
  //   round   — display precision matching how that quantity is normally read
  //             (humidity in whole percent, temperature in 0.1 °C steps, etc.)
  // Users can still override any field afterwards in the editor row.
  private static readonly _DEVICE_CLASS_DEFAULTS: Record<
    string,
    { icon: string; round?: number }
  > = {
    temperature: { icon: 'mdi:thermometer', round: 1 },
    apparent_temperature: { icon: 'mdi:thermometer-lines', round: 1 },
    humidity: { icon: 'mdi:water-percent', round: 0 },
    moisture: { icon: 'mdi:water-percent', round: 0 },
    pressure: { icon: 'mdi:gauge', round: 0 },
    atmospheric_pressure: { icon: 'mdi:gauge', round: 0 },
    wind_speed: { icon: 'mdi:weather-windy', round: 1 },
    wind_direction: { icon: 'mdi:compass', round: 0 },
    illuminance: { icon: 'mdi:brightness-5', round: 0 },
    irradiance: { icon: 'mdi:weather-sunny', round: 0 },
    precipitation: { icon: 'mdi:weather-rainy', round: 1 },
    precipitation_intensity: { icon: 'mdi:weather-pouring', round: 1 },
    voc: { icon: 'mdi:cloud-outline', round: 0 },
    pm25: { icon: 'mdi:weather-fog', round: 0 },
    pm10: { icon: 'mdi:weather-fog', round: 0 },
    co2: { icon: 'mdi:molecule-co2', round: 0 },
    co: { icon: 'mdi:molecule-co', round: 1 },
    aqi: { icon: 'mdi:air-filter', round: 0 },
    ozone: { icon: 'mdi:cloud-outline', round: 0 },
    sulphur_dioxide: { icon: 'mdi:cloud-outline', round: 0 },
    nitrogen_dioxide: { icon: 'mdi:cloud-outline', round: 0 },
    nitrogen_monoxide: { icon: 'mdi:cloud-outline', round: 0 },
    ammonia: { icon: 'mdi:cloud-outline', round: 0 },
    distance: { icon: 'mdi:ruler', round: 1 },
    speed: { icon: 'mdi:speedometer', round: 1 },
    uv_index: { icon: 'mdi:weather-sunny-alert', round: 1 },
  };

  // Validation regex mirrors the runtime guard in WeatherEnergySection.
  // Only icons that pass this go into the saved config — keeps malformed
  // pre-fills from being silently accepted.
  private static readonly _ICON_RE = /^[a-z]+:[a-z0-9-]+$/;

  /**
   * Derive sensible defaults for icon, unit, round from the entity's HA
   * registry / state attributes. Used as pre-fill when a sensor is added
   * via the picker; the user can still edit any field afterwards.
   *
   * Resolution order:
   *   icon  — entity.attributes.icon → device_class lookup → omitted
   *   unit  — entity.attributes.unit_of_measurement → omitted
   *   round — device_class lookup → omitted (no inference from state)
   *
   * Inferring round from the current state value is unreliable (`37` and
   * `37.0` both happen for the same humidity sensor), so the table above
   * is the single source of truth.
   */
  private _inferWeatherSensorDefaults(entityId: string): {
    icon?: string;
    unit?: string;
    round?: number;
  } {
    const state = this._hass?.states[entityId];
    const attrs = (state?.attributes || {}) as Record<string, unknown>;
    const out: { icon?: string; unit?: string; round?: number } = {};

    const deviceClass = typeof attrs.device_class === 'string' ? attrs.device_class : undefined;
    const classDefaults = deviceClass
      ? OrielEditor._DEVICE_CLASS_DEFAULTS[deviceClass]
      : undefined;

    // Icon: prefer explicit entity icon → device_class map → omit
    const explicitIcon = typeof attrs.icon === 'string' ? attrs.icon : undefined;
    const icon = explicitIcon || classDefaults?.icon;
    if (icon && OrielEditor._ICON_RE.test(icon)) {
      out.icon = icon;
    }

    // Unit: straight passthrough of unit_of_measurement if present
    const unit = typeof attrs.unit_of_measurement === 'string' ? attrs.unit_of_measurement : undefined;
    if (unit && unit.length > 0) out.unit = unit;

    // Decimals: device_class table only — no state-precision inference
    if (classDefaults && classDefaults.round !== undefined) {
      out.round = classDefaults.round;
    }

    return out;
  }

  private _addWeatherSensor(entityId: string): void {
    if (!this._hass) return;
    const current = this._config.weather_sensors || [];
    if (current.some((s) => s.entity === entityId)) return;

    const defaults = this._inferWeatherSensorDefaults(entityId);
    const newEntry: WeatherSensorConfig = { entity: entityId, ...defaults };

    const newConfig: OrielConfig = {
      ...this._config,
      weather_sensors: [...current, newEntry],
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeWeatherSensor(index: number): void {
    const current = this._config.weather_sensors || [];
    if (index < 0 || index >= current.length) return;

    const next = [...current.slice(0, index), ...current.slice(index + 1)];
    const newConfig: OrielConfig = { ...this._config };
    if (next.length > 0) {
      newConfig.weather_sensors = next;
    } else {
      delete newConfig.weather_sensors;
    }
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateWeatherSensor(
    index: number,
    field: keyof WeatherSensorConfig,
    rawValue: string
  ): void {
    const current = this._config.weather_sensors || [];
    if (index < 0 || index >= current.length) return;

    const target = { ...current[index] } as WeatherSensorConfig;
    const trimmed = rawValue.trim();

    if (field === 'round') {
      if (trimmed === '') {
        delete target.round;
      } else {
        const n = Number.parseInt(trimmed, 10);
        if (Number.isFinite(n) && n >= 0) target.round = n;
      }
    } else if (field === 'icon' || field === 'unit') {
      if (trimmed === '') {
        delete target[field];
      } else {
        target[field] = trimmed;
      }
    } else if (field === 'entity') {
      // entity is read-only via this method; ignore
      return;
    }

    const next = [...current];
    next[index] = target;
    const newConfig: OrielConfig = { ...this._config, weather_sensors: next };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _renderAreasSection(): TemplateResult {
    // Areas section lives in a per-tab module. Stateful helpers
    // (_renderAreaItems / _renderAreaEntities / _renderBadgeGroup,
    // drag refs, _expandedAreas, _areaEntitiesCache) stay on the
    // editor class — the tab module calls back via the context.
    if (!this._hass) return html``;
    return renderAreasTab({
      hass: this._hass,
      config: this._config,
      renderCheckbox: (id, label, checked, onChange, disabled) =>
        this._renderCheckbox(id, label, checked, onChange, disabled),
      renderAreaItems: (allAreas, hiddenAreas, areaOrder) =>
        this._renderAreaItems(allAreas, hiddenAreas, areaOrder),
      onToggleChange: (k, v, d) => this._toggleChanged(k, v, d),
      onRoomVisibilityChange: (areaId, field, value) =>
        this._roomVisibilityChanged(areaId, field, value),
      onCameraCompanionsChange: (kinds) => this._cameraCompanionsChanged(kinds),
    });
  }

  /**
   * Persist a `room_camera_companions` update. The default (all five
   * kinds) is stored as "key absent" — when the editor reports all
   * five enabled, we strip the key from the config to keep saved
   * YAML sparse. An explicit empty array remains stored — it's the
   * "disable picture-glance entirely" signal.
   */
  private _cameraCompanionsChanged(
    kinds: Array<'light' | 'motion' | 'siren' | 'battery' | 'doorbell'>,
  ): void {
    const newConfig: OrielConfig = { ...this._config };
    const allFive = ['light', 'motion', 'siren', 'battery', 'doorbell'].every((k) =>
      kinds.includes(k as 'light'),
    );
    if (allFive) {
      delete newConfig.room_camera_companions;
    } else {
      newConfig.room_camera_companions = kinds;
    }
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _roomVisibilityChanged(areaId: string, field: 'entity' | 'state', value: string): void {
    const updated: OrielConfig = { ...this._config };
    const current = { ...(updated.room_visibility || {}) };
    const rule = { ...(current[areaId] || { entity: '', state: '' }) };
    rule[field] = value.trim();
    if (!rule.entity && !rule.state) {
      delete current[areaId];
    } else {
      current[areaId] = rule;
    }
    if (Object.keys(current).length === 0) {
      delete updated.room_visibility;
    } else {
      updated.room_visibility = current;
    }
    this._fireConfigChanged(updated);
  }

  private _renderRoomPinsSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderRoomPinsTab({
      hass: this._hass,
      config: this._config,
      search: this._roomPinSearch,
      allEntitiesForSelect: this._getAllEntitiesForSelect(),
      filteredEntities: this._getFilteredEntities(this._roomPinSearch, true),
      renderCheckbox: (id, label, checked, onChange) =>
        this._renderCheckbox(id, label, checked, onChange),
      onSearchChange: (value) => {
        this._roomPinSearch = value;
        this.requestUpdate();
      },
      onAddEntity: (entityId) => this._addRoomPinEntity(entityId),
      onRemoveEntity: (entityId) => this._removeRoomPinEntity(entityId),
      onPositionChange: (position) => this._roomPinsPositionChanged(position),
      onToggleChange: (k, v, d) => this._toggleChanged(k, v, d),
      onDragStart: (ev) => this._handleEntityDragStart(ev, 'room_pins'),
      onDragEnd: this._handleEntityDragEnd,
      onDragOver: this._handleEntityDragOver,
      onDragLeave: this._handleEntityDragLeave,
      onDrop: (ev) => this._handleEntityDrop(ev, 'room_pins'),
    });
  }

  private _roomPinsPositionChanged(position: 'top' | 'bottom'): void {
    const updated: OrielConfig = { ...this._config };
    // 'top' is the default — omit the key when it matches default to keep YAML clean
    if (position === 'top') {
      delete updated.room_pins_position;
    } else {
      updated.room_pins_position = position;
    }
    this._fireConfigChanged(updated);
  }

  private _renderViewsSection(): TemplateResult {
    // Views section lives in a per-tab module — established the
    // ha-form schema pattern that the rest of the editor follows.
    // See src/editor/tabs/ViewsTab.ts.
    if (!this._hass) return html``;
    return renderViewsTab({
      hass: this._hass,
      config: this._config,
      onChange: (patch) => {
        const newConfig: OrielConfig = { ...this._config, ...patch };
        // Strip default-equal keys so the saved config stays sparse —
        // matches _toggleChanged(key, value, false) semantics.
        for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
          if (patch[key] === undefined) {
            delete (newConfig as Record<string, unknown>)[key as string];
          }
        }
        this._config = newConfig;
        this._fireConfigChanged(newConfig);
      },
    });
  }

  private _renderCustomCardsSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderCustomCardsTab({
      config: this._config,
      sectionMeta: OrielEditor._sectionMeta,
      onHeadingChange: (value) => this._customCardsHeadingChanged({ target: { value } } as unknown as Event),
      onIconChange: (value) => this._customCardsIconChanged({ target: { value } } as unknown as Event),
      onAddCard: () => this._addCustomCard(),
      onRemoveCard: (index) => this._removeCustomCard(index),
      onUpdateField: (index, field, value) => this._updateCustomCardField(index, field, value),
      onUpdateYaml: (index, yamlString) => this._updateCustomCardYaml(index, yamlString),
    });
  }

  private _renderCustomSectionsSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderCustomSectionsTab({
      config: this._config,
      onAdd: () => this._addCustomSection(),
      onRemove: (index) => this._removeCustomSection(index),
      onUpdateField: (index, field, value) =>
        this._updateCustomSectionField(index, field, value),
      onUpdateYaml: (index, yamlString) => this._updateCustomSectionYaml(index, yamlString),
    });
  }

  private _renderCustomBadgesSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderCustomBadgesTab({
      config: this._config,
      onAdd: () => this._addCustomBadge(),
      onRemove: (index) => this._removeCustomBadge(index),
      onUpdateYaml: (index, yamlString) => this._updateCustomBadgeYaml(index, yamlString),
    });
  }

  private _renderCustomViewsSection(): TemplateResult {
    if (!this._hass) return html``;
    return renderCustomViewsTab({
      config: this._config,
      onAdd: () => this._addCustomView(),
      onRemove: (index) => this._removeCustomView(index),
      onUpdateField: (index, field, value) => this._updateCustomViewField(index, field, value),
      onUpdateYaml: (index, yamlString) => this._updateCustomViewYaml(index, yamlString),
      onUpdateRefField: (index, field, value) => this._updateCustomViewRefField(index, field, value),
    });
  }

  // ====================================================================
  // ITEM RENDERERS
  // ====================================================================

  private _renderCheckbox(
    id: string,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    disabled = false
  ): TemplateResult {
    return html`
      <div class="form-row">
        <input type="checkbox" id=${id}
          ?checked=${checked}
          ?disabled=${disabled}
          @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)} />
        <label for=${id} class=${disabled ? 'disabled-label' : ''}>${label}</label>
      </div>
    `;
  }


  // ====================================================================
  // AREA RENDERERS
  // ====================================================================

  private _renderAreaItems(
    allAreas: AreaRegistryEntry[],
    hiddenAreas: string[],
    areaOrder: string[]
  ): TemplateResult | TemplateResult[] {
    if (allAreas.length === 0) {
      return html`<div class="empty-state">${localize('editor.no_areas')}</div>`;
    }

    // Sort areas by configured order
    const sortedAreas = [...allAreas].sort((a, b) => {
      const orderA = areaOrder.indexOf(a.area_id);
      const orderB = areaOrder.indexOf(b.area_id);
      const effectiveA = orderA !== -1 ? orderA : 9999 + allAreas.indexOf(a);
      const effectiveB = orderB !== -1 ? orderB : 9999 + allAreas.indexOf(b);
      return effectiveA - effectiveB;
    });

    return sortedAreas.map((area) => {
      const isHidden = hiddenAreas.includes(area.area_id);
      const isExpanded = this._expandedAreas.has(area.area_id);
      const cachedData = this._areaEntitiesCache.get(area.area_id);

      return html`
        <div class="area-item"
          data-area-id=${area.area_id}
          draggable="true"
          @dragstart=${this._handleDragStart}
          @dragend=${this._handleDragEnd}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}>
          <div class="area-header">
            <span class="drag-handle" draggable="true">&#x2630;</span>
            <input type="checkbox" class="area-checkbox"
              data-area-id=${area.area_id}
              ?checked=${!isHidden}
              @change=${(e: Event) => this._areaVisibilityChanged(area.area_id, (e.target as HTMLInputElement).checked)} />
            <span class="area-name">${area.name}</span>
            ${area.icon ? html`<ha-icon class="area-icon" icon=${area.icon}></ha-icon>` : nothing}
            <button class="expand-button ${isExpanded ? 'expanded' : ''}"
              data-area-id=${area.area_id}
              ?disabled=${isHidden}
              @click=${(e: Event) => this._toggleAreaExpand(e, area.area_id)}>
              <span class="expand-icon">&#x25B6;</span>
            </button>
          </div>
          ${isExpanded
            ? html`
              <div class="area-content" data-area-id=${area.area_id}>
                ${cachedData
                  ? this._renderAreaEntities(area.area_id, cachedData)
                  : html`<div class="loading-placeholder">${localize('editor.loading_entities')}</div>`}
              </div>
            `
            : nothing}
        </div>
      `;
    });
  }

  private _renderAreaEntities(
    areaId: string,
    data: NonNullable<ReturnType<typeof this._areaEntitiesCache.get>>
  ): TemplateResult {
    const {
      groupedEntities,
      hiddenEntities,
      badgeCandidates,
      additionalBadges,
      availableEntities,
      defaultShowNames,
      namesVisible,
      namesHidden,
    } = data;

    const hass = this._hass!;

    const domainGroups: DomainGroup[] = [
      { key: 'lights', label: localize('editor.domain_lights'), icon: 'mdi:lightbulb' },
      { key: 'climate', label: localize('editor.domain_climate'), icon: 'mdi:thermostat' },
      { key: 'covers', label: localize('editor.domain_covers'), icon: 'mdi:window-shutter' },
      { key: 'covers_curtain', label: localize('editor.domain_covers_curtain'), icon: 'mdi:curtains' },
      { key: 'covers_window', label: localize('editor.domain_covers_window'), icon: 'mdi:window-open-variant' },
      { key: 'media_player', label: localize('editor.domain_media_player'), icon: 'mdi:speaker' },
      { key: 'scenes', label: localize('editor.domain_scenes'), icon: 'mdi:palette' },
      { key: 'vacuum', label: localize('editor.domain_vacuum'), icon: 'mdi:robot-vacuum' },
      { key: 'fan', label: localize('editor.domain_fan'), icon: 'mdi:fan' },
      { key: 'switches', label: localize('editor.domain_switches'), icon: 'mdi:light-switch' },
      { key: 'locks', label: localize('editor.domain_locks'), icon: 'mdi:lock' },
    ];

    const hasEntities = domainGroups.some((g) => (groupedEntities[g.key]?.length ?? 0) > 0);
    const hasBadges = (badgeCandidates?.length ?? 0) > 0 || (additionalBadges?.length ?? 0) > 0;

    if (!hasEntities && !hasBadges) {
      return html`<div class="empty-state">${localize('editor.no_entities_in_area')}</div>`;
    }

    const expandedGroups = this._expandedGroups.get(areaId) || new Set<string>();

    return html`
      <div class="entity-groups">
        ${domainGroups.map((group) => {
          const entities = groupedEntities[group.key] as string[] | undefined;
          if (!entities || entities.length === 0) return nothing;

          const hiddenInGroup = (hiddenEntities[group.key] || []) as string[];
          const allHidden = entities.every((e) => hiddenInGroup.includes(e));
          const someHidden = entities.some((e) => hiddenInGroup.includes(e)) && !allHidden;
          const isGroupExpanded = expandedGroups.has(group.key);

          return html`
            <div class="entity-group" data-group=${group.key}>
              <div class="entity-group-header"
                role="button"
                tabindex="0"
                aria-expanded=${isGroupExpanded ? 'true' : 'false'}
                @click=${() => this._toggleGroupExpand(areaId, group.key)}
                @keydown=${onActivateKey(() => this._toggleGroupExpand(areaId, group.key))}>
                <input type="checkbox" class="group-checkbox"
                  data-area-id=${areaId}
                  data-group=${group.key}
                  ?checked=${!allHidden}
                  .indeterminate=${someHidden}
                  @click=${(e: Event) => e.stopPropagation()}
                  @change=${(e: Event) => {
                    e.stopPropagation();
                    const checked = (e.target as HTMLInputElement).checked;
                    this._groupVisibilityChanged(areaId, group.key, checked, entities);
                  }} />
                <ha-icon icon=${group.icon}></ha-icon>
                <span class="group-name">${group.label}</span>
                <span class="entity-count">(${entities.length})</span>
                <button class="expand-button-small ${isGroupExpanded ? 'expanded' : ''}"
                  @click=${(e: Event) => { e.stopPropagation(); this._toggleGroupExpand(areaId, group.key); }}>
                  <span class="expand-icon-small">&#x25B6;</span>
                </button>
              </div>
              ${isGroupExpanded
                ? html`
                  <div class="entity-list" data-area-id=${areaId} data-group=${group.key}>
                    ${entities.map((entityId) => {
                      const stateObj = hass.states[entityId];
                      const name = stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' ');
                      const isEntityHidden = hiddenInGroup.includes(entityId);
                      return html`
                        <div class="entity-item">
                          <input type="checkbox" class="entity-checkbox"
                            ?checked=${!isEntityHidden}
                            @change=${(e: Event) => this._entityVisibilityChanged(areaId, group.key, entityId, (e.target as HTMLInputElement).checked)} />
                          <span class="entity-name">${name}</span>
                          <span class="entity-id">${entityId}</span>
                        </div>
                      `;
                    })}
                  </div>
                `
                : nothing}
            </div>
          `;
        })}
        ${hasBadges
          ? this._renderBadgeGroup(areaId, badgeCandidates, additionalBadges, availableEntities, hiddenEntities, defaultShowNames, namesVisible, namesHidden, expandedGroups)
          : nothing}
      </div>
    `;
  }

  private _renderBadgeGroup(
    areaId: string,
    badgeCandidates: string[],
    additionalBadges: string[],
    availableEntities: Array<{ entity_id: string; name: string }>,
    hiddenEntities: Record<string, string[]>,
    defaultShowNames: Set<string>,
    namesVisible: string[],
    namesHidden: string[],
    expandedGroups: Set<string>
  ): TemplateResult {
    const hass = this._hass!;
    const totalCount = badgeCandidates.length + additionalBadges.length;
    if (totalCount === 0) return html``;

    const hiddenInBadges = hiddenEntities['badges'] || [];
    const allHidden = badgeCandidates.length > 0 && badgeCandidates.every((e) => hiddenInBadges.includes(e));
    const someHidden = badgeCandidates.some((e) => hiddenInBadges.includes(e)) && !allHidden;

    const namesVisibleSet = new Set(namesVisible || []);
    const namesHiddenSet = new Set(namesHidden || []);

    const isNameShown = (entityId: string): boolean =>
      resolveShowName(entityId, defaultShowNames.has(entityId), namesVisibleSet, namesHiddenSet);

    const isGroupExpanded = expandedGroups.has('badges');

    return html`
      <div class="entity-group" data-group="badges">
        <div class="entity-group-header"
          role="button"
          tabindex="0"
          aria-expanded=${isGroupExpanded ? 'true' : 'false'}
          @click=${() => this._toggleGroupExpand(areaId, 'badges')}
          @keydown=${onActivateKey(() => this._toggleGroupExpand(areaId, 'badges'))}>
          <input type="checkbox" class="group-checkbox"
            data-area-id=${areaId}
            data-group="badges"
            ?checked=${!allHidden}
            .indeterminate=${someHidden}
            @click=${(e: Event) => e.stopPropagation()}
            @change=${(e: Event) => {
              e.stopPropagation();
              const checked = (e.target as HTMLInputElement).checked;
              this._groupVisibilityChanged(areaId, 'badges', checked, badgeCandidates);
            }} />
          <ha-icon icon="mdi:checkbox-multiple-blank-circle"></ha-icon>
          <span class="group-name">${localize('editor.domain_badges')}</span>
          <span class="entity-count">(${totalCount})</span>
          <button class="expand-button-small ${isGroupExpanded ? 'expanded' : ''}"
            @click=${(e: Event) => { e.stopPropagation(); this._toggleGroupExpand(areaId, 'badges'); }}>
            <span class="expand-icon-small">&#x25B6;</span>
          </button>
        </div>
        ${isGroupExpanded
          ? html`
            <div class="entity-list" data-area-id=${areaId} data-group="badges">
              ${badgeCandidates.map((entityId) => {
                const stateObj = hass.states[entityId];
                const name = stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' ');
                const isHidden = hiddenInBadges.includes(entityId);
                const showName = isNameShown(entityId);

                return html`
                  <div class="entity-item">
                    <input type="checkbox" class="entity-checkbox"
                      ?checked=${!isHidden}
                      @change=${(e: Event) => this._entityVisibilityChanged(areaId, 'badges', entityId, (e.target as HTMLInputElement).checked)} />
                    <span class="entity-name">${name}</span>
                    <input type="checkbox" class="badge-name-checkbox"
                      ?checked=${showName}
                      title=${localize('editor.badges_show_name')}
                      @change=${(e: Event) => this._badgeShowNameChanged(areaId, entityId, (e.target as HTMLInputElement).checked)} />
                    <span class="badge-name-label">${localize('editor.badges_name_short')}</span>
                    <span class="entity-id">${entityId}</span>
                  </div>
                `;
              })}

              ${additionalBadges.length > 0
                ? html`
                  <div class="badge-separator">${localize('editor.badges_additional')}</div>
                  ${additionalBadges.map((entityId) => {
                    const stateObj = hass.states[entityId];
                    const name = stateObj?.attributes?.friendly_name || (entityId.split('.')[1] ?? entityId).replace(/_/g, ' ');
                    const showName = isNameShown(entityId);

                    return html`
                      <div class="entity-item badge-additional-item">
                        <span class="entity-name">${name}</span>
                        <input type="checkbox" class="badge-name-checkbox"
                          ?checked=${showName}
                          title=${localize('editor.badges_show_name')}
                          @change=${(e: Event) => this._badgeShowNameChanged(areaId, entityId, (e.target as HTMLInputElement).checked)} />
                        <span class="badge-name-label">${localize('editor.badges_name_short')}</span>
                        <span class="entity-id">${entityId}</span>
                        <button class="badge-remove-btn"
                          title=${localize('editor.badges_remove')}
                          @click=${() => this._badgeAdditionalChanged(areaId, entityId, false)}>&#x2715;</button>
                      </div>
                    `;
                  })}
                `
                : nothing}

              ${availableEntities.length > 0
                ? html`
                  <div class="badge-add-section">
                    <select class="badge-entity-picker" data-area-id=${areaId}>
                      <option value="">${localize('editor.badges_select_entity')}</option>
                      ${availableEntities.map((e) => html`
                        <option value=${e.entity_id}>${e.name} (${e.entity_id})</option>
                      `)}
                    </select>
                    <button class="badge-add-button"
                      @click=${(e: Event) => this._addBadgeFromPicker(e, areaId)}>
                      ${localize('editor.badges_add')}
                    </button>
                  </div>
                `
                : nothing}
            </div>
          `
          : nothing}
      </div>
    `;
  }

  // ====================================================================
  // AREA ENTITY LOADING
  // ====================================================================

  private async _loadAreaEntities(areaId: string): Promise<void> {
    if (!this._hass) return;

    const groupedEntities = await getAreaGroupedEntities(areaId, this._hass);
    const hiddenEntities = getHiddenEntitiesForArea(areaId, this._config);
    const entityOrders = getEntityOrdersForArea(areaId, this._config);
    const badgeCandidates = getAreaBadgeCandidates(areaId, this._hass);
    const additionalBadges = getAdditionalBadgesForArea(areaId, this._config);
    const availableEntities = getAvailableBadgeEntities(areaId, this._hass, badgeCandidates, additionalBadges);
    const defaultShowNames = getDefaultShowNameEntities(badgeCandidates, this._hass);
    const { namesVisible, namesHidden } = getBadgeNamesConfig(areaId, this._config);

    this._areaEntitiesCache.set(areaId, {
      groupedEntities,
      hiddenEntities,
      entityOrders,
      badgeCandidates,
      additionalBadges,
      availableEntities,
      defaultShowNames,
      namesVisible,
      namesHidden,
    });

    this.requestUpdate();
  }

  private _refreshAreaCache(areaId: string): void {
    if (!this._hass || !this._areaEntitiesCache.has(areaId)) return;

    const groupedEntities = this._areaEntitiesCache.get(areaId)!.groupedEntities;
    const hiddenEntities = getHiddenEntitiesForArea(areaId, this._config);
    const entityOrders = getEntityOrdersForArea(areaId, this._config);
    const badgeCandidates = getAreaBadgeCandidates(areaId, this._hass);
    const additionalBadges = getAdditionalBadgesForArea(areaId, this._config);
    const availableEntities = getAvailableBadgeEntities(areaId, this._hass, badgeCandidates, additionalBadges);
    const defaultShowNames = getDefaultShowNameEntities(badgeCandidates, this._hass);
    const { namesVisible, namesHidden } = getBadgeNamesConfig(areaId, this._config);

    this._areaEntitiesCache.set(areaId, {
      groupedEntities,
      hiddenEntities,
      entityOrders,
      badgeCandidates,
      additionalBadges,
      availableEntities,
      defaultShowNames,
      namesVisible,
      namesHidden,
    });
  }

  // ====================================================================
  // EVENT HANDLERS — Toggle / Config changes
  // ====================================================================

  private _toggleChanged(key: string, value: boolean, defaultValue: boolean): void {
    if (!this._hass) return;

    const newConfig: OrielConfig = {
      ...this._config,
      [key]: value,
    };

    // Remove property when set to default
    if (value === defaultValue) {
      delete (newConfig as any)[key];
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _summariesColumnsChanged(columns: 2 | 4): void {
    if (!this._hass) return;

    const newConfig: OrielConfig = {
      ...this._config,
      summaries_columns: columns,
    };

    if (columns === 2) {
      delete newConfig.summaries_columns;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _personBadgeLayoutChanged(layout: 'minimal' | 'with_state' | 'with_state_and_time'): void {
    const updated: OrielConfig = { ...this._config };
    if (layout === 'with_state') {
      delete updated.person_badge_layout;
    } else {
      updated.person_badge_layout = layout;
    }
    this._fireConfigChanged(updated);
  }

  private _alarmEntityChanged(e: Event): void {
    if (!this._hass) return;

    const entityId = (e.target as HTMLSelectElement).value;
    const newConfig: OrielConfig = {
      ...this._config,
      alarm_entity: entityId,
    };

    if (!entityId || entityId === '') {
      delete newConfig.alarm_entity;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _weatherEntityChanged(e: Event): void {
    if (!this._hass) return;

    const entityId = (e.target as HTMLSelectElement).value;
    const newConfig: OrielConfig = {
      ...this._config,
      weather_entity: entityId,
    };

    if (!entityId || entityId === '') {
      delete newConfig.weather_entity;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }
  private _powerBadgeEntityChanged = (e: Event): void => {
    const entityId = (e.target as HTMLSelectElement).value;
    const newConfig: OrielConfig = { ...this._config };
    if (entityId) {
      newConfig.power_badge_entity = entityId;
    } else {
      delete newConfig.power_badge_entity;
    }
    this._fireConfigChanged(newConfig);
  };

  private _batteryCriticalChanged(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (isNaN(value) || value < 1 || value > 99) return;
    const newConfig: OrielConfig = { ...this._config, battery_critical_threshold: value };
    if (value === 20) delete newConfig.battery_critical_threshold;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _batteryLowChanged(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (isNaN(value) || value < 1 || value > 99) return;
    const newConfig: OrielConfig = { ...this._config, battery_low_threshold: value };
    if (value === 50) delete newConfig.battery_low_threshold;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Favorites --------------------------------------------------------

  private _addFavoriteFromSelect(): void {
    const select = this.shadowRoot!.querySelector('#favorite-entity-select') as HTMLSelectElement | null;
    if (!select || !select.value) return;
    this._addFavoriteEntity(select.value);
    select.value = '';
  }

  private _addFavoriteEntity(entityId: string): void {
    if (!this._hass) return;
    const existing = this._config.favorite_entities as unknown;
    if (isViewportKeyedFavorites(existing)) {
      // Viewport-keyed: write to the currently-active viewport's list.
      const map = existing as Partial<Record<FavoritesViewport, string[]>>;
      const list = Array.isArray(map[this._favoritesActiveViewport])
        ? (map[this._favoritesActiveViewport] as string[])
        : [];
      if (list.includes(entityId)) return;
      const newConfig: OrielConfig = {
        ...this._config,
        favorite_entities: {
          ...map,
          [this._favoritesActiveViewport]: [...list, entityId],
        } as OrielConfig['favorite_entities'],
      };
      this._config = newConfig;
      this._fireConfigChanged(newConfig);
      return;
    }
    // Flat shape (default behaviour).
    const currentFavorites: string[] = Array.isArray(existing) ? (existing as string[]) : [];
    if (currentFavorites.includes(entityId)) return;
    const newConfig: OrielConfig = {
      ...this._config,
      favorite_entities: [...currentFavorites, entityId],
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeFavoriteEntity(entityId: string): void {
    if (!this._hass) return;
    const existing = this._config.favorite_entities as unknown;
    if (isViewportKeyedFavorites(existing)) {
      const map = existing as Partial<Record<FavoritesViewport, string[]>>;
      const list = Array.isArray(map[this._favoritesActiveViewport])
        ? (map[this._favoritesActiveViewport] as string[])
        : [];
      const next = list.filter((id) => id !== entityId);
      const nextMap = { ...map, [this._favoritesActiveViewport]: next };
      if (next.length === 0) delete nextMap[this._favoritesActiveViewport];
      const newConfig: OrielConfig = { ...this._config };
      const remaining = Object.values(nextMap).filter(
        (v) => Array.isArray(v) && v.length > 0,
      ).length;
      if (remaining === 0) delete newConfig.favorite_entities;
      else newConfig.favorite_entities = nextMap as OrielConfig['favorite_entities'];
      this._config = newConfig;
      this._fireConfigChanged(newConfig);
      return;
    }
    const currentFavorites: string[] = Array.isArray(existing) ? (existing as string[]) : [];
    const newFavorites = currentFavorites.filter((id) => id !== entityId);
    const newConfig: OrielConfig = { ...this._config };
    if (newFavorites.length === 0) delete newConfig.favorite_entities;
    else newConfig.favorite_entities = newFavorites;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  /**
   * Convert flat favorites to viewport-keyed shape (F-8). The current
   * flat list moves to `default`; the other viewports start empty so
   * the user can populate per-device favorites independently. No-ops
   * when already keyed.
   */
  private _splitFavoritesByViewport(): void {
    const existing = this._config.favorite_entities as unknown;
    if (isViewportKeyedFavorites(existing)) return;
    const flat: string[] = Array.isArray(existing) ? (existing as string[]) : [];
    const newConfig: OrielConfig = {
      ...this._config,
      favorite_entities: { default: flat } as OrielConfig['favorite_entities'],
    };
    this._config = newConfig;
    this._favoritesActiveViewport = 'default';
    this._fireConfigChanged(newConfig);
  }

  /**
   * Convert viewport-keyed favorites back to a flat list. Uses
   * `default` as the base, then appends any entities present in other
   * viewports that aren't already there (preserves the union so the
   * user doesn't silently lose phone-only or wall-only favorites on
   * downgrade). No-ops when already flat.
   */
  private _mergeFavoriteViewports(): void {
    const existing = this._config.favorite_entities as unknown;
    if (!isViewportKeyedFavorites(existing)) return;
    const map = existing as Partial<Record<FavoritesViewport, string[]>>;
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const vp of ['default', 'phone', 'tablet', 'wall'] as const) {
      const list = map[vp];
      if (!Array.isArray(list)) continue;
      for (const id of list) {
        if (typeof id !== 'string' || seen.has(id)) continue;
        merged.push(id);
        seen.add(id);
      }
    }
    const newConfig: OrielConfig = { ...this._config };
    if (merged.length === 0) delete newConfig.favorite_entities;
    else newConfig.favorite_entities = merged;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Room Pins --------------------------------------------------------

  private _addRoomPinFromSelect(): void {
    const select = this.shadowRoot!.querySelector('#room-pin-entity-select') as HTMLSelectElement | null;
    if (!select || !select.value) return;
    this._addRoomPinEntity(select.value);
    select.value = '';
  }

  private _addRoomPinEntity(entityId: string): void {
    if (!this._hass) return;
    const currentPins = this._config.room_pin_entities || [];
    if (currentPins.includes(entityId)) return;

    const newConfig: OrielConfig = {
      ...this._config,
      room_pin_entities: [...currentPins, entityId],
    };

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeRoomPinEntity(entityId: string): void {
    if (!this._hass) return;
    const currentPins = this._config.room_pin_entities || [];
    const newPins = currentPins.filter((id) => id !== entityId);

    const newConfig: OrielConfig = {
      ...this._config,
      room_pin_entities: newPins.length > 0 ? newPins : undefined,
    };

    if (newPins.length === 0) {
      delete newConfig.room_pin_entities;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Custom Views -----------------------------------------------------

  private _addCustomView(): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    customViews.push({
      title: 'Neue View',
      path: `custom-view-${customViews.length + 1}`,
      icon: 'mdi:card-text-outline',
      yaml: '',
      parsed_config: undefined,
    } as CustomView);

    const newConfig: OrielConfig = { ...this._config, custom_views: customViews };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeCustomView(index: number): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    customViews.splice(index, 1);

    const newConfig: OrielConfig = { ...this._config };
    if (customViews.length === 0) {
      delete newConfig.custom_views;
    } else {
      newConfig.custom_views = customViews;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomViewField(index: number, field: string, value: string): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    if (!customViews[index]) return;

    customViews[index] = { ...customViews[index], [field]: value };

    const newConfig: OrielConfig = { ...this._config, custom_views: customViews };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomViewRefField(
    index: number,
    field: 'ref_dashboard' | 'ref_view',
    value: string,
  ): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    if (!customViews[index]) return;

    const updated: CustomView = { ...customViews[index] };
    const trimmed = value.trim();
    // Keep YAML sparse — strip the key entirely when cleared.
    if (trimmed) updated[field] = trimmed;
    else delete updated[field];
    customViews[index] = updated;

    const newConfig: OrielConfig = { ...this._config, custom_views: customViews };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomViewYaml(index: number, yamlString: string): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    if (!customViews[index]) return;

    const updated: CustomView = { ...customViews[index], yaml: yamlString };
    delete updated._yaml_error;

    if (yamlString.trim()) {
      try {
        const parsed = yaml.load(yamlString);
        if (parsed && typeof parsed === 'object') {
          updated.parsed_config = parsed as Record<string, any>;
        } else {
          updated._yaml_error = localize('editor.yaml_error_not_object');
          updated.parsed_config = undefined;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message.split('\n')[0] : localize('editor.yaml_error_invalid');
        updated._yaml_error = message || localize('editor.yaml_error_invalid');
        updated.parsed_config = undefined;
      }
    } else {
      updated.parsed_config = undefined;
    }

    customViews[index] = updated;

    const newConfig: OrielConfig = { ...this._config, custom_views: customViews };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Custom Cards -----------------------------------------------------

  private _customCardsHeadingChanged(e: Event): void {
    const value = (e.target as HTMLInputElement).value.trim();
    const newConfig: OrielConfig = { ...this._config };
    if (value) {
      newConfig.custom_cards_heading = value;
    } else {
      delete newConfig.custom_cards_heading;
    }
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _customCardsIconChanged(e: Event): void {
    const value = (e.target as HTMLInputElement).value.trim();
    const newConfig: OrielConfig = { ...this._config };
    if (value) {
      newConfig.custom_cards_icon = value;
    } else {
      delete newConfig.custom_cards_icon;
    }
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _addCustomCard(): void {
    const customCards: CustomCard[] = [...(this._config.custom_cards || [])];
    customCards.push({ title: '', yaml: '', parsed_config: undefined } as CustomCard);

    const newConfig: OrielConfig = { ...this._config, custom_cards: customCards };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeCustomCard(index: number): void {
    const customCards: CustomCard[] = [...(this._config.custom_cards || [])];
    customCards.splice(index, 1);

    const newConfig: OrielConfig = { ...this._config };
    if (customCards.length === 0) {
      delete newConfig.custom_cards;
    } else {
      newConfig.custom_cards = customCards;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomCardField(index: number, field: string, value: string): void {
    const customCards: CustomCard[] = [...(this._config.custom_cards || [])];
    if (!customCards[index]) return;

    customCards[index] = { ...customCards[index], [field]: value };

    const newConfig: OrielConfig = { ...this._config, custom_cards: customCards };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomCardYaml(index: number, yamlString: string): void {
    const customCards: CustomCard[] = [...(this._config.custom_cards || [])];
    if (!customCards[index]) return;

    const updated: CustomCard = { ...customCards[index], yaml: yamlString };
    delete updated._yaml_error;

    if (yamlString.trim()) {
      try {
        const parsed = yaml.load(yamlString);
        if (parsed && typeof parsed === 'object') {
          updated.parsed_config = parsed as Record<string, any>;
        } else {
          updated._yaml_error = localize('editor.yaml_error_not_object_or_array');
          updated.parsed_config = undefined;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message.split('\n')[0] : localize('editor.yaml_error_invalid');
        updated._yaml_error = message || localize('editor.yaml_error_invalid');
        updated.parsed_config = undefined;
      }
    } else {
      updated.parsed_config = undefined;
    }

    customCards[index] = updated;

    const newConfig: OrielConfig = { ...this._config, custom_cards: customCards };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Custom Sections --------------------------------------------------

  private _addCustomSection(): void {
    const sections: CustomSection[] = [...(this._config.custom_sections || [])];
    sections.push({ key: '', heading: '', yaml: '', parsed_config: undefined });
    const newConfig: OrielConfig = { ...this._config, custom_sections: sections };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeCustomSection(index: number): void {
    const sections: CustomSection[] = [...(this._config.custom_sections || [])];
    sections.splice(index, 1);
    const newConfig: OrielConfig = { ...this._config };
    if (sections.length === 0) delete newConfig.custom_sections;
    else newConfig.custom_sections = sections;
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomSectionField(index: number, field: 'key' | 'heading' | 'icon', value: string): void {
    const sections: CustomSection[] = [...(this._config.custom_sections || [])];
    if (!sections[index]) return;
    sections[index] = { ...sections[index], [field]: value };
    const newConfig: OrielConfig = { ...this._config, custom_sections: sections };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomSectionYaml(index: number, yamlString: string): void {
    const sections: CustomSection[] = [...(this._config.custom_sections || [])];
    if (!sections[index]) return;
    const updated: CustomSection = { ...sections[index], yaml: yamlString };
    delete updated._yaml_error;
    if (yamlString.trim()) {
      try {
        const parsed = yaml.load(yamlString);
        if (Array.isArray(parsed)) {
          updated.parsed_config = parsed as Record<string, any>[];
        } else if (parsed && typeof parsed === 'object') {
          // single card → wrap into array for caller convenience
          updated.parsed_config = [parsed as Record<string, any>];
        } else {
          updated._yaml_error = localize('editor.yaml_error_not_card_or_list');
          updated.parsed_config = undefined;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message.split('\n')[0] : localize('editor.yaml_error_invalid');
        updated._yaml_error = message || localize('editor.yaml_error_invalid');
        updated.parsed_config = undefined;
      }
    } else {
      updated.parsed_config = undefined;
    }
    sections[index] = updated;
    const newConfig: OrielConfig = { ...this._config, custom_sections: sections };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Custom Badges ----------------------------------------------------

  private _addCustomBadge(): void {
    const customBadges: CustomBadge[] = [...(this._config.custom_badges || [])];
    customBadges.push({ yaml: '', parsed_config: undefined } as CustomBadge);

    const newConfig: OrielConfig = { ...this._config, custom_badges: customBadges };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _removeCustomBadge(index: number): void {
    const customBadges: CustomBadge[] = [...(this._config.custom_badges || [])];
    customBadges.splice(index, 1);

    const newConfig: OrielConfig = { ...this._config };
    if (customBadges.length === 0) {
      delete newConfig.custom_badges;
    } else {
      newConfig.custom_badges = customBadges;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _updateCustomBadgeYaml(index: number, yamlString: string): void {
    const customBadges: CustomBadge[] = [...(this._config.custom_badges || [])];
    if (!customBadges[index]) return;

    const updated: CustomBadge = { ...customBadges[index], yaml: yamlString };
    delete updated._yaml_error;

    if (yamlString.trim()) {
      try {
        const parsed = yaml.load(yamlString);
        if (parsed && typeof parsed === 'object') {
          updated.parsed_config = parsed as Record<string, any>;
        } else {
          updated._yaml_error = localize('editor.yaml_error_not_object');
          updated.parsed_config = undefined;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message.split('\n')[0] : localize('editor.yaml_error_invalid');
        updated._yaml_error = message || localize('editor.yaml_error_invalid');
        updated.parsed_config = undefined;
      }
    } else {
      updated.parsed_config = undefined;
    }

    customBadges[index] = updated;

    const newConfig: OrielConfig = { ...this._config, custom_badges: customBadges };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // ====================================================================
  // AREA MANAGEMENT
  // ====================================================================

  private _areaVisibilityChanged(areaId: string, isVisible: boolean): void {
    if (!this._hass) return;

    let hiddenAreas = [...(this._config.areas_display?.hidden || [])];

    if (isVisible) {
      hiddenAreas = hiddenAreas.filter((id) => id !== areaId);
    } else {
      if (!hiddenAreas.includes(areaId)) {
        hiddenAreas.push(areaId);
      }
      // Collapse area when hidden
      this._expandedAreas.delete(areaId);
      this._expandedGroups.delete(areaId);
      this._areaEntitiesCache.delete(areaId);
    }

    const newConfig: OrielConfig = {
      ...this._config,
      areas_display: {
        ...this._config.areas_display,
        hidden: hiddenAreas,
      },
    };

    if (newConfig.areas_display?.hidden?.length === 0) {
      delete newConfig.areas_display.hidden;
    }
    if (newConfig.areas_display && Object.keys(newConfig.areas_display).length === 0) {
      delete newConfig.areas_display;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  private _toggleAreaExpand(e: Event, areaId: string): void {
    e.stopPropagation();

    const newExpandedAreas = new Set(this._expandedAreas);

    if (newExpandedAreas.has(areaId)) {
      newExpandedAreas.delete(areaId);
      const newExpandedGroups = new Map(this._expandedGroups);
      newExpandedGroups.delete(areaId);
      this._expandedGroups = newExpandedGroups;
    } else {
      newExpandedAreas.add(areaId);
      // Load entities if not cached
      if (!this._areaEntitiesCache.has(areaId)) {
        void this._loadAreaEntities(areaId);
      }
    }

    this._expandedAreas = newExpandedAreas;
  }

  private _toggleGroupExpand(areaId: string, groupKey: string): void {
    const newExpandedGroups = new Map(this._expandedGroups);
    const areaGroups = new Set(newExpandedGroups.get(areaId) || []);

    if (areaGroups.has(groupKey)) {
      areaGroups.delete(groupKey);
    } else {
      areaGroups.add(groupKey);
    }

    if (areaGroups.size > 0) {
      newExpandedGroups.set(areaId, areaGroups);
    } else {
      newExpandedGroups.delete(areaId);
    }

    this._expandedGroups = newExpandedGroups;
  }

  private _groupVisibilityChanged(areaId: string, group: string, isVisible: boolean, entities: string[]): void {
    if (!this._hass) return;

    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentGroupOptions = currentGroupsOptions[group] as Record<string, any> | undefined;
    let hiddenEntities = [...(currentGroupOptions?.hidden || [])];

    if (isVisible) {
      hiddenEntities = hiddenEntities.filter((e) => !entities.includes(e));
    } else {
      hiddenEntities = [...new Set([...hiddenEntities, ...entities])];
    }

    this._updateEntityConfig(areaId, group, hiddenEntities);
  }

  private _entityVisibilityChanged(areaId: string, group: string, entityId: string, isVisible: boolean): void {
    if (!this._hass) return;

    // Handle badge additional entities
    if (group === 'badges_additional') {
      this._badgeAdditionalChanged(areaId, entityId, isVisible);
      return;
    }

    // Handle badge show_name toggle
    if (group === 'badges_show_name') {
      this._badgeShowNameChanged(areaId, entityId, isVisible);
      return;
    }

    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentGroupOptions = currentGroupsOptions[group] as Record<string, any> | undefined;
    let hiddenEntities = [...(currentGroupOptions?.hidden || [])];

    if (isVisible) {
      hiddenEntities = hiddenEntities.filter((e) => e !== entityId);
    } else {
      if (!hiddenEntities.includes(entityId)) {
        hiddenEntities.push(entityId);
      }
    }

    this._updateEntityConfig(areaId, group, hiddenEntities);
  }

  private _updateEntityConfig(areaId: string, group: string, hiddenEntities: string[]): void {
    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentGroupOptions = currentGroupsOptions[group] as Record<string, any> | undefined;

    const newGroupOptions: Record<string, any> = {
      ...currentGroupOptions,
      hidden: hiddenEntities,
    };

    if (newGroupOptions.hidden.length === 0) {
      delete newGroupOptions.hidden;
    }

    const newGroupsOptions: Record<string, any> = {
      ...currentGroupsOptions,
      [group]: newGroupOptions,
    };

    if (Object.keys(newGroupsOptions[group]).length === 0) {
      delete newGroupsOptions[group];
    }

    const newAreaOptions: Record<string, any> = {
      ...currentAreaOptions,
      groups_options: newGroupsOptions,
    };

    if (Object.keys(newAreaOptions.groups_options).length === 0) {
      delete newAreaOptions.groups_options;
    }

    const newAreasOptions: Record<string, any> = {
      ...this._config.areas_options,
      [areaId]: newAreaOptions,
    };

    if (Object.keys(newAreasOptions[areaId]).length === 0) {
      delete newAreasOptions[areaId];
    }

    const newConfig: OrielConfig = {
      ...this._config,
      areas_options: newAreasOptions,
    };

    if (newConfig.areas_options && Object.keys(newConfig.areas_options).length === 0) {
      delete newConfig.areas_options;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Refresh cached data so re-render picks up the changes
    this._refreshAreaCache(areaId);
  }

  // -- Badge additional and show_name -----------------------------------

  private _badgeAdditionalChanged(areaId: string, entityId: string, isAdd: boolean): void {
    if (!this._config) return;

    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentBadgeOptions = currentGroupsOptions['badges'] || {};

    let additional = [...(currentBadgeOptions.additional || [])];

    if (isAdd) {
      if (!additional.includes(entityId)) additional.push(entityId);
    } else {
      additional = additional.filter((e) => e !== entityId);
    }

    const newBadgeOptions: Record<string, any> = { ...currentBadgeOptions };
    if (additional.length > 0) {
      newBadgeOptions.additional = additional;
    } else {
      delete newBadgeOptions.additional;
    }

    const newGroupsOptions: Record<string, any> = {
      ...currentGroupsOptions,
      badges: newBadgeOptions,
    };

    if (Object.keys(newGroupsOptions.badges).length === 0) {
      delete newGroupsOptions.badges;
    }

    const newAreaOptions: Record<string, any> = {
      ...currentAreaOptions,
      groups_options: newGroupsOptions,
    };

    if (Object.keys(newAreaOptions.groups_options).length === 0) {
      delete newAreaOptions.groups_options;
    }

    const newAreasOptions: Record<string, any> = {
      ...this._config.areas_options,
      [areaId]: newAreaOptions,
    };

    if (Object.keys(newAreasOptions[areaId]).length === 0) {
      delete newAreasOptions[areaId];
    }

    const newConfig: OrielConfig = {
      ...this._config,
      areas_options: newAreasOptions,
    };

    if (newConfig.areas_options && Object.keys(newConfig.areas_options).length === 0) {
      delete newConfig.areas_options;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Refresh cached data
    this._refreshAreaCache(areaId);
  }

  private _badgeShowNameChanged(areaId: string, entityId: string, showName: boolean): void {
    if (!this._config || !this._hass) return;

    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentBadgeOptions = currentGroupsOptions['badges'] || {};

    let namesVisible = [...(currentBadgeOptions.names_visible || [])];
    let namesHidden = [...(currentBadgeOptions.names_hidden || [])];

    const stateObj = this._hass.states[entityId];
    const dc = stateObj?.attributes?.device_class as string | undefined;
    const defaultShowName = isDefaultShowName(dc);

    if (showName === defaultShowName) {
      namesVisible = namesVisible.filter((e) => e !== entityId);
      namesHidden = namesHidden.filter((e) => e !== entityId);
    } else if (showName) {
      if (!namesVisible.includes(entityId)) namesVisible.push(entityId);
      namesHidden = namesHidden.filter((e) => e !== entityId);
    } else {
      namesVisible = namesVisible.filter((e) => e !== entityId);
      if (!namesHidden.includes(entityId)) namesHidden.push(entityId);
    }

    const newBadgeOptions: Record<string, any> = { ...currentBadgeOptions };
    if (namesVisible.length > 0) newBadgeOptions.names_visible = namesVisible;
    else delete newBadgeOptions.names_visible;
    if (namesHidden.length > 0) newBadgeOptions.names_hidden = namesHidden;
    else delete newBadgeOptions.names_hidden;

    const newGroupsOptions: Record<string, any> = { ...currentGroupsOptions, badges: newBadgeOptions };
    if (Object.keys(newGroupsOptions.badges).length === 0) delete newGroupsOptions.badges;

    const newAreaOptions: Record<string, any> = { ...currentAreaOptions, groups_options: newGroupsOptions };
    if (Object.keys(newAreaOptions.groups_options).length === 0) delete newAreaOptions.groups_options;

    const newAreasOptions: Record<string, any> = { ...this._config.areas_options, [areaId]: newAreaOptions };
    if (Object.keys(newAreasOptions[areaId]).length === 0) delete newAreasOptions[areaId];

    const newConfig: OrielConfig = { ...this._config, areas_options: newAreasOptions };
    if (newConfig.areas_options && Object.keys(newConfig.areas_options).length === 0) delete newConfig.areas_options;

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Refresh cached data
    this._refreshAreaCache(areaId);
  }

  private _addBadgeFromPicker(e: Event, areaId: string): void {
    e.stopPropagation();
    const picker = this.shadowRoot!.querySelector(
      `.badge-entity-picker[data-area-id="${areaId}"]`
    ) as HTMLSelectElement | null;
    if (!picker || !picker.value) return;

    const entityId = picker.value;
    this._badgeAdditionalChanged(areaId, entityId, true);
    picker.value = '';
  }

  // ====================================================================
  // DRAG AND DROP
  // ====================================================================

  private _handleDragStart = (ev: DragEvent): void => {
    const dragHandle = (ev.target as HTMLElement).closest('.drag-handle');
    if (!dragHandle) {
      ev.preventDefault();
      return;
    }

    const areaItem = (ev.target as HTMLElement).closest('.area-item') as HTMLElement | null;
    if (!areaItem) {
      ev.preventDefault();
      return;
    }

    areaItem.classList.add('dragging');
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', areaItem.dataset.areaId || '');
    }
    this._draggedElement = areaItem;
  };

  private _handleDragEnd = (ev: DragEvent): void => {
    const areaItem = (ev.target as HTMLElement).closest('.area-item') as HTMLElement | null;
    if (areaItem) {
      areaItem.classList.remove('dragging');
    }

    // Remove all drag-over classes
    const areaList = this.shadowRoot!.querySelector('#area-list');
    if (areaList) {
      areaList.querySelectorAll('.area-item').forEach((item) => {
        item.classList.remove('drag-over');
      });
    }
  };

  private _handleDragOver = (ev: DragEvent): void => {
    ev.preventDefault();
    ev.dataTransfer!.dropEffect = 'move';

    const item = (ev.currentTarget as HTMLElement);
    if (item !== this._draggedElement) {
      item.classList.add('drag-over');
    }
  };

  private _handleDragLeave = (ev: DragEvent): void => {
    (ev.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  private _handleDrop = (ev: DragEvent): void => {
    ev.stopPropagation();
    ev.preventDefault();

    const dropTarget = ev.currentTarget as HTMLElement;
    dropTarget.classList.remove('drag-over');

    if (!this._draggedElement || this._draggedElement === dropTarget) return;

    const draggedAreaId = this._draggedElement.dataset.areaId;
    const dropAreaId = dropTarget.dataset.areaId;
    if (!draggedAreaId || !dropAreaId) return;

    // Compute new order from current config state (NOT from DOM)
    const currentOrder = this._getAreaOrder();
    const draggedIndex = currentOrder.indexOf(draggedAreaId);
    const dropIndex = currentOrder.indexOf(dropAreaId);
    if (draggedIndex === -1 || dropIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedAreaId);

    this._updateAreaOrder(newOrder);
  };

  private _getAreaOrder(): string[] {
    if (!this._hass) return [];
    const configOrder = this._config.areas_display?.order;
    if (configOrder && configOrder.length > 0) return [...configOrder];
    return Object.keys(this._hass.areas || {});
  }

  private _updateAreaOrder(newOrder: string[]): void {

    const newConfig: OrielConfig = {
      ...this._config,
      areas_display: {
        ...this._config.areas_display,
        order: newOrder,
      },
    };

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // ====================================================================
  // ENTITY LIST DRAG & DROP (Favorites / Room Pins)
  // ====================================================================

  private _entityDraggedId: string | null = null;

  private _handleEntityDragStart = (ev: DragEvent, _listType: 'favorites' | 'room_pins'): void => {
    const item = (ev.target as HTMLElement).closest('.entity-list-item') as HTMLElement | null;
    if (!item) { ev.preventDefault(); return; }

    item.classList.add('dragging');
    this._entityDraggedId = item.dataset.entityId || null;
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', this._entityDraggedId || '');
    }
  };

  private _handleEntityDragEnd = (ev: DragEvent): void => {
    const item = (ev.target as HTMLElement).closest('.entity-list-item') as HTMLElement | null;
    if (item) item.classList.remove('dragging');
    this._entityDraggedId = null;
  };

  private _handleEntityDragOver = (ev: DragEvent): void => {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    const item = (ev.currentTarget as HTMLElement);
    if (item.dataset.entityId !== this._entityDraggedId) {
      item.classList.add('drag-over');
    }
  };

  private _handleEntityDragLeave = (ev: DragEvent): void => {
    (ev.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  private _handleEntityDrop = (ev: DragEvent, listType: 'favorites' | 'room_pins'): void => {
    ev.stopPropagation();
    ev.preventDefault();

    const dropTarget = ev.currentTarget as HTMLElement;
    dropTarget.classList.remove('drag-over');

    const draggedId = this._entityDraggedId;
    const dropId = dropTarget.dataset.entityId;
    if (!draggedId || !dropId || draggedId === dropId) return;

    // Reorder the right list depending on the source pane + (for
    // favorites) the current shape. Viewport-keyed favorites reorder
    // the active-viewport slice; flat favorites reorder the array
    // directly. Room pins is always flat.
    const favRaw = this._config.favorite_entities as unknown;
    if (listType === 'favorites' && isViewportKeyedFavorites(favRaw)) {
      const map = favRaw as Partial<Record<FavoritesViewport, string[]>>;
      const list = Array.isArray(map[this._favoritesActiveViewport])
        ? [...(map[this._favoritesActiveViewport] as string[])]
        : [];
      const di = list.indexOf(draggedId);
      const dpi = list.indexOf(dropId);
      if (di === -1 || dpi === -1) return;
      list.splice(di, 1);
      list.splice(dpi, 0, draggedId);
      const newConfig: OrielConfig = {
        ...this._config,
        favorite_entities: {
          ...map,
          [this._favoritesActiveViewport]: list,
        } as OrielConfig['favorite_entities'],
      };
      this._config = newConfig;
      this._fireConfigChanged(newConfig);
      return;
    }

    const favList: string[] = Array.isArray(favRaw) ? (favRaw as string[]) : [];
    const currentList = listType === 'favorites'
      ? [...favList]
      : [...(this._config.room_pin_entities || [])];

    const draggedIndex = currentList.indexOf(draggedId);
    const dropIndex = currentList.indexOf(dropId);
    if (draggedIndex === -1 || dropIndex === -1) return;

    currentList.splice(draggedIndex, 1);
    currentList.splice(dropIndex, 0, draggedId);

    const key = listType === 'favorites' ? 'favorite_entities' : 'room_pin_entities';
    const newConfig: OrielConfig = { ...this._config, [key]: currentList };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  };

  // ====================================================================
  // CONFIG DISPATCH
  // ====================================================================

  private _fireConfigChanged(config: OrielConfig): void {
    this._isUpdatingConfig = true;

    // Live preview (F-5) — schedule a debounced re-render whenever
    // config changes. The runner handles its own debouncing; this
    // call is cheap (just resets a timer).
    if (this._livePreviewState.visible && this._livePreviewRunner && this._hass) {
      this._livePreviewRunner.schedule(config, this._hass);
    }

    // Strip internal fields before saving
    const cleanConfig: OrielConfig = { ...config };
    if (cleanConfig.custom_views) {
      cleanConfig.custom_views = cleanConfig.custom_views.map((cv) => {
        const clean = { ...cv };
        delete clean._yaml_error;
        return clean;
      });
    }
    if (cleanConfig.custom_cards) {
      cleanConfig.custom_cards = cleanConfig.custom_cards.map((cc) => {
        const clean = { ...cc };
        delete clean._yaml_error;
        return clean;
      });
    }
    if (cleanConfig.custom_badges) {
      cleanConfig.custom_badges = cleanConfig.custom_badges.map((cb) => {
        const clean = { ...cb };
        delete clean._yaml_error;
        return clean;
      });
    }

    this._config = cleanConfig;

    const event = new CustomEvent('config-changed', {
      detail: { config: cleanConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);

    // Reset flag after one tick
    setTimeout(() => {
      this._isUpdatingConfig = false;
    }, 0);
  }
}

// ====================================================================
// HELPER FUNCTIONS (local to this module)
// ====================================================================

async function getAreaGroupedEntities(areaId: string, hass: HomeAssistant): Promise<RoomEntities> {
  const devices = Object.values(hass.devices || {});
  const entities = Object.values(hass.entities || {});

  const areaDevices = new Set<string>();
  for (const device of devices) {
    if (device.area_id === areaId) {
      areaDevices.add(device.id);
    }
  }

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

  const excludeLabels = entities
    .filter((e: EntityRegistryEntry) => e.labels?.includes('no_dboard'))
    .map((e: EntityRegistryEntry) => e.entity_id);

  for (const entity of entities) {
    let belongsToArea = false;

    if (entity.area_id) {
      belongsToArea = entity.area_id === areaId;
    } else if (entity.device_id && areaDevices.has(entity.device_id)) {
      belongsToArea = true;
    }

    if (!belongsToArea) continue;
    if (excludeLabels.includes(entity.entity_id)) continue;
    if (!hass.states[entity.entity_id]) continue;
    if (entity.hidden) continue;

    const entityRegistry = hass.entities?.[entity.entity_id];
    if (entityRegistry?.hidden) continue;

    const domain = entity.entity_id.split('.')[0];
    const stateObj = hass.states[entity.entity_id];
    if (!stateObj) continue;
    const deviceClass = stateObj.attributes?.device_class;

    if (domain === 'light') {
      roomEntities.lights.push(entity.entity_id);
    } else if (domain === 'cover') {
      if (deviceClass === 'curtain') {
        roomEntities.covers_curtain.push(entity.entity_id);
      } else if (deviceClass === 'window' || deviceClass === 'door' || deviceClass === 'gate' || deviceClass === 'garage') {
        roomEntities.covers_window.push(entity.entity_id);
      } else {
        roomEntities.covers.push(entity.entity_id);
      }
    } else if (domain === 'scene') {
      roomEntities.scenes.push(entity.entity_id);
    } else if (domain === 'climate') {
      roomEntities.climate.push(entity.entity_id);
    } else if (domain === 'media_player') {
      roomEntities.media_player.push(entity.entity_id);
    } else if (domain === 'vacuum') {
      roomEntities.vacuum.push(entity.entity_id);
    } else if (domain === 'fan') {
      roomEntities.fan.push(entity.entity_id);
    } else if (domain === 'switch') {
      roomEntities.switches.push(entity.entity_id);
    } else if (domain === 'lock') {
      roomEntities.locks.push(entity.entity_id);
    }
  }

  return roomEntities;
}

function getAreaBadgeCandidates(areaId: string, hass: HomeAssistant): string[] {
  const devices = Object.values(hass.devices || {});
  const entities = Object.values(hass.entities || {});

  const areaDevices = new Set<string>();
  for (const device of devices) {
    if (device.area_id === areaId) areaDevices.add(device.id);
  }

  const candidates: string[] = [];

  for (const entity of entities) {
    let belongsToArea = false;
    if (entity.area_id) belongsToArea = entity.area_id === areaId;
    else if (entity.device_id && areaDevices.has(entity.device_id)) belongsToArea = true;
    if (!belongsToArea) continue;
    if (entity.hidden) continue;
    if (entity.labels?.includes('no_dboard')) continue;
    const stateObj = hass.states[entity.entity_id];
    if (!stateObj) continue;

    const domain = entity.entity_id.split('.')[0] ?? '';
    const dc = stateObj.attributes?.device_class as string | undefined;
    const unit = stateObj.attributes?.unit_of_measurement as string | undefined;

    if (!isBadgeCandidate(domain, dc, unit, entity.entity_id)) continue;

    if (domain === 'sensor' && (dc === 'battery' || entity.entity_id.includes('battery'))) {
      const val = parseFloat(stateObj.state);
      if (!isNaN(val) && val < 20) candidates.push(entity.entity_id);
      continue;
    }

    candidates.push(entity.entity_id);
  }

  return candidates;
}

function getAdditionalBadgesForArea(areaId: string, config: OrielConfig): string[] {
  return config.areas_options?.[areaId]?.groups_options?.badges?.additional || [];
}

function getAvailableBadgeEntities(
  areaId: string,
  hass: HomeAssistant,
  existingCandidates: string[],
  existingAdditional: string[]
): Array<{ entity_id: string; name: string }> {
  const devices = Object.values(hass.devices || {});
  const entities = Object.values(hass.entities || {});
  const excludeSet = new Set([...existingCandidates, ...existingAdditional]);

  const areaDevices = new Set<string>();
  for (const device of devices) {
    if (device.area_id === areaId) areaDevices.add(device.id);
  }

  const available: Array<{ entity_id: string; name: string }> = [];

  for (const entity of entities) {
    let belongsToArea = false;
    if (entity.area_id) belongsToArea = entity.area_id === areaId;
    else if (entity.device_id && areaDevices.has(entity.device_id)) belongsToArea = true;
    if (!belongsToArea) continue;
    if (entity.hidden) continue;
    if (!hass.states[entity.entity_id]) continue;

    const domain = entity.entity_id.split('.')[0];
    if (domain !== 'sensor' && domain !== 'binary_sensor') continue;
    if (excludeSet.has(entity.entity_id)) continue;

    const stateObj = hass.states[entity.entity_id];
    if (!stateObj) continue;
    const name =
      (stateObj.attributes?.friendly_name as string) ||
      (entity.entity_id.split('.')[1] ?? entity.entity_id).replace(/_/g, ' ');
    available.push({ entity_id: entity.entity_id, name });
  }

  available.sort((a, b) => a.name.localeCompare(b.name));
  return available;
}

function getDefaultShowNameEntities(badgeCandidates: string[], hass: HomeAssistant): Set<string> {
  const result = new Set<string>();
  for (const entityId of badgeCandidates) {
    const stateObj = hass.states[entityId];
    if (!stateObj) continue;
    const dc = stateObj.attributes?.device_class as string | undefined;
    if (isDefaultShowName(dc)) result.add(entityId);
  }
  return result;
}

function getBadgeNamesConfig(
  areaId: string,
  config: OrielConfig
): { namesVisible: string[]; namesHidden: string[] } {
  const opts = config.areas_options?.[areaId]?.groups_options?.badges;
  return {
    namesVisible: opts?.names_visible || [],
    namesHidden: opts?.names_hidden || [],
  };
}

function getHiddenEntitiesForArea(areaId: string, config: OrielConfig): Record<string, string[]> {
  const areaOptions = config.areas_options?.[areaId];
  if (!areaOptions || !areaOptions.groups_options) {
    return {};
  }

  const hidden: Record<string, string[]> = {};
  for (const [group, options] of Object.entries(areaOptions.groups_options)) {
    if (options.hidden) {
      hidden[group] = options.hidden;
    }
  }

  return hidden;
}

function getEntityOrdersForArea(areaId: string, config: OrielConfig): Record<string, string[]> {
  const areaOptions = config.areas_options?.[areaId];
  if (!areaOptions || !areaOptions.groups_options) {
    return {};
  }

  const orders: Record<string, string[]> = {};
  for (const [group, options] of Object.entries(areaOptions.groups_options)) {
    if (options.order) {
      orders[group] = options.order;
    }
  }

  return orders;
}

// Register custom element
customElements.define('oriel-editor', OrielEditor);
