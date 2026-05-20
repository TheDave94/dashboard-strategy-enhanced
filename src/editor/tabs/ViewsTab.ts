// ====================================================================
// Editor tab — Views
// ====================================================================
// First section migrated out of the StrategyEditor.ts monolith and
// onto HA's `<ha-form>` + schema rendering.
//
// Why ha-form: HA themes the form components consistently with the
// rest of the UI, ha-form handles i18n labels + helpers, focus
// management, ARIA, and keyboard nav. Hand-rolled <input>/<select>
// blocks bypassed every one of those. The audit at
// /tmp/simon42_audit_2026.md §2.1 identified this migration as the
// single biggest tech-debt anchor in the repo (~4300 LOC monolith).
//
// Pattern (so future tabs follow the same shape):
//   - Export a single render function `renderXxxTab(ctx) => TemplateResult`.
//   - Take a `TabRenderContext` with `hass`, `config`, and `onChange`.
//   - Define a static `SCHEMA` array driving ha-form.
//   - Route labels and helpers through `localize()`.
//   - Patch back via `onChange(partial)` — the parent editor owns
//     persistence (config-changed event dispatch). The tab module is
//     pure-functional.
// ====================================================================

import { html, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { Simon42StrategyConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface TabRenderContext {
  hass: HomeAssistant;
  config: Simon42StrategyConfig;
  /**
   * Apply a partial patch to the config. The parent editor merges,
   * strips default-equal keys (matching the old _toggleChanged
   * behavior), and fires `config-changed`.
   */
  onChange: (patch: Partial<Simon42StrategyConfig>) => void;
}

/**
 * ha-form schema for the Views tab. Two booleans, both default false
 * (the strategy treats `undefined` and `false` identically here).
 */
const VIEWS_SCHEMA = [
  { name: 'show_summary_views', selector: { boolean: {} } },
  { name: 'show_room_views', selector: { boolean: {} } },
] as const;

export function renderViewsTab(ctx: TabRenderContext): TemplateResult {
  const { hass, config, onChange } = ctx;

  // ha-form reads from `.data` so we hand it a fresh object that
  // mirrors the relevant schema keys. Treat undefined as false to
  // match the strategy's existing config semantics.
  const data: Record<string, boolean> = {
    show_summary_views: config.show_summary_views === true,
    show_room_views: config.show_room_views === true,
  };

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_views')}</div>
      <ha-form
        .hass=${hass}
        .data=${data}
        .schema=${VIEWS_SCHEMA}
        .computeLabel=${(s: { name: string }) => localize(`editor.${s.name}`)}
        .computeHelper=${(s: { name: string }) => localize(`editor.${s.name}_desc`)}
        @value-changed=${(ev: CustomEvent<{ value: Record<string, boolean> }>) => {
          // Strip false (the schema default) so the saved config stays
          // sparse — matches _toggleChanged(key, value, false) behavior
          // in the legacy editor.
          const patch: Partial<Simon42StrategyConfig> = {};
          for (const key of Object.keys(ev.detail.value) as Array<
            'show_summary_views' | 'show_room_views'
          >) {
            const v = ev.detail.value[key];
            patch[key] = v === true ? true : undefined;
          }
          onChange(patch);
        }}
      ></ha-form>
    </div>
  `;
}
