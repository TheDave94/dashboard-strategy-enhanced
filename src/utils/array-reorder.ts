// ============================================================================
// array-reorder — pure helpers for keyboard-equivalent reorder controls
// ============================================================================
// Lifted out of editor tab code so the keyboard ↑/↓ semantics can be unit-
// tested without instantiating the full editor element. Used by the section-
// order tab; ModeOrderTab still inlines the same shape (intentionally, since
// its move buttons have always been there).
//
// Out-of-range indices return the input array (referentially unchanged) so
// the caller can early-out from a wired event handler — no surprise mutation,
// no surprise re-render.
// ============================================================================

/**
 * Swap `arr[idx]` with `arr[idx - 1]`. Returns a new array; returns the
 * input array (same reference) when the swap would be out-of-range
 * (`idx <= 0` or `idx >= arr.length`).
 */
export function swapAdjacentUp<T>(arr: readonly T[], idx: number): readonly T[] {
  if (idx <= 0 || idx >= arr.length) return arr;
  const next = arr.slice() as T[];
  [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
  return next;
}

/**
 * Swap `arr[idx]` with `arr[idx + 1]`. Returns a new array; returns the
 * input array (same reference) when the swap would be out-of-range
 * (`idx < 0` or `idx >= arr.length - 1`).
 */
export function swapAdjacentDown<T>(arr: readonly T[], idx: number): readonly T[] {
  if (idx < 0 || idx >= arr.length - 1) return arr;
  const next = arr.slice() as T[];
  [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
  return next;
}
