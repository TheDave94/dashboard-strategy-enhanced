// ====================================================================
// ZONE PRESENCE CARD — Compact row of zone-presence indicators (LitElement)
// ====================================================================
// Use case: multi-zone presence sensors (Aqara FP1/FP2, ESP32-S3 mmWave,
// etc.) where each zone is exposed as a separate binary_sensor. The
// native HA pattern is one full-size tile per zone — for an apartment
// with desk + couch + bed + relax + bath that's 5 tiles eating ~⅓ of
// the overview vertical space. This card collapses them into a single
// row of small colored dots: same information, ~⅙ the space.
//
// Each dot:
//   - reflects the zone's binary_sensor state (on = active, off = idle)
//   - shows the zone's friendly name as label below
//   - is keyboard-focusable + supports HA's tap/hold/double-tap actions
//     (default tap → more-info)
//
// Config (YAML for custom_cards / custom_views):
//   type: custom:simon42-zone-presence-card
//   name: Anwesenheit            # optional header label
//   icon: mdi:account-multiple   # optional header icon
//   entities:
//     - binary_sensor.desk_occupied
//     - { entity: binary_sensor.couch, name: Couch, color: light-blue }
//     - binary_sensor.relax_area
//     - binary_sensor.bed
//   tap_action:                  # optional, applies to every dot;
//     action: more-info          # per-entity override via the object form
//
// Design notes
// ------------
// - Built per the HA custom-card playbook: extends LitElement directly,
//   uses HA's `actionHandler` directive + `handleAction` helper instead
//   of raw `@click`, exposes `getCardSize` + `getGridOptions`, gates
//   re-renders to only the entities we actually watch.
// - Colors come from HA CSS variables (`--state-active-color`,
//   `--state-inactive-color`, etc.) so themes work out of the box. The
//   per-entity `color:` is forwarded as an inline `--dot-color` so users
//   keep their existing tile-card palette idioms.
// - Accessibility: each dot is a `role="button"` with `tabindex="0"`,
//   `aria-pressed`, `aria-label`, and a `:focus-visible` ring. The
//   `actionHandler` directive wires Enter/Space keyboard activation.
// ====================================================================

import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';

// The Window.customCards interface is already declared in
// SummaryCard.ts / LightsGroupCard.ts / CoversGroupCard.ts. We register
// our card by pushing to that same array; the `preview` field below is
// type-cast at the push site to stay compatible with the existing
// shared declaration without forcing every card module to redeclare it.

// --------------------------------------------------------------------
// HA action-handler integration
// --------------------------------------------------------------------
// We use HA's official action-handler directive (registered globally
// by the frontend as the custom element `action-handler`). The
// directive fires a single `@action` event with `detail.action ∈
// 'tap' | 'hold' | 'double_tap'`. We dispatch the actual action through
// `hass-action` (HA's built-in handler) so navigation, more-info,
// service calls, etc. all work the same way the tile-card does them.

interface ActionConfig {
  action: 'more-info' | 'toggle' | 'navigate' | 'call-service' | 'url' | 'none';
  [key: string]: unknown;
}

interface ActionHandlerEventDetail {
  action: 'tap' | 'hold' | 'double_tap';
}
type ActionHandlerEvent = CustomEvent<ActionHandlerEventDetail>;

interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

const hasAction = (a?: ActionConfig): boolean => a !== undefined && a.action !== 'none';

// Mirrors HA's actionHandler() directive in the simplest correct form:
// attach the global <action-handler> custom element to the bound node
// once, and configure it for hold/double-tap. The element is lazily
// created on first use.
type ActionHandlerElement = HTMLElement & {
  bind: (el: HTMLElement, opts: ActionHandlerOptions) => void;
};
let _actionHandlerEl: ActionHandlerElement | null = null;

function getActionHandler(): ActionHandlerElement {
  if (_actionHandlerEl) return _actionHandlerEl;
  const existing = document.body.querySelector('action-handler') as ActionHandlerElement | null;
  if (existing) {
    _actionHandlerEl = existing;
    return _actionHandlerEl;
  }
  // The element is shipped by the HA frontend; in the rare case it
  // isn't loaded yet, we create it. It self-registers on first import
  // anywhere in HA.
  const el = document.createElement('action-handler') as ActionHandlerElement;
  document.body.appendChild(el);
  _actionHandlerEl = el;
  return _actionHandlerEl;
}

function bindActionHandler(el: HTMLElement, opts: ActionHandlerOptions): void {
  const handler = getActionHandler();
  if (typeof handler.bind === 'function') {
    handler.bind(el, opts);
  }
}

// --------------------------------------------------------------------
// Config
// --------------------------------------------------------------------

interface ZoneEntry {
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

interface ZonePresenceCardConfig {
  type: string;
  name?: string;
  icon?: string;
  entities: Array<string | ZoneEntry>;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

interface LovelaceGridOptions {
  rows?: number | 'auto';
  columns?: number | 'full';
  min_rows?: number;
  max_rows?: number;
  min_columns?: number;
  max_columns?: number;
}

// Map of the HA tile-card / Mushroom palette aliases to the official
// HA `--<name>-color` variables. Falls back gracefully if a theme
// doesn't define one.
const PALETTE = new Set([
  'red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue',
  'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber',
  'orange', 'deep-orange', 'brown', 'grey', 'blue-grey', 'black', 'white',
  'disabled', 'primary', 'accent',
]);

function resolveColor(color: string | undefined): string {
  if (!color) return 'var(--state-active-color, var(--primary-color))';
  if (color === 'accent') return 'var(--accent-color)';
  if (color === 'primary') return 'var(--primary-color)';
  if (PALETTE.has(color)) return `var(--${color}-color)`;
  // Allow raw CSS color values (hex, rgb(), etc.) to pass through.
  return color;
}

// --------------------------------------------------------------------
// Card
// --------------------------------------------------------------------

class Simon42ZonePresenceCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  public hass?: HomeAssistant;
  private _config?: ZonePresenceCardConfig;

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      padding: 12px 16px;
      background: var(--ha-card-background, var(--card-background-color));
      border-radius: var(--ha-card-border-radius, 12px);
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      color: var(--primary-text-color);
      font-weight: 500;
      font-size: 14px;
      line-height: 1.2;
    }
    .header ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .zones {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      align-items: flex-start;
    }
    .zone {
      flex: 1 1 56px;
      min-width: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 6px 4px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 120ms ease;
      outline: none;
    }
    .zone:hover {
      background: var(--secondary-background-color);
    }
    .zone:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .zone.unavailable {
      cursor: default;
      opacity: 0.6;
    }
    .dot {
      --dot-color: var(--state-active-color, var(--primary-color));
      --dot-inactive: var(--state-inactive-color, var(--disabled-text-color));
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--dot-inactive);
      transition: background-color 200ms ease, box-shadow 200ms ease, transform 180ms ease;
    }
    .zone.active .dot {
      background: var(--dot-color);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot-color) 24%, transparent);
      transform: scale(1.15);
    }
    .zone.unavailable .dot {
      background: transparent;
      border: 1.5px dashed var(--dot-inactive);
      width: 11px;
      height: 11px;
    }
    .label {
      font-size: 11px;
      line-height: 1.15;
      color: var(--secondary-text-color);
      text-align: center;
      max-width: 88px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zone.active .label {
      color: var(--primary-text-color);
      font-weight: 500;
    }
  `;

  // ---- LovelaceCard interface ----------------------------------------

  public setConfig(config: ZonePresenceCardConfig): void {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error('simon42-zone-presence-card: `entities` (non-empty array) is required');
    }
    // Apply defaults first, user config second — mirrors HA tile-card.
    this._config = {
      tap_action: { action: 'more-info' },
      hold_action: { action: 'more-info' },
      ...config,
    };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return { rows: 1, columns: 6, min_rows: 1, min_columns: 3, max_rows: 1 };
  }

  // Pick a representative binary_sensor for the picker preview.
  public static getStubConfig(hass: HomeAssistant): ZonePresenceCardConfig {
    const entityIds = Object.keys(hass.states)
      .filter((id) => id.startsWith('binary_sensor.'))
      .slice(0, 4);
    return {
      type: 'custom:simon42-zone-presence-card',
      name: 'Zone Presence',
      entities: entityIds.length > 0 ? entityIds : ['binary_sensor.example'],
    };
  }

  // ---- Render gating -------------------------------------------------

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('_config')) return true;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    if (!oldHass || !this._config) return true;
    // Only re-render when one of our watched entities actually changed.
    return this._entries().some((z) => oldHass.states[z.entity] !== this.hass?.states[z.entity]);
  }

  // ---- Helpers -------------------------------------------------------

  private _entries(): ZoneEntry[] {
    if (!this._config) return [];
    return this._config.entities.map((e) => (typeof e === 'string' ? { entity: e } : { ...e }));
  }

  private _nameFor(z: ZoneEntry): string {
    if (z.name) return z.name;
    const s = this.hass?.states[z.entity] as HassEntity | undefined;
    return s?.attributes?.friendly_name || z.entity.split('.').slice(1).join('.') || z.entity;
  }

  private _stateFor(z: ZoneEntry): { active: boolean; unavailable: boolean } {
    const s = this.hass?.states[z.entity] as HassEntity | undefined;
    const v = s?.state;
    return {
      active: v === 'on',
      unavailable: v === undefined || v === 'unavailable' || v === 'unknown',
    };
  }

  // Merges card-level defaults with per-entry overrides into the config
  // shape HA's `hass-action` event expects.
  private _resolveActions(z: ZoneEntry) {
    return {
      tap_action: z.tap_action || this._config?.tap_action || { action: 'more-info' },
      hold_action: z.hold_action || this._config?.hold_action || { action: 'more-info' },
      double_tap_action: z.double_tap_action || this._config?.double_tap_action,
    };
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (!this.hass) return;
    const target = ev.currentTarget as HTMLElement;
    const idx = Number(target.dataset.index);
    const entries = this._entries();
    if (!Number.isFinite(idx) || idx < 0 || idx >= entries.length) return;
    const entry = entries[idx];
    const actions = this._resolveActions(entry);
    // Build a config block hass-action recognises (same shape as a
    // tile-card config). Pass the per-entry entity so more-info /
    // toggle targets the dot the user tapped.
    const cfg = {
      entity: entry.entity,
      ...actions,
    };
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: { config: cfg, action: ev.detail.action },
      })
    );
  }

  // Rebind the action-handler directive every render (cheap; matches
  // HA's own usage from `actionHandler.bind`). We do it in `updated`
  // so the element exists in the DOM.
  protected updated(changed: PropertyValues): void {
    if (!this._config) return;
    if (!changed.has('_config') && !changed.has('hass')) return;
    const entries = this._entries();
    const nodes = this.shadowRoot?.querySelectorAll<HTMLElement>('.zone') || [];
    nodes.forEach((node, i) => {
      const entry = entries[i];
      if (!entry) return;
      const actions = this._resolveActions(entry);
      bindActionHandler(node, {
        hasHold: hasAction(actions.hold_action),
        hasDoubleClick: hasAction(actions.double_tap_action),
        disabled: this._stateFor(entry).unavailable,
      });
    });
    // Reflect dark-mode for theme-aware ::shadow consumers (Mushroom pattern).
    if (changed.has('hass') && this.hass) {
      const dark = (this.hass.themes as { darkMode?: boolean } | undefined)?.darkMode === true;
      this.toggleAttribute('dark-mode', dark);
    }
  }

  // ---- Render --------------------------------------------------------

  protected render(): TemplateResult {
    if (!this._config || !this.hass) return html``;

    const headerName = this._config.name;
    const headerIcon = this._config.icon;
    const showHeader = !!headerName || !!headerIcon;
    const entries = this._entries();

    return html`
      <ha-card>
        ${showHeader
          ? html`
              <div class="header">
                ${headerIcon ? html`<ha-icon icon=${headerIcon}></ha-icon>` : nothing}
                ${headerName ? html`<span>${headerName}</span>` : nothing}
              </div>
            `
          : nothing}
        <div class="zones">
          ${entries.map((z, i) => {
            const { active, unavailable } = this._stateFor(z);
            const color = resolveColor(z.color);
            return html`
              <div
                class=${classMap({ zone: true, active, unavailable })}
                style=${styleMap({ '--dot-color': color })}
                data-index=${i}
                role="button"
                tabindex=${unavailable ? '-1' : '0'}
                aria-pressed=${active ? 'true' : 'false'}
                aria-disabled=${unavailable ? 'true' : 'false'}
                aria-label=${`${this._nameFor(z)} ${active ? 'active' : 'idle'}`}
                title=${this._nameFor(z)}
                @action=${this._handleAction}
              >
                <div class="dot"></div>
                <div class="label">${this._nameFor(z)}</div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }
}

customElements.define('simon42-zone-presence-card', Simon42ZonePresenceCard);

// Register with HA's "Add card" picker so it surfaces in the editor UI.
// The `preview: true` flag isn't part of the shared global interface
// (other cards in this bundle declare a narrower shape), so we cast
// the descriptor at push site rather than widen every card module.
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'simon42-zone-presence-card')) {
  window.customCards.push({
    type: 'simon42-zone-presence-card',
    name: 'Simon42 Zone Presence',
    description:
      'Compact row of zone-presence dots, one per zone — for multi-zone presence sensors (Aqara FP1/FP2, mmWave, etc.).',
    preview: true,
  } as { type: string; name: string; description: string });
}
