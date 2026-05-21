// ====================================================================
// SPARKLINE CARD — inline 24h history mini-graph
// ====================================================================
// Compact tile-style card that fetches the last 24h of a sensor's
// history via HA's REST API once on mount + on every hour boundary,
// then renders an inline SVG sparkline. No external dependency,
// no Canvas — keeps the chunk small.
//
// Tap → more-info dialog. Hold → opens HA's history view (not
// implemented yet; defaults to more-info).
// ====================================================================

import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { bindActionHandler, type ActionHandlerEvent } from '../utils/action-handler';
import type { HomeAssistant } from '../types/homeassistant';

interface SparklineCardConfig {
  type: string;
  entity: string;
  /** Card title — defaults to the entity's friendly_name. */
  name?: string;
  /** Hours of history to plot. Default 24. Max 168 (1 week). */
  hours?: number;
  /** Color of the line + fill. Default `var(--state-active-color)`. */
  color?: string;
  /** Show current value above the sparkline. Default true. */
  show_value?: boolean;
  /** Show min/max labels at the ends. Default false. */
  show_extrema?: boolean;
  /**
   * When true AND `apexcharts-card` is installed (HACS), delegate
   * rendering to apexcharts-card instead of the built-in SVG. Default
   * false. See v3.2.1 release notes.
   */
  use_apexcharts?: boolean;
}

interface HistoryPoint {
  t: number; // ms timestamp
  v: number; // numeric value
}

class DashboardEnhancedSparklineCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _history: HistoryPoint[] = [];

  private _config!: SparklineCardConfig;
  private _refreshTimer?: number;
  private _lastFetchHass?: HomeAssistant;

  static styles = css`
    :host {
      display: block;
      container-type: inline-size;
      container-name: de-spark;
    }
    ha-card {
      padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 100%;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--ha-space-2, 8px);
    }
    .name {
      font-size: var(--ha-font-size-s, 13px);
      color: var(--secondary-text-color);
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .value {
      font-size: var(--ha-font-size-l, 18px);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .spark {
      width: 100%;
      height: 40px;
      display: block;
    }
    .spark path.fill { fill: var(--de-spark-color, var(--state-active-color, var(--primary-color))); opacity: 0.18; }
    .spark path.line { fill: none; stroke: var(--de-spark-color, var(--state-active-color, var(--primary-color))); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .extrema {
      display: flex;
      justify-content: space-between;
      font-size: var(--ha-font-size-xs, 11px);
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    @container de-spark (max-width: 200px) {
      .spark { height: 28px; }
    }
  `;

  public setConfig(config: SparklineCardConfig): void {
    if (!config?.entity || typeof config.entity !== 'string') {
      throw new Error('dashboard-enhanced-sparkline-card: `entity` (string) required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns?: number;
    min_rows?: number;
  } {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    // Refresh history hourly. Cheap enough to leave on; the request
    // is one GET per active sparkline-card per hour.
    this._refreshTimer = window.setInterval(() => this._fetchHistory(), 60 * 60 * 1000);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._refreshTimer !== undefined) window.clearInterval(this._refreshTimer);
  }

  protected updated(changed: PropertyValues): void {
    // First time hass arrives — kick the fetch.
    if (changed.has('hass') && this.hass && !this._lastFetchHass) {
      this._fetchHistory();
    }
    // Action-handler binding (tap → more-info).
    if (changed.has('hass') || changed.has('_history')) {
      const card = this.shadowRoot?.querySelector<HTMLElement>('ha-card');
      if (card) bindActionHandler(card, { hasHold: false, hasDoubleClick: false });
    }
  }

  private async _fetchHistory(): Promise<void> {
    if (!this.hass || !this._config) return;
    this._lastFetchHass = this.hass;
    const hours = Math.min(this._config.hours ?? 24, 168);
    const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    try {
      const url = `history/period/${encodeURIComponent(start)}?filter_entity_id=${encodeURIComponent(this._config.entity)}&minimal_response`;
      // callApi isn't in the local HomeAssistant type but exists at
      // runtime; cast through unknown to call it.
      const callApi = (this.hass as unknown as {
        callApi: <T>(method: string, path: string) => Promise<T>;
      }).callApi;
      const result = (await callApi.call(this.hass, 'GET', url)) as Array<
        Array<{ s: string; lu?: number }>
      > | null;
      if (!Array.isArray(result) || result.length === 0) {
        this._history = [];
        return;
      }
      const entries = result[0] ?? [];
      const points: HistoryPoint[] = [];
      for (const e of entries) {
        const v = parseFloat(e.s);
        if (!isNaN(v)) {
          // `lu` (last_updated) is a Unix timestamp in seconds in minimal_response.
          const t = (e.lu ?? Date.now() / 1000) * 1000;
          points.push({ t, v });
        }
      }
      this._history = points;
    } catch {
      // Silently fail — sparkline degrades to a flat line + current value.
      this._history = [];
    }
  }

  private _onAction(ev: ActionHandlerEvent): void {
    if (!this.hass || !this._config || ev.detail.action !== 'tap') return;
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: {
          config: {
            entity: this._config.entity,
            tap_action: { action: 'more-info' },
          },
          action: 'tap',
        },
      }),
    );
  }

  private _renderSparkline(): TemplateResult {
    const pts = this._history;
    if (pts.length < 2) {
      // No data — flat line.
      return html`<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path class="line" d="M0,20 L100,20" />
      </svg>`;
    }
    const tMin = pts[0]!.t;
    const tMax = pts[pts.length - 1]!.t;
    const tRange = Math.max(tMax - tMin, 1);
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const p of pts) {
      if (p.v < vMin) vMin = p.v;
      if (p.v > vMax) vMax = p.v;
    }
    const vRange = Math.max(vMax - vMin, 1e-6);

    const W = 100;
    const H = 40;
    const PAD = 1;
    const coords = pts.map((p) => {
      const x = ((p.t - tMin) / tRange) * (W - 2 * PAD) + PAD;
      const y = H - PAD - ((p.v - vMin) / vRange) * (H - 2 * PAD);
      return [x, y] as const;
    });
    const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const fillPath = `${linePath} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;

    return html`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path class="fill" d=${fillPath} />
      <path class="line" d=${linePath} />
    </svg>`;
  }

  /**
   * Should we delegate to apexcharts-card? Requires the per-card
   * `use_apexcharts` flag AND a runtime-loaded `apexcharts-card`
   * custom element. Falls back to built-in SVG when either is missing.
   */
  private _shouldUseApex(): boolean {
    if (this._config?.use_apexcharts !== true) return false;
    try {
      return !!customElements.get('apexcharts-card');
    } catch {
      return false;
    }
  }

  /** Build an apexcharts-card config from sparkline config. */
  private _buildApexConfig(): Record<string, unknown> {
    const hours = this._config.hours ?? 24;
    return {
      type: 'custom:apexcharts-card',
      graph_span: `${hours}h`,
      header: { show: true, title: this._config.name ?? '' },
      apex_config: {
        chart: { height: 80, sparkline: { enabled: !this._config.show_extrema } },
      },
      series: [
        {
          entity: this._config.entity,
          type: 'line',
          stroke_width: 2,
          opacity: 0.18,
          ...(this._config.color ? { color: this._config.color } : {}),
        },
      ],
    };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    if (this._shouldUseApex()) {
      // apexcharts-card is a third-party custom element; the type
      // assertion is purely to satisfy lit-html attribute binding.
      // The card reads `.hass` and `.config` via property setters.
      const apexConfig = this._buildApexConfig();
      return html`
        <apexcharts-card
          .hass=${this.hass}
          .config=${apexConfig}
        ></apexcharts-card>
      `;
    }

    const stateObj = this.hass.states[this._config.entity];
    const name =
      this._config.name ||
      (stateObj?.attributes?.friendly_name as string | undefined) ||
      this._config.entity;
    const value = stateObj?.state ?? '—';
    const unit = (stateObj?.attributes?.unit_of_measurement as string | undefined) ?? '';

    const showValue = this._config.show_value !== false;
    const showExtrema = this._config.show_extrema === true;
    const style = this._config.color ? `--de-spark-color: ${this._config.color}` : '';

    let extrema = html``;
    if (showExtrema && this._history.length > 0) {
      let mn = Infinity;
      let mx = -Infinity;
      for (const p of this._history) {
        if (p.v < mn) mn = p.v;
        if (p.v > mx) mx = p.v;
      }
      extrema = html`<div class="extrema"><span>${mn.toFixed(1)}${unit}</span><span>${mx.toFixed(1)}${unit}</span></div>`;
    }

    return html`
      <ha-card style=${style} role="button" tabindex="0" @action=${this._onAction}>
        <div class="header">
          <span class="name">${name}</span>
          ${showValue ? html`<span class="value">${value}${unit}</span>` : ''}
        </div>
        ${this._renderSparkline()}
        ${extrema}
      </ha-card>
    `;
  }

  public static getStubConfig(): SparklineCardConfig {
    return { type: 'custom:dashboard-enhanced-sparkline-card', entity: 'sensor.example' };
  }
}

customElements.define('dashboard-enhanced-sparkline-card', DashboardEnhancedSparklineCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'dashboard-enhanced-sparkline-card')) {
  window.customCards.push({
    type: 'dashboard-enhanced-sparkline-card',
    name: 'DashboardEnhanced Sparkline',
    description: 'Compact tile with the entity value + a 24h history sparkline. SVG-only, no chart libraries.',
    preview: true,
  } as { type: string; name: string; description: string });
}
