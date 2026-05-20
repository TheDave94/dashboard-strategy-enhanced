// ====================================================================
// Editor tab — Weather Sensors
// ====================================================================
// Multi-row editor (per-sensor icon / unit / round) + entity-search-
// picker for adding rows.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { Simon42StrategyConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface WeatherSensorsTabContext {
  config: Simon42StrategyConfig;
  search: string;
  entityNameMap: Map<string, string>;
  filteredEntities: Array<{ entity_id: string; name: string }>;
  onSearchChange: (value: string) => void;
  onAddSensor: (entityId: string) => void;
  onRemoveSensor: (index: number) => void;
  onUpdateSensor: (index: number, field: 'icon' | 'unit' | 'round', value: string) => void;
}

export function renderWeatherSensorsTab(ctx: WeatherSensorsTabContext): TemplateResult {
  const sensors = ctx.config.weather_sensors || [];

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_weather_sensors')}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${localize('editor.weather_sensors_desc')}
      </div>

      <div id="weather-sensors-list" style="margin-bottom: 12px;">
        ${sensors.length === 0
          ? html`<div class="empty-state">${localize('editor.no_weather_sensors')}</div>`
          : sensors.map((sensor, index) => {
              const name = ctx.entityNameMap.get(sensor.entity) || sensor.entity;
              return html`
                <div class="custom-item" data-sensor-index=${index}>
                  <div class="custom-item-header">
                    <strong>
                      ${name}
                      <span class="item-entity-id" style="font-weight: normal; margin-left: 8px;">
                        ${sensor.entity}
                      </span>
                    </strong>
                    <button class="btn-remove" @click=${() => ctx.onRemoveSensor(index)}>
                      &#x2715;
                    </button>
                  </div>
                  <div class="custom-item-fields">
                    <div class="custom-item-row">
                      <input
                        type="text"
                        style="flex: 2;"
                        placeholder=${localize('editor.weather_sensors_icon')}
                        .value=${sensor.icon || ''}
                        @change=${(e: Event) =>
                          ctx.onUpdateSensor(index, 'icon', (e.target as HTMLInputElement).value)}
                      />
                      <input
                        type="text"
                        style="flex: 1;"
                        placeholder=${localize('editor.weather_sensors_unit')}
                        .value=${sensor.unit || ''}
                        @change=${(e: Event) =>
                          ctx.onUpdateSensor(index, 'unit', (e.target as HTMLInputElement).value)}
                      />
                      <input
                        type="number"
                        style="flex: 1;"
                        min="0"
                        max="6"
                        step="1"
                        placeholder=${localize('editor.weather_sensors_round')}
                        .value=${sensor.round !== undefined ? String(sensor.round) : ''}
                        @change=${(e: Event) =>
                          ctx.onUpdateSensor(index, 'round', (e.target as HTMLInputElement).value)}
                      />
                    </div>
                  </div>
                </div>
              `;
            })}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${localize('editor.weather_sensors_add')}
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
                            ctx.onAddSensor(entity.entity_id);
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
    </div>
  `;
}
