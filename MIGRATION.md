# Migrating from Simon42 → Oriel

For users on [simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) who want maximum configurability through the editor instead of editing YAML.

The two projects target different audiences. **simon42** is the focused, opinionated auto-dashboard — minimal configuration surface, sensible defaults out of the box. **Oriel** keeps the same auto-generation core but exposes every advanced feature in the editor: per-user dashboards, composable visibility rules, mode-driven section reorder, HACS-plugin auto-detection, wall-panel mode, custom cards beyond the original set. Pick the one that fits how you want to work.

Switching is a one-shot YAML edit + a HACS swap.

> Coming from a pre-v4.1.0 Oriel release? Those used different brand names. Cleanest path: uninstall, reinstall, run the Setup wizard.

---

## What you get on Oriel that isn't in Simon42

- **Setup wizard** in the editor — auto-detects installed HACS plugins (Bubble Card, ApexCharts, decluttering-card, floorplan-card) and surfaces every advanced feature with an install hint when missing.
- **Per-user / per-role dashboards** — different layouts per HA user or label.
- **Density / viewport presets** — `density: compact | cozy | comfortable` as a single config knob.
- **Mode-driven section reorder** — `sections_order_by_mode` reshuffles sections based on `input_select.house_mode`.
- **Composable visibility rules** — `role`, `time_after/before`, `mode_entity/mode_is`, `any[]`, `all[]` predicates per section.
- **Wall-panel mode** — `panel_mode: wall` + screensaver, for tablet installs.
- **Lazy-mounting** — sections below the fold defer state subscriptions until scrolled into view.
- **Per-area room view overrides** — `areas_options.<area>.room_view_overrides` customises one room's layout while the rest stay auto-generated.
- **Plugin extension API** — `window.oriel.registerSection(...)` for third-party plugins.
- **Migration assistants** in the editor — a banner offers one-tap apply when deprecated fields are detected.
- **Adaptive state-iconography** — locks, covers, garage doors emit state-distinct glyphs.
- **History sparklines** — `oriel-sparkline-card` for inline 24h trends, optionally backed by ApexCharts.
- **Routines section** — auto-collects scenes + scripts ranked by last-used.
- **Notification banners** — sticky surface for smoke / leak / doorbell triggers.
- **Today-vs-yesterday tile overlays** — delta indicators on summary tiles.
- **Voice FAB** — floating voice-command button via HA Assist.
- **Mobile swipe-gesture navigation** — opt-in via `swipe_nav: true`.
- **Per-device-class favorites** — viewport-keyed favorite lists (`phone` / `tablet` / `wall`).
- **Energy cost overlay feature** — per-tile €/h reading from power × tariff.

Mostly additive, but the identifier rename below is a hard break.

---

## Step 1 — install Oriel Dashboard via HACS

1. HACS → Frontend → ⋮ menu → "Custom repositories"
2. Add `https://github.com/TheDave94/oriel-dashboard` as type "Lovelace"
3. Install **Oriel Dashboard** (that's the display name)
4. Reload HA after install (HACS prompts you)

You can keep the upstream Simon42 plugin installed alongside during the migration — they don't share custom element names, so there's no collision. Uninstall Simon42 once your dashboard works on Oriel.

---

## Step 2 — update your dashboard YAML

The strategy type and every custom card tag changed. Edit your dashboard config (Settings → Dashboards → ⋮ → Edit raw configuration) and apply these replacements:

### Strategy type

```diff
 strategy:
-  type: custom:simon42-dashboard
+  type: custom:oriel
   show_clock_card: true
   …
```

### Custom card / feature tags

If your dashboard config references any of these — most commonly inside `custom_cards`, `favorites_cards`, or hand-written `custom_views` — apply the same prefix swap:

| Simon42 tag | Oriel tag |
|---|---|
| `custom:simon42-summary-card` | `custom:oriel-summary-card` |
| `custom:simon42-zone-presence-card` | `custom:oriel-zone-presence-card` |
| `custom:simon42-lights-group-card` | `custom:oriel-lights-group-card` |
| `custom:simon42-covers-group-card` | `custom:oriel-covers-group-card` |
| `custom:simon42-sticky-lock-feature` | `custom:oriel-sticky-lock-feature` |

If you weren't using any of those by hand, you don't need to touch this — the strategy emits them itself.

### Everything else stays the same

Every config field (`show_clock_card`, `areas_options`, `favorite_entities`, `custom_cards`, `weather_presentation`, …) has the same name and the same shape. The strategy reads them identically.

---

## Step 3 — verify

Hard-refresh your browser (Cmd/Ctrl+Shift+R). You should see:

- The dashboard renders with the same sections.
- The strategy editor (Edit dashboard → strategy options) now has a **Setup wizard** panel at the top showing every advanced feature, with HACS install hints where applicable.
- The runtime version logs `Oriel Dashboard vX.Y.Z loaded` in the browser console.

If the dashboard shows "Custom element doesn't exist" placeholders, you missed a `custom:simon42-*` reference somewhere in the YAML. Search the raw config for `simon42-` and replace each hit with `oriel-`.

---

## What if I want to roll back?

The migration is a YAML edit, not a destructive operation. To revert:

1. Edit dashboard YAML, replace `custom:oriel*` back to `custom:simon42*` everywhere.
2. HACS → Frontend → Oriel Dashboard → ⋮ → Remove.
3. Hard-refresh.

Your existing Simon42 install (if you didn't uninstall it in step 1) picks back up.

---

## Surface that changed — power-user reference

For YAML power users, card-mod users, plugin authors. Most users can skip this section.

| Concept | Simon42 | Oriel |
|---|---|---|
| Strategy type | `custom:simon42-dashboard` | `custom:oriel` |
| Custom card prefix | `simon42-*` | `oriel-*` |
| Custom feature prefix | `simon42-*-feature` | `oriel-*-feature` |
| HA strategy view registration | `ll-strategy-view-simon42-view-*` | `ll-strategy-view-oriel-*` |
| HA strategy registration | `ll-strategy-dashboard-simon42-dashboard` | `ll-strategy-dashboard-oriel` |
| Editor element | `simon42-dashboard-strategy-editor` | `oriel-editor` |
| Plugin extension API | n/a | `window.oriel.registerSection / registerBadge` |
| CSS custom properties (for card-mod) | `--s42-*` | `--oriel-*` |
| Debug URL param | `?s42_debug=1` | `?oriel_debug=1` |
| Console log prefix | `[simon42]`, `[s42-perf]` | `[oriel]`, `[oriel-perf]` |
| localStorage keys | — | `oriel_usage_v1`, `oriel_anomaly_v1` |
| TypeScript classes (plugin authors) | `Simon42*` | `Oriel*` (no `Strategy` suffix) |
