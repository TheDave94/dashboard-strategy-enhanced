# Investigation: `house_mode` vocabulary mismatch

**Date:** 2026-05-23
**Branch:** `investigation/house-mode-mismatch`
**Status:** Read-only. No code changes.

## TL;DR

The reader is already tolerant — strategy + mode-order editor tab both normalize and match against HA's actual `input_select` options. The mismatch lives in **one place**: the v4.4.0 adaptive hint at `src/onboarding/hints.ts:102-119` writes hardcoded `morning / evening / night / away` keys regardless of HA-side states. For a user whose `input_select.house_mode` is `At Home / Away / Holiday`, accepting that hint produces a `sections_order_by_mode` config that matches only "Away" and silently falls back to `sections_order` for "At Home" and "Holiday".

**Runtime impact: (c) partially broken, but only on a narrow path** — user must (1) accept the adaptive hint and (2) not later edit the per-mode orders via the Mode Order tab. Users who configure via the editor tab directly get the tolerant path. Users who don't enable the feature at all see nothing.

**Cheapest fix:** rewrite the hint's `apply()` to read HA's actual `input_select.options` and seed the map with normalized real keys (option 4a below). Two-line change plus a touched-up description. Same fix on the stale docstring at `src/onboarding/features.ts:128`.

---

## Q1 — Every `house_mode` reference in src/

| # | Site | Mechanism | What it does with the value | Fallback when state ≠ expected |
|---|---|---|---|---|
| 1 | `src/views/OverviewViewStrategy.ts:285-305` (mode-driven section reorder) | Reads `dashboardConfig.house_mode_entity` (configured by user) | Normalizes `state` (`.toLowerCase().replace(/[\s_-]+/g, '_')`), matches against normalized keys of `sections_order_by_mode`. Picks the matched override. | Silently falls back to `dashboardConfig.sections_order`, then `DEFAULT_SECTIONS_ORDER`. No error, no log. |
| 2 | `src/views/OverviewViewStrategy.ts:581-600` (house-mode badge) | Reads `dashboardConfig.house_mode_entity` | Emits a badge that renders the current state verbatim. Value-agnostic. | Hides the badge when entity is absent. |
| 3 | `src/utils/visibility.ts:132-135` (section/room visibility) | Reads `rule.mode_entity` (per-rule config) | Normalizes both sides identically, compares for equality. | Rule evaluates false → section/room hides. |
| 4 | `src/editor/tabs/ModeOrderTab.ts:33-43` (`detectModes`) | `config.house_mode_entity` OR hardcoded `'input_select.house_mode'` | Reads `state.attributes.options` from HA, normalizes them. Builds the editor's per-mode editor blocks from those. | When entity has no options at all: hardcoded `['morning', 'evening', 'night', 'away']` shown as a starter list. |
| 5 | **`src/onboarding/hints.ts:102-119` (adaptive hint)** | Detects `hass.states['input_select.house_mode']` (hardcoded entity_id) | `apply()` writes `sections_order_by_mode: { morning: [...], evening: [...], night: [...], away: [...] }` — **hardcoded keys, no read of actual options**. | Strategy fallback (#1) applies when keys don't match. |
| 6 | `src/onboarding/features.ts:124-141` (feature catalog card) | Detects `hass.states['input_select.house_mode']` (hardcoded entity_id) | Label/description only — does not write to config. Description text says "morning / evening / night / away" (misleading; stale). | n/a. |
| 7 | `src/onboarding/personas.ts:259-264` (Family persona apply) | `hasEntity(..., 'input_select.house_mode')` inside a ternary | **Both branches are `{}` — dead spread.** Placeholder with a `// real check happens elsewhere` comment that's been there since v3.x. | n/a. |
| 8 | `src/utils/health.ts:126-138` (orphan health check) | `config.house_mode_entity` | Checks the entity exists in HA; offers a "remove from config" suggestion if not. | n/a. |
| 9 | `src/types/strategy.ts:198-205, 427-443` (type definitions) | Documentation | Comment at 198-205 explicitly names `At Home / Away / Holiday`. The docstring at 440-441 says: *"Keys match the lowercase form of the input_select option name (e.g. option 'At Home' → key 'at home' or 'at_home' — both work)."* | n/a. |

## Q2 — Is there actually a feature driving off morning/evening/night/away?

**Yes, three features touch house_mode:**

1. **Section reorder** (the one the audit named) — `OverviewViewStrategy.ts:285-305`. Strategy code is **value-agnostic**: normalizes both entity state and config keys, matches whichever happens to align. Original commit message (`13cb4c3`, v2.3.3) explicitly calls out the "At Home" case as the design intent.
2. **Section / room visibility** — `utils/visibility.ts:132-135`. Same normalize-both-sides pattern. Also value-agnostic.
3. **Overview badge** — `OverviewViewStrategy.ts:586-600`. Renders whatever state HA has. Value-agnostic.

None of the runtime branches expect `morning / evening / night / away` specifically. Those four names appear as:

- The **`detectModes` fallback** when the configured entity has no `options` array at all (`ModeOrderTab.ts:42`) — UX nudge for users who haven't created their `input_select` yet.
- The **adaptive hint's `apply()`** at `hints.ts:113-118` — the actual hardcoded write that produces the mismatch.
- The **feature catalog description** at `features.ts:128` — stale documentation.
- The **`sections_order_by_mode` docstring example** at `strategy.ts:435-438` — illustrative, with the immediately-following sentence explaining the "At Home" case.

## Q3 — What's happening at runtime?

**Pick: (c) partially broken on a narrow path.**

For a user whose HA exposes `input_select.house_mode` with states `At Home / Away / Holiday`:

- **If they configure `sections_order_by_mode` via the Mode Order tab** (`editor/tabs/ModeOrderTab.ts`) → tab reads actual options, writes normalized keys (`at_home`, `away`, `holiday`), strategy matches all three. **Works.**
- **If they accept the adaptive hint** → hint writes `{ morning: [...], evening: [...], night: [...], away: [...] }`. Strategy lookup:
  - State `At Home` → normalize → `at_home` → no key matches → fallback to `sections_order`. **Silent no-op.**
  - State `Away` → normalize → `away` → matches key `away` → uses the hint's away order. **Works (one state only).**
  - State `Holiday` → normalize → `holiday` → no key matches → fallback. **Silent no-op.**
- **If they hand-author YAML with the right keys** → works. (Documented at `strategy.ts:440-441`.)
- **If they never enable the feature** → no impact.

Evidence the path is narrow:

- The adaptive hint requires the user to actively click "Apply" in the editor — it's not auto-applied.
- The Mode Order tab is the documented editor surface; reaches the same config field through the tolerant path.
- The strategy's fallback chain (`baseOrder ?? DEFAULT_SECTIONS_ORDER`) means a misconfigured map never produces a broken render — just an unchanged one. This is why the bug has been latent since v4.4.0 (2026-05-21) without surfacing.

The audit caught a real bug. It's the *kind* of bug that doesn't show up until someone notices "huh, my dashboard never reshuffles when my house mode changes" — at which point they're likely to assume the feature is broken in general, not that the hint pre-populated the wrong keys.

## Q4 — Cheapest fix

| Option | Cost | Verdict |
|---|---|---|
| **1. Granular states on HA side** (add `morning/evening/night/away` to `input_select.house_mode`) | Requires changes to the HA repo. Conflates two concerns (presence-tracking and time-of-day). Doesn't fix the root cause — the hint would still write hardcoded keys even on a system with HA-side mode states that don't include all four. | No. |
| **2. Template sensor on HA side** mapping `At Home / Away / Holiday` → Oriel-expected vocabulary | Pushes coupling to the HA side. Still leaves the misleading hint description in place. Adds a Jinja maintenance burden. | No. |
| **3. Make Oriel's reader tolerant** | **The reader is already tolerant.** Strategy (`OverviewViewStrategy.ts:285-305`) and the editor tab (`ModeOrderTab.ts:33-43`) both normalize both sides. Implementing this option would be a no-op. | n/a — already done. |
| **4a. Fix the adaptive hint** to read actual `input_select.options` and seed a map with normalized real keys | Tiny — rewrite the `apply` function at `hints.ts:111-119` to pull `hass.states['input_select.house_mode'].attributes.options`, normalize each, and seed the map with placeholder orders. Touch the misleading description on the same hint. Touch the stale description at `features.ts:128`. | **Yes.** |
| **4b. Drop the auto-seed from the hint** | Have the hint just route the user to the Mode Order tab (which seeds from real options). Smaller still, but removes some onboarding helpfulness. | Defensible alternative if 4a feels too clever. |

**Recommendation: 4a.** Concrete shape — about a dozen lines:

```ts
// hints.ts:111-119 (current)
apply: (current) => ({
  ...current,
  sections_order_by_mode: {
    morning: ['overview', 'weather', 'energy', 'areas'],
    evening: ['overview', 'areas', 'weather'],
    night:   ['overview', 'areas'],
    away:    ['overview', 'areas', 'weather'],
  },
}),

// proposed
apply: (current, hass) => {
  const opts = (hass?.states['input_select.house_mode']?.attributes?.options ?? []) as string[];
  const seed: Record<string, string[]> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '_');
  for (const opt of opts) {
    // Generic starter — same shape for every detected mode. User
    // tunes per-mode via the Mode Order tab afterwards. The point
    // of the hint is to get the field populated with the right
    // KEYS so the strategy's normalize-match finds them; the
    // values are placeholders.
    seed[normalize(opt)] = ['overview', 'areas', 'weather'];
  }
  return { ...current, sections_order_by_mode: seed };
},
```

Plus:
- Update the hint's description (`hints.ts:105-106`) to reference "your configured house mode states" rather than naming morning/evening/night/away.
- Touch `features.ts:128` description similarly.
- Verify the `AdaptiveHint.apply` signature actually receives `hass` — if not, that's a small refactor needed first (worth checking before promising the size of the fix).

Need to check the `AdaptiveHint` type signature before sizing this precisely — if `apply` is currently `(current) => ...` without `hass`, the fix grows by one signature change + every other hint's apply gets a (currently-unused) second arg. Still small; flag for the PR author.

## When did the mismatch first appear?

- **v2.3.3** (`13cb4c3`, 2026-05-21 00:50 UTC) — original section-reorder feature. Commit message: *"Keys are matched case- and underscore-insensitively, so an input_select option 'At Home' matches keys 'at_home', 'AT HOME', or 'at home'."* No bug here.
- **v4.4.0** (`944af37`, 2026-05-21 10:43 UTC, same day +10h) — adaptive hints + 4 editor surfaces. This commit added `hints.ts` with the hardcoded `morning / evening / night / away` apply. The mismatch entered the codebase here.

So the bug is exactly two days old at time of writing (2026-05-23) and almost certainly hasn't been hit in the wild yet — the v4.4.0 release was three days ago, the hint requires user opt-in, and the symptom (a feature that was supposed to reshuffle silently doesn't) is the kind of thing a user would tolerate without reporting for a while.
