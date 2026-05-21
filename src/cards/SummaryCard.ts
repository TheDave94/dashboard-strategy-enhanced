// ====================================================================
// SUMMARY CARD — Reactive summary tile for lights/covers/security/batteries (LitElement)
// ====================================================================

import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { Registry } from '../Registry';
import { trackHassUpdate, debugLog, timeStart, timeEnd } from '../utils/debug';
import { localize } from '../utils/localize';
import { getBatteryEntities, SECURITY_EXCLUDED_PLATFORMS } from '../utils/entity-filter';
import { bindActionHandler, type ActionHandlerEvent } from '../utils/action-handler';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

type SummaryType = 'lights' | 'covers' | 'security' | 'batteries' | 'climate';

interface SummaryCardConfig {
  summary_type: SummaryType;
  hide_mobile_app_batteries?: boolean;
  hide_battery_notes_entities?: boolean;
  battery_critical_threshold?: number;
  /**
   * Density of the tile. 'comfortable' (default) is the original layout —
   * stacked icon + label, generous padding. 'compact' is a horizontal
   * single-row layout that halves the tile's vertical footprint, useful
   * when the user wants the summary row to take less of the overview.
   */
  density?: 'compact' | 'comfortable';
  /**
   * What to render as the tile's secondary line. Mirrors HA's tile-card
   * `state_content` convention. Currently supported values: `count`
   * (shows the relevant entity count, e.g. "3 on"). Omitting the field
   * keeps the original icon+name layout. Accepts a string or array of
   * strings; array variants concatenate with " · " separators.
   *
   * Available since v3.3.
   */
  state_content?: string | string[];
  /**
   * Show a delta indicator comparing the current count to yesterday's
   * at-the-same-time count. Fires one history API call on mount + an
   * hourly refresh. No effect when neither value resolves (e.g. less
   * than 24h of history). Default false.
   *
   * Available since v3.4.
   */
  show_delta?: boolean;
}

interface DisplayConfig {
  icon: string;
  name: string;
  color: string;
  path: string;
}

const COVER_DEVICE_CLASSES = new Set(['awning', 'blind', 'curtain', 'shade', 'shutter', 'window']);

const SECURITY_COVER_CLASSES = new Set(['door', 'garage', 'gate', 'window']);
const SECURITY_BINARY_SENSOR_CLASSES = new Set(['door', 'window', 'garage_door', 'opening', 'smoke', 'gas', 'moisture']);

const COLOR_MAP: Record<string, string> = {
  orange: 'var(--orange-color, #ff9800)',
  purple: 'var(--purple-color, #9c27b0)',
  yellow: 'var(--yellow-color, #ffc107)',
  red: 'var(--red-color, #f44336)',
  grey: 'var(--disabled-color, #bdbdbd)',
};

class OrielSummaryCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _count = 0;
  // Yesterday's count at the same time, when `show_delta: true`.
  // null = not fetched yet (or fetch failed), number = delta vs today.
  @state() accessor _yesterdayCount: number | null = null;

  private _config!: SummaryCardConfig;
  private _relevantEntityIds: Set<string> | null = null;
  private _deltaRefreshTimer?: number;
  private _yesterdayFetched = false;

  static styles = css`
    :host {
      display: block;
      cursor: pointer;
      /* Container queries scale to the tile's actual rendered width. */
      container-type: inline-size;
      container-name: oriel-summary;

      --oriel-pad: var(--ha-space-3, 12px);
      --oriel-gap: var(--ha-space-2, 8px);
      --oriel-icon: 28px;
      --oriel-name: var(--ha-font-size-s, 13px);
    }
    /* Narrow (< 160px wide cell): half-summary in a 4-col strip. */
    @container oriel-summary (max-width: 160px) {
      :host {
        --oriel-pad: var(--ha-space-2, 10px) var(--ha-space-3, 14px);
        --oriel-gap: var(--ha-space-3, 10px);
        --oriel-icon: 24px;
      }
    }
    /* Wide (> 280px): summary card in a generous lane. */
    @container oriel-summary (min-width: 280px) {
      :host {
        --oriel-icon: 32px;
      }
    }
    /* Manual overrides win against the container queries. */
    :host([density="compact"]) {
      --oriel-pad: var(--ha-space-2, 10px) var(--ha-space-3, 14px) !important;
      --oriel-gap: var(--ha-space-3, 10px) !important;
      --oriel-icon: 26px !important;
    }
    :host([density="comfortable"]) {
      --oriel-pad: var(--ha-space-3, 12px) !important;
      --oriel-gap: var(--ha-space-2, 8px) !important;
      --oriel-icon: 28px !important;
    }
    ha-card {
      padding: var(--oriel-pad);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: var(--oriel-gap);
      height: 100%;
      box-sizing: border-box;
      --ha-card-border-width: 0;
      background: var(--ha-card-background, var(--card-background-color));
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
    }
    /* Compact: switch to a single horizontal row, ~½ vertical footprint.
       Uses logical "text-align: start" so RTL inherits HA's parent
       direction (the inline-axis flips for Arabic/Hebrew automatically). */
    :host([density="compact"]) ha-card {
      flex-direction: row;
      text-align: start;
      justify-content: flex-start;
    }
    ha-card:active {
      transform: scale(0.97);
      transition: transform 0.1s;
    }
    .icon {
      --mdc-icon-size: var(--oriel-icon);
      transition: color 0.3s;
    }
    :host([density="compact"]) .icon {
      flex: 0 0 auto;
    }
    .name {
      font-size: var(--oriel-name);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-condensed, 1.2);
      color: var(--primary-text-color);
    }
    :host([density="compact"]) .name {
      flex: 1 1 auto;
    }
    .state-content {
      font-size: var(--ha-font-size-xs, 11px);
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
      margin-top: 2px;
    }
    :host([density="compact"]) .state-content {
      margin-top: 0;
      margin-left: auto;
    }
    .delta {
      margin-left: 6px;
      font-variant-numeric: tabular-nums;
      font-size: 0.95em;
    }
    .delta-up   { color: var(--warning-color, #ff9800); }
    .delta-down { color: var(--success-color, #4caf50); }
    .delta-zero { color: var(--secondary-text-color); opacity: 0.7; }
  `;

  setConfig(config: SummaryCardConfig): void {
    // HA convention: setConfig throws on invalid input so the visual
    // editor surfaces the error inline instead of silently rendering
    // an empty count.
    if (!config || typeof config !== 'object') {
      throw new Error('oriel-summary-card: config object required');
    }
    if (
      !['lights', 'covers', 'security', 'batteries', 'climate'].includes(config.summary_type)
    ) {
      throw new Error(
        "oriel-summary-card: summary_type must be one of 'lights' | 'covers' | 'security' | 'batteries' | 'climate'",
      );
    }
    this._config = config;
    this._relevantEntityIds = null;
    if (config.density === 'compact' || config.density === 'comfortable') {
      this.setAttribute('density', config.density);
    } else {
      this.removeAttribute('density');
    }
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has('hass') || !this.hass) return;

    trackHassUpdate(`summary-${this._config.summary_type}`);
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    if (!oldHass || oldHass.entities !== this.hass.entities) {
      this._relevantEntityIds = null;
      debugLog(`summary-${this._config.summary_type}: cache invalidated (registry changed)`);
    }

    const newCount = this._calculateCount();
    if (this._count !== newCount) {
      this._count = newCount;
    }

    // Kick the yesterday-count fetch on first hass arrival when
    // `show_delta: true`. Idempotent — only fires once per mount,
    // then a 1h refresh timer keeps it current.
    if (
      this._config.show_delta === true &&
      !this._yesterdayFetched &&
      this.hass
    ) {
      this._yesterdayFetched = true;
      void this._fetchYesterdayCount();
      this._deltaRefreshTimer = window.setInterval(
        () => void this._fetchYesterdayCount(),
        60 * 60 * 1000,
      );
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._deltaRefreshTimer !== undefined) {
      window.clearInterval(this._deltaRefreshTimer);
      this._deltaRefreshTimer = undefined;
    }
  }

  /**
   * Fetch yesterday's count via the history API. We look up each
   * relevant entity at the timestamp 24h ago and count the ones in
   * the "active" state for this summary_type. Costs N requests in
   * the worst case but HA's history endpoint batches by URL.
   */
  private async _fetchYesterdayCount(): Promise<void> {
    if (!this.hass || !this._relevantEntityIds) return;
    const ids = [...this._relevantEntityIds];
    if (ids.length === 0) {
      this._yesterdayCount = null;
      return;
    }
    const now = Date.now();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const oneHourLater = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    try {
      const callApi = (this.hass as unknown as {
        callApi: <T>(method: string, path: string) => Promise<T>;
      }).callApi;
      // History API: a single GET fetches all entities at the start
      // boundary (= the state-as-of). We slice to the first state per
      // entity (HA returns them in time order).
      const path =
        `history/period/${yesterday}` +
        `?end_time=${encodeURIComponent(oneHourLater)}` +
        `&filter_entity_id=${encodeURIComponent(ids.join(','))}` +
        `&minimal_response&no_attributes`;
      const result = await callApi<Array<Array<{ state: string }>>>('GET', path);
      let count = 0;
      for (const series of result || []) {
        const first = series?.[0];
        if (!first) continue;
        if (this._isStateActive(first.state)) count++;
      }
      this._yesterdayCount = count;
    } catch {
      this._yesterdayCount = null;
    }
  }

  /** Whether a state value is "active" for the current summary_type. */
  private _isStateActive(state: string): boolean {
    const type = this._config.summary_type;
    if (type === 'lights') return state === 'on';
    if (type === 'covers') return state === 'open' || state === 'opening';
    if (type === 'security') return state === 'on' || state === 'open' || state === 'unlocked';
    if (type === 'batteries') {
      const n = Number(state);
      return Number.isFinite(n) && n <= (this._config.battery_critical_threshold ?? 20);
    }
    if (type === 'climate')
      return state !== 'off' && state !== 'unavailable' && state !== 'unknown';
    return false;
  }

  private _isEntityRelevant(id: string, _state: HassEntity): boolean {
    return !Registry.isEntityExcludedWithStateCategory(id);
  }

  private _getRelevantEntities(): void {
    if (!this.hass || this._relevantEntityIds) return;
    if (!Registry.initialized) return;

    const type = this._config.summary_type;
    timeStart(`summary-getRelevant-${type}`);
    const hass = this.hass;
    let result: string[];

    switch (this._config.summary_type) {
      case 'lights':
        result = Registry.getVisibleEntityIdsForDomain('light').filter(
          (id) => hass.states[id] && this._isEntityRelevant(id, hass.states[id])
        );
        break;

      case 'covers':
        result = Registry.getVisibleEntityIdsForDomain('cover').filter((id) => {
          const state = hass.states[id];
          if (!state) return false;
          if (!this._isEntityRelevant(id, state)) return false;
          const coverDeviceClass = state.attributes?.device_class;
          if (coverDeviceClass && !COVER_DEVICE_CLASSES.has(coverDeviceClass)) return false;
          return true;
        });
        break;

      case 'security': {
        const lockIds = Registry.getVisibleEntityIdsForDomain('lock');
        const coverIds = Registry.getVisibleEntityIdsForDomain('cover');
        const binarySensorIds = Registry.getVisibleEntityIdsForDomain('binary_sensor');

        result = [];
        for (const id of lockIds) {
          if (hass.states[id] && this._isEntityRelevant(id, hass.states[id])) {
            result.push(id);
          }
        }
        for (const id of coverIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass !== undefined && SECURITY_COVER_CLASSES.has(deviceClass)) {
            result.push(id);
          }
        }
        for (const id of binarySensorIds) {
          const state = hass.states[id];
          if (!state || !this._isEntityRelevant(id, state)) continue;
          const entry = Registry.getEntity(id);
          if (entry?.platform && SECURITY_EXCLUDED_PLATFORMS.has(entry.platform)) continue;
          const deviceClass = state.attributes?.device_class;
          if (deviceClass === undefined || !SECURITY_BINARY_SENSOR_CLASSES.has(deviceClass)) continue;
          // Skip relay-style devices that expose an `opening` binary_sensor
          // alongside their primary switch (e.g. SONOFF ZBMINIR2/L2). The
          // "opening" state mirrors the relay, not a door/window contact.
          if (deviceClass === 'opening' && entry?.device_id) {
            const siblings = Registry.getEntityIdsForDevice(entry.device_id);
            if (siblings.some((sid) => sid.startsWith('switch.'))) continue;
          }
          result.push(id);
        }
        break;
      }

      case 'batteries': {
        result = getBatteryEntities(hass, this._config);
        break;
      }

      case 'climate':
        result = Registry.getVisibleEntityIdsForDomain('climate').filter(
          (id) => hass.states[id] && this._isEntityRelevant(id, hass.states[id])
        );
        break;

      default:
        result = [];
    }

    this._relevantEntityIds = new Set(result);
    debugLog(`summary-${type}: ${result.length} relevant entities`);
    timeEnd(`summary-getRelevant-${type}`);
  }

  private _calculateCount(): number {
    if (!this.hass) return 0;

    this._getRelevantEntities();
    if (!this._relevantEntityIds || this._relevantEntityIds.size === 0) return 0;

    const hass = this.hass;
    let count = 0;

    switch (this._config.summary_type) {
      case 'lights':
        for (const id of this._relevantEntityIds) {
          if (hass.states[id]?.state === 'on') count++;
        }
        return count;

      case 'covers':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s === 'open' || s === 'opening') count++;
        }
        return count;

      case 'security':
        for (const id of this._relevantEntityIds) {
          const state = hass.states[id];
          if (!state) continue;
          if (id.startsWith('lock.') && state.state === 'unlocked') count++;
          else if (id.startsWith('cover.') && state.state === 'open') count++;
          else if (id.startsWith('binary_sensor.') && state.state === 'on') count++;
        }
        return count;

      case 'batteries': {
        const critThreshold = this._config.battery_critical_threshold ?? 20;
        for (const id of this._relevantEntityIds) {
          const state = hass.states[id];
          if (!state) continue;
          if (id.startsWith('binary_sensor.')) {
            if (state.state === 'on') count++;
          } else {
            const unit = state.attributes?.unit_of_measurement;
            if (unit && unit !== '%') continue;
            const value = parseFloat(state.state);
            const isUnavailable = state.state === 'unavailable' || state.state === 'unknown';
            if (isUnavailable || (!isNaN(value) && value < critThreshold)) count++;
          }
        }
        return count;
      }

      case 'climate':
        for (const id of this._relevantEntityIds) {
          const s = hass.states[id]?.state;
          if (s && s !== 'off' && s !== 'unavailable' && s !== 'unknown') count++;
        }
        return count;

      default:
        return 0;
    }
  }

  private _getDisplayConfig(): DisplayConfig {
    const count = this._count;
    const hasItems = count > 0;

    const configs: Record<SummaryType, DisplayConfig> = {
      lights: {
        icon: 'mdi:lamps',
        name: hasItems ? `${count} ${count === 1 ? localize('summary.lights_on_one') : localize('summary.lights_on_many')}` : localize('summary.lights_off'),
        color: hasItems ? 'orange' : 'grey',
        path: 'lights',
      },
      covers: {
        icon: 'mdi:blinds-horizontal',
        name: hasItems ? `${count} ${count === 1 ? localize('summary.covers_open_one') : localize('summary.covers_open_many')}` : localize('summary.covers_closed'),
        color: hasItems ? 'purple' : 'grey',
        path: 'covers',
      },
      security: {
        icon: 'mdi:security',
        name: hasItems ? `${count} ${localize('summary.security_unsafe')}` : localize('summary.security_safe'),
        color: hasItems ? 'yellow' : 'grey',
        path: 'security',
      },
      batteries: {
        icon: hasItems ? 'mdi:battery-alert' : 'mdi:battery-charging',
        name: hasItems ? `${count} ${count === 1 ? localize('summary.batteries_critical_one') : localize('summary.batteries_critical_many')}` : localize('summary.batteries_ok'),
        color: hasItems ? 'red' : 'grey',
        path: 'batteries',
      },
      climate: {
        icon: 'mdi:thermostat',
        name: hasItems ? `${count} ${count === 1 ? localize('summary.climate_active_one') : localize('summary.climate_active_many')}` : localize('summary.climate_off'),
        color: hasItems ? 'orange' : 'grey',
        path: 'climate',
      },
    };

    return configs[this._config.summary_type];
  }

  // Action dispatch — uses HA's action-handler directive (attached in
  // updated()) so tap/hold/double-tap all work, plus Enter/Space when
  // the card has focus. Matches the ZonePresenceCard contract; the
  // SummaryCard config is always a navigate to its summary view.
  private _onAction(ev: ActionHandlerEvent): void {
    if (!this.hass || !this._config) return;
    const action = ev.detail.action;
    // Hold and double-tap default to more-info on the summary's first
    // relevant entity (when available). Tap navigates to the view.
    const displayConfig = this._getDisplayConfig();
    const first = this._relevantEntityIds && [...this._relevantEntityIds][0];
    const config =
      action === 'tap'
        ? { tap_action: { action: 'navigate', navigation_path: displayConfig.path } }
        : first
          ? { entity: first, hold_action: { action: 'more-info' }, double_tap_action: { action: 'more-info' } }
          : { tap_action: { action: 'navigate', navigation_path: displayConfig.path } };
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: { config, action },
      }),
    );
  }

  protected updated(changed: PropertyValues): void {
    if (!this.hass) return;
    // Bind HA's global <action-handler> custom element to the
    // ha-card once, so tap/hold/double-tap all dispatch a single
    // @action event with `detail.action` set. Same pattern as
    // ZonePresenceCard — see /tmp/oriel_audit_2026.md §2.2 for
    // the rationale (raw @click loses keyboard + hold).
    if (!changed.has('hass') && !changed.has('_config')) return;
    const card = this.shadowRoot?.querySelector<HTMLElement>('ha-card');
    if (!card) return;
    bindActionHandler(card, { hasHold: true, hasDoubleClick: true });
  }

  /**
   * Mirror of HA tile-card's `state_content`. Returns the rendered
   * secondary line text, or undefined to skip rendering.
   */
  private _renderStateContent(): string | undefined {
    const sc = this._config?.state_content;
    if (!sc) return undefined;
    const parts = (Array.isArray(sc) ? sc : [sc])
      .map((key) => {
        switch (key) {
          case 'count':
            return this._count > 0 ? `${this._count}` : '0';
          default:
            return '';
        }
      })
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }

  /** Render the today-vs-yesterday delta indicator. */
  private _renderDelta(): TemplateResult | undefined {
    if (this._config?.show_delta !== true) return undefined;
    if (this._yesterdayCount === null) return undefined;
    const delta = this._count - this._yesterdayCount;
    if (delta === 0) return html`<span class="delta delta-zero">±0</span>`;
    const symbol = delta > 0 ? '↑' : '↓';
    const cls = delta > 0 ? 'delta-up' : 'delta-down';
    return html`<span class="delta ${cls}">${symbol}${Math.abs(delta)}</span>`;
  }

  protected render() {
    if (!this._config) return html``;
    const display = this._getDisplayConfig();
    const colorCss = COLOR_MAP[display.color] || COLOR_MAP.grey;
    const stateLine = this._renderStateContent();
    const delta = this._renderDelta();

    return html`
      <ha-card
        role="button"
        tabindex="0"
        aria-label=${display.name}
        @action=${this._onAction}
      >
        <ha-icon class="icon" .icon=${display.icon} style="color: ${colorCss}"></ha-icon>
        <div class="name">${display.name}</div>
        ${stateLine
          ? html`<div class="state-content">${stateLine}${delta ? html` ${delta}` : ''}</div>`
          : delta
            ? html`<div class="state-content">${delta}</div>`
            : ''}
      </ha-card>
    `;
  }

  getCardSize(): number {
    return 1;
  }

  // Tile-card pattern: half-section default, never narrower than 3
  // columns (icon + label needs that minimum to look right). rows: 1
  // is enough for either density variant. See research note 6.1 in
  // commit history for the rationale.
  getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns?: number;
    min_rows?: number;
  } {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  // Picker preview — HA's "Add card" dialog calls this to seed the
  // YAML when the user picks the card. We default to the lights
  // summary (the most universally useful starting point).
  public static getStubConfig(): SummaryCardConfig {
    return { summary_type: 'lights' };
  }

  // Visual config editor — surfaces in HA's "Edit card" dialog instead
  // of the raw YAML fallback. Lazy-imported so SimpleConfigEditor only
  // joins the editor chunk when the user opens an edit dialog.
  public static async getConfigElement(): Promise<HTMLElement> {
    const { createSimpleConfigEditor } = await import('./SimpleConfigEditor');
    return createSimpleConfigEditor(
      [
        {
          name: 'summary_type',
          required: true,
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: 'lights', label: 'Lights' },
                { value: 'covers', label: 'Covers' },
                { value: 'security', label: 'Security' },
                { value: 'batteries', label: 'Batteries' },
                { value: 'climate', label: 'Climate' },
              ],
            },
          },
        },
        {
          name: 'density',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                { value: '', label: 'Auto (container query)' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ],
            },
          },
        },
      ],
      'card.oriel-summary-card',
    );
  }
}

customElements.define('oriel-summary-card', OrielSummaryCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'oriel-summary-card',
  name: 'Oriel Summary Card',
  description: 'Reactive summary tile that counts entities (lights / covers / security / batteries / climate)',
  preview: true,
} as { type: string; name: string; description: string });
