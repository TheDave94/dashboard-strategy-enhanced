// ====================================================================
// Editor tab — Section order, headings, badges, visibility
// ====================================================================
// Largest single render in the editor (~200 LOC). Doesn't fit
// ha-form: it's a drag-drop reorder list with conditional inline
// sub-editors per section, plus details/summary panels for heading
// hiding, badge toggles, and per-section visibility rules.
//
// Extraction strategy ("option A" from the v1.5 plan): pure render
// template here, all stateful methods (drag state, config mutators,
// section-meta) remain in StrategyEditor and are passed in via the
// context. Net effect: the section's template + helpers are now in
// one place, the editor file shrinks, and unit tests can later
// snapshot the template against a known context.
//
// Future betas may decompose the badge toggles into ha-form (those
// are clean booleans) and the visibility rules into per-row
// ha-forms.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type {
  OrielConfig,
  SectionKey,
  WeatherPresentation,
} from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface SectionMeta {
  icon: string;
  labelKey: string;
}

export interface EntityOption {
  entity_id: string;
  name: string;
}

export interface SectionOrderTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  order: SectionKey[];
  sectionMeta: Map<SectionKey, SectionMeta>;
  weatherEntities: EntityOption[];
  powerSensorEntities: EntityOption[];
  isSectionDisabled: (key: SectionKey) => boolean;
  isSectionToggleable: (key: SectionKey) => boolean;
  // Mutators — wired to the editor's existing methods
  onToggleChange: (key: string, value: boolean, defaultValue: boolean) => void;
  onSetWeatherPresentation: (v: WeatherPresentation) => void;
  onWeatherEntityChange: (ev: Event) => void;
  onPowerBadgeEntityChange: (ev: Event) => void;
  onToggleSectionVisibility: (key: SectionKey, visible: boolean) => void;
  onToggleHiddenHeading: (key: string, hide: boolean) => void;
  onSectionVisibilityChange: (
    key: string,
    field: 'entity' | 'state',
    value: string,
  ) => void;
  // Drag-and-drop handlers — these mutate `_sectionDraggedElement`
  // state on the editor class, so they stay there and are bound in
  onDragStart: (ev: DragEvent) => void;
  onDragEnd: (ev: DragEvent) => void;
  onDragOver: (ev: DragEvent) => void;
  onDragLeave: (ev: DragEvent) => void;
  onDrop: (ev: DragEvent) => void;
}

const HIDDEN_HEADING_KEYS = [
  'overview',
  'summaries',
  'favorites',
  'custom_cards',
  'areas',
  'areas_other',
  'weather',
  'energy',
] as const;

const BADGE_TOGGLE_KEYS = [
  'show_unavailable_alert_badge',
  'show_now_playing_badge',
  'show_sun_badge',
  'show_updates_badge',
] as const;

function renderSectionRow(
  ctx: SectionOrderTabContext,
  key: SectionKey,
): TemplateResult | typeof nothing {
  const meta = ctx.sectionMeta.get(key);
  if (!meta) return nothing;

  const disabled = ctx.isSectionDisabled(key);
  const toggleable = ctx.isSectionToggleable(key);

  return html`
    <div
      class="section-order-item ${disabled ? 'disabled' : ''}"
      data-section-key=${key}
      draggable="true"
      @dragstart=${ctx.onDragStart}
      @dragend=${ctx.onDragEnd}
      @dragover=${ctx.onDragOver}
      @dragleave=${ctx.onDragLeave}
      @drop=${ctx.onDrop}
    >
      <span class="drag-handle" draggable="true">&#x2630;</span>
      <ha-icon class="section-icon" icon=${meta.icon}></ha-icon>
      <span class="section-label">${localize(meta.labelKey)}</span>
      ${disabled && !toggleable
        ? html`<span class="section-hidden-tag">(${localize('editor.section_hidden')})</span>`
        : nothing}
      ${toggleable
        ? html`
            <label
              class="section-toggle"
              @mousedown=${(e: Event) => {
                e.stopPropagation();
              }}
            >
              <input
                type="checkbox"
                ?checked=${!disabled}
                @change=${(e: Event) => {
                  ctx.onToggleSectionVisibility(key, (e.target as HTMLInputElement).checked);
                }}
                @dragstart=${(e: Event) => {
                  e.stopPropagation();
                }}
              />
            </label>
          `
        : nothing}
    </div>
    ${renderWeatherSub(ctx, key)} ${renderEnergySub(ctx, key)}
  `;
}

function renderWeatherSub(
  ctx: SectionOrderTabContext,
  key: SectionKey,
): TemplateResult | typeof nothing {
  if (key !== 'weather') return nothing;
  const showWeather = ctx.config.show_weather !== false;
  if (!showWeather) return nothing;

  const weatherPresentation: WeatherPresentation =
    ctx.config.weather_presentation ??
    (ctx.config.show_weather_forecast_card === false ? 'none' : 'forecast_daily');
  const weatherEntity = ctx.config.weather_entity || '';

  const presentationDropdown = html`
    <div class="section-order-sub" style="flex-wrap: wrap;">
      <label for="weather-presentation">${localize('editor.weather_presentation')}</label>
      <select
        id="weather-presentation"
        .value=${weatherPresentation}
        @change=${(e: Event) =>
          ctx.onSetWeatherPresentation(
            (e.target as HTMLSelectElement).value as WeatherPresentation,
          )}
      >
        ${(['forecast_daily', 'forecast_hourly', 'forecast_twice_daily', 'tile', 'none'] as const).map(
          (v) => html`
            <option value=${v} ?selected=${weatherPresentation === v}>
              ${localize(`editor.weather_presentation_${v}`)}
            </option>
          `,
        )}
      </select>
    </div>
  `;

  const entityDropdown =
    ctx.weatherEntities.length > 1
      ? html`
          <div class="section-order-sub" style="flex-wrap: wrap;">
            <label for="weather-entity">${localize('editor.weather_entity')}</label>
            <select
              id="weather-entity"
              .value=${weatherEntity}
              @change=${ctx.onWeatherEntityChange}
            >
              <option value="" ?selected=${!weatherEntity}>
                ${localize('editor.weather_entity_auto')}
              </option>
              ${ctx.weatherEntities.map(
                (entity) => html`
                  <option
                    value=${entity.entity_id}
                    ?selected=${entity.entity_id === weatherEntity}
                  >
                    ${entity.name}
                  </option>
                `,
              )}
            </select>
          </div>
        `
      : nothing;

  return html`${presentationDropdown}${entityDropdown}`;
}

function renderEnergySub(
  ctx: SectionOrderTabContext,
  key: SectionKey,
): TemplateResult | typeof nothing {
  if (key !== 'energy') return nothing;
  const showEnergy = ctx.config.show_energy !== false;
  if (!showEnergy) return nothing;

  const energyLinkDashboard = ctx.config.energy_link_dashboard !== false;
  const showEnergyDistributionCard = ctx.config.show_energy_distribution_card !== false;
  const powerBadgeEntity = ctx.config.power_badge_entity || '';

  return html`
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="energy-link-dashboard"
        ?checked=${energyLinkDashboard}
        @change=${(e: Event) =>
          ctx.onToggleChange(
            'energy_link_dashboard',
            (e.target as HTMLInputElement).checked,
            true,
          )}
      />
      <label for="energy-link-dashboard">${localize('editor.energy_link_dashboard')}</label>
    </div>
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="show-energy-distribution-card"
        ?checked=${showEnergyDistributionCard}
        @change=${(e: Event) =>
          ctx.onToggleChange(
            'show_energy_distribution_card',
            (e.target as HTMLInputElement).checked,
            true,
          )}
      />
      <label for="show-energy-distribution-card">
        ${localize('editor.show_energy_distribution_card')}
      </label>
    </div>
    ${ctx.powerSensorEntities.length > 0
      ? html`
          <div class="section-order-sub" style="display: block;">
            <label for="power-badge-entity" style="display: block; margin-bottom: 4px;">
              ${localize('editor.power_badge_entity')}
            </label>
            <select
              id="power-badge-entity"
              style="width: 100%;"
              @change=${ctx.onPowerBadgeEntityChange}
            >
              <option value="" ?selected=${!powerBadgeEntity}>
                ${localize('editor.power_badge_none')}
              </option>
              ${ctx.powerSensorEntities.map(
                (entity) => html`
                  <option
                    value=${entity.entity_id}
                    ?selected=${entity.entity_id === powerBadgeEntity}
                  >
                    ${entity.name}
                  </option>
                `,
              )}
            </select>
            <div class="description">${localize('editor.power_badge_entity_desc')}</div>
          </div>
        `
      : nothing}
  `;
}

function renderHiddenHeadings(ctx: SectionOrderTabContext): TemplateResult {
  const hiddenHeadings = new Set(ctx.config.hidden_section_headings || []);
  return html`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${localize('editor.hide_section_headings')}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${localize('editor.hide_section_headings_desc')}
        </div>
        ${HIDDEN_HEADING_KEYS.map(
          (hk) => html`
            <div class="form-row">
              <input
                type="checkbox"
                id="hide-heading-${hk}"
                ?checked=${hiddenHeadings.has(hk)}
                @change=${(e: Event) =>
                  ctx.onToggleHiddenHeading(hk, (e.target as HTMLInputElement).checked)}
              />
              <label for="hide-heading-${hk}">${localize(`editor.heading_label_${hk}`)}</label>
            </div>
          `,
        )}
      </div>
    </details>
  `;
}

function renderBadgeToggles(ctx: SectionOrderTabContext): TemplateResult {
  return html`
    ${BADGE_TOGGLE_KEYS.map(
      (key) => html`
        <div style="margin-top: 12px;">
          <div class="form-row">
            <input
              type="checkbox"
              id=${key}
              ?checked=${ctx.config[key] === true}
              @change=${(e: Event) =>
                ctx.onToggleChange(key, (e.target as HTMLInputElement).checked, false)}
            />
            <label for=${key}>${localize(`editor.${key}`)}</label>
          </div>
          <div class="description">${localize(`editor.${key}_desc`)}</div>
        </div>
      `,
    )}
  `;
}

function renderVisibilityRules(ctx: SectionOrderTabContext): TemplateResult {
  return html`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${localize('editor.section_visibility')}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${localize('editor.section_visibility_desc')}
        </div>
        ${ctx.order.map((key) => {
          const meta = ctx.sectionMeta.get(key);
          if (!meta) return nothing;
          const rule = ctx.config.section_visibility?.[key];
          return html`
            <div
              style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
            >
              <div style="font-weight: 500; margin-bottom: 6px;">${localize(meta.labelKey)}</div>
              <div class="form-row">
                <label for="visibility-entity-${key}" style="min-width: 80px; font-size: 12px;">
                  ${localize('editor.section_visibility_entity')}
                </label>
                <input
                  type="text"
                  id="visibility-entity-${key}"
                  style="flex: 1;"
                  placeholder="calendar.workday_sensor"
                  .value=${rule?.entity || ''}
                  @change=${(e: Event) =>
                    ctx.onSectionVisibilityChange(
                      key,
                      'entity',
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </div>
              <div class="form-row">
                <label for="visibility-state-${key}" style="min-width: 80px; font-size: 12px;">
                  ${localize('editor.section_visibility_state')}
                </label>
                <input
                  type="text"
                  id="visibility-state-${key}"
                  style="flex: 1;"
                  placeholder="on"
                  .value=${rule?.state || ''}
                  @change=${(e: Event) =>
                    ctx.onSectionVisibilityChange(
                      key,
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
  `;
}

export function renderSectionOrderTab(ctx: SectionOrderTabContext): TemplateResult {
  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_order')}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${localize('editor.section_order_desc')}
      </div>
      <div class="section-order-list" id="section-order-list">
        ${ctx.order.map((key) => renderSectionRow(ctx, key))}
      </div>
      ${renderHiddenHeadings(ctx)} ${renderBadgeToggles(ctx)} ${renderVisibilityRules(ctx)}
    </div>
  `;
}
