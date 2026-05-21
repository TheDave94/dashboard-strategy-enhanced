// ====================================================================
// SCREENSAVER CARD — wall-panel idle overlay
// ====================================================================
// Used by `panel_mode: wall`. Renders a full-screen overlay with a
// clock + weather/sensor entity after N minutes of no user
// interaction. Tapping anywhere dismisses; document-level pointer/
// keydown events reset the idle timer.
//
// Lives as a regular custom card (so users can use it standalone in
// other dashboards too if they want).
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';

interface ScreensaverCardConfig {
  type: string;
  /** Trigger entity (typically a weather.* or sensor.*).
   *  Renders state + attributes. Optional. */
  entity?: string;
  /** Idle minutes before activating. Default 5. */
  idle_minutes?: number;
  /** Show the clock. Default true. */
  show_clock?: boolean;
  /** Show the date below the clock. Default true. */
  show_date?: boolean;
}

class OrielScreensaverCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _active = false;
  @state() accessor _now = new Date();

  private _config!: ScreensaverCardConfig;
  private _idleTimer: number | undefined;
  private _clockTimer: number | undefined;
  private _activityListeners: Array<[string, (e: Event) => void]> = [];

  static styles = css`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: var(--card-background-color, #000);
      color: var(--primary-text-color, #fff);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 600ms ease-in-out;
      gap: var(--ha-space-4, 16px);
      font-family: var(--ha-font-family-body, inherit);
    }
    .overlay.active {
      opacity: 1;
      pointer-events: auto;
      cursor: pointer;
    }
    .clock {
      font-size: clamp(72px, 18vw, 192px);
      font-weight: var(--ha-font-weight-medium, 500);
      letter-spacing: -0.02em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .date {
      font-size: clamp(20px, 4vw, 36px);
      font-weight: var(--ha-font-weight-normal, 400);
      opacity: 0.85;
    }
    .entity {
      font-size: clamp(18px, 3vw, 28px);
      opacity: 0.75;
      margin-top: var(--ha-space-4, 16px);
      display: flex;
      align-items: center;
      gap: var(--ha-space-3, 12px);
    }
    ha-icon { --mdc-icon-size: 1.5em; }
  `;

  public setConfig(config: ScreensaverCardConfig): void {
    this._config = config ?? { type: 'custom:oriel-screensaver-card' };
    this._resetIdle();
  }

  public getCardSize(): number {
    return 0;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._installActivityListeners();
    this._startClockTick();
    this._resetIdle();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const [evt, fn] of this._activityListeners) {
      window.removeEventListener(evt, fn, { capture: true } as EventListenerOptions);
    }
    this._activityListeners = [];
    if (this._idleTimer !== undefined) window.clearTimeout(this._idleTimer);
    if (this._clockTimer !== undefined) window.clearInterval(this._clockTimer);
  }

  private _installActivityListeners(): void {
    const handler = (): void => {
      if (this._active) this._active = false;
      this._resetIdle();
    };
    const events: string[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    for (const evt of events) {
      window.addEventListener(evt, handler, { capture: true, passive: true });
      this._activityListeners.push([evt, handler]);
    }
  }

  private _resetIdle(): void {
    if (this._idleTimer !== undefined) window.clearTimeout(this._idleTimer);
    const minutes = this._config?.idle_minutes ?? 5;
    this._idleTimer = window.setTimeout(() => {
      this._active = true;
    }, minutes * 60 * 1000);
  }

  private _startClockTick(): void {
    // Update every 15s — fine for HH:MM display.
    this._clockTimer = window.setInterval(() => {
      this._now = new Date();
    }, 15_000);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._active) return nothing;

    const showClock = this._config?.show_clock !== false;
    const showDate = this._config?.show_date !== false;
    const entityId = this._config?.entity;
    const entState = entityId ? this.hass?.states[entityId] : undefined;

    const hh = String(this._now.getHours()).padStart(2, '0');
    const mm = String(this._now.getMinutes()).padStart(2, '0');
    const dateStr = this._now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return html`
      <div class="overlay active" @click=${this._dismiss}>
        ${showClock ? html`<div class="clock">${hh}:${mm}</div>` : nothing}
        ${showDate ? html`<div class="date">${dateStr}</div>` : nothing}
        ${entState
          ? html`
              <div class="entity">
                ${entState.attributes?.icon
                  ? html`<ha-icon icon=${entState.attributes.icon as string}></ha-icon>`
                  : nothing}
                <span>${entState.state}${entState.attributes?.unit_of_measurement || ''}</span>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _dismiss = (): void => {
    this._active = false;
    this._resetIdle();
  };
}

customElements.define('oriel-screensaver-card', OrielScreensaverCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-screensaver-card')) {
  window.customCards.push({
    type: 'oriel-screensaver-card',
    name: 'Oriel Screensaver',
    description: 'Full-screen clock+weather overlay after N minutes idle. For wall-mounted tablets.',
  });
}
