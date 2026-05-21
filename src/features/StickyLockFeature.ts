// ====================================================================
// STICKY-LOCK CUSTOM TILE FEATURE
// ====================================================================
// HA Lovelace lets a plugin register custom "card features" that slot
// into the tile-card's bottom feature row (alongside `select-options`,
// `target-temperature`, etc.). That row exists *for free* whenever a
// tile-card has any feature, so adding a custom feature lets us pack a
// second control into the same tile without growing the tile vertically.
//
// This one renders a tiny lock icon-button at the trailing edge of the
// feature row. The button reads / toggles a SEPARATE entity from the
// tile's primary entity — typically a `input_boolean.<room>_sticky`
// that pins the room mode against auto-changes.
//
// Why "feature" not "card":
//   - Stays inside `hui-tile-card`. The strategy keeps emitting a
//     standard `tile` config (entity = room_mode select), so all of
//     HA's tile machinery (theming, focus, RTL, accessibility, action
//     handling) keeps working without us reimplementing it.
//   - Rides in the existing `features_position: bottom` row, so the
//     `select-options` mode picker and the lock toggle share one row.
//     Net height: identical to a plain mode tile.
//
// References:
//   developers.home-assistant.io/docs/frontend/custom-ui/custom-card-feature/
//   home-assistant/frontend → src/panels/lovelace/cards/hui-tile-card.ts
//   home-assistant/frontend → src/panels/lovelace/create-element/create-card-feature-element.ts
// ====================================================================

import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant, HassEntity } from '../types/homeassistant';
import { setupLocalize, localize } from '../utils/localize';

// HA's frontend registers a few global hooks for plugin extensions. The
// Window typing in other card files is intentionally narrow; we extend
// here only for the feature registry without re-declaring customCards.
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

interface StickyLockFeatureConfig {
  type: string;
  sticky_entity: string;
}

// HA passes a `context` object to each feature with the parent tile's
// entity_id and (sometimes) area_id. We only read entity_id here.
interface CardFeatureContext {
  entity_id?: string;
}

const MDI_LOCK = 'mdi:lock';
const MDI_LOCK_OPEN = 'mdi:lock-open-variant';

class Simon42StickyLockFeature extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @property({ attribute: false }) accessor context: CardFeatureContext | undefined;
  @state() accessor _config: StickyLockFeatureConfig | undefined;

  // HA calls this with the YAML feature config. Required to throw on
  // bad input (the docs example does too).
  public setConfig(config: StickyLockFeatureConfig): void {
    if (!config?.sticky_entity || typeof config.sticky_entity !== 'string') {
      throw new Error('simon42-sticky-lock-feature: `sticky_entity` is required');
    }
    this._config = config;
  }

  // Optional but recommended: lets HA's feature-row layout know how
  // tall we want to be. Tile-card's bottom row is 42px by default.
  public static getStubConfig(): StickyLockFeatureConfig {
    return { type: 'custom:simon42-sticky-lock-feature', sticky_entity: '' };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('_config') || changed.has('context')) return true;
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    if (!oldHass || !this._config) return true;
    return (
      oldHass.states[this._config.sticky_entity] !==
      this.hass?.states[this._config.sticky_entity]
    );
  }

  private get _locked(): boolean {
    if (!this._config || !this.hass) return false;
    const s = this.hass.states[this._config.sticky_entity] as HassEntity | undefined;
    return s?.state === 'on';
  }

  private _onClick(ev: Event): void {
    // Stop the tile's primary tap_action from also firing (otherwise
    // the more-info dialog for the mode entity opens on top).
    ev.stopPropagation();
    ev.preventDefault();
    if (!this._config || !this.hass) return;
    this.hass.callService('input_boolean', 'toggle', {
      entity_id: this._config.sticky_entity,
    });
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    // If the configured entity doesn't exist, render nothing (rather
    // than a confusing dead button).
    if (!this.hass.states[this._config.sticky_entity]) return nothing;

    setupLocalize(this.hass);
    const locked = this._locked;
    return html`
      <button
        class=${locked ? 'btn locked' : 'btn'}
        role="switch"
        aria-checked=${locked ? 'true' : 'false'}
        aria-label=${locked
          ? localize('sticky_lock.aria_locked')
          : localize('sticky_lock.aria_unlocked')}
        title=${locked
          ? localize('sticky_lock.title_on')
          : localize('sticky_lock.title_off')}
        @click=${this._onClick}
      >
        <ha-icon icon=${locked ? MDI_LOCK : MDI_LOCK_OPEN}></ha-icon>
      </button>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: var(--feature-height, 36px);
    }
    .btn {
      all: unset;
      cursor: pointer;
      box-sizing: border-box;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      transition: background-color 120ms ease, color 200ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover {
      background: var(--secondary-background-color);
    }
    .btn:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .btn.locked {
      color: var(--state-active-color, var(--primary-color));
      background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) 18%, transparent);
    }
    .btn ha-icon {
      --mdc-icon-size: 20px;
    }
  `;
}

customElements.define('simon42-sticky-lock-feature', Simon42StickyLockFeature);

// Surface the feature in HA's "Add feature" picker in the tile-card
// visual editor.
window.customCardFeatures = window.customCardFeatures || [];
if (!window.customCardFeatures.some((f) => f.type === 'simon42-sticky-lock-feature')) {
  window.customCardFeatures.push({
    type: 'simon42-sticky-lock-feature',
    name: 'Sticky Lock (Simon42)',
    // Only offer this feature when the parent tile points at an
    // input_select (the room-mode use-case). Users adapting the
    // feature to other domains can still wire it manually via YAML.
    supported: (hass, context) => {
      const eid = context?.entity_id;
      if (!eid) return false;
      const state = hass.states[eid];
      if (!state) return false;
      return eid.startsWith('input_select.');
    },
    configurable: true,
  });
}
