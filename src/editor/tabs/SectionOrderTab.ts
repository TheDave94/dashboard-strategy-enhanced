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
  EnergyPresentation,
} from '../../types/strategy';
import { localize } from '../../utils/localize';
import { detectAvailable, type KnownCard } from '../../utils/section-card-registry';

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
  onSetEnergyPresentation: (v: EnergyPresentation) => void;
  onSetPlantsPresentation: (v: string) => void;
  onSetVacuumsPresentation: (v: string) => void;
  onWeatherEntityChange: (ev: Event) => void;
  onPowerBadgeEntityChange: (ev: Event) => void;
  onToggleSectionVisibility: (key: SectionKey, visible: boolean) => void;
  onToggleHiddenHeading: (key: string, hide: boolean) => void;
  /** Set the shared staleness threshold (minutes). */
  onStaleAfterChange: (minutes: number) => void;
  onSectionVisibilityChange: (
    key: string,
    field: 'entity' | 'state' | 'role' | 'time_after' | 'time_before' | 'mode_entity' | 'mode_is',
    value: string,
  ) => void;
  // Drag-and-drop handlers — these mutate `_sectionDraggedElement`
  // state on the editor class, so they stay there and are bound in
  onDragStart: (ev: DragEvent) => void;
  onDragEnd: (ev: DragEvent) => void;
  onDragOver: (ev: DragEvent) => void;
  onDragLeave: (ev: DragEvent) => void;
  onDrop: (ev: DragEvent) => void;
  // Keyboard-equivalent reorder (a11y). Drag-drop stays; these are
  // added paths, not replacements. Idx is 0-based against `order`.
  // Implementations should be no-ops when idx is out of range
  // (move-up on 0, move-down on length-1).
  onMoveSectionUp: (idx: number) => void;
  onMoveSectionDown: (idx: number) => void;
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
  'show_staleness_alert_badge',
  'show_now_playing_badge',
  'show_sun_badge',
  'show_updates_badge',
] as const;

function renderSectionRow(
  ctx: SectionOrderTabContext,
  key: SectionKey,
  idx: number,
  total: number,
): TemplateResult | typeof nothing {
  const meta = ctx.sectionMeta.get(key);
  if (!meta) return nothing;

  const disabled = ctx.isSectionDisabled(key);
  const toggleable = ctx.isSectionToggleable(key);
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const sectionLabel = localize(meta.labelKey);
  const moveUpLabel = `${localize('editor.move_section_up') || 'Move up'}: ${sectionLabel}`;
  const moveDownLabel = `${localize('editor.move_section_down') || 'Move down'}: ${sectionLabel}`;

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
      <span class="section-label">${sectionLabel}</span>
      ${disabled && !toggleable
        ? html`<span class="section-hidden-tag">(${localize('editor.section_hidden')})</span>`
        : nothing}
      <button
        class="section-move-btn"
        type="button"
        aria-label=${moveUpLabel}
        title=${moveUpLabel}
        ?disabled=${isFirst}
        @click=${() => ctx.onMoveSectionUp(idx)}
        @mousedown=${(e: Event) => e.stopPropagation()}
        @dragstart=${(e: Event) => e.stopPropagation()}
      >↑</button>
      <button
        class="section-move-btn"
        type="button"
        aria-label=${moveDownLabel}
        title=${moveDownLabel}
        ?disabled=${isLast}
        @click=${() => ctx.onMoveSectionDown(idx)}
        @mousedown=${(e: Event) => e.stopPropagation()}
        @dragstart=${(e: Event) => e.stopPropagation()}
      >↓</button>
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
    ${renderPlantsSub(ctx, key)} ${renderVacuumsSub(ctx, key)}
  `;
}

/**
 * Reusable presentation-dropdown renderer for sections that swap a
 * default tile-grid for a single registry-known HACS card per entity.
 * Used by plants + vacuums.
 *
 * `defaultLabel` is what shows for the "no swap, default layout" choice.
 */
function renderEntityPerCardSub(
  ctx: SectionOrderTabContext,
  section: 'plants' | 'vacuums',
  presentationFieldId: string,
  configKey: 'plants_presentation' | 'vacuums_presentation',
  onChange: (value: string) => void,
  defaultLabel: string,
): TemplateResult {
  const detected: KnownCard[] = detectAvailable(section);
  if (detected.length === 0) return html``;
  const current = (ctx.config[configKey] as string | undefined) ?? '';
  return html`
    <div class="section-order-sub" style="flex-wrap: wrap;">
      <label for=${presentationFieldId}>
        ${localize(`editor.${configKey}`) || (section.charAt(0).toUpperCase() + section.slice(1) + ' card')}
      </label>
      <select
        id=${presentationFieldId}
        .value=${current}
        @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${current === ''}>${defaultLabel}</option>
        <optgroup label=${localize('editor.section_presentation_hacs_group') || 'Installed HACS cards'}>
          ${detected.map(
            (c) => html`
              <option value=${c.id} ?selected=${current === c.id}>${c.label}</option>
            `,
          )}
        </optgroup>
      </select>
    </div>
  `;
}

function renderPlantsSub(
  ctx: SectionOrderTabContext,
  key: SectionKey,
): TemplateResult | typeof nothing {
  if (key !== 'plants') return nothing;
  if (ctx.config.show_plants_section !== true) return nothing;
  return renderEntityPerCardSub(
    ctx,
    'plants',
    'plants-presentation',
    'plants_presentation',
    ctx.onSetPlantsPresentation,
    localize('editor.plants_presentation_default') || 'Default (tile per plant)',
  );
}

function renderVacuumsSub(
  ctx: SectionOrderTabContext,
  key: SectionKey,
): TemplateResult | typeof nothing {
  if (key !== 'vacuums') return nothing;
  if (ctx.config.show_vacuums_section !== true) return nothing;
  return renderEntityPerCardSub(
    ctx,
    'vacuums',
    'vacuums-presentation',
    'vacuums_presentation',
    ctx.onSetVacuumsPresentation,
    localize('editor.vacuums_presentation_default') || 'Default (tile per vacuum)',
  );
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

  // Auto-detect installed HACS weather cards via the registry.
  // Each detected card becomes an additional dropdown option; the
  // strategy emits the right `custom:...-card` when picked.
  const detectedWeatherCards: KnownCard[] = detectAvailable('weather');
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
        <optgroup label=${localize('editor.weather_presentation_builtin_group') || 'Built-in'}>
          ${(['forecast_daily', 'forecast_hourly', 'forecast_twice_daily', 'tile', 'none'] as const).map(
            (v) => html`
              <option value=${v} ?selected=${weatherPresentation === v}>
                ${localize(`editor.weather_presentation_${v}`)}
              </option>
            `,
          )}
        </optgroup>
        ${detectedWeatherCards.length > 0
          ? html`
              <optgroup label=${localize('editor.weather_presentation_hacs_group') || 'Installed HACS cards'}>
                ${detectedWeatherCards.map(
                  (c) => html`
                    <option value=${c.id} ?selected=${weatherPresentation === c.id}>
                      ${c.label}
                    </option>
                  `,
                )}
              </optgroup>
            `
          : nothing}
      </select>
      ${weatherPresentation === 'none'
        ? html`<small class="section-order-hint">${
            localize('editor.weather_presentation_none_hint') ||
            'Heading + slot kept; add your own card via custom_cards with target_section: weather'
          }</small>`
        : nothing}
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

  // Resolved energy presentation — explicit value wins, otherwise infer
  // from the legacy boolean. Default 'distribution'.
  const energyPresentation: EnergyPresentation =
    ctx.config.energy_presentation ??
    (showEnergyDistributionCard ? 'distribution' : 'none');

  const detectedEnergyCards: KnownCard[] = detectAvailable('energy');

  return html`
    <div class="section-order-sub" style="flex-wrap: wrap;">
      <label for="energy-presentation">${localize('editor.energy_presentation') || 'Energy card'}</label>
      <select
        id="energy-presentation"
        .value=${energyPresentation}
        @change=${(e: Event) =>
          ctx.onSetEnergyPresentation(
            (e.target as HTMLSelectElement).value as EnergyPresentation,
          )}
      >
        <optgroup label=${localize('editor.energy_presentation_builtin_group') || 'Built-in'}>
          <option value="distribution" ?selected=${energyPresentation === 'distribution'}>
            ${localize('editor.energy_presentation_distribution') || 'Energy distribution (default)'}
          </option>
          <option value="none" ?selected=${energyPresentation === 'none'}>
            ${localize('editor.energy_presentation_none') || 'None (custom_cards only)'}
          </option>
        </optgroup>
        ${detectedEnergyCards.length > 0
          ? html`
              <optgroup label=${localize('editor.energy_presentation_hacs_group') || 'Installed HACS cards'}>
                ${detectedEnergyCards.map(
                  (c) => html`
                    <option value=${c.id} ?selected=${energyPresentation === c.id}>
                      ${c.label}
                    </option>
                  `,
                )}
              </optgroup>
            `
          : nothing}
      </select>
      ${energyPresentation === 'none'
        ? html`<small class="section-order-hint">${
            localize('editor.energy_presentation_none_hint') ||
            'Heading + slot kept; add your own card via custom_cards with target_section: energy'
          }</small>`
        : nothing}
    </div>
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

/**
 * Shared staleness threshold (minutes). Only shown once staleness is
 * enabled somewhere — the overview badge toggle (right above) or
 * `mark_stale_in_rooms` (Areas tab) — so it isn't dead clutter for the
 * common case where the feature is off.
 */
function renderStalenessThreshold(ctx: SectionOrderTabContext): TemplateResult | typeof nothing {
  const enabled =
    ctx.config.show_staleness_alert_badge === true || ctx.config.mark_stale_in_rooms === true;
  if (!enabled) return nothing;
  const minutes =
    typeof ctx.config.stale_after === 'number' && ctx.config.stale_after > 0
      ? ctx.config.stale_after
      : 60;
  return html`
    <div style="margin-top: 12px;">
      <div class="form-row">
        <label for="stale-after" style="min-width: 80px;">${localize('editor.stale_after')}</label>
        <input
          type="number"
          id="stale-after"
          min="5"
          max="1440"
          step="5"
          .value=${String(minutes)}
          @change=${(e: Event) =>
            ctx.onStaleAfterChange(Number((e.target as HTMLInputElement).value))}
        />
      </div>
      <div class="description">${localize('editor.stale_after_desc')}</div>
    </div>
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
        <div
          style="background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent); border: 1px solid var(--warning-color, #ff9800); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; font-size: 0.85rem; line-height: 1.4;"
        >
          <strong>${localize('editor.visibility_not_acl') || 'UI default, not access control.'}</strong>
          ${localize('editor.visibility_not_acl_body') ||
            ' These rules only hide sections from the rendered dashboard. Users can still reach hidden content via URL, raw YAML, or service calls. Use HA\'s user permissions for actual restrictions.'}
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
              <details style="margin-top: 6px;">
                <summary style="cursor: pointer; font-size: 11px; color: var(--secondary-text-color);">
                  ${localize('editor.section_visibility_advanced') || 'More rules (role / time / mode) — all must match (AND)'}
                </summary>
                <div style="margin-left: 8px; margin-top: 6px;">
                  <div class="form-row">
                    <label for="visibility-role-${key}" style="min-width: 80px; font-size: 12px;">
                      ${localize('editor.section_visibility_role') || 'Role(s)'}
                    </label>
                    <input
                      type="text"
                      id="visibility-role-${key}"
                      style="flex: 1;"
                      placeholder="admin, resident"
                      .value=${(rule as { role?: string | string[] })?.role
                        ? Array.isArray((rule as { role?: string | string[] }).role)
                          ? ((rule as { role?: string[] }).role as string[]).join(', ')
                          : ((rule as { role?: string }).role as string)
                        : ''}
                      @change=${(e: Event) =>
                        ctx.onSectionVisibilityChange(
                          key,
                          'role',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                  <div class="form-row">
                    <label for="visibility-time-after-${key}" style="min-width: 80px; font-size: 12px;">
                      ${localize('editor.section_visibility_time_after') || 'After (HH:MM)'}
                    </label>
                    <input
                      type="time"
                      id="visibility-time-after-${key}"
                      style="flex: 1;"
                      .value=${(rule as { time_after?: string })?.time_after || ''}
                      @change=${(e: Event) =>
                        ctx.onSectionVisibilityChange(
                          key,
                          'time_after',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                  <div class="form-row">
                    <label for="visibility-time-before-${key}" style="min-width: 80px; font-size: 12px;">
                      ${localize('editor.section_visibility_time_before') || 'Before (HH:MM)'}
                    </label>
                    <input
                      type="time"
                      id="visibility-time-before-${key}"
                      style="flex: 1;"
                      .value=${(rule as { time_before?: string })?.time_before || ''}
                      @change=${(e: Event) =>
                        ctx.onSectionVisibilityChange(
                          key,
                          'time_before',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                  <div class="form-row">
                    <label for="visibility-mode-entity-${key}" style="min-width: 80px; font-size: 12px;">
                      ${localize('editor.section_visibility_mode_entity') || 'Mode entity'}
                    </label>
                    <input
                      type="text"
                      id="visibility-mode-entity-${key}"
                      style="flex: 1;"
                      placeholder="input_select.house_mode"
                      .value=${(rule as { mode_entity?: string })?.mode_entity || ''}
                      @change=${(e: Event) =>
                        ctx.onSectionVisibilityChange(
                          key,
                          'mode_entity',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                  <div class="form-row">
                    <label for="visibility-mode-is-${key}" style="min-width: 80px; font-size: 12px;">
                      ${localize('editor.section_visibility_mode_is') || 'Mode is'}
                    </label>
                    <input
                      type="text"
                      id="visibility-mode-is-${key}"
                      style="flex: 1;"
                      placeholder="at_home"
                      .value=${(rule as { mode_is?: string })?.mode_is || ''}
                      @change=${(e: Event) =>
                        ctx.onSectionVisibilityChange(
                          key,
                          'mode_is',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </div>
                </div>
              </details>
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
        ${ctx.order.map((key, idx) => renderSectionRow(ctx, key, idx, ctx.order.length))}
      </div>
      ${renderHiddenHeadings(ctx)} ${renderBadgeToggles(ctx)}
      ${renderStalenessThreshold(ctx)} ${renderVisibilityRules(ctx)}
    </div>
  `;
}
