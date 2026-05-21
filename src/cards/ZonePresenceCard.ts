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
//   type: custom:dashboard-enhanced-zone-presence-card
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
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { setupLocalize, localize } from '../utils/localize';

// The Window.customCards interface is already declared in
// SummaryCard.ts / LightsGroupCard.ts / CoversGroupCard.ts. We register
// our card by pushing to that same array; the `preview` field below is
// type-cast at the push site to stay compatible with the existing
// shared declaration without forcing every card module to redeclare it.

import { bindActionHandler, type ActionHandlerEvent } from '../utils/action-handler';

// --------------------------------------------------------------------
// Config
// --------------------------------------------------------------------

interface ActionConfig {
  action: 'more-info' | 'toggle' | 'navigate' | 'call-service' | 'url' | 'none';
  [key: string]: unknown;
}

const hasAction = (a?: ActionConfig): boolean => a !== undefined && a.action !== 'none';

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
  /** Density variant — drives the --de-* CSS tokens. */
  density?: 'comfortable' | 'compact';
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

class DashboardEnhancedZonePresenceCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _config: ZonePresenceCardConfig | undefined;

  static styles = css`
    :host {
      display: block;
      /* Enable inline-size container queries on the host so the card
         scales to its actual rendered width — narrow cells in a
         section, wide cells in a single-card layout, anything between.
         Token-driven design: the CSS below reads only --de-* so the
         container-query rules just rebind them per breakpoint. */
      container-type: inline-size;
      container-name: de-zone;

      /* Default / mid-size tokens (≈ comfortable). Used when no
         container-query breakpoint matches. */
      --de-pad-block: var(--ha-space-3, 12px);
      --de-pad-inline: var(--ha-space-4, 16px);
      --de-header-gap: var(--ha-space-2, 8px);
      --de-header-mb: var(--ha-space-3, 10px);
      --de-zone-gap-row: var(--ha-space-2, 6px);
      --de-zone-gap-col: var(--ha-space-3, 12px);
      --de-zone-pad: var(--ha-space-2, 8px) var(--ha-space-1, 4px);
      --de-zone-radius: var(--ha-border-radius-md, 10px);
      --de-zone-label-gap: var(--ha-space-1, 4px);
      --de-icon-wrap: 36px;
      --de-icon-size: 22px;
      --de-label: var(--ha-font-size-xs, 11px);
      --de-header-size: var(--ha-font-size-m, 14px);
    }
    /* Narrow container (< 360px): cards on phones, half-section
       favorites pins. Tighten chrome, keep icons legible. */
    @container de-zone (max-width: 360px) {
      :host {
        --de-pad-block: var(--ha-space-2, 10px);
        --de-pad-inline: var(--ha-space-3, 14px);
        --de-header-mb: var(--ha-space-2, 8px);
        --de-zone-gap-col: var(--ha-space-2, 10px);
        --de-zone-pad: var(--ha-space-1, 6px) var(--ha-space-1, 3px);
        --de-icon-wrap: 32px;
        --de-icon-size: 20px;
      }
    }
    /* Wide container (> 600px): card has room to breathe. */
    @container de-zone (min-width: 600px) {
      :host {
        --de-pad-block: var(--ha-space-4, 16px);
        --de-pad-inline: var(--ha-space-5, 20px);
        --de-icon-wrap: 40px;
        --de-icon-size: 24px;
      }
    }
    /* Manual override — overrides any container-query result, used
       when the user explicitly forces a density regardless of size. */
    :host([density="compact"]) {
      --de-pad-block: var(--ha-space-2, 10px) !important;
      --de-pad-inline: var(--ha-space-3, 14px) !important;
      --de-header-mb: var(--ha-space-2, 8px) !important;
      --de-zone-gap-col: var(--ha-space-2, 10px) !important;
      --de-zone-pad: var(--ha-space-1, 6px) var(--ha-space-1, 3px) !important;
      --de-icon-wrap: 32px !important;
      --de-icon-size: 20px !important;
    }
    :host([density="comfortable"]) {
      --de-pad-block: var(--ha-space-3, 12px) !important;
      --de-pad-inline: var(--ha-space-4, 16px) !important;
      --de-icon-wrap: 36px !important;
      --de-icon-size: 22px !important;
    }
    ha-card {
      padding: var(--de-pad-block) var(--de-pad-inline);
      background: var(--ha-card-background, var(--card-background-color));
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: var(--de-header-gap);
      margin-bottom: var(--de-header-mb);
      color: var(--primary-text-color);
      font-weight: var(--ha-font-weight-medium, 500);
      font-size: var(--de-header-size);
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .header ha-icon {
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .zones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--de-zone-gap-row) var(--de-zone-gap-col);
      align-items: flex-start;
    }
    .zone {
      flex: 1 1 64px;
      min-width: 56px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--de-zone-label-gap);
      padding: var(--de-zone-pad);
      border-radius: var(--de-zone-radius);
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
    .icon-wrap {
      --dot-color: var(--state-active-color, var(--primary-color));
      --dot-inactive: var(--state-inactive-color, var(--disabled-text-color));
      width: var(--de-icon-wrap);
      height: var(--de-icon-wrap);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--dot-inactive) 18%, transparent);
      transition: background-color 200ms ease, box-shadow 200ms ease, transform 180ms ease;
    }
    .icon-wrap ha-icon {
      --mdc-icon-size: var(--de-icon-size);
      color: var(--dot-inactive);
      transition: color 200ms ease;
    }
    .zone.active .icon-wrap {
      background: color-mix(in srgb, var(--dot-color) 22%, transparent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot-color) 14%, transparent);
      transform: scale(1.06);
    }
    .zone.active .icon-wrap ha-icon {
      color: var(--dot-color);
    }
    .zone.unavailable .icon-wrap {
      background: transparent;
      border: 1.5px dashed var(--dot-inactive);
    }
    .label {
      font-size: var(--de-label);
      line-height: 1.15;
      color: var(--secondary-text-color);
      text-align: center;
      max-width: 96px;
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
      throw new Error('dashboard-enhanced-zone-presence-card: `entities` (non-empty array) is required');
    }
    // Apply defaults first, user config second — mirrors HA tile-card.
    this._config = {
      tap_action: { action: 'more-info' },
      hold_action: { action: 'more-info' },
      ...config,
    };
    if (config.density === 'compact') {
      this.setAttribute('density', 'compact');
    } else {
      this.removeAttribute('density');
    }
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    // Icon-strip card: defaults to 6 cols (half-section) so a sibling
    // card can share the row. The icon row wraps naturally inside the
    // card when the zone count exceeds what fits — rows: 'auto' lets
    // HA reserve the right vertical space. min_columns: 3 keeps the
    // icons readable even at the smallest reasonable width.
    //
    // YAML `grid_options:` overrides win (HA's reconciler is
    // `{...element, ...config}`), so users can still emit columns:'full'
    // when they want a presence strip to span the whole section.
    return { columns: 6, rows: 'auto', min_columns: 3, min_rows: 1 };
  }

  // Pick a representative binary_sensor for the picker preview.
  public static getStubConfig(hass: HomeAssistant): ZonePresenceCardConfig {
    const entityIds = Object.keys(hass.states)
      .filter((id) => id.startsWith('binary_sensor.'))
      .slice(0, 4);
    return {
      type: 'custom:dashboard-enhanced-zone-presence-card',
      name: 'Zone Presence',
      entities: entityIds.length > 0 ? entityIds : ['binary_sensor.example'],
    };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    const { createSimpleConfigEditor } = await import('./SimpleConfigEditor');
    return createSimpleConfigEditor(
      [
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        {
          name: 'entities',
          required: true,
          selector: {
            entity: { multiple: true, filter: { domain: 'binary_sensor' } },
          },
        },
      ],
      'card.dashboard-enhanced-zone-presence-card',
    );
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

  /**
   * Resolve the icon for a zone entry. Priority:
   *   1. Per-entry `icon:` config (manual override)
   *   2. The icon set on the *area* the binary_sensor belongs to
   *      (entity.area_id, or via its device.area_id) — this matches the
   *      user expectation that each "zone of the room" inherits the
   *      room's icon by default.
   *   3. The entity's own `attributes.icon` (custom icon set on the
   *      entity in HA).
   *   4. A generic presence fallback (mdi:motion-sensor).
   *
   * All hass.entities / hass.devices / hass.areas lookups stay
   * defensive — the card is intended to be usable outside the dashboard-enhanced
   * strategy too, so it can't assume Registry is initialised.
   */
  private _iconFor(z: ZoneEntry): string {
    if (z.icon) return z.icon;
    const hass = this.hass;
    if (hass) {
      const entityEntry = Reflect.get(hass.entities as Record<string, unknown>, z.entity) as
        | { area_id?: string | null; device_id?: string | null }
        | undefined;
      let areaId: string | null | undefined = entityEntry?.area_id;
      if (!areaId && entityEntry?.device_id) {
        const dev = Reflect.get(hass.devices as Record<string, unknown>, entityEntry.device_id) as
          | { area_id?: string | null }
          | undefined;
        areaId = dev?.area_id;
      }
      if (areaId) {
        const area = Reflect.get(hass.areas as Record<string, unknown>, areaId) as
          | { icon?: string | null }
          | undefined;
        if (area?.icon) return area.icon;
      }
      const stateIcon = (hass.states[z.entity] as HassEntity | undefined)?.attributes?.icon;
      if (typeof stateIcon === 'string' && stateIcon.length > 0) return stateIcon;
    }
    return 'mdi:motion-sensor';
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
    if (!entry) return;
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
  }

  // ---- Render --------------------------------------------------------

  protected render(): TemplateResult {
    if (!this._config || !this.hass) return html``;

    // Initialise the shared localize() helper from this hass instance.
    // The strategy may have already done it during Registry.initialize,
    // but the card can be used stand-alone in any Lovelace view — so we
    // make sure the language is set before reading translation keys.
    setupLocalize(this.hass);

    // Default the card heading to a localized "Presence" when the user
    // hasn't overridden it. Pass an empty string in config to hide.
    const headerName = this._config.name ?? localize('zone_presence.title');
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
            const icon = this._iconFor(z);
            return html`
              <div
                class=${classMap({ zone: true, active, unavailable })}
                style=${styleMap({ '--dot-color': color })}
                data-index=${i}
                role="button"
                tabindex=${unavailable ? '-1' : '0'}
                aria-pressed=${active ? 'true' : 'false'}
                aria-disabled=${unavailable ? 'true' : 'false'}
                aria-label=${`${this._nameFor(z)} ${
                  active ? localize('zone_presence.aria_active') : localize('zone_presence.aria_idle')
                }`}
                title=${this._nameFor(z)}
                @action=${this._handleAction}
              >
                <div class="icon-wrap">
                  <ha-icon icon=${icon}></ha-icon>
                </div>
                <div class="label">${this._nameFor(z)}</div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }
}

customElements.define('dashboard-enhanced-zone-presence-card', DashboardEnhancedZonePresenceCard);

// Register with HA's "Add card" picker so it surfaces in the editor UI.
// The `preview: true` flag isn't part of the shared global interface
// (other cards in this bundle declare a narrower shape), so we cast
// the descriptor at push site rather than widen every card module.
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'dashboard-enhanced-zone-presence-card')) {
  window.customCards.push({
    type: 'dashboard-enhanced-zone-presence-card',
    name: 'DashboardEnhanced Zone Presence',
    description:
      'Compact row of zone-presence dots, one per zone — for multi-zone presence sensors (Aqara FP1/FP2, mmWave, etc.).',
    preview: true,
  } as { type: string; name: string; description: string });
}
