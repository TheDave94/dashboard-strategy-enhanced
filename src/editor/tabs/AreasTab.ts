// ====================================================================
// Editor tab — Areas
// ====================================================================
// Largest remaining tab (~135 LOC of template + ~270 LOC of nested
// area-items / area-entities / badge-group helpers). The helpers
// keep their home on the editor class — they touch instance state
// (_expandedAreas, _areaEntitiesCache, _expandedGroups, drag refs)
// that doesn't fit cleanly in a pure-function. The TOP-LEVEL render
// moves here, the helpers are called back through the context.
// ====================================================================

import { html, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { Simon42StrategyConfig } from '../../types/strategy';
import type { AreaRegistryEntry } from '../../types/registries';
import { localize } from '../../utils/localize';

export interface AreasTabContext {
  hass: HomeAssistant;
  config: Simon42StrategyConfig;
  renderCheckbox: (
    id: string,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    disabled?: boolean,
  ) => TemplateResult;
  renderAreaItems: (
    allAreas: AreaRegistryEntry[],
    hiddenAreas: string[],
    areaOrder: string[],
  ) => TemplateResult | TemplateResult[];
  onToggleChange: (key: string, value: boolean, defaultValue: boolean) => void;
  onRoomVisibilityChange: (
    areaId: string,
    field: 'entity' | 'state',
    value: string,
  ) => void;
}

export function renderAreasTab(ctx: AreasTabContext): TemplateResult {
  const c = ctx.config;
  const groupByFloors = c.group_by_floors === true;
  const showSwitchesOnAreas = c.show_switches_on_areas === true;
  const showAlertsOnAreas = c.show_alerts_on_areas === true;
  const showWindowAlertsOnAreas = c.show_window_alerts_on_areas === true;
  const showLocksInRooms = c.show_locks_in_rooms === true;
  const showAutomationsInRooms = c.show_automations_in_rooms === true;
  const showScriptsInRooms = c.show_scripts_in_rooms === true;
  const showCamerasInRooms = c.show_cameras_in_rooms !== false;
  const showWindowContactsInRooms = c.show_window_contacts_in_rooms !== false;
  const showDoorContactsInRooms = c.show_door_contacts_in_rooms !== false;
  const useDefaultAreaSort = c.use_default_area_sort === true;

  const allAreas = Object.values(ctx.hass.areas).sort((a, b) => a.name.localeCompare(b.name));
  const hiddenAreas = c.areas_display?.hidden || [];
  const areaOrder = c.areas_display?.order || [];

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_areas')}</div>

      ${ctx.renderCheckbox(
        'group-by-floors',
        localize('editor.group_by_floors'),
        groupByFloors,
        (checked) => ctx.onToggleChange('group_by_floors', checked, false),
      )}
      <div class="description">${localize('editor.group_by_floors_desc')}</div>

      ${ctx.renderCheckbox(
        'show-switches-on-areas',
        localize('editor.show_switches_on_areas'),
        showSwitchesOnAreas,
        (checked) => ctx.onToggleChange('show_switches_on_areas', checked, false),
      )}
      <div class="description">${localize('editor.show_switches_on_areas_desc')}</div>

      ${ctx.renderCheckbox(
        'show-alerts-on-areas',
        localize('editor.show_alerts_on_areas'),
        showAlertsOnAreas,
        (checked) => ctx.onToggleChange('show_alerts_on_areas', checked, false),
      )}
      <div class="description">${localize('editor.show_alerts_on_areas_desc')}</div>

      ${ctx.renderCheckbox(
        'show-window-alerts-on-areas',
        localize('editor.show_window_alerts_on_areas'),
        showWindowAlertsOnAreas,
        (checked) => ctx.onToggleChange('show_window_alerts_on_areas', checked, false),
      )}
      <div class="description">${localize('editor.show_window_alerts_on_areas_desc')}</div>

      ${ctx.renderCheckbox(
        'show-locks-in-rooms',
        localize('editor.show_locks_in_rooms'),
        showLocksInRooms,
        (checked) => ctx.onToggleChange('show_locks_in_rooms', checked, false),
      )}
      <div class="description">${localize('editor.show_locks_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'show-automations-in-rooms',
        localize('editor.show_automations_in_rooms'),
        showAutomationsInRooms,
        (checked) => ctx.onToggleChange('show_automations_in_rooms', checked, false),
      )}
      <div class="description">${localize('editor.show_automations_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'show-scripts-in-rooms',
        localize('editor.show_scripts_in_rooms'),
        showScriptsInRooms,
        (checked) => ctx.onToggleChange('show_scripts_in_rooms', checked, false),
      )}
      <div class="description">${localize('editor.show_scripts_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'show-cameras-in-rooms',
        localize('editor.show_cameras_in_rooms'),
        showCamerasInRooms,
        (checked) => ctx.onToggleChange('show_cameras_in_rooms', checked, true),
      )}
      <div class="description">${localize('editor.show_cameras_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'show-window-contacts-in-rooms',
        localize('editor.show_window_contacts_in_rooms'),
        showWindowContactsInRooms,
        (checked) => ctx.onToggleChange('show_window_contacts_in_rooms', checked, true),
      )}
      <div class="description">${localize('editor.show_window_contacts_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'show-door-contacts-in-rooms',
        localize('editor.show_door_contacts_in_rooms'),
        showDoorContactsInRooms,
        (checked) => ctx.onToggleChange('show_door_contacts_in_rooms', checked, true),
      )}
      <div class="description">${localize('editor.show_door_contacts_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'hide-unavailable-in-rooms',
        localize('editor.hide_unavailable_in_rooms'),
        c.hide_unavailable_in_rooms !== false,
        (checked) => ctx.onToggleChange('hide_unavailable_in_rooms', checked, true),
      )}
      <div class="description">${localize('editor.hide_unavailable_in_rooms_desc')}</div>

      ${ctx.renderCheckbox(
        'use-default-area-sort',
        localize('editor.use_default_area_sort'),
        useDefaultAreaSort,
        (checked) => ctx.onToggleChange('use_default_area_sort', checked, false),
      )}
      <div class="description">${localize('editor.use_default_area_sort_desc')}</div>

      <div class="description" style="margin-left: 0; margin-top: 16px; margin-bottom: 12px;">
        ${localize('editor.areas_manage_desc')}
      </div>

      <div class="area-list" id="area-list">
        ${ctx.renderAreaItems(allAreas, hiddenAreas, areaOrder)}
      </div>

      <details style="margin-top: 12px;">
        <summary
          style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
        >
          ${localize('editor.room_visibility')}
        </summary>
        <div style="margin-left: 14px; margin-top: 6px;">
          <div class="description" style="margin-left: 0; margin-bottom: 8px;">
            ${localize('editor.room_visibility_desc')}
          </div>
          ${allAreas
            .filter((a) => !hiddenAreas.includes(a.area_id))
            .map((area) => {
              const rule = c.room_visibility?.[area.area_id];
              return html`
                <div
                  style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
                >
                  <div style="font-weight: 500; margin-bottom: 6px;">${area.name}</div>
                  <div class="form-row">
                    <label
                      for="room-vis-entity-${area.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${localize('editor.section_visibility_entity')}</label
                    >
                    <input
                      type="text"
                      id="room-vis-entity-${area.area_id}"
                      style="flex: 1;"
                      placeholder="input_boolean.guest_mode"
                      .value=${rule?.entity || ''}
                      @change=${(e: Event) =>
                        ctx.onRoomVisibilityChange(
                          area.area_id,
                          'entity',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                  <div class="form-row">
                    <label
                      for="room-vis-state-${area.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${localize('editor.section_visibility_state')}</label
                    >
                    <input
                      type="text"
                      id="room-vis-state-${area.area_id}"
                      style="flex: 1;"
                      placeholder="on"
                      .value=${rule?.state || ''}
                      @change=${(e: Event) =>
                        ctx.onRoomVisibilityChange(
                          area.area_id,
                          'state',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                </div>
              `;
            })}
        </div>
      </details>
    </div>
  `;
}
