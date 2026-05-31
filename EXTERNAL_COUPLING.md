# EXTERNAL_COUPLING.md — the contract with Oriel and the Lovelace dashboards

What this HA config exposes as a de-facto API to surfaces it doesn't control: the Oriel Dashboard repo, and the Lovelace dashboards stored in HA's `.storage/` (not in git). Renaming or deleting entities in this list without a deliberate plan can silently break rendering elsewhere.

> **Mirror**: this file exists with identical content in `/opt/repos/homeassistant-config/EXTERNAL_COUPLING.md`. The two repos keep it in sync manually. Both sessions own the contract; either side can revise it, but changes go through both repos in tandem.

---

## Scope boundary

The Oriel Dashboard repo at `/opt/repos/oriel-dashboard/` is managed in its own Claude Code session. **HA-side work happens here, Oriel-side work happens there.** When an Oriel-side issue surfaces in the HA session (or vice versa), the rule is "stop and surface, take it to the other session" — don't continue across the boundary even when asked nicely. The session with the right context, dependencies installed, and memory does the work cleanly.

This file documents the *contract* between the two, not the implementation on either side.

---

## The entity contract

These four entities are the HA-side surface Oriel reads, either by hardcoded reference or by configurable auto-detect. Renaming or deleting any of them affects the dashboard.

### `input_select.house_mode`

- **Oriel reads it**: yes. Currently hardcoded in `src/onboarding/hints.ts` and `src/onboarding/features.ts` for the "Reshuffle dashboard sections by mode" feature gate. Also auto-detected by the Mode Order tab in the dashboard editor.
- **Configurable override**: `dashboardConfig.house_mode_entity` lets a dashboard creator point Oriel at a different entity. Default = `input_select.house_mode`.
- **Failure mode if missing**: feature disables gracefully — the section-reorder toggle stays available but unactivated.
- **Current HA-side options**: `At Home`, `Away`, `Holiday`. See vocabulary contract below.

### `input_select.room_mode`

- **Oriel reads it**: yes, per-area. Auto-detected as `input_select.*mode` within each area's tile selection logic.
- **Configurable override**: `room_mode_entity` per-area.
- **Failure mode if missing**: room view still renders; the mode picker tile skips.
- **Current HA-side options**: `General`, `Work`, `Relax`, `Movie`, `Gaming`, `Sleep`, `Away`.

### `input_boolean.room_mode_sticky`

- **Oriel reads it**: yes, per-area. Renders the sticky-lock feature on the room tile.
- **Configurable override**: `room_mode_sticky_entity` per-area.
- **Failure mode if missing**: sticky-lock UI doesn't render; room tile still works.

### `sun.sun`

- **Oriel reads it**: yes, for the overview sun badge.
- **Failure mode if missing**: badge auto-hides.

---

## The PollenWatch severity-bucketing duplication (TEMPORARY)

Separate from the entity-name contract above: Oriel's pollen card
duplicates PollenWatch's severity-bucketing tables to colour raw-source
sensors. This duplication is a known root cause of visual drift, and is
itself currently a **colour-agreement tourniquet** — not the cure.

### What's mirrored

`src/utils/pollen.ts::pollenLevel()` mirrors four tables from
PollenWatch v2 `custom_components/pollenwatch/analytics.py`:

- `_THRESHOLDS` (per-species grains/m³ onset/peak; consumed by
  `bucket_level`) — Oriel's `_GRAINS_THRESHOLDS_TREE` (10/100) and
  `_GRAINS_THRESHOLDS_GRASS_HERB` (3/50) + the bracket-membership sets.
- `_INDEX_TO_LEVEL` (polleninformation 0-4 collapse) — Oriel's
  `_PI_INDEX_TO_LEVEL`.
- `_UPI_TO_LEVEL` (Google UPI 0-5 collapse) — Oriel's `_UPI_TO_LEVEL`.
- `_DWD_TO_LEVEL` composed with `dwd._STR_TO_FLOAT` (DWD categorical →
  float → level) — Oriel's `_dwdFloatToLevel`.

### Why this is a tourniquet, not a fix

Two distinct problems travel together here and both retire together:

1. **The duplication itself.** v4.16 shipped with Oriel-side thresholds
   that disagreed with PollenWatch — Polleninformation ≥2 rendered
   "high" in Oriel while the bundled PollenWatch card showed "low" on
   the same reading, with parallel gaps for Google UPI, DWD, and the
   tree grains/m³ band 50-99. Any future analytics.py threshold change
   silently drifts again until manually mirrored.
2. **The threshold values themselves are unverified.** Trees 10/100,
   grasses 3/50, and the PI/Google/DWD cutoffs are **family-borrowed
   EAACI brackets currently under provenance review upstream** — only
   9 of the 24 species have exact-species cutoffs; the rest borrow
   from the family analogue. Matching analytics.py keeps Oriel
   agreeing with the card we're co-deployed with — it does NOT mean
   the cutoffs themselves are settled. Do not treat them as such.

### Retirement plan

Both retire the moment PollenWatch v3 exposes an authoritative severity
attribute on every per-source sensor (Oriel collapses to a thin
attribute reader, and the brackets debate moves entirely into the
integration where the data lives). Tracked upstream:
[TheDave94/pollenwatch#2](https://github.com/TheDave94/pollenwatch/issues/2).

### Until then

- Any change to a `_THRESHOLDS` / `_INDEX_TO_LEVEL` / `_UPI_TO_LEVEL` /
  `_DWD_TO_LEVEL` table in PollenWatch must be mirrored into
  `src/utils/pollen.ts` in the same release cycle. Treat the Oriel
  side as a hard mirror — the source of truth is analytics.py.
- The `TEMPORARY` banner in `src/utils/pollen.ts` says all of this in
  the code itself. Don't remove the banner until issue #2 is resolved
  and the pollenLevel() pathway is gone.

---

## Vocabulary normalization contract

The `input_select.house_mode.attributes.options` array can be **any vocabulary**. The HA side is free to add, remove, rename, or reorder the options as automation logic evolves.

**Oriel normalizes the option strings at apply time** by lowercasing and replacing `[\s_-]+` with `_`. So:

| HA-side option | Oriel-side key |
|---|---|
| `At Home` | `at_home` |
| `Away` | `away` |
| `Holiday` | `holiday` |
| `Night-Mode` | `night_mode` |
| `Deep Focus` | `deep_focus` |

The contract:

- **HA owns the option strings.** They can be human-friendly (capitalized, spaced, etc.).
- **Oriel owns the normalization.** Any time Oriel needs a stable key for an option (e.g. matching a CSS class, a translation key, a layout slot), it derives the key via the normalization above.
- The pre-PR-#54 framing — "Oriel expects `morning / evening / night / away`" — was a single v4.4.0 adaptive hint that hardcoded those four values. **That hint shipped a fix in Oriel PR #54** (dynamic vocabulary at apply time). The contract going forward is the normalization rule, not a fixed value list.

**HA-side practice**: when adding or renaming an option in `input_select.house_mode`, no Oriel-side change is required as long as the normalized key still makes sense. If the rename produces a less-meaningful key (e.g. `Mode 1` → `mode_1`), prefer a clearer string.

**Oriel-side practice** (documented here for symmetry; canonical is the Oriel session's docs): treat `attributes.options` as the source of truth, build mode lists dynamically, never hardcode a value comparison without going through the normalizer.

---

## Lovelace dashboards — not in git

The Lovelace dashboards rendered by this HA instance are stored in `.storage/lovelace*` on the HAOS device. **They are not committed to this repo.** This has two practical consequences:

1. **Any HA-side rename can silently break a dashboard card.** No grep across the repo will catch a Lovelace reference. The canonical example: `input_boolean.enable_walking_cycle` is unused by any automation but referenced by two Lovelace cards (per `DEFERRED.md` and `LESSONS.md orphaned-helpers-cleanup-2026-05-05`). Deleting it would remove a working button.

2. **Cross-repo audits are blind.** A read-only investigation of "what does Oriel render" from the HA repo can list the entity-API surface above but can't enumerate every individual card.

**Pending fix**: `DEFERRED.md` has an entry for automated Lovelace export — a scheduled HA script or CI job dumps `.storage/lovelace*` to a `dashboards/` subdirectory and commits if changed. Once that lands, dashboard YAML becomes grep-able and this whole class of opacity goes away. Until then, treat any rename of a helper / sensor / input as potentially dashboard-breaking and prefer additive changes (new entity alongside old) when the rename would be silent.

---

## When to load this file

- Renaming any `input_select.*`, `input_boolean.*`, or `effective_*` entity.
- Deleting a helper that doesn't have a clear automation consumer (it might be UI-only).
- Any task where someone says "this entity isn't used" — verify against this list first.
- Cross-repo discussions where the contract is in scope.

When the dashboard YAML export lands, this file should be revised to point at the grep-able location instead of describing the opacity.
