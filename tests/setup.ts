// ====================================================================
// Vitest global setup — happy-dom environment for the card tests.
// ====================================================================
// HA's frontend ships custom elements (<ha-card>, <ha-icon>,
// <action-handler>) that the cards reference in their templates and
// JS code. In a happy-dom test environment those don't exist, so we
// register tiny shims here. The shims are not visually correct, but
// they satisfy:
//   - `customElements.get()` returning a defined class
//   - querySelector('ha-card') finding a node our cards mounted
//   - <action-handler>.bind(node, opts) being callable from utils/
//
// Cards' own custom elements (`dashboard-enhanced-summary-card`, etc.) are
// registered when each card module is imported by its test file.
// ====================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

if (!customElements.get('ha-card')) {
  class HACardShim extends HTMLElement {}
  customElements.define('ha-card', HACardShim);
}

if (!customElements.get('ha-icon')) {
  class HAIconShim extends HTMLElement {
    static get observedAttributes() {
      return ['icon'];
    }
  }
  customElements.define('ha-icon', HAIconShim);
}

if (!customElements.get('action-handler')) {
  // Real HA element supports a `.bind(el, opts)` method we forward to.
  // We record bindings so tests can assert on them if they want.
  class ActionHandlerShim extends HTMLElement {
    public bindings: Array<{ el: HTMLElement; opts: unknown }> = [];
    bind(el: HTMLElement, opts: unknown): void {
      this.bindings.push({ el, opts });
    }
  }
  customElements.define('action-handler', ActionHandlerShim);
}

// Ensure a singleton <action-handler> exists in the body so the
// shared utility in src/utils/action-handler.ts finds it on first
// lookup (matches the real HA frontend behaviour).
if (!document.body.querySelector('action-handler')) {
  document.body.appendChild(document.createElement('action-handler'));
}
