// ====================================================================
// Simple `<ha-form>` config editor for the strategy's custom cards
// ====================================================================
// Each custom card returns one of these from `static getConfigElement()`.
// HA's visual editor then renders an inline form instead of falling
// back to raw YAML. Cards pass their own schema + label-key prefix.
//
// Lazy-loaded so the editor chunk only pulls Lit when the user
// actually opens a card editor.
// ====================================================================

import { LitElement, html, css, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types/homeassistant';
import { setupLocalize, localize } from '../utils/localize';

interface HaFormSchemaItem {
  name: string;
  selector?: Record<string, unknown>;
  required?: boolean;
}

export interface SimpleConfigEditorConfig {
  schema: HaFormSchemaItem[];
  /** Translation key prefix for labels (e.g. `card.simon42-summary-card`). */
  labelPrefix: string;
}

/**
 * Build a one-off `<simon42-simple-config-editor>` element configured
 * with the given schema + label prefix. Each custom card constructs
 * its own instance from `getConfigElement()`.
 */
export function createSimpleConfigEditor(
  schema: HaFormSchemaItem[],
  labelPrefix: string,
): HTMLElement {
  const tag = 'simon42-simple-config-editor';
  if (!customElements.get(tag)) {
    customElements.define(tag, SimpleConfigEditorElement);
  }
  const el = document.createElement(tag) as SimpleConfigEditorElement;
  el.schema = schema;
  el.labelPrefix = labelPrefix;
  return el;
}

class SimpleConfigEditorElement extends LitElement {
  @property({ attribute: false }) accessor hass: HomeAssistant | undefined;
  @property({ attribute: false }) accessor schema: HaFormSchemaItem[] = [];
  @property({ attribute: false }) accessor labelPrefix = '';
  @state() accessor _config: Record<string, unknown> = {};

  public setConfig(config: Record<string, unknown>): void {
    this._config = { ...config };
  }

  static styles = css`
    :host { display: block; }
  `;

  protected render(): TemplateResult {
    if (this.hass) setupLocalize(this.hass);
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this.schema}
        .computeLabel=${(s: { name: string }) => {
          const key = `${this.labelPrefix}.${s.name}`;
          const text = localize(key);
          return text === key ? s.name : text;
        }}
        .computeHelper=${(s: { name: string }) => {
          const key = `${this.labelPrefix}.${s.name}_desc`;
          const text = localize(key);
          return text === key ? '' : text;
        }}
        @value-changed=${(ev: CustomEvent<{ value: Record<string, unknown> }>) => {
          this._config = ev.detail.value;
          this.dispatchEvent(
            new CustomEvent('config-changed', {
              bubbles: true,
              composed: true,
              detail: { config: this._config },
            }),
          );
        }}
      ></ha-form>
    `;
  }
}
