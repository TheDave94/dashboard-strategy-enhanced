// ====================================================================
// HA action-handler integration — shared utility
// ====================================================================
// HA's frontend registers a global `<action-handler>` custom element
// that custom cards bind to in order to support tap / hold /
// double-tap, including keyboard activation (Enter / Space) when the
// target has `tabindex`.
//
// Used by oriel-zone-presence-card (per-zone dot), oriel-summary-
// card (the whole tile), and any future card that needs richer-than-
// `@click` interaction. Identical contract to HA's official
// `actionHandler` directive — we expose a `bindActionHandler(node,
// opts)` helper because the directive itself isn't exported as a
// loose function we can call outside Lit's template flow.
//
// References:
//   developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
//   home-assistant/frontend → src/panels/lovelace/common/directives/action-handler-directive.ts
// ====================================================================

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

type ActionHandlerElement = HTMLElement & {
  bind: (el: HTMLElement, opts: ActionHandlerOptions) => void;
};

let _actionHandlerEl: ActionHandlerElement | null = null;

/**
 * Locate (or lazily create) HA's `<action-handler>` element. It's a
 * singleton in the document body; HA frontends register it on first
 * use of the directive, so it normally exists by the time any custom
 * card mounts. We create it defensively in case it doesn't.
 */
function getActionHandler(): ActionHandlerElement {
  if (_actionHandlerEl) return _actionHandlerEl;
  const existing = document.body.querySelector('action-handler') as ActionHandlerElement | null;
  if (existing) {
    _actionHandlerEl = existing;
    return _actionHandlerEl;
  }
  const el = document.createElement('action-handler') as ActionHandlerElement;
  document.body.appendChild(el);
  _actionHandlerEl = el;
  return _actionHandlerEl;
}

/**
 * Bind HA's action-handler to a DOM node. The node will fire a single
 * `action` CustomEvent with `detail.action ∈ 'tap' | 'hold' |
 * 'double_tap'` matching the user's gesture. Keyboard Enter / Space
 * also fire 'tap' when the node has `tabindex`.
 *
 * Lifecycle: HA's `<action-handler>` element attaches its listeners
 * directly to `el`. When the bound node is GC'd (e.g. the card is
 * removed from the DOM), the listeners go with it — no manual
 * `unbind` step is needed.
 */
export function bindActionHandler(el: HTMLElement, opts: ActionHandlerOptions): void {
  const handler = getActionHandler();
  if (typeof handler.bind === 'function') {
    handler.bind(el, opts);
  }
}

/**
 * For tests / harnesses that reset DOM between cases. Production
 * code doesn't need to call this — the action-handler element lives
 * for the lifetime of the document.
 */
export function _resetActionHandlerForTesting(): void {
  _actionHandlerEl = null;
}

export type ActionHandlerEventDetail = {
  action: 'tap' | 'hold' | 'double_tap';
};
export type ActionHandlerEvent = CustomEvent<ActionHandlerEventDetail>;
