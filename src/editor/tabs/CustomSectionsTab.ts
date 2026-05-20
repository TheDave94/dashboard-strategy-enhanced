// ====================================================================
// Editor tab — Custom Sections
// ====================================================================

import { html, type TemplateResult } from 'lit';
import type { Simon42StrategyConfig, CustomSection } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface CustomSectionsTabContext {
  config: Simon42StrategyConfig;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdateField: (index: number, field: 'key' | 'heading' | 'icon', value: string) => void;
  onUpdateYaml: (index: number, yamlString: string) => void;
}

function renderSectionItem(
  ctx: CustomSectionsTabContext,
  section: CustomSection,
  index: number,
): TemplateResult {
  const validationMsg = section._yaml_error
    ? html`<span style="color: var(--error-color);">&#x274C; ${section._yaml_error}</span>`
    : section.parsed_config
      ? html`<span style="color: var(--success-color, green);">&#x2705; ${localize('editor.yaml_valid')}</span>`
      : html``;

  return html`
    <div class="custom-item">
      <div class="custom-item-header">
        <span class="custom-item-index">#${index + 1}</span>
        <button
          class="btn-icon"
          @click=${() => ctx.onRemove(index)}
          title=${localize('editor.remove')}
        >
          &#x274C;
        </button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${section.key || ''}
          placeholder=${localize('editor.custom_section_key_placeholder')}
          @change=${(e: Event) =>
            ctx.onUpdateField(index, 'key', (e.target as HTMLInputElement).value)}
        />
        <input
          type="text"
          .value=${section.heading || ''}
          placeholder=${localize('editor.custom_section_heading_placeholder')}
          @change=${(e: Event) =>
            ctx.onUpdateField(index, 'heading', (e.target as HTMLInputElement).value)}
        />
        <input
          type="text"
          .value=${section.icon || ''}
          placeholder="mdi:card-bulleted"
          @change=${(e: Event) =>
            ctx.onUpdateField(index, 'icon', (e.target as HTMLInputElement).value)}
        />
        <textarea
          rows="6"
          placeholder=${localize('editor.custom_section_yaml_placeholder')}
          .value=${section.yaml || ''}
          style="width: 100%;"
          @change=${(e: Event) => ctx.onUpdateYaml(index, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="custom-item-validation">${validationMsg}</div>
      </div>
    </div>
  `;
}

export function renderCustomSectionsTab(ctx: CustomSectionsTabContext): TemplateResult {
  const customSections = ctx.config.custom_sections || [];
  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_custom_sections')}</div>
      <div class="description" style="margin-bottom: 8px;">
        ${localize('editor.custom_sections_desc')}
      </div>

      <div id="custom-sections-list">
        ${customSections.length === 0
          ? html`<div class="empty-state">${localize('editor.no_custom_sections')}</div>`
          : customSections.map((s, index) => renderSectionItem(ctx, s, index))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${() => ctx.onAdd()}>
        ${localize('editor.add_custom_section')}
      </button>
      <div class="description">${localize('editor.custom_sections_help')}</div>
    </div>
  `;
}
