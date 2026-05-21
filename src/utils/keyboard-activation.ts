// ====================================================================
// Keyboard activation helper (a11y) — v4.7.0
// ====================================================================
// Shared `@keydown` handler factory for non-button DOM elements that
// also have a `@click` handler. The canonical WAI-ARIA contract for
// `role="button"` is: clicking, pressing Enter, and pressing Space
// all activate the control.
//
// Used by:
//   - SetupTab.setup-header (collapse/expand the wizard)
//   - ScreensaverCard.overlay (dismiss on tap)
//   - StrategyEditor.entity-group-header (collapse/expand a group)
//
// The Lit-friendly templates look like:
//
//     <div
//       role="button"
//       tabindex="0"
//       @click=${this._toggle}
//       @keydown=${onActivateKey(this._toggle)}
//     >…</div>
//
// Enforced by `lit-a11y/click-events-have-key-events`. Any new
// non-button clickable element trips lint until it pairs the @click
// with a key handler.
// ====================================================================

/**
 * Return a `@keydown` handler that invokes `fn` when the user presses
 * Enter or Space, matching native <button> semantics. Calls
 * `preventDefault` so Space doesn't also scroll the page when the
 * element is focused.
 */
export function onActivateKey(fn: () => void): (ev: KeyboardEvent) => void {
  return (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      fn();
    }
  };
}
