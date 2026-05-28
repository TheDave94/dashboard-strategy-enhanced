// ====================================================================
// Editor tab — Summaries
// ====================================================================
// The biggest tab in the editor (~150 LOC of hand-rolled markup, 17
// fields). Migrates the bulk to ha-form; the security-extra-entities
// custom picker stays as a sibling (it's a searchable entity-list,
// not a single ha-selector — future beta can replace it with HA's
// `selector: { entity: { multiple: true } }`).
//
// Field list:
//   summaries_columns                 select(2|4)
//   show_light_summary                boolean default true
//   group_lights_by_floors            boolean
//   nested_light_groups               boolean
//   lights_sort_by                    select(last_changed|name)
//   show_covers_summary               boolean default true
//     show_partially_open_covers      boolean
//     group_covers_by_floors          boolean
//   show_security_summary             boolean default true
//   show_climate_summary              boolean
//   show_battery_summary              boolean default true
//     hide_mobile_app_batteries       boolean
//     show_area_in_battery_view       boolean
//     hide_battery_notes_entities     boolean
//     battery_critical_threshold      number 1..99
//     battery_low_threshold           number 1..99
//     unavailable_batteries_bucket    select(critical|good)
//
// All nested fields render unconditionally (matches legacy
// behaviour — the indentation in the old editor was purely visual).
// ====================================================================

import { html, type TemplateResult } from 'lit';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';
import type { TabRenderContext } from './ViewsTab';

type ColumnCount = 2 | 4;
type LightsSortBy = 'last_changed' | 'name';
type BatteriesBucket = 'critical' | 'good';

interface SummariesData {
  summaries_columns: ColumnCount;
  show_light_summary: boolean;
  group_lights_by_floors: boolean;
  nested_light_groups: boolean;
  lights_sort_by: LightsSortBy;
  show_covers_summary: boolean;
  show_partially_open_covers: boolean;
  group_covers_by_floors: boolean;
  show_security_summary: boolean;
  show_climate_summary: boolean;
  show_battery_summary: boolean;
  hide_mobile_app_batteries: boolean;
  show_area_in_battery_view: boolean;
  hide_battery_notes_entities: boolean;
  battery_critical_threshold: number;
  battery_low_threshold: number;
  unavailable_batteries_bucket: BatteriesBucket;
  show_camera_view: boolean;
  show_humidity_summary: boolean;
  humidity_low_threshold: number;
  humidity_high_threshold: number;
}

function readData(c: OrielConfig): SummariesData {
  const cols = c.summaries_columns;
  return {
    summaries_columns: cols === 4 ? 4 : 2,
    show_light_summary: c.show_light_summary !== false,
    group_lights_by_floors: c.group_lights_by_floors === true,
    nested_light_groups: c.nested_light_groups === true,
    lights_sort_by: c.lights_sort_by === 'name' ? 'name' : 'last_changed',
    show_covers_summary: c.show_covers_summary !== false,
    show_partially_open_covers: c.show_partially_open_covers === true,
    group_covers_by_floors: c.group_covers_by_floors === true,
    show_security_summary: c.show_security_summary !== false,
    show_climate_summary: c.show_climate_summary === true,
    show_battery_summary: c.show_battery_summary !== false,
    hide_mobile_app_batteries: c.hide_mobile_app_batteries === true,
    show_area_in_battery_view: c.show_area_in_battery_view === true,
    hide_battery_notes_entities: c.hide_battery_notes_entities === true,
    battery_critical_threshold: c.battery_critical_threshold ?? 20,
    battery_low_threshold: c.battery_low_threshold ?? 50,
    unavailable_batteries_bucket: c.unavailable_batteries_bucket === 'critical' ? 'critical' : 'good',
    show_camera_view: c.show_camera_view === true,
    show_humidity_summary: c.show_humidity_summary === true,
    humidity_low_threshold: c.humidity_low_threshold ?? 30,
    humidity_high_threshold: c.humidity_high_threshold ?? 60,
  };
}

const SCHEMA = [
  {
    name: 'summaries_columns',
    selector: {
      select: {
        mode: 'box',
        options: [
          { value: 2, label: localize('editor.columns_2') },
          { value: 4, label: localize('editor.columns_4') },
        ],
      },
    },
  },
  { name: 'show_light_summary', selector: { boolean: {} } },
  { name: 'group_lights_by_floors', selector: { boolean: {} } },
  { name: 'nested_light_groups', selector: { boolean: {} } },
  {
    name: 'lights_sort_by',
    selector: {
      select: {
        mode: 'list',
        options: [
          { value: 'last_changed', label: localize('editor.lights_sort_by_last_changed') },
          { value: 'name', label: localize('editor.lights_sort_by_name') },
        ],
      },
    },
  },
  { name: 'show_covers_summary', selector: { boolean: {} } },
  { name: 'show_partially_open_covers', selector: { boolean: {} } },
  { name: 'group_covers_by_floors', selector: { boolean: {} } },
  { name: 'show_security_summary', selector: { boolean: {} } },
  { name: 'show_climate_summary', selector: { boolean: {} } },
  { name: 'show_battery_summary', selector: { boolean: {} } },
  { name: 'hide_mobile_app_batteries', selector: { boolean: {} } },
  { name: 'show_area_in_battery_view', selector: { boolean: {} } },
  { name: 'hide_battery_notes_entities', selector: { boolean: {} } },
  {
    name: 'battery_critical_threshold',
    selector: { number: { min: 1, max: 99, step: 1, unit_of_measurement: '%', mode: 'box' } },
  },
  {
    name: 'battery_low_threshold',
    selector: { number: { min: 1, max: 99, step: 1, unit_of_measurement: '%', mode: 'box' } },
  },
  {
    name: 'unavailable_batteries_bucket',
    selector: {
      select: {
        mode: 'list',
        options: [
          { value: 'critical', label: localize('editor.unavailable_batteries_critical') },
          { value: 'good', label: localize('editor.unavailable_batteries_good') },
        ],
      },
    },
  },
  { name: 'show_camera_view', selector: { boolean: {} } },
  { name: 'show_humidity_summary', selector: { boolean: {} } },
  {
    name: 'humidity_low_threshold',
    selector: { number: { min: 1, max: 99, step: 1, unit_of_measurement: '%', mode: 'box' } },
  },
  {
    name: 'humidity_high_threshold',
    selector: { number: { min: 1, max: 99, step: 1, unit_of_measurement: '%', mode: 'box' } },
  },
] as const;

function buildPatch(v: Partial<SummariesData>): Partial<OrielConfig> {
  const p: Partial<OrielConfig> = {};

  // 2-column is the default — only persist 4.
  p.summaries_columns = v.summaries_columns === 4 ? 4 : undefined;

  // default-true booleans → only persist false.
  p.show_light_summary = v.show_light_summary === false ? false : undefined;
  p.show_covers_summary = v.show_covers_summary === false ? false : undefined;
  p.show_security_summary = v.show_security_summary === false ? false : undefined;
  p.show_battery_summary = v.show_battery_summary === false ? false : undefined;

  // default-false booleans → only persist true.
  p.group_lights_by_floors = v.group_lights_by_floors === true ? true : undefined;
  p.nested_light_groups = v.nested_light_groups === true ? true : undefined;
  p.show_partially_open_covers = v.show_partially_open_covers === true ? true : undefined;
  p.group_covers_by_floors = v.group_covers_by_floors === true ? true : undefined;
  p.show_climate_summary = v.show_climate_summary === true ? true : undefined;
  p.hide_mobile_app_batteries = v.hide_mobile_app_batteries === true ? true : undefined;
  p.show_area_in_battery_view = v.show_area_in_battery_view === true ? true : undefined;
  p.hide_battery_notes_entities = v.hide_battery_notes_entities === true ? true : undefined;

  // selects → only persist when not the default.
  p.lights_sort_by = v.lights_sort_by === 'name' ? 'name' : undefined;
  p.unavailable_batteries_bucket =
    v.unavailable_batteries_bucket === 'critical' ? 'critical' : undefined;

  // numbers → only persist when not the default.
  p.battery_critical_threshold =
    typeof v.battery_critical_threshold === 'number' && v.battery_critical_threshold !== 20
      ? v.battery_critical_threshold
      : undefined;
  p.battery_low_threshold =
    typeof v.battery_low_threshold === 'number' && v.battery_low_threshold !== 50
      ? v.battery_low_threshold
      : undefined;

  // camera overview — default-false boolean → persist true.
  p.show_camera_view = v.show_camera_view === true ? true : undefined;

  // humidity — default-false boolean → persist true; numbers → persist non-default.
  p.show_humidity_summary = v.show_humidity_summary === true ? true : undefined;
  p.humidity_low_threshold =
    typeof v.humidity_low_threshold === 'number' && v.humidity_low_threshold !== 30
      ? v.humidity_low_threshold
      : undefined;
  p.humidity_high_threshold =
    typeof v.humidity_high_threshold === 'number' && v.humidity_high_threshold !== 60
      ? v.humidity_high_threshold
      : undefined;

  return p;
}

export interface SummariesTabRenderContext extends TabRenderContext {
  /**
   * The legacy editor renders a custom searchable entity picker for
   * `security_extra_entities` inline. ha-form doesn't host it well
   * yet (it's a stateful multi-select with free-text search), so the
   * parent passes the markup in as a slot. Future beta can replace
   * with `selector: { entity: { multiple: true, filter: ... } }`.
   */
  securityExtraSlot: TemplateResult;
}

export function renderSummariesTab(ctx: SummariesTabRenderContext): TemplateResult {
  const { hass, config, onChange, securityExtraSlot } = ctx;
  const data = readData(config);

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_summaries')}</div>
      <ha-form
        .hass=${hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => localize(`editor.${s.name}`)}
        .computeHelper=${(s: { name: string }) => {
          const key = `editor.${s.name}_desc`;
          const text = localize(key);
          return text === key ? '' : text;
        }}
        @value-changed=${(ev: CustomEvent<{ value: Partial<SummariesData> }>) => {
          onChange(buildPatch(ev.detail.value));
        }}
      ></ha-form>
      ${securityExtraSlot}
    </div>
  `;
}
