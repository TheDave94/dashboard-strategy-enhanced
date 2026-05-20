// ====================================================================
// Editor tab — Custom Badges
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { Simon42StrategyConfig, CustomBadge } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface CustomBadgesTabContext {
  config: Simon42StrategyConfig;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdateYaml: (index: number, yamlString: string) => void;
}

function renderBadgeItem(
  ctx: CustomBadgesTabContext,
  badge: CustomBadge,
  index: number,
): TemplateResult {
  const validationMsg = badge._yaml_error
    ? html`<span style="color: var(--error-color);">&#x274C; ${badge._yaml_error}</span>`
    : badge.yaml
      ? html`<span style="color: var(--success-color, green);">&#x2705; ${localize('editor.yaml_valid')}</span>`
      : nothing;

  return html`
    <div class="custom-item" data-index=${index}>
      <div class="custom-item-header">
        <strong>Badge ${index + 1}</strong>
        <button class="btn-remove" @click=${() => ctx.onRemove(index)}>&#x2715;</button>
      </div>
      <textarea
        rows="4"
        placeholder="type: entity&#10;entity: sun.sun"
        .value=${badge.yaml || ''}
        style="width: 100%;"
        @change=${(e: Event) => ctx.onUpdateYaml(index, (e.target as HTMLTextAreaElement).value)}
      ></textarea>
      <div class="custom-item-validation">${validationMsg}</div>
    </div>
  `;
}

export function renderCustomBadgesTab(ctx: CustomBadgesTabContext): TemplateResult {
  const customBadges = ctx.config.custom_badges || [];

  return html`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${localize('editor.section_custom_badges')}
      </div>

      <div id="custom-badges-list">
        ${customBadges.length === 0
          ? html`<div class="empty-state">${localize('editor.no_custom_badges')}</div>`
          : customBadges.map((badge, index) => renderBadgeItem(ctx, badge, index))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${() => ctx.onAdd()}>
        ${localize('editor.add_custom_badge')}
      </button>
      <div class="description">${localize('editor.custom_badges_help')}</div>
    </div>
  `;
}
