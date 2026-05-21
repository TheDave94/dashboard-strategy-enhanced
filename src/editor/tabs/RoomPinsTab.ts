// ====================================================================
// Editor tab — Room Pins
// ====================================================================
// Entity-search-picker shape (matches LightFavorites / Favorites /
// WeatherSensors). Stateful editor fields (_roomPinSearch) stay on
// the editor class — the tab module reads them through the context
// and triggers `onSearchChange` to update them.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { HomeAssistant } from '../../types/homeassistant';
import type { DashboardEnhancedStrategyConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface RoomPinsTabContext {
  hass: HomeAssistant;
  config: DashboardEnhancedStrategyConfig;
  search: string;
  allEntitiesForSelect: Array<{
    entity_id: string;
    name: string;
    area_id?: string | null;
    device_area_id?: string | null;
  }>;
  filteredEntities: Array<{ entity_id: string; name: string }>;
  renderCheckbox: (
    id: string,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ) => TemplateResult;
  onSearchChange: (value: string) => void;
  onAddEntity: (entityId: string) => void;
  onRemoveEntity: (entityId: string) => void;
  onPositionChange: (position: 'top' | 'bottom') => void;
  onToggleChange: (key: string, value: boolean, defaultValue: boolean) => void;
  onDragStart: (ev: DragEvent) => void;
  onDragEnd: (ev: DragEvent) => void;
  onDragOver: (ev: DragEvent) => void;
  onDragLeave: (ev: DragEvent) => void;
  onDrop: (ev: DragEvent) => void;
}

export function renderRoomPinsTab(ctx: RoomPinsTabContext): TemplateResult {
  const roomPinEntities = ctx.config.room_pin_entities || [];
  const roomPinsShowState = ctx.config.room_pins_show_state === true;
  const roomPinsHideLastChanged = ctx.config.room_pins_hide_last_changed === true;
  const roomPinsPosition = ctx.config.room_pins_position === 'bottom' ? 'bottom' : 'top';

  const allAreas = Object.values(ctx.hass.areas).sort((a, b) => a.name.localeCompare(b.name));
  const entityMap = new Map(ctx.allEntitiesForSelect.map((e) => [e.entity_id, e]));
  const areaMap = new Map(allAreas.map((a) => [a.area_id, a.name]));

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_room_pins')}</div>

      <div id="room-pins-list" style="margin-bottom: 12px;">
        ${roomPinEntities.length === 0
          ? html`<div class="empty-state">${localize('editor.no_room_pins')}</div>`
          : html`
              <div class="entity-list-container">
                ${roomPinEntities.map((entityId) => {
                  const entity = entityMap.get(entityId);
                  const name = entity?.name || entityId;
                  const areaId = entity?.area_id || entity?.device_area_id;
                  const areaName = areaId ? areaMap.get(areaId) || areaId : localize('editor.no_room');
                  return html`
                    <div
                      class="entity-list-item"
                      data-entity-id=${entityId}
                      draggable="true"
                      @dragstart=${ctx.onDragStart}
                      @dragend=${ctx.onDragEnd}
                      @dragover=${ctx.onDragOver}
                      @dragleave=${ctx.onDragLeave}
                      @drop=${ctx.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
                      <span class="item-info">
                        <span class="item-name">${name}</span>
                        <span class="item-entity-id">${entityId}</span>
                        <span class="item-area">&#x1F4CD; ${areaName}</span>
                      </span>
                      <button class="btn-remove" @click=${() => ctx.onRemoveEntity(entityId)}>
                        &#x2715;
                      </button>
                    </div>
                  `;
                })}
              </div>
            `}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${localize('editor.select_entity') + '...'}
          .value=${ctx.search}
          @input=${(e: Event) => ctx.onSearchChange((e.target as HTMLInputElement).value)}
          @blur=${() => setTimeout(() => ctx.onSearchChange(''), 200)}
        />
        ${ctx.search.length >= 2
          ? html`
              <div class="entity-search-results">
                ${ctx.filteredEntities.length > 0
                  ? ctx.filteredEntities.map(
                      (entity) => html`
                        <div
                          class="entity-search-result"
                          @mousedown=${(e: Event) => {
                            e.preventDefault();
                            ctx.onAddEntity(entity.entity_id);
                            ctx.onSearchChange('');
                          }}
                        >
                          <span class="entity-search-name">${entity.name}</span>
                          <span class="entity-search-id">${entity.entity_id}</span>
                        </div>
                      `,
                    )
                  : html`<div class="entity-search-no-results">${localize('editor.no_results')}</div>`}
              </div>
            `
          : nothing}
      </div>
      <div class="description">${unsafeHTML(localize('editor.room_pins_desc'))}</div>

      ${ctx.renderCheckbox(
        'room-pins-show-state',
        localize('editor.show_state'),
        roomPinsShowState,
        (checked) => ctx.onToggleChange('room_pins_show_state', checked, false),
      )}
      ${ctx.renderCheckbox(
        'room-pins-hide-last-changed',
        localize('editor.hide_last_changed'),
        roomPinsHideLastChanged,
        (checked) => ctx.onToggleChange('room_pins_hide_last_changed', checked, false),
      )}

      <div
        style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 12px; margin-bottom: 4px;"
      >
        ${localize('editor.room_pins_position')}
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-top"
          name="room-pins-position"
          value="top"
          ?checked=${roomPinsPosition === 'top'}
          @change=${() => ctx.onPositionChange('top')}
        />
        <label for="room-pins-top">${localize('editor.room_pins_position_top')}</label>
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-bottom"
          name="room-pins-position"
          value="bottom"
          ?checked=${roomPinsPosition === 'bottom'}
          @change=${() => ctx.onPositionChange('bottom')}
        />
        <label for="room-pins-bottom">${localize('editor.room_pins_position_bottom')}</label>
      </div>
      <div class="description">${localize('editor.room_pins_position_desc')}</div>
    </div>
  `;
}
