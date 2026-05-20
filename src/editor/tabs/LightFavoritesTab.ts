// ====================================================================
// Editor tab — Light Favorites
// ====================================================================
// Entity-search-picker shape (light.* filtered). No drag-reorder.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { Simon42StrategyConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface LightFavoritesTabContext {
  config: Simon42StrategyConfig;
  search: string;
  entityNameMap: Map<string, string>;
  filteredEntities: Array<{ entity_id: string; name: string }>;
  onSearchChange: (value: string) => void;
  onAddEntity: (entityId: string) => void;
  onRemoveEntity: (entityId: string) => void;
}

export function renderLightFavoritesTab(ctx: LightFavoritesTabContext): TemplateResult {
  const lightFavs = ctx.config.light_favorite_entities || [];
  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_light_favorites')}</div>

      ${lightFavs.length > 0
        ? html`
            <div class="entity-list-container" style="margin-bottom: 8px;">
              ${lightFavs.map((entityId) => {
                const name = ctx.entityNameMap.get(entityId) || entityId;
                return html`
                  <div class="entity-list-item" data-entity-id=${entityId}>
                    <span class="item-info">
                      <span class="item-name">${name}</span>
                      <span class="item-entity-id">${entityId}</span>
                    </span>
                    <button class="btn-remove" @click=${() => ctx.onRemoveEntity(entityId)}>
                      &#x2715;
                    </button>
                  </div>
                `;
              })}
            </div>
          `
        : nothing}

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${localize('editor.select_entity') + '...'}
          .value=${ctx.search}
          @input=${(e: Event) => ctx.onSearchChange((e.target as HTMLInputElement).value)}
          @blur=${() => setTimeout(() => ctx.onSearchChange(''), 200)}
        />
        ${ctx.search.length >= 2
          ? html`
              <div class="entity-search-results">
                ${ctx.filteredEntities.length > 0
                  ? ctx.filteredEntities.map(
                      (entity) => html`
                        <div
                          class="entity-search-result"
                          @mousedown=${(e: Event) => {
                            e.preventDefault();
                            ctx.onAddEntity(entity.entity_id);
                            ctx.onSearchChange('');
                          }}
                        >
                          <span class="entity-search-name">${entity.name}</span>
                          <span class="entity-search-id">${entity.entity_id}</span>
                        </div>
                      `,
                    )
                  : html`<div class="entity-search-no-results">${localize('editor.no_results')}</div>`}
              </div>
            `
          : nothing}
      </div>
      <div class="description">${localize('editor.light_favorites_desc')}</div>
    </div>
  `;
}
