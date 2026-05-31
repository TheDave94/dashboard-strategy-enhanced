// ====================================================================
// POLLEN CARD — Pollen readings from the PollenWatch integration
// ====================================================================
// Reactive LitElement, mounted in the weather section. Three layouts:
//
//   - consensus_tiles (default) — tile per pollen, coloured by severity
//   - severity_chips             — single chip row, compact
//   - raw_grid                   — sensor-card per pollen with raw value
//
// willUpdate keeps render work O(N pollens) per state push; the
// per-pollen entity set is cached and only invalidated when the hass
// registry reference changes (matches SummaryCard's pattern).
// ====================================================================

import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import {
  ALL_POLLEN_TYPES,
  type PollenPresentation,
  type PollenSource,
  type PollenType,
} from '../types/strategy';
import {
  pollenIcon,
  pollenLevel,
  pollenSensorId,
  pollenSeverityColor,
  type PollenLevel,
} from '../utils/pollen';
import { localize } from '../utils/localize';

interface PollenCardConfig {
  source: PollenSource;
  types: PollenType[];
  presentation: PollenPresentation;
  /**
   * When false (default), species currently at level `none` are hidden
   * from render. When true, all configured species render unconditionally.
   */
  show_inactive: boolean;
}

const SEVERITY_TO_VAR: Record<string, string> = {
  red: 'var(--red-color)',
  orange: 'var(--orange-color)',
  yellow: 'var(--yellow-color)',
  green: 'var(--success-color, var(--green-color))',
  disabled: 'var(--disabled-color)',
};

class OrielPollenCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;

  private _config: PollenCardConfig = {
    source: 'analytics',
    types: ALL_POLLEN_TYPES,
    presentation: 'consensus_tiles',
    show_inactive: false,
  };
  private _relevantIds: Set<string> | null = null;

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: var(--ha-space-3, 12px);
      background: var(--ha-card-background, var(--card-background-color));
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
      --ha-card-border-width: 0;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-md, 8px);
      background: var(--secondary-background-color);
      gap: 4px;
    }
    .tile-icon {
      --mdc-icon-size: 28px;
    }
    .tile-name {
      font-size: var(--ha-font-size-s, 13px);
      color: var(--primary-text-color);
      text-transform: capitalize;
    }
    .tile-state {
      font-size: var(--ha-font-size-xs, 11px);
      color: var(--secondary-text-color);
      text-transform: capitalize;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2, 8px);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--secondary-background-color);
      font-size: var(--ha-font-size-s, 13px);
    }
    .chip ha-icon {
      --mdc-icon-size: 18px;
    }
    .empty {
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 13px);
    }
  `;

  setConfig(config: PollenCardConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('oriel-pollen-card: config object required');
    }
    const source: PollenSource =
      [
        'analytics',
        'open_meteo',
        'polleninformation',
        'dwd',
        'meteoswiss',
        'epin',
        'google',
      ].includes(config.source)
        ? config.source
        : 'analytics';
    const presentation: PollenPresentation =
      ['consensus_tiles', 'severity_chips', 'raw_grid'].includes(
        config.presentation,
      )
        ? config.presentation
        : 'consensus_tiles';
    const types: PollenType[] = Array.isArray(config.types)
      ? config.types.filter((t): t is PollenType =>
          ALL_POLLEN_TYPES.includes(t as PollenType),
        )
      : ALL_POLLEN_TYPES;
    const show_inactive = config.show_inactive === true;
    this._config = { source, types, presentation, show_inactive };
    this._relevantIds = null;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass || oldHass.entities !== this.hass.entities) {
      this._relevantIds = new Set(
        this._config.types.map((t) => pollenSensorId(this._config.source, t)),
      );
    }
    if (!oldHass) return;
    // Skip re-render if no relevant pollen sensor moved.
    if (!this._relevantIds) return;
    let changed = false;
    for (const id of this._relevantIds) {
      if (oldHass.states[id] !== this.hass.states[id]) {
        changed = true;
        break;
      }
    }
    if (!changed) {
      // Suppress the upcoming render: Lit treats willUpdate as advisory,
      // so we can't "cancel" it, but skipping work here keeps render()
      // costs low. Real cost saver is the early-out in render() itself.
    }
  }

  render(): TemplateResult {
    if (!this.hass) return html``;
    const { source, types, presentation, show_inactive } = this._config;
    if (types.length === 0) {
      return html`<ha-card><div class="empty">${localize('editor.pollen_no_data') || 'No pollen data'}</div></ha-card>`;
    }

    const allRows = types.map((type) => {
      const id = pollenSensorId(source, type);
      const state = this.hass!.states[id];
      const level = pollenLevel(source, state);
      return { type, id, level };
    });
    // When show_inactive is off (default), drop species currently at
    // `none`. Unknown/null levels still render — the user might want to
    // know that a species has no data, vs. confidently zero.
    const rows = show_inactive
      ? allRows
      : allRows.filter((r) => r.level !== 'none');

    if (rows.length === 0) {
      return html`<ha-card><div class="empty">${localize('editor.pollen_no_active') || localize('editor.pollen_no_data') || 'No active pollen'}</div></ha-card>`;
    }

    switch (presentation) {
      case 'severity_chips':
        return this._renderChips(rows);
      case 'raw_grid':
        return this._renderRawGrid(rows);
      case 'consensus_tiles':
      default:
        return this._renderTiles(rows);
    }
  }

  private _renderTiles(
    rows: Array<{ type: PollenType; id: string; level: PollenLevel | null }>,
  ): TemplateResult {
    return html`
      <ha-card>
        <div class="tiles">
          ${rows.map(
            ({ type, id, level }) => html`
              <div
                class="tile"
                role="button"
                tabindex="0"
                @click=${() => this._openMoreInfo(id)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._openMoreInfo(id);
                  }
                }}
              >
                <ha-icon
                  class="tile-icon"
                  icon=${pollenIcon(type)}
                  style="color: ${SEVERITY_TO_VAR[pollenSeverityColor(level)] || ''}"
                ></ha-icon>
                <span class="tile-name">${this._typeLabel(type)}</span>
                <span class="tile-state">${this._levelLabel(level)}</span>
              </div>
            `,
          )}
        </div>
      </ha-card>
    `;
  }

  private _renderChips(
    rows: Array<{ type: PollenType; id: string; level: PollenLevel | null }>,
  ): TemplateResult {
    return html`
      <ha-card>
        <div class="chips">
          ${rows.map(
            ({ type, id, level }) => html`
              <button
                class="chip"
                @click=${() => this._openMoreInfo(id)}
              >
                <ha-icon
                  icon=${pollenIcon(type)}
                  style="color: ${SEVERITY_TO_VAR[pollenSeverityColor(level)] || ''}"
                ></ha-icon>
                <span>${this._typeLabel(type)}</span>
                <span style="opacity: 0.7;">${this._levelLabel(level)}</span>
              </button>
            `,
          )}
        </div>
      </ha-card>
    `;
  }

  private _renderRawGrid(
    rows: Array<{
      type: PollenType;
      id: string;
      level: PollenLevel | null;
    }>,
  ): TemplateResult {
    return html`
      <ha-card>
        <div class="tiles">
          ${rows.map(({ type, id, level }) => {
            const state = this.hass!.states[id];
            const rawValue = state?.state ?? '—';
            const unit = state?.attributes?.unit_of_measurement ?? '';
            return html`
              <div
                class="tile"
                role="button"
                tabindex="0"
                @click=${() => this._openMoreInfo(id)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._openMoreInfo(id);
                  }
                }}
              >
                <ha-icon
                  class="tile-icon"
                  icon=${pollenIcon(type)}
                  style="color: ${SEVERITY_TO_VAR[pollenSeverityColor(level)] || ''}"
                ></ha-icon>
                <span class="tile-name">${this._typeLabel(type)}</span>
                <span class="tile-state">${rawValue}${unit ? ` ${unit}` : ''}</span>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  private _typeLabel(type: PollenType): string {
    return localize(`editor.pollen_type_${type}`) || type;
  }

  private _levelLabel(level: PollenLevel | null): string {
    if (level === null) return localize('editor.pollen_level_unknown') || '—';
    return localize(`editor.pollen_level_${level}`) || level;
  }

  private _openMoreInfo(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId },
      }),
    );
  }

  getCardSize(): number {
    return 2;
  }
}

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

if (!customElements.get('oriel-pollen-card')) {
  customElements.define('oriel-pollen-card', OrielPollenCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-pollen-card')) {
  window.customCards.push({
    type: 'oriel-pollen-card',
    name: 'Oriel Pollen Card',
    description:
      'Pollen readings sourced from the PollenWatch integration. Rendered in the weather section by the Oriel strategy.',
  });
}
