// ====================================================================
// Editor tab — Overview
// ====================================================================
// Second migration in the ha-form refactor arc. Same `TabRenderContext`
// shape as ViewsTab; schema is richer (boolean + select + entity +
// conditional). The conditional field (`search_card_variant`) is added
// to the schema dynamically based on the current `show_search_card`
// value — matches how the legacy editor only rendered the variant
// picker when search was enabled.
//
// Notes:
//   - The legacy "search card dependencies missing" warning is kept
//     in the parent editor wrapper since it's purely informational
//     (no input field). Future betas can route it through ha-form
//     via a `constant` selector if useful.
//   - `show_clock_card` and `show_person_badges` default to `true`;
//     when patched back to `true` we strip the key so the saved
//     config stays sparse (matches _toggleChanged(key, value, true)).
// ====================================================================

import { html, type TemplateResult } from 'lit';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';
import type { TabRenderContext } from './ViewsTab';

type OverviewData = {
  show_clock_card: boolean;
  person_badge_layout: 'minimal' | 'with_state' | 'with_state_and_time';
  alarm_entity: string;
  show_search_card: boolean;
  search_card_variant: 'custom' | 'tip';
  show_person_badges: boolean;
};

/** Selector defaults applied when reading from a sparse config. */
function readData(config: OrielConfig): OverviewData {
  return {
    show_clock_card: config.show_clock_card !== false,
    person_badge_layout: (config.person_badge_layout ?? 'with_state') as OverviewData['person_badge_layout'],
    alarm_entity: config.alarm_entity ?? '',
    show_search_card: config.show_search_card === true,
    search_card_variant: (config.search_card_variant === 'tip' ? 'tip' : 'custom') as OverviewData['search_card_variant'],
    show_person_badges: config.show_person_badges !== false,
  };
}

function computeSchema(data: OverviewData) {
  const personBadgeOptions = (['minimal', 'with_state', 'with_state_and_time'] as const).map(
    (value) => ({ value, label: localize(`editor.person_badge_layout_${value}`) }),
  );
  const searchVariantOptions = (['custom', 'tip'] as const).map((value) => ({
    value,
    label: localize(`editor.search_card_variant_${value}`),
  }));

  const schema: Array<Record<string, unknown>> = [
    { name: 'show_clock_card', selector: { boolean: {} } },
    {
      name: 'person_badge_layout',
      selector: { select: { mode: 'list', options: personBadgeOptions } },
    },
    {
      name: 'alarm_entity',
      selector: { entity: { filter: { domain: 'alarm_control_panel' } } },
    },
    { name: 'show_search_card', selector: { boolean: {} } },
  ];
  if (data.show_search_card) {
    schema.push({
      name: 'search_card_variant',
      selector: { select: { mode: 'list', options: searchVariantOptions } },
    });
  }
  schema.push({ name: 'show_person_badges', selector: { boolean: {} } });
  return schema;
}

/**
 * Compute a sparse patch from the ha-form value. Defaults match the
 * legacy _toggleChanged() behaviour (deletes the key when value
 * matches the default).
 */
function buildPatch(value: Partial<OverviewData>): Partial<OrielConfig> {
  const patch: Partial<OrielConfig> = {};

  // show_clock_card default = true; only persist when false.
  patch.show_clock_card = value.show_clock_card === false ? false : undefined;

  // person_badge_layout default = 'with_state'.
  patch.person_badge_layout =
    value.person_badge_layout && value.person_badge_layout !== 'with_state'
      ? value.person_badge_layout
      : undefined;

  // alarm_entity: '' means unset.
  patch.alarm_entity = value.alarm_entity ? value.alarm_entity : undefined;

  // show_search_card default = false; only persist when true.
  patch.show_search_card = value.show_search_card === true ? true : undefined;

  // search_card_variant default = 'custom'; only persist 'tip'.
  patch.search_card_variant = value.search_card_variant === 'tip' ? 'tip' : undefined;

  // show_person_badges default = true; only persist when false.
  patch.show_person_badges = value.show_person_badges === false ? false : undefined;

  return patch;
}

export function renderOverviewTab(ctx: TabRenderContext): TemplateResult {
  const { hass, config, onChange } = ctx;
  const data = readData(config);
  const schema = computeSchema(data);

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_overview')}</div>
      <ha-form
        .hass=${hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${(s: { name: string }) => localize(`editor.${s.name}`)}
        .computeHelper=${(s: { name: string }) => {
          // Several fields have descriptions, but a few share the
          // same key suffix. Keep one mapping for clarity.
          const key = `editor.${s.name}_desc`;
          const text = localize(key);
          return text === key ? '' : text;
        }}
        @value-changed=${(ev: CustomEvent<{ value: Partial<OverviewData> }>) => {
          onChange(buildPatch(ev.detail.value));
        }}
      ></ha-form>
    </div>
  `;
}
