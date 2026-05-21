// ====================================================================
// oriel-voice-fab — floating voice-command button (v3.2.4)
// ====================================================================
// Wraps HA's built-in `<ha-voice-command-button>` (or an Assist API
// trigger if the underlying element isn't registered) and anchors it
// to the viewport's bottom-right corner so it's reachable on every
// emitted view.
//
// The element itself is provided by HA core; this card is just a
// styled wrapper that calls into the existing Assist pipeline via a
// service call when tapped.
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import type { HomeAssistant } from '../types/homeassistant';

interface VoiceFabConfig {
  type: string;
  /** Override the default mic icon. */
  icon?: string;
  /** Position offset from viewport edges (CSS length). Default 16px. */
  offset?: string;
}

class OrielVoiceFab extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _config: VoiceFabConfig | undefined;

  static styles = css`
    :host {
      display: block;
    }
    .fab {
      position: fixed;
      bottom: var(--oriel-voice-fab-offset, 16px);
      right: var(--oriel-voice-fab-offset, 16px);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999;
      transition: transform 0.15s ease, box-shadow 0.2s ease;
      border: none;
      padding: 0;
    }
    .fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .fab:active {
      transform: scale(0.95);
    }
    .fab ha-icon {
      --mdc-icon-size: 26px;
    }
  `;

  public setConfig(config: VoiceFabConfig): void {
    this._config = config;
    if (config.offset) {
      this.style.setProperty('--oriel-voice-fab-offset', config.offset);
    }
  }

  public getCardSize(): number {
    return 0; // FAB doesn't occupy layout space
  }

  public getGridOptions(): { columns: number | 'full'; rows: number | 'auto' } {
    return { columns: 'full', rows: 0 };
  }

  private _onClick(): void {
    if (!this.hass) return;
    // Prefer HA's voice command button if registered (it owns the
    // entire conversation pipeline). Fallback: open the Assist
    // dialog via service.
    const VoiceButton = customElements.get('ha-voice-command-button');
    if (VoiceButton) {
      // Programmatically click the offscreen element (HA's button
      // handles all the WS handshakes when it receives a click).
      const btn = this.shadowRoot?.querySelector<HTMLElement>('ha-voice-command-button');
      btn?.click();
      return;
    }
    // Fallback: fire the Assist dialog show-dialog event. This is the
    // same event HA's own top-bar mic button dispatches.
    this.dispatchEvent(
      new CustomEvent('hass-show-dialog', {
        bubbles: true,
        composed: true,
        detail: { dialogTag: 'ha-voice-command-dialog', dialogImport: () => Promise.resolve() },
      }),
    );
  }

  protected render(): TemplateResult {
    if (!this.hass) return html``;
    const icon = this._config?.icon ?? 'mdi:microphone';
    const VoiceButton = customElements.get('ha-voice-command-button');
    return html`
      <button class="fab" @click=${this._onClick} aria-label="Voice assistant">
        <ha-icon icon=${icon}></ha-icon>
        ${VoiceButton
          ? html`<ha-voice-command-button style="display:none;"></ha-voice-command-button>`
          : nothing}
      </button>
    `;
  }

  public static getStubConfig(): VoiceFabConfig {
    return { type: 'custom:oriel-voice-fab' };
  }
}

customElements.define('oriel-voice-fab', OrielVoiceFab);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'oriel-voice-fab')) {
  window.customCards.push({
    type: 'oriel-voice-fab',
    name: 'Oriel Voice FAB',
    description: 'Floating voice-command button that calls HA Assist on tap.',
  });
}
