// ====================================================================
// Editor tab — Custom Cards
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { OrielConfig, CustomCard, SectionKey } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface CustomCardsTabContext {
  config: OrielConfig;
  sectionMeta: Map<SectionKey, { icon: string; labelKey: string }>;
  onHeadingChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onAddCard: () => void;
  onRemoveCard: (index: number) => void;
  onUpdateField: (index: number, field: string, value: string) => void;
  onUpdateYaml: (index: number, yamlString: string) => void;
}

function renderCardItem(
  ctx: CustomCardsTabContext,
  card: CustomCard,
  index: number,
): TemplateResult {
  const validationMsg = card._yaml_error
    ? html`<span style="color: var(--error-color);">&#x274C; ${card._yaml_error}</span>`
    : card.yaml
      ? html`<span style="color: var(--success-color, green);">&#x2705; ${localize('editor.yaml_valid')}</span>`
      : nothing;

  return html`
    <div class="custom-item" data-index=${index}>
      <div class="custom-item-header">
        <strong>${card.title || localize('editor.new_card')}</strong>
        <button class="btn-remove" @click=${() => ctx.onRemoveCard(index)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${card.title || ''}
          placeholder=${localize('editor.card_title_placeholder')}
          @change=${(e: Event) =>
            ctx.onUpdateField(index, 'title', (e.target as HTMLInputElement).value)}
        />
        <div class="custom-card-target">
          <label>${localize('editor.target_section')}:</label>
          <select
            @change=${(e: Event) =>
              ctx.onUpdateField(index, 'target_section', (e.target as HTMLSelectElement).value)}
          >
            ${[...ctx.sectionMeta.entries()].map(
              ([key, meta]) => html`
                <option value=${key} ?selected=${(card.target_section || 'custom_cards') === key}>
                  ${localize(meta.labelKey)}
                </option>
              `,
            )}
          </select>
        </div>
        <textarea
          rows="6"
          placeholder=${localize('editor.yaml_placeholder')}
          .value=${card.yaml || ''}
          style="width: 100%;"
          @change=${(e: Event) => ctx.onUpdateYaml(index, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="custom-item-validation">${validationMsg}</div>
      </div>
    </div>
  `;
}

export function renderCustomCardsTab(ctx: CustomCardsTabContext): TemplateResult {
  const customCards = ctx.config.custom_cards || [];
  const customCardsHeading = ctx.config.custom_cards_heading || '';
  const customCardsIcon = ctx.config.custom_cards_icon || '';

  return html`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${localize('editor.section_custom_cards')}
      </div>
      <div class="custom-item-row" style="margin-bottom: 12px;">
        <input
          type="text"
          id="custom-cards-heading"
          .value=${customCardsHeading}
          placeholder=${localize('editor.custom_cards_heading_placeholder')}
          style="flex: 2;"
          @change=${(e: Event) => ctx.onHeadingChange((e.target as HTMLInputElement).value)}
        />
        <input
          type="text"
          id="custom-cards-icon"
          .value=${customCardsIcon}
          placeholder="mdi:cards"
          style="flex: 1;"
          @change=${(e: Event) => ctx.onIconChange((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="description" style="margin-bottom: 8px;">
        ${localize('editor.custom_cards_desc')}
      </div>

      <div id="custom-cards-list">
        ${customCards.length === 0
          ? html`<div class="empty-state">${localize('editor.no_custom_cards')}</div>`
          : customCards.map((card, index) => renderCardItem(ctx, card, index))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${() => ctx.onAddCard()}>
        ${localize('editor.add_custom_card')}
      </button>
      <div class="description">${localize('editor.custom_cards_help')}</div>
    </div>
  `;
}
