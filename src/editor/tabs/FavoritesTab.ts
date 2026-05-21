// ====================================================================
// Editor tab — Favorites (v4.6.0: viewport-keyed support per F-8)
// ====================================================================
// Entity-search-picker with drag-reorder. Now surfaces BOTH:
//
//   1. Flat shape (v3.x):  favorite_entities: ['light.a', 'light.b']
//   2. Viewport-keyed map (v3.5.5+):
//        favorite_entities:
//          default: ['light.a']
//          phone:   ['light.b']
//          tablet:  ['light.a', 'light.c']
//          wall:    ['light.d']
//
// In viewport-keyed mode the picker / drag-reorder mutates the
// currently-selected viewport's list. A button at the top toggles
// between flat and keyed modes:
//   - "Split by viewport" — flat → keyed (copies the flat list to
//     `default`, the others stay empty)
//   - "Merge to single list" — keyed → flat (uses `default` as the
//     base, then dedupes any entities present in other viewports)
//
// Per PRINCIPLES #1: every YAML-only feature gets an editor path. The
// detection is also wired into the health-check tab — orphaned entries
// per-viewport surface as separate health issues.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

export type FavoritesViewport = 'default' | 'phone' | 'tablet' | 'wall';

const VIEWPORTS: Array<{ key: FavoritesViewport; labelKey: string; icon: string }> = [
  { key: 'default', labelKey: 'editor.favorites_viewport_default', icon: 'mdi:devices' },
  { key: 'phone', labelKey: 'editor.favorites_viewport_phone', icon: 'mdi:cellphone' },
  { key: 'tablet', labelKey: 'editor.favorites_viewport_tablet', icon: 'mdi:tablet' },
  { key: 'wall', labelKey: 'editor.favorites_viewport_wall', icon: 'mdi:monitor-dashboard' },
];

export interface FavoritesTabContext {
  config: OrielConfig;
  search: string;
  entityNameMap: Map<string, string>;
  filteredEntities: Array<{ entity_id: string; name: string }>;
  /** Currently-selected viewport when in keyed mode. */
  activeViewport: FavoritesViewport;
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
  /** Switch which viewport's list the picker edits. */
  onViewportChange: (viewport: FavoritesViewport) => void;
  /** Convert from flat to viewport-keyed shape. */
  onSplitByViewport: () => void;
  /** Convert from viewport-keyed back to a single flat list. */
  onMergeViewports: () => void;
}

/**
 * Helper exposed so the editor can decide whether to write to the flat
 * shape or a specific viewport based on the currently-stored config.
 */
export function isViewportKeyedFavorites(
  fav: unknown,
): fav is Partial<Record<FavoritesViewport, string[]>> {
  if (!fav || typeof fav !== 'object' || Array.isArray(fav)) return false;
  const v = fav as Record<string, unknown>;
  return (
    Array.isArray(v.default) ||
    Array.isArray(v.phone) ||
    Array.isArray(v.tablet) ||
    Array.isArray(v.wall)
  );
}

export function renderFavoritesTab(ctx: FavoritesTabContext): TemplateResult {
  const favRaw = ctx.config.favorite_entities as unknown;
  const isKeyed = isViewportKeyedFavorites(favRaw);

  // Pick the currently-visible list based on mode + active viewport.
  let visibleList: string[];
  if (isKeyed) {
    const map = favRaw as Partial<Record<FavoritesViewport, string[]>>;
    visibleList = Array.isArray(map[ctx.activeViewport]) ? (map[ctx.activeViewport] as string[]) : [];
  } else if (Array.isArray(favRaw)) {
    visibleList = favRaw as string[];
  } else {
    visibleList = [];
  }

  const favoritesShowState = ctx.config.favorites_show_state === true;
  const favoritesHideLastChanged = ctx.config.favorites_hide_last_changed === true;

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.section_favorites')}</div>

      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;"
      >
        ${isKeyed
          ? html`
              <div
                role="tablist"
                style="display: flex; gap: 4px; flex-wrap: wrap; flex: 1;"
              >
                ${VIEWPORTS.map(
                  (vp) => html`
                    <button
                      role="tab"
                      aria-selected=${ctx.activeViewport === vp.key ? 'true' : 'false'}
                      style="display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 6px; border: 1px solid ${ctx.activeViewport === vp.key ? 'var(--primary-color)' : 'var(--divider-color)'}; background: ${ctx.activeViewport === vp.key ? 'color-mix(in srgb, var(--primary-color) 14%, transparent)' : 'transparent'}; cursor: pointer; font: inherit; color: inherit; font-size: 0.85rem;"
                      @click=${() => ctx.onViewportChange(vp.key)}
                    >
                      <ha-icon icon=${vp.icon} style="--mdc-icon-size: 18px;"></ha-icon>
                      ${localize(vp.labelKey) || vp.key}
                    </button>
                  `,
                )}
              </div>
              <button
                class="btn-remove"
                style="white-space: nowrap;"
                title=${localize('editor.favorites_merge_help') ||
                  'Merge all viewports back into a single flat list'}
                @click=${ctx.onMergeViewports}
              >
                ${localize('editor.favorites_merge') || 'Merge to single list'}
              </button>
            `
          : html`
              <span style="flex: 1; color: var(--secondary-text-color); font-size: 0.85rem;">
                ${localize('editor.favorites_flat_hint') ||
                  'Single list shown on every device. Split per device to differentiate.'}
              </span>
              <button
                class="btn-primary"
                style="white-space: nowrap;"
                title=${localize('editor.favorites_split_help') ||
                  'Switch to per-viewport favorites (phone / tablet / wall)'}
                @click=${ctx.onSplitByViewport}
              >
                ${localize('editor.favorites_split') || 'Split by viewport'}
              </button>
            `}
      </div>

      <div id="favorites-list" style="margin-bottom: 12px;">
        ${visibleList.length === 0
          ? html`<div class="empty-state">${localize('editor.no_favorites')}</div>`
          : html`
              <div class="entity-list-container">
                ${visibleList.map((entityId) => {
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
        'favorites-hide-last-changed',
        localize('editor.hide_last_changed'),
        favoritesHideLastChanged,
        (checked) => ctx.onToggleChange('favorites_hide_last_changed', checked, false),
      )}
    </div>
  `;
}
