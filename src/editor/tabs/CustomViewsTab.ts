// ====================================================================
// Editor tab — Custom Views
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { OrielConfig, CustomView } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface CustomViewsTabContext {
  config: OrielConfig;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onUpdateField: (index: number, field: 'title' | 'path' | 'icon', value: string) => void;
  onUpdateYaml: (index: number, yamlString: string) => void;
  onUpdateRefField: (index: number, field: 'ref_dashboard' | 'ref_view', value: string) => void;
}

function renderViewItem(
  ctx: CustomViewsTabContext,
  view: CustomView,
  index: number,
  total: number,
): TemplateResult {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const label = view.title || localize('editor.new_view');
  const moveUpLabel = `${localize('editor.move_view_up')}: ${label}`;
  const moveDownLabel = `${localize('editor.move_view_down')}: ${label}`;
  const validationMsg = view._yaml_error
    ? html`<span style="color: var(--error-color);">&#x274C; ${view._yaml_error}</span>`
    : view.yaml
      ? html`<span style="color: var(--success-color, green);">&#x2705; ${localize('editor.yaml_valid')}</span>`
      : nothing;

  return html`
    <div class="custom-item" data-index=${index}>
      <div class="custom-item-header">
        <strong>${label}</strong>
        <button
          class="section-move-btn"
          type="button"
          aria-label=${moveUpLabel}
          title=${moveUpLabel}
          ?disabled=${isFirst}
          @click=${() => ctx.onMove(index, 'up')}
        >&#x2191;</button>
        <button
          class="section-move-btn"
          type="button"
          aria-label=${moveDownLabel}
          title=${moveDownLabel}
          ?disabled=${isLast}
          @click=${() => ctx.onMove(index, 'down')}
        >&#x2193;</button>
        <button class="btn-remove" @click=${() => ctx.onRemove(index)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <div class="custom-item-row">
          <input
            type="text"
            .value=${view.title || ''}
            placeholder=${localize('editor.title_placeholder')}
            style="flex: 2;"
            @change=${(e: Event) =>
              ctx.onUpdateField(index, 'title', (e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            .value=${view.path || ''}
            placeholder=${localize('editor.path_placeholder')}
            style="flex: 2;"
            @change=${(e: Event) =>
              ctx.onUpdateField(index, 'path', (e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            .value=${view.icon || ''}
            placeholder="mdi:star"
            style="flex: 1;"
            @change=${(e: Event) =>
              ctx.onUpdateField(index, 'icon', (e.target as HTMLInputElement).value)}
          />
        </div>
        <textarea
          rows="8"
          placeholder=${localize('editor.yaml_placeholder')}
          .value=${view.yaml || ''}
          style="width: 100%;"
          @change=${(e: Event) => ctx.onUpdateYaml(index, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="custom-item-validation">${validationMsg}</div>
        <div class="custom-item-row" style="margin-top: 8px;">
          <input
            type="text"
            .value=${view.ref_dashboard || ''}
            placeholder=${localize('editor.custom_view_ref_dashboard')}
            style="flex: 1;"
            @change=${(e: Event) =>
              ctx.onUpdateRefField(index, 'ref_dashboard', (e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            .value=${view.ref_view || ''}
            placeholder=${localize('editor.custom_view_ref_view')}
            style="flex: 1;"
            @change=${(e: Event) =>
              ctx.onUpdateRefField(index, 'ref_view', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="description">${localize('editor.custom_view_ref_help')}</div>
      </div>
    </div>
  `;
}

export function renderCustomViewsTab(ctx: CustomViewsTabContext): TemplateResult {
  const customViews = ctx.config.custom_views || [];

  return html`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${localize('editor.section_custom_views')}
      </div>

      <div id="custom-views-list">
        ${customViews.length === 0
          ? html`<div class="empty-state">${localize('editor.no_custom_views')}</div>`
          : customViews.map((view, index) => renderViewItem(ctx, view, index, customViews.length))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${() => ctx.onAdd()}>
        ${localize('editor.add_custom_view')}
      </button>
      <div class="description">${localize('editor.custom_views_help')}</div>
    </div>
  `;
}
