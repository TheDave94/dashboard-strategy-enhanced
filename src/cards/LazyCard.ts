// ====================================================================
// LAZY CARD — IntersectionObserver-deferred child card
// ====================================================================
// Wraps a single Lovelace card config and only mounts it once the
// element scrolls into view (plus rootMargin so it's ready by the
// time the user actually sees it). Once mounted, stays mounted —
// no re-unmount on scroll-out (predictable behaviour > marginal
// memory wins).
//
// Used by OverviewViewStrategy to defer sections beyond the initial
// viewport. Addresses Part 0 #3 (large-install perf cliff) without
// touching HA frontend internals — the strategy just emits this
// card type in place of regular ones.
// ====================================================================

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceCardConfig } from '../types/lovelace';

interface LazyCardConfig {
  type: string;
  card: LovelaceCardConfig;
  /** Margin around the viewport to consider "near visible". Default 200px. */
  root_margin?: string;
  /** Reserved height while the child hasn't mounted yet. Helps avoid
   *  layout jank when the lazy card finally swaps in. Default 200px. */
  placeholder_height?: string;
}

class Simon42LazyCard extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @state() accessor _mounted = false;

  private _config!: LazyCardConfig;
  private _observer?: IntersectionObserver;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .placeholder {
      width: 100%;
      min-height: var(--s42-lazy-min-height, 200px);
    }
  `;

  public setConfig(config: LazyCardConfig): void {
    if (!config?.card || typeof config.card !== 'object') {
      throw new Error('simon42-lazy-card: `card` config required');
    }
    this._config = config;
  }

  public getCardSize(): number {
    // We can't ask the child until it's mounted; estimate from
    // placeholder_height. HA accepts a number — 1 = 56px row.
    return 3;
  }

  protected firstUpdated(): void {
    const rootMargin = this._config.root_margin ?? '200px';
    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this._mounted) {
            this._mounted = true;
            this._observer?.disconnect();
            this._observer = undefined;
            break;
          }
        }
      },
      { rootMargin },
    );
    this._observer.observe(this);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = undefined;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._mounted) {
      const minHeight = this._config?.placeholder_height ?? '200px';
      return html`<div
        class="placeholder"
        style=${`--s42-lazy-min-height: ${minHeight}`}
      ></div>`;
    }
    // HA exposes <hui-card> as a public custom element for embedding
    // arbitrary card configs. The element handles type-resolution,
    // hass propagation, and grid-options forwarding.
    return html`<hui-card .config=${this._config.card} .hass=${this.hass}></hui-card>`;
  }
}

customElements.define('simon42-lazy-card', Simon42LazyCard);

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'simon42-lazy-card')) {
  window.customCards.push({
    type: 'simon42-lazy-card',
    name: 'Simon42 Lazy Card',
    description:
      'IntersectionObserver wrapper that defers child card mounting until the viewport reaches it. Used internally by the strategy to lazy-mount sections beyond the initial viewport.',
  });
}
