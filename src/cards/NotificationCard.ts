// ====================================================================
// NOTIFICATION CARD — ephemeral safety alert surface
// ====================================================================
// Sticky full-width banner that appears at the top of the overview
// when a configured trigger entity reports an active state. Common
// uses: smoke/gas/water-leak alarms, doorbells, security alarms,
// motion in monitored zones.
//
// Strategy emits this card automatically at the top of the
// overview when `notification_triggers` is configured. Card
// auto-hides when no trigger is active; sticky-positioned so it
// stays visible on scroll while active. Tap dismisses for the
// session (re-fires on next active state transition).
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';

interface NotificationTrigger {
  entity: string;
  /** State value that's considered "active". Default 'on'. */
  active_state?: string;
  /** Display title override. Default: entity friendly_name. */
  title?: string;
  /** Optional message override. Default: entity state + unit. */
  message?: string;
  /** Severity affects the visual treatment. Default 'warning'. */
  severity?: 'info' | 'warning' | 'critical';
  /** Optional MDI icon. Defaults derived from severity. */
  icon?: string;
}

interface NotificationCardConfig {
  type: string;
  triggers: NotificationTrigger[];
}

const ICON_BY_SEVERITY = {
  info: 'mdi:information',
  warning: 'mdi:alert',
  critical: 'mdi:alert-octagon',
};

class OrielNotificationCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _dismissedIds = new Set<string>();

  private _config!: NotificationCardConfig;

  static styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .banner {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3, 12px);
      padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
      animation: slideIn 220ms ease-out;
      margin-bottom: var(--ha-space-2, 8px);
    }
    @keyframes slideIn {
      from { transform: translateY(-12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .banner.info { background: var(--info-color); color: var(--text-primary-color, white); }
    .banner.warning { background: var(--warning-color); color: var(--text-primary-color, white); }
    .banner.critical {
      background: var(--error-color);
      color: var(--text-primary-color, white);
      animation: slideIn 220ms ease-out, pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 18px color-mix(in srgb, var(--error-color) 40%, transparent); }
      50% { box-shadow: 0 4px 30px color-mix(in srgb, var(--error-color) 85%, transparent); }
    }
    .icon { --mdc-icon-size: 28px; flex: 0 0 auto; }
    .body { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; }
    .title { font-size: var(--ha-font-size-m, 16px); font-weight: var(--ha-font-weight-semibold, 600); line-height: 1.2; }
    .message { font-size: var(--ha-font-size-s, 14px); opacity: 0.92; line-height: 1.3; }
    .dismiss {
      all: unset;
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      flex: 0 0 auto;
      transition: background 120ms;
    }
    .dismiss:hover { background: rgba(0, 0, 0, 0.15); }
    .dismiss ha-icon { --mdc-icon-size: 20px; }
  `;

  public setConfig(config: NotificationCardConfig): void {
    if (!config || !Array.isArray(config.triggers)) {
      throw new Error('oriel-notification-card: `triggers` array required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): { columns: number | 'full'; rows: number | 'auto' } {
    return { columns: 'full', rows: 'auto' };
  }

  private _isActive(t: NotificationTrigger): boolean {
    const state = this.hass?.states[t.entity]?.state;
    return state === (t.active_state ?? 'on');
  }

  private _dismiss = (entityId: string): void => {
    this._dismissedIds = new Set(this._dismissedIds).add(entityId);
  };

  // Re-fire on state transition: when entity flips inactive→active,
  // un-dismiss it. Called from willUpdate.
  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('hass') || !this.hass) return;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    if (!oldHass || !this._config) return;
    const dismissed = new Set(this._dismissedIds);
    let mutated = false;
    for (const t of this._config.triggers) {
      if (!dismissed.has(t.entity)) continue;
      const wasActive = oldHass.states[t.entity]?.state === (t.active_state ?? 'on');
      const isActive = this._isActive(t);
      if (!wasActive && isActive) {
        dismissed.delete(t.entity);
        mutated = true;
      }
    }
    if (mutated) this._dismissedIds = dismissed;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const active = this._config.triggers.filter(
      (t) => this._isActive(t) && !this._dismissedIds.has(t.entity),
    );
    if (active.length === 0) return nothing;

    return html`
      ${active.map((t) => {
        const severity = t.severity ?? 'warning';
        const stateObj = this.hass!.states[t.entity];
        const title =
          t.title || (stateObj?.attributes?.friendly_name as string) || t.entity;
        const message =
          t.message ||
          `${stateObj?.state ?? ''}${(stateObj?.attributes?.unit_of_measurement as string) || ''}`.trim();
        const icon = t.icon || ICON_BY_SEVERITY[severity];
        return html`
          <div class="banner ${severity}">
            <ha-icon class="icon" icon=${icon}></ha-icon>
            <div class="body">
              <div class="title">${title}</div>
              ${message ? html`<div class="message">${message}</div>` : nothing}
            </div>
            <button
              class="dismiss"
              aria-label="Dismiss"
              @click=${() => this._dismiss(t.entity)}
            >
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>
        `;
      })}
    `;
  }
}

customElements.define('oriel-notification-card', OrielNotificationCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-notification-card')) {
  window.customCards.push({
    type: 'oriel-notification-card',
    name: 'Oriel Notification Banner',
    description:
      'Ephemeral safety-alert banner at the top of the overview. Sticky on scroll, auto-hides when no trigger active, re-fires on state transition.',
  });
}
