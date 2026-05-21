// ====================================================================
// Editor tab — Favorites
// ====================================================================
// Entity-search-picker with drag-reorder. Two trailing booleans
// (show_state, hide_last_changed) rendered via the checkbox helper.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export interface FavoritesTabContext {
  config: OrielConfig;
  search: string;
  entityNameMap: Map<string, string>;
  filteredEntities: Array<{ entity_id: string; name: string }>;
  renderCheckbox: (
    id: string,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ) => TemplateResult;
  onSearchChange: (value: string) => void;
  onAddEntity: (entityId: string) => void;
  onRemoveEntity: (entityId: string) => void;
  onToggleChange: (key: string, value: boolean, defaultValue: boolean) => void;
  onDragStart: (ev: DragEvent) => void;
  onDragEnd: (ev: DragEvent) => void;
  onDragOver: (ev: DragEvent) => void;
  onDragLeave: (ev: DragEvent) => void;
  onDrop: (ev: DragEvent) => void;
}

export function renderFavoritesTab(ctx: FavoritesTabContext): TemplateResult {
  // Editor surfaces only the legacy string[] shape. Viewport-keyed
  // map (v3.5.5) is YAML-only; treat any non-array config as empty.
  const _favRaw = ctx.config.favorite_entities;
  const favoriteEntities: string[] = Array.isArray(_favRaw) ? _favRaw : [];
  const favoritesShowState = ctx.config.favorites_show_state === true;
  const favoritesHideLastChanged = ctx.config.favorites_hide_last_changed === true;

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_favorites')}</div>

      <div id="favorites-list" style="margin-bottom: 12px;">
        ${favoriteEntities.length === 0
          ? html`<div class="empty-state">${localize('editor.no_favorites')}</div>`
          : html`
              <div class="entity-list-container">
                ${favoriteEntities.map((entityId) => {
                  const name = ctx.entityNameMap.get(entityId) || entityId;
                  return html`
                    <div
                      class="entity-list-item"
                      data-entity-id=${entityId}
                      draggable="true"
                      @dragstart=${ctx.onDragStart}
                      @dragend=${ctx.onDragEnd}
                      @dragover=${ctx.onDragOver}
                      @dragleave=${ctx.onDragLeave}
                      @drop=${ctx.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
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
            `}
      </div>

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
      <div class="description">${localize('editor.favorites_desc')}</div>

      ${ctx.renderCheckbox(
        'favorites-show-state',
        localize('editor.show_state'),
        favoritesShowState,
        (checked) => ctx.onToggleChange('favorites_show_state', checked, false),
      )}
      ${ctx.renderCheckbox(
        'favorites-hioriel-last-changed',
        localize('editor.hide_last_changed'),
        favoritesHideLastChanged,
        (checked) => ctx.onToggleChange('favorites_hide_last_changed', checked, false),
      )}
    </div>
  `;
}
