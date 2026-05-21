// ====================================================================
// dashboard-enhanced-cost-overlay-feature — energy cost per device (v3.5.3)
// ====================================================================
// Custom tile feature that renders `0.40 €/h` inline based on:
//   - a power reading (W or kW), from `power_entity` or the tile's
//     primary entity if it has the right unit_of_measurement
//   - a tariff value (€/kWh), from `tariff_entity` (live) or
//     `tariff_value` (config)
//
// Auto-hides when power is zero / unavailable. Cost recalculates on
// every hass update — cheap (one multiplication + format).
// ====================================================================

import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';

declare global {
  interface Window {
    customCardFeatures?: Array<{
      type: string;
      name: string;
      supported?: (hass: HomeAssistant, context?: { entity_id?: string }) => boolean;
      configurable?: boolean;
    }>;
  }
}

interface CostOverlayConfig {
  type: string;
  /** Source of the running-power reading. Defaults to the tile's entity. */
  power_entity?: string;
  /** Live tariff entity (€/kWh). When set, overrides tariff_value. */
  tariff_entity?: string;
  /** Static tariff value (€/kWh). Used when no tariff_entity is set. */
  tariff_value?: number;
  /** Currency symbol. Defaults to '€'. */
  currency?: string;
}

interface CardFeatureContext {
  entity_id?: string;
}

class DashboardEnhancedCostOverlayFeature extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @property({ attribute: false }) accessor context: CardFeatureContext | undefined;
  @state() accessor _config: CostOverlayConfig | undefined;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 0 var(--ha-space-3, 12px);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 13px);
      font-variant-numeric: tabular-nums;
    }
    .cost { color: var(--primary-text-color); font-weight: 500; }
    .unit { margin-left: 3px; opacity: 0.7; }
  `;

  public setConfig(config: CostOverlayConfig): void {
    if (!config) throw new Error('dashboard-enhanced-cost-overlay-feature: config required');
    this._config = config;
  }

  public static getStubConfig(): CostOverlayConfig {
    return { type: 'custom:dashboard-enhanced-cost-overlay-feature', tariff_value: 0.30 };
  }

  /** Resolve power in kW from config + tile context. Returns null when missing. */
  private _resolvePowerKw(): number | null {
    if (!this.hass) return null;
    const id = this._config?.power_entity ?? this.context?.entity_id;
    if (!id) return null;
    const state = this.hass.states[id] as HassEntity | undefined;
    if (!state) return null;
    const value = Number(state.state);
    if (!Number.isFinite(value)) return null;
    const unit = (state.attributes?.unit_of_measurement as string | undefined) ?? 'W';
    if (unit === 'kW') return value;
    if (unit === 'W') return value / 1000;
    if (unit === 'MW') return value * 1000;
    return null;
  }

  /** Resolve tariff value in €/kWh. */
  private _resolveTariff(): number | null {
    if (!this._config) return null;
    if (this._config.tariff_entity && this.hass) {
      const state = this.hass.states[this._config.tariff_entity];
      const value = Number(state?.state);
      if (Number.isFinite(value)) return value;
    }
    return this._config.tariff_value ?? null;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const kw = this._resolvePowerKw();
    const tariff = this._resolveTariff();
    if (kw === null || tariff === null) return nothing;
    if (kw <= 0.001) return nothing; // off — hide
    const costPerHour = kw * tariff;
    const currency = this._config.currency ?? '€';
    return html`
      <span class="cost">${costPerHour.toFixed(2)}</span>
      <span class="unit">${currency}/h</span>
    `;
  }
}

customElements.define('dashboard-enhanced-cost-overlay-feature', DashboardEnhancedCostOverlayFeature);

window.customCardFeatures = window.customCardFeatures || [];
if (!window.customCardFeatures.some((c) => c.type === 'dashboard-enhanced-cost-overlay-feature')) {
  window.customCardFeatures.push({
    type: 'dashboard-enhanced-cost-overlay-feature',
    name: 'Energy cost overlay',
    // Allowed on any tile — the feature itself decides whether to render.
    supported: () => true,
    configurable: false,
  });
}
