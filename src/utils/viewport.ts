// ====================================================================
// Viewport helpers (generate-time)
// ====================================================================
// Oriel resolves a few layout choices from the viewport at generate()
// time (same approach as the favorite_entities viewport map). This is a
// per-load decision — the dashboard re-generates on load/navigation, so
// a phone gets the phone layout and a desktop the desktop one; it does
// not reflow live on window resize.

/** True when rendering on a phone-width viewport (< 640px). */
export function isPhoneViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

/**
 * grid_options that force a card full-width (one per row) on phones only,
 * leaving the responsive default on larger screens. Spread into a card
 * config: `...phoneFullWidth()`. Avoids cramped 2-up tiles whose names
 * truncate on narrow screens, without changing desktop density.
 */
export function phoneFullWidth(): { grid_options?: { columns: 'full' } } {
  return isPhoneViewport() ? { grid_options: { columns: 'full' } } : {};
}
