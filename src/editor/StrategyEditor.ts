// ====================================================================
// SIMON42 DASHBOARD STRATEGY - EDITOR
// ====================================================================

import yaml from 'js-yaml';
import { getEditorStyles } from './editor-styles';
import { renderEditorHTML, renderCustomViewsList } from './editor-template';
import {
  attachWeatherCheckboxListener,
  attachEnergyCheckboxListener,
  attachSearchCardCheckboxListener,
  attachSummaryViewsCheckboxListener,
  attachRoomViewsCheckboxListener,
  attachGroupByFloorsCheckboxListener,
  attachCoversSummaryCheckboxListener,
  attachHideMobileAppBatteriesCheckboxListener,
  attachShowLocksInRoomsCheckboxListener,
  attachAreaCheckboxListeners,
  attachDragAndDropListeners,
  attachExpandButtonListeners,
  sortAreaItems,
} from './editor-handlers';

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, CustomView } from '../types/strategy';

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

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
    cardTools?: unknown;
  }
}

// ====================================================================
// Editor Class
// ====================================================================

class Simon42DashboardStrategyEditor extends HTMLElement {
  private _config: Simon42StrategyConfig = {};
  private _hass: HomeAssistant | null = null;
  private _isUpdatingConfig = false;
  _expandedAreas: Set<string> = new Set();
  _expandedGroups: Map<string, Set<string>> = new Map();
  private _isRendering = false;

  // -- Lifecycle --------------------------------------------------------

  setConfig(config: Simon42StrategyConfig): void {
    this._config = config || {};
    // Only render if we are not currently pushing a config update ourselves
    if (!this._isUpdatingConfig) {
      this._render();
    }
  }

  set hass(hass: HomeAssistant) {
    const shouldRender = !this._hass; // Only render on first assignment
    this._hass = hass;
    if (shouldRender) {
      this._render();
    }
  }

  // -- Dependency check -------------------------------------------------

  _checkSearchCardDependencies(): boolean {
    const hasSearchCard = customElements.get('search-card') !== undefined;
    const hasCardTools = customElements.get('card-tools') !== undefined;
    return hasSearchCard && hasCardTools;
  }

  // -- Entity helpers ---------------------------------------------------

  _getAllEntitiesForSelect(): EntitySelectOption[] {
    if (!this._hass) return [];

    const entities = Object.values(this._hass.entities || {});
    const devices = Object.values(this._hass.devices || {});

    // Build device-to-area lookup
    const deviceAreaMap = new Map<string, string>();
    devices.forEach((device) => {
      if (device.area_id) {
        deviceAreaMap.set(device.id, device.area_id);
      }
    });

    return Object.keys(this._hass.states)
      .map((entityId) => {
        const state = this._hass!.states[entityId];
        const entity = entities.find((e) => e.entity_id === entityId);

        // Determine area_id: direct or via device
        let areaId = entity?.area_id;
        if (!areaId && entity?.device_id) {
          areaId = deviceAreaMap.get(entity.device_id) ?? null;
        }

        return {
          entity_id: entityId,
          name: state.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' '),
          area_id: areaId,
          device_area_id: areaId, // backward compat
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // -- Main render ------------------------------------------------------

  _render(): void {
    if (!this._hass || !this._config) {
      return;
    }

    const showWeather = this._config.show_weather !== false;
    const showEnergy = this._config.show_energy !== false;
    const showSearchCard = this._config.show_search_card === true;
    const showSummaryViews = this._config.show_summary_views === true;
    const showRoomViews = this._config.show_room_views === true;
    const groupByFloors = this._config.group_by_floors === true;
    const showCoversSummary = this._config.show_covers_summary !== false;
    const hideMobileAppBatteries = this._config.hide_mobile_app_batteries === true;
    const showLocksInRooms = this._config.show_locks_in_rooms === true;
    const customViews = this._config.custom_views || [];
    const summariesColumns = this._config.summaries_columns || 2;
    const alarmEntity = this._config.alarm_entity || '';
    const favoriteEntities = this._config.favorite_entities || [];
    const roomPinEntities = this._config.room_pin_entities || [];
    const hasSearchCardDeps = this._checkSearchCardDependencies();

    // Collect all alarm-control-panel entities
    const alarmEntities: AlarmEntityOption[] = Object.keys(this._hass.states)
      .filter((entityId) => entityId.startsWith('alarm_control_panel.'))
      .map((entityId) => {
        const state = this._hass!.states[entityId];
        return {
          entity_id: entityId,
          name: state.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' '),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // All entities for favorites / room-pins select
    const allEntities = this._getAllEntitiesForSelect();

    // Areas
    const allAreas = Object.values(this._hass.areas).sort((a, b) => a.name.localeCompare(b.name));
    const hiddenAreas = this._config.areas_display?.hidden || [];
    const areaOrder = this._config.areas_display?.order || [];

    // Set HTML content with styles and template
    this.innerHTML = `
      <style>${getEditorStyles()}</style>
      ${renderEditorHTML({
        allAreas,
        hiddenAreas,
        areaOrder,
        showWeather,
        showEnergy,
        showSummaryViews,
        showRoomViews,
        showSearchCard,
        hasSearchCardDeps,
        summariesColumns,
        alarmEntity,
        alarmEntities,
        favoriteEntities,
        roomPinEntities,
        allEntities,
        groupByFloors,
        showCoversSummary,
        hideMobileAppBatteries,
        showLocksInRooms,
        customViews,
      })}
    `;

    // Bind event listeners
    attachWeatherCheckboxListener(this, (val: boolean) => this._showWeatherChanged(val));
    attachEnergyCheckboxListener(this, (val: boolean) => this._showEnergyChanged(val));
    attachSearchCardCheckboxListener(this, (val: boolean) => this._showSearchCardChanged(val));
    attachSummaryViewsCheckboxListener(this, (val: boolean) => this._showSummaryViewsChanged(val));
    attachRoomViewsCheckboxListener(this, (val: boolean) => this._showRoomViewsChanged(val));
    attachGroupByFloorsCheckboxListener(this, (val: boolean) => this._groupByFloorsChanged(val));
    attachCoversSummaryCheckboxListener(this, (val: boolean) => this._showCoversSummaryChanged(val));
    attachHideMobileAppBatteriesCheckboxListener(this, (hide: boolean) => this._hideMobileAppBatteriesChanged(hide));
    attachShowLocksInRoomsCheckboxListener(this, (show: boolean) => this._showLocksInRoomsChanged(show));
    this._attachCustomViewsListeners();
    this._attachSummariesColumnsListener();
    this._attachAlarmEntityListener();
    this._attachFavoritesListeners();
    this._attachRoomPinsListeners();
    attachAreaCheckboxListeners(this, (areaId: string, isVisible: boolean) =>
      this._areaVisibilityChanged(areaId, isVisible)
    );

    // Sort area items by displayOrder
    sortAreaItems(this);

    // Drag & Drop event listeners
    attachDragAndDropListeners(this, () => this._updateAreaOrder());

    // Expand button listeners
    attachExpandButtonListeners(
      this,
      this._hass,
      this._config,
      (areaId: string, group: string, entityId: string | null, isVisible: boolean) =>
        this._entityVisibilityChanged(areaId, group, entityId, isVisible)
    );

    // Restore expanded state
    this._restoreExpandedState();
  }

  // -- Summaries columns ------------------------------------------------

  _attachSummariesColumnsListener(): void {
    const radio2 = this.querySelector('#summaries-2-columns') as HTMLInputElement | null;
    const radio4 = this.querySelector('#summaries-4-columns') as HTMLInputElement | null;

    if (radio2) {
      radio2.addEventListener('change', (e: Event) => {
        if ((e.target as HTMLInputElement).checked) {
          this._summariesColumnsChanged(2);
        }
      });
    }

    if (radio4) {
      radio4.addEventListener('change', (e: Event) => {
        if ((e.target as HTMLInputElement).checked) {
          this._summariesColumnsChanged(4);
        }
      });
    }
  }

  _summariesColumnsChanged(columns: 2 | 4): void {
    if (!this._config || !this._hass) {
      return;
    }

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      summaries_columns: columns,
    };

    // Remove property when set to default (2)
    if (columns === 2) {
      delete newConfig.summaries_columns;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Alarm entity -----------------------------------------------------

  _attachAlarmEntityListener(): void {
    const alarmSelect = this.querySelector('#alarm-entity') as HTMLSelectElement | null;
    if (alarmSelect) {
      alarmSelect.addEventListener('change', (e: Event) => {
        this._alarmEntityChanged((e.target as HTMLSelectElement).value);
      });
    }
  }

  _alarmEntityChanged(entityId: string): void {
    if (!this._config || !this._hass) {
      return;
    }

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      alarm_entity: entityId,
    };

    // Remove property when empty
    if (!entityId || entityId === '') {
      delete newConfig.alarm_entity;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Favorites --------------------------------------------------------

  _attachFavoritesListeners(): void {
    // Add button
    const addBtn = this.querySelector('#add-favorite-btn');
    const select = this.querySelector('#favorite-entity-select') as HTMLSelectElement | null;

    if (addBtn && select) {
      addBtn.addEventListener('click', () => {
        const entityId = select.value;
        if (entityId && entityId !== '') {
          this._addFavoriteEntity(entityId);
          select.value = ''; // Reset selection
        }
      });
    }

    // Remove buttons
    const removeButtons = this.querySelectorAll('.remove-favorite-btn');
    removeButtons.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        const entityId = (e.target as HTMLElement).dataset.entityId;
        if (entityId) {
          this._removeFavoriteEntity(entityId);
        }
      });
    });
  }

  _addFavoriteEntity(entityId: string): void {
    if (!this._config || !this._hass) {
      return;
    }

    const currentFavorites = this._config.favorite_entities || [];

    // Already present?
    if (currentFavorites.includes(entityId)) {
      return;
    }

    const newFavorites = [...currentFavorites, entityId];

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      favorite_entities: newFavorites,
    };

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Re-render only the favorites list
    this._updateFavoritesList();
  }

  _removeFavoriteEntity(entityId: string): void {
    if (!this._config || !this._hass) {
      return;
    }

    const currentFavorites = this._config.favorite_entities || [];
    const newFavorites = currentFavorites.filter((id) => id !== entityId);

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      favorite_entities: newFavorites.length > 0 ? newFavorites : undefined,
    };

    // Remove property when empty
    if (newFavorites.length === 0) {
      delete newConfig.favorite_entities;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Re-render only the favorites list
    this._updateFavoritesList();
  }

  _updateFavoritesList(): void {
    const container = this.querySelector('#favorites-list');
    if (!container) return;

    const favoriteEntities = this._config.favorite_entities || [];
    const allEntities = this._getAllEntitiesForSelect();

    // Dynamic import of the render function
    import('./editor-template')
      .then((module) => {
        container.innerHTML =
          (module as any).renderFavoritesList?.(favoriteEntities, allEntities) ||
          this._renderFavoritesListFallback(favoriteEntities, allEntities);

        // Reattach listeners
        this._attachFavoritesListeners();
      })
      .catch(() => {
        // Fallback if import fails
        container.innerHTML = this._renderFavoritesListFallback(favoriteEntities, allEntities);
        this._attachFavoritesListeners();
      });
  }

  private _renderFavoritesListFallback(favoriteEntities: string[], allEntities: EntitySelectOption[]): string {
    if (!favoriteEntities || favoriteEntities.length === 0) {
      return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine Favoriten hinzugefügt</div>';
    }

    const entityMap = new Map(allEntities.map((e) => [e.entity_id, e.name]));

    return `
      <div style="border: 1px solid var(--divider-color); border-radius: 4px; overflow: hidden;">
        ${favoriteEntities
          .map((entityId) => {
            const name = entityMap.get(entityId) || entityId;
            return `
            <div class="favorite-item" data-entity-id="${entityId}" style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--divider-color); background: var(--card-background-color);">
              <span class="drag-handle" style="margin-right: 12px; cursor: grab; color: var(--secondary-text-color);">☰</span>
              <span style="flex: 1; font-size: 14px;">
                <strong>${name}</strong>
                <span style="margin-left: 8px; font-size: 12px; color: var(--secondary-text-color); font-family: monospace;">${entityId}</span>
              </span>
              <button class="remove-favorite-btn" data-entity-id="${entityId}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">
                ✕
              </button>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  }

  // -- Room Pins --------------------------------------------------------

  _attachRoomPinsListeners(): void {
    // Add button
    const addBtn = this.querySelector('#add-room-pin-btn');
    const select = this.querySelector('#room-pin-entity-select') as HTMLSelectElement | null;

    if (addBtn && select) {
      addBtn.addEventListener('click', () => {
        const entityId = select.value;
        if (entityId && entityId !== '') {
          this._addRoomPinEntity(entityId);
          select.value = ''; // Reset selection
        }
      });
    }

    // Remove buttons
    const removeButtons = this.querySelectorAll('.remove-room-pin-btn');
    removeButtons.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        const entityId = (e.target as HTMLElement).dataset.entityId;
        if (entityId) {
          this._removeRoomPinEntity(entityId);
        }
      });
    });
  }

  _addRoomPinEntity(entityId: string): void {
    if (!this._config || !this._hass) {
      return;
    }

    const currentPins = this._config.room_pin_entities || [];

    // Already present?
    if (currentPins.includes(entityId)) {
      return;
    }

    const newPins = [...currentPins, entityId];

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      room_pin_entities: newPins,
    };

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Re-render only the room-pins list
    this._updateRoomPinsList();
  }

  _removeRoomPinEntity(entityId: string): void {
    if (!this._config || !this._hass) {
      return;
    }

    const currentPins = this._config.room_pin_entities || [];
    const newPins = currentPins.filter((id) => id !== entityId);

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      room_pin_entities: newPins.length > 0 ? newPins : undefined,
    };

    // Remove property when empty
    if (newPins.length === 0) {
      delete newConfig.room_pin_entities;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Re-render only the room-pins list
    this._updateRoomPinsList();
  }

  _updateRoomPinsList(): void {
    const container = this.querySelector('#room-pins-list');
    if (!container) return;

    const roomPinEntities = this._config.room_pin_entities || [];
    const allEntities = this._getAllEntitiesForSelect();
    const allAreas = Object.values(this._hass!.areas).sort((a, b) => a.name.localeCompare(b.name));

    // Dynamic import of the render function
    import('./editor-template')
      .then((module) => {
        container.innerHTML =
          (module as any).renderRoomPinsList?.(roomPinEntities, allEntities, allAreas) ||
          this._renderRoomPinsListFallback(roomPinEntities, allEntities, allAreas);

        // Reattach listeners
        this._attachRoomPinsListeners();
      })
      .catch(() => {
        // Fallback if import fails
        container.innerHTML = this._renderRoomPinsListFallback(roomPinEntities, allEntities, allAreas);
        this._attachRoomPinsListeners();
      });
  }

  private _renderRoomPinsListFallback(
    roomPinEntities: string[],
    allEntities: EntitySelectOption[],
    allAreas: Array<{ area_id: string; name: string }>
  ): string {
    if (!roomPinEntities || roomPinEntities.length === 0) {
      return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine Raum-Pins hinzugefügt</div>';
    }

    const entityMap = new Map(allEntities.map((e) => [e.entity_id, e]));
    const areaMap = new Map(allAreas.map((a) => [a.area_id, a.name]));

    return `
      <div style="border: 1px solid var(--divider-color); border-radius: 4px; overflow: hidden;">
        ${roomPinEntities
          .map((entityId) => {
            const entity = entityMap.get(entityId);
            const name = entity?.name || entityId;
            const areaId = entity?.area_id || entity?.device_area_id;
            const areaName = areaId ? areaMap.get(areaId) || areaId : 'Kein Raum';

            return `
            <div class="room-pin-item" data-entity-id="${entityId}" style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--divider-color); background: var(--card-background-color);">
              <span class="drag-handle" style="margin-right: 12px; cursor: grab; color: var(--secondary-text-color);">☰</span>
              <span style="flex: 1; font-size: 14px;">
                <strong>${name}</strong>
                <span style="margin-left: 8px; font-size: 12px; color: var(--secondary-text-color); font-family: monospace;">${entityId}</span>
                <br>
                <span style="font-size: 11px; color: var(--secondary-text-color);">📍 ${areaName}</span>
              </span>
              <button class="remove-room-pin-btn" data-entity-id="${entityId}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">
                ✕
              </button>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  }

  // -- Custom Views -----------------------------------------------------

  _attachCustomViewsListeners(): void {
    // Add button
    const addBtn = this.querySelector('#add-custom-view-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._addCustomView());
    }

    // Remove buttons
    this.querySelectorAll('.remove-custom-view-btn').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0', 10);
        this._removeCustomView(index);
      });
    });

    // Title / Path / Icon inputs
    this.querySelectorAll('.custom-view-title, .custom-view-path, .custom-view-icon').forEach((input) => {
      input.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0', 10);
        const field = target.classList.contains('custom-view-title')
          ? 'title'
          : target.classList.contains('custom-view-path')
            ? 'path'
            : 'icon';
        this._updateCustomViewField(index, field, target.value);
      });
    });

    // YAML textareas — parse on change
    this.querySelectorAll('.custom-view-yaml').forEach((textarea) => {
      textarea.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        const index = parseInt(target.dataset.index || '0', 10);
        this._updateCustomViewYaml(index, target.value);
      });
    });
  }

  _addCustomView(): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    customViews.push({
      title: 'Neue View',
      path: `custom-view-${customViews.length + 1}`,
      icon: 'mdi:card-text-outline',
      yaml: '',
      parsed_config: undefined,
    } as CustomView);

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      custom_views: customViews,
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
    this._updateCustomViewsList();
  }

  _removeCustomView(index: number): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    customViews.splice(index, 1);

    const newConfig: Simon42StrategyConfig = { ...this._config };
    if (customViews.length === 0) {
      delete newConfig.custom_views;
    } else {
      newConfig.custom_views = customViews;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
    this._updateCustomViewsList();
  }

  _updateCustomViewField(index: number, field: string, value: string): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    if (!customViews[index]) return;

    customViews[index] = { ...customViews[index], [field]: value };

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      custom_views: customViews,
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _updateCustomViewYaml(index: number, yamlString: string): void {
    const customViews: CustomView[] = [...(this._config.custom_views || [])];
    if (!customViews[index]) return;

    const updated: CustomView = {
      ...customViews[index],
      yaml: yamlString,
    };
    delete updated._yaml_error;

    if (yamlString.trim()) {
      try {
        const parsed = yaml.load(yamlString);
        if (parsed && typeof parsed === 'object') {
          updated.parsed_config = parsed as Record<string, any>;
        } else {
          updated._yaml_error = 'YAML muss ein Objekt ergeben';
          updated.parsed_config = undefined;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message?.split('\n')[0] : 'Ungültiges YAML';
        updated._yaml_error = message || 'Ungültiges YAML';
        updated.parsed_config = undefined;
      }
    } else {
      updated.parsed_config = undefined;
    }

    customViews[index] = updated;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      custom_views: customViews,
    };
    this._config = newConfig;
    this._fireConfigChanged(newConfig);

    // Update only the validation display (not the whole list — avoids cursor loss)
    const validationEl = this.querySelector(`.custom-view-validation[data-index="${index}"]`);
    if (validationEl) {
      if (updated._yaml_error) {
        validationEl.innerHTML = `<span style="color: var(--error-color, red);">❌ ${updated._yaml_error}</span>`;
      } else if (yamlString.trim()) {
        validationEl.innerHTML = '<span style="color: var(--success-color, green);">✅ YAML gültig</span>';
      } else {
        validationEl.innerHTML = '';
      }
    }
  }

  _updateCustomViewsList(): void {
    const container = this.querySelector('#custom-views-list');
    if (container) {
      container.innerHTML = renderCustomViewsList(this._config.custom_views || []);
      this._attachCustomViewsListeners();
    }
  }

  // -- Toggle handlers --------------------------------------------------

  _showWeatherChanged(showWeather: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_weather: showWeather,
    };

    // Remove property when set to default (true)
    if (showWeather === true) {
      delete newConfig.show_weather;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showEnergyChanged(showEnergy: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_energy: showEnergy,
    };

    if (showEnergy === true) {
      delete newConfig.show_energy;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showSearchCardChanged(showSearchCard: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_search_card: showSearchCard,
    };

    // Remove property when set to default (false)
    if (showSearchCard === false) {
      delete newConfig.show_search_card;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showSummaryViewsChanged(showSummaryViews: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_summary_views: showSummaryViews,
    };

    if (showSummaryViews === false) {
      delete newConfig.show_summary_views;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showRoomViewsChanged(showRoomViews: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_room_views: showRoomViews,
    };

    if (showRoomViews === false) {
      delete newConfig.show_room_views;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _groupByFloorsChanged(groupByFloors: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      group_by_floors: groupByFloors,
    };

    if (groupByFloors === false) {
      delete newConfig.group_by_floors;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showCoversSummaryChanged(showCoversSummary: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_covers_summary: showCoversSummary,
    };

    // Remove property when set to default (true)
    if (showCoversSummary === true) {
      delete newConfig.show_covers_summary;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _hideMobileAppBatteriesChanged(hide: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      hide_mobile_app_batteries: hide,
    };

    if (hide === false) {
      delete newConfig.hide_mobile_app_batteries;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _showLocksInRoomsChanged(show: boolean): void {
    if (!this._config || !this._hass) return;

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      show_locks_in_rooms: show,
    };

    if (show === false) {
      delete newConfig.show_locks_in_rooms;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Area management --------------------------------------------------

  _areaVisibilityChanged(areaId: string, isVisible: boolean): void {
    if (!this._config || !this._hass) return;

    let hiddenAreas = [...(this._config.areas_display?.hidden || [])];

    if (isVisible) {
      // Remove from hidden
      hiddenAreas = hiddenAreas.filter((id) => id !== areaId);
    } else {
      // Add to hidden
      if (!hiddenAreas.includes(areaId)) {
        hiddenAreas.push(areaId);
      }
    }

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      areas_display: {
        ...this._config.areas_display,
        hidden: hiddenAreas,
      },
    };

    // Remove hidden array when empty
    if (newConfig.areas_display!.hidden!.length === 0) {
      delete newConfig.areas_display!.hidden;
    }

    // Remove areas_display when empty
    if (Object.keys(newConfig.areas_display!).length === 0) {
      delete newConfig.areas_display;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _updateAreaOrder(): void {
    const areaList = this.querySelector('#area-list');
    if (!areaList) return;

    const items = Array.from(areaList.querySelectorAll('.area-item'));
    const newOrder = items.map((item) => (item as HTMLElement).dataset.areaId!);

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      areas_display: {
        ...this._config.areas_display,
        order: newOrder,
      },
    };

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  _entityVisibilityChanged(areaId: string, group: string, entityId: string | null, isVisible: boolean): void {
    if (!this._config || !this._hass) return;

    // Get current groups_options for this area
    const currentAreaOptions = this._config.areas_options?.[areaId] || {};
    const currentGroupsOptions = currentAreaOptions.groups_options || {};
    const currentGroupOptions = currentGroupsOptions[group] || {};

    let hiddenEntities = [...(currentGroupOptions.hidden || [])];

    if (entityId === null) {
      // All entities in the group
      if (!isVisible) {
        // Add all entities in this group to hidden
        const entityList = this.querySelector(`.entity-list[data-area-id="${areaId}"][data-group="${group}"]`);
        if (entityList) {
          const entityCheckboxes = entityList.querySelectorAll('.entity-checkbox');
          const allEntities = Array.from(entityCheckboxes).map((cb) => (cb as HTMLElement).dataset.entityId!);
          hiddenEntities = [...new Set([...hiddenEntities, ...allEntities])];
        }
      } else {
        // Remove all entities of this group from hidden
        const entityList = this.querySelector(`.entity-list[data-area-id="${areaId}"][data-group="${group}"]`);
        if (entityList) {
          const entityCheckboxes = entityList.querySelectorAll('.entity-checkbox');
          const allEntities = Array.from(entityCheckboxes).map((cb) => (cb as HTMLElement).dataset.entityId!);
          hiddenEntities = hiddenEntities.filter((e) => !allEntities.includes(e));
        }
      }
    } else {
      // Single entity
      if (isVisible) {
        hiddenEntities = hiddenEntities.filter((e) => e !== entityId);
      } else {
        if (!hiddenEntities.includes(entityId)) {
          hiddenEntities.push(entityId);
        }
      }
    }

    // Build new config
    const newGroupOptions: Record<string, any> = {
      ...currentGroupOptions,
      hidden: hiddenEntities,
    };

    // Remove hidden when empty
    if (newGroupOptions.hidden.length === 0) {
      delete newGroupOptions.hidden;
    }

    const newGroupsOptions: Record<string, any> = {
      ...currentGroupsOptions,
      [group]: newGroupOptions,
    };

    // Remove group when empty
    if (Object.keys(newGroupsOptions[group]).length === 0) {
      delete newGroupsOptions[group];
    }

    const newAreaOptions: Record<string, any> = {
      ...currentAreaOptions,
      groups_options: newGroupsOptions,
    };

    // Remove groups_options when empty
    if (Object.keys(newAreaOptions.groups_options).length === 0) {
      delete newAreaOptions.groups_options;
    }

    const newAreasOptions: Record<string, any> = {
      ...this._config.areas_options,
      [areaId]: newAreaOptions,
    };

    // Remove area when empty
    if (Object.keys(newAreasOptions[areaId]).length === 0) {
      delete newAreasOptions[areaId];
    }

    const newConfig: Simon42StrategyConfig = {
      ...this._config,
      areas_options: newAreasOptions,
    };

    // Remove areas_options when empty
    if (newConfig.areas_options && Object.keys(newConfig.areas_options).length === 0) {
      delete newConfig.areas_options;
    }

    this._config = newConfig;
    this._fireConfigChanged(newConfig);
  }

  // -- Expand state persistence -----------------------------------------

  _restoreExpandedState(): void {
    // Restore expanded areas
    this._expandedAreas.forEach((areaId) => {
      const button = this.querySelector(`.expand-button[data-area-id="${areaId}"]`);
      const content = this.querySelector(`.area-content[data-area-id="${areaId}"]`) as HTMLElement | null;

      if (button && content) {
        content.style.display = 'block';
        button.classList.add('expanded');

        // Restore expanded groups for this area
        const expandedGroups = this._expandedGroups.get(areaId);
        if (expandedGroups) {
          expandedGroups.forEach((groupKey) => {
            const groupButton = content.querySelector(
              `.expand-button-small[data-area-id="${areaId}"][data-group="${groupKey}"]`
            );
            const entityList = content.querySelector(
              `.entity-list[data-area-id="${areaId}"][data-group="${groupKey}"]`
            ) as HTMLElement | null;

            if (groupButton && entityList) {
              entityList.style.display = 'block';
              groupButton.classList.add('expanded');
            }
          });
        }
      }
    });
  }

  // -- Config dispatch --------------------------------------------------

  _fireConfigChanged(config: Simon42StrategyConfig): void {
    // Set flag so setConfig() does not re-render
    this._isUpdatingConfig = true;

    // Strip internal fields from custom_views before saving
    const cleanConfig: Simon42StrategyConfig = { ...config };
    if (cleanConfig.custom_views) {
      cleanConfig.custom_views = cleanConfig.custom_views.map((cv) => {
        const { _yaml_error, ...clean } = cv;
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

// Register custom element
customElements.define('simon42-dashboard-strategy-editor', Simon42DashboardStrategyEditor);
