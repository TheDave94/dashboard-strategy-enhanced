// ============================================================================
// Tests — array-reorder helpers (v4.9 — SectionOrderTab keyboard reorder)
// ============================================================================
// Pins the spec claims for the keyboard-equivalent reorder mutator:
//   - move-up on index 2 of [a,b,c,d,e] yields [a,c,b,d,e]
//   - move-down on the last index is a no-op
//   - move-up on index 0 is a no-op
//   - bounds violations return the input array by reference (caller's
//     early-out signal)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { swapAdjacentUp, swapAdjacentDown } from '../../src/utils/array-reorder';

describe('swapAdjacentUp', () => {
  it('swaps idx with idx-1', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    expect(swapAdjacentUp(arr, 2)).toEqual(['a', 'c', 'b', 'd', 'e']);
  });

  it('returns input ref when idx is 0 (no-op at top)', () => {
    const arr = ['a', 'b', 'c'];
    const result = swapAdjacentUp(arr, 0);
    expect(result).toBe(arr);
  });

  it('returns input ref when idx is negative', () => {
    const arr = ['a', 'b', 'c'];
    expect(swapAdjacentUp(arr, -1)).toBe(arr);
  });

  it('returns input ref when idx is past the end', () => {
    const arr = ['a', 'b', 'c'];
    expect(swapAdjacentUp(arr, 3)).toBe(arr);
    expect(swapAdjacentUp(arr, 99)).toBe(arr);
  });

  it('does not mutate the input array', () => {
    const arr = ['a', 'b', 'c'];
    const snapshot = [...arr];
    swapAdjacentUp(arr, 1);
    expect(arr).toEqual(snapshot);
  });

  it('handles a two-element array', () => {
    expect(swapAdjacentUp(['a', 'b'], 1)).toEqual(['b', 'a']);
  });

  it('handles a single-element array (always no-op)', () => {
    const arr = ['only'];
    expect(swapAdjacentUp(arr, 0)).toBe(arr);
  });

  it('handles an empty array (always no-op)', () => {
    const arr: string[] = [];
    expect(swapAdjacentUp(arr, 0)).toBe(arr);
  });
});

describe('swapAdjacentDown', () => {
  it('swaps idx with idx+1', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    expect(swapAdjacentDown(arr, 1)).toEqual(['a', 'c', 'b', 'd', 'e']);
  });

  it('returns input ref when idx is last (no-op at bottom)', () => {
    const arr = ['a', 'b', 'c'];
    const result = swapAdjacentDown(arr, 2);
    expect(result).toBe(arr);
  });

  it('returns input ref when idx is negative', () => {
    const arr = ['a', 'b', 'c'];
    expect(swapAdjacentDown(arr, -1)).toBe(arr);
  });

  it('returns input ref when idx is past the end', () => {
    const arr = ['a', 'b', 'c'];
    expect(swapAdjacentDown(arr, 3)).toBe(arr);
    expect(swapAdjacentDown(arr, 99)).toBe(arr);
  });

  it('does not mutate the input array', () => {
    const arr = ['a', 'b', 'c'];
    const snapshot = [...arr];
    swapAdjacentDown(arr, 0);
    expect(arr).toEqual(snapshot);
  });

  it('handles a two-element array', () => {
    expect(swapAdjacentDown(['a', 'b'], 0)).toEqual(['b', 'a']);
  });

  it('handles a single-element array (always no-op)', () => {
    const arr = ['only'];
    expect(swapAdjacentDown(arr, 0)).toBe(arr);
  });

  it('handles an empty array (always no-op)', () => {
    const arr: string[] = [];
    expect(swapAdjacentDown(arr, 0)).toBe(arr);
  });
});

describe('round-trip: down then up returns to original', () => {
  it('move down + move up cancels out', () => {
    const start = ['overview', 'areas', 'weather', 'energy'];
    const down = swapAdjacentDown(start, 1);
    const back = swapAdjacentUp(down, 2);
    expect(back).toEqual(start);
  });
});
