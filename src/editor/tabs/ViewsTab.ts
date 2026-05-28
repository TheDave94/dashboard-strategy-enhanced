// ====================================================================
// Editor tab — Views
// ====================================================================
// First section migrated out of the StrategyEditor.ts monolith and
// onto HA's `<ha-form>` + schema rendering.
//
// Why ha-form: HA themes the form components consistently with the
// rest of the UI, ha-form handles i18n labels + helpers, focus
// management, ARIA, and keyboard nav. Hand-rolled <input>/<select>
// blocks bypassed every one of those. Migrating to ha-form was the
// single biggest tech-debt cleanup the editor needed.
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
import type { OrielConfig, OrielBackgroundConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

const BG_SIZE = ['auto', 'cover', 'contain'] as const;
const BG_ALIGN = [
  'top left', 'top center', 'top right',
  'center left', 'center', 'center right',
  'bottom left', 'bottom center', 'bottom right',
] as const;
const BG_REPEAT = ['repeat', 'no-repeat'] as const;
const BG_ATTACH = ['scroll', 'fixed'] as const;
const sel = (vals: readonly string[]) => vals.map((v) => ({ value: v, label: v }));

// Background editor — mirrors HA's native view-background controls (media
// image picker + opacity/size/alignment/repeat/attachment), plus a
// color/gradient text field the native object form lacks (simon42#188).
// Image sub-options are only shown once an image is chosen.
function renderBackgroundForm(ctx: TabRenderContext): TemplateResult {
  const { hass, config, onChange } = ctx;
  const bg: OrielBackgroundConfig = config.background || {};
  const hasImage = !!bg.image;
  const data: Record<string, unknown> = {
    bg_image: bg.image,
    bg_color: bg.color,
    bg_opacity: bg.opacity ?? 100,
    bg_size: bg.size ?? 'cover',
    bg_alignment: bg.alignment ?? 'center',
    bg_repeat: bg.repeat ?? 'no-repeat',
    bg_attachment: bg.attachment ?? 'scroll',
  };
  const schema: Array<Record<string, unknown>> = [
    { name: 'bg_image', selector: { media: { image_upload: true, accept: ['image/*'], hide_content_type: true } } },
    ...(hasImage
      ? [
          { name: 'bg_opacity', selector: { number: { min: 0, max: 100, step: 10, mode: 'slider' } } },
          { name: 'bg_size', selector: { select: { mode: 'dropdown', options: sel(BG_SIZE) } } },
          { name: 'bg_alignment', selector: { select: { mode: 'dropdown', options: sel(BG_ALIGN) } } },
          { name: 'bg_repeat', selector: { select: { mode: 'dropdown', options: sel(BG_REPEAT) } } },
          { name: 'bg_attachment', selector: { select: { mode: 'dropdown', options: sel(BG_ATTACH) } } },
        ]
      : []),
    { name: 'bg_color', selector: { text: {} } },
  ];
  return html`
    <div class="section-title" style="margin-top: 16px;">${localize('editor.section_background')}</div>
    <div class="description">${localize('editor.background_desc')}</div>
    <ha-form
      .hass=${hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => localize(`editor.${s.name}`)}
      .computeHelper=${() => ''}
      @value-changed=${(ev: CustomEvent<{ value: Record<string, unknown> }>) => {
        const v = ev.detail.value;
        const next: OrielBackgroundConfig = {};
        if (v.bg_image) next.image = v.bg_image as string | Record<string, unknown>;
        if (v.bg_color) next.color = String(v.bg_color);
        // Image sub-options only matter (and only persist non-defaults) when
        // an image is set — keeps the saved config sparse.
        if (next.image) {
          if (typeof v.bg_opacity === 'number' && v.bg_opacity !== 100) next.opacity = v.bg_opacity;
          if (v.bg_size && v.bg_size !== 'cover') next.size = v.bg_size as OrielBackgroundConfig['size'];
          if (v.bg_alignment && v.bg_alignment !== 'center') next.alignment = v.bg_alignment as OrielBackgroundConfig['alignment'];
          if (v.bg_repeat && v.bg_repeat !== 'no-repeat') next.repeat = v.bg_repeat as OrielBackgroundConfig['repeat'];
          if (v.bg_attachment && v.bg_attachment !== 'scroll') next.attachment = v.bg_attachment as OrielBackgroundConfig['attachment'];
        }
        onChange({ background: Object.keys(next).length > 0 ? next : undefined });
      }}
    ></ha-form>
  `;
}

export interface TabRenderContext {
  hass: HomeAssistant;
  config: OrielConfig;
  /**
   * Apply a partial patch to the config. The parent editor merges,
   * strips default-equal keys (matching the old _toggleChanged
   * behavior), and fires `config-changed`.
   */
  onChange: (patch: Partial<OrielConfig>) => void;
}

/**
 * ha-form schema for the Views tab. Two booleans, both default false
 * (the strategy treats `undefined` and `false` identically here).
 */
const VIEWS_SCHEMA = [
  { name: 'show_summary_views', selector: { boolean: {} } },
  { name: 'show_room_views', selector: { boolean: {} } },
] as const;

// HA-native theme picker — populates from the user's installed themes and
// includes a "no theme" (inherit global) option (#74).
const THEME_SCHEMA = [{ name: 'theme', selector: { theme: {} } }] as const;

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
          const patch: Partial<OrielConfig> = {};
          for (const key of Object.keys(ev.detail.value) as Array<
            'show_summary_views' | 'show_room_views'
          >) {
            const v = ev.detail.value[key];
            patch[key] = v === true ? true : undefined;
          }
          onChange(patch);
        }}
      ></ha-form>
      <ha-form
        .hass=${hass}
        .data=${{ theme: config.theme }}
        .schema=${THEME_SCHEMA}
        .computeLabel=${() => localize('editor.theme')}
        .computeHelper=${() => localize('editor.theme_desc')}
        @value-changed=${(ev: CustomEvent<{ value: { theme?: string } }>) => {
          // Empty / "no theme" → undefined so the saved config stays sparse.
          onChange({ theme: ev.detail.value.theme || undefined });
        }}
      ></ha-form>
      ${renderBackgroundForm(ctx)}
    </div>
  `;
}
