# Dashboard Strategy Enhanced

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/TheDave94/dashboard-strategy-enhanced?style=for-the-badge&color=green)](https://github.com/TheDave94/dashboard-strategy-enhanced/releases)
[![GitHub Stars](https://img.shields.io/github/stars/TheDave94/dashboard-strategy-enhanced?style=for-the-badge&color=yellow)](https://github.com/TheDave94/dashboard-strategy-enhanced/stargazers)
![AI-Assisted](https://img.shields.io/badge/AI--Assisted-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey?style=for-the-badge)](LICENSE)

A modular, highly-configurable Lovelace strategy for Home Assistant that **auto-generates a complete dashboard from your areas, devices, and entities** — no per-card YAML, no manual layout. Comes with five custom cards (reactive summary tiles, container-query-scaled zone presence, lights & covers groups, sticky-lock tile feature), a visual config editor, and conditional visibility on every section and room.

Optimized for HA **2026.5+** with HA's modern design tokens, CSS container queries, and the `<ha-form>` config editor pattern.

> Screenshots reflecting the current v2.0+ state will land here once captured against a clean install.

## What you get

### Auto-generated views
- **Overview** — clock, alarm tile, area cards (with optional alert/temperature badges), summary tiles for lights/covers/security/batteries/climate, customizable header badges (power, unavailable alerts, now-playing, sun, updates).
- **Per-room views** — one detailed view per HA area with lights, climate, blinds, media, scenes, miscellaneous, plus an auto-rendered zone-presence card.
- **Specialised summary views** — Lights, Blinds & Covers, Security (locks, doors, garages, windows, smoke/gas), Batteries (with custom thresholds + critical/low/good buckets), Climate.
- **Six opt-in extra overview sections** — Plants, Agenda, Todos, Persons, Vacuums, Maintenance.
- **Custom views** — declare extra dashboard views with arbitrary card YAML, fully editor-supported.

### Custom cards & features

Five custom elements that the strategy emits internally, all also available as standalone HACS-grade cards in the "Add card" picker:

| Element | What it does |
|---|---|
| `simon42-summary-card` | Reactive count tile for a domain bucket (lights on, partially-open covers, low batteries, etc.). Tap → navigate to the corresponding summary view. CSS container-query sized. |
| `simon42-zone-presence-card` | Per-area presence indicator strip. Icons + colors per zone, theme-aware. Curated entity list via `presence_entities` or auto-detected from device_class. |
| `simon42-lights-group-card` | Reactive on/off light tile grid. Nested groups (HA light groups expand inline), floor grouping, inline batch controls. |
| `simon42-covers-group-card` | Open / partially-open / closed groups with batch open/close. Awnings and windows get their own buckets. |
| `simon42-sticky-lock-feature` | Custom tile feature that pins a room-mode `input_select` against auto-changes (sits in the standard tile feature row, doesn't grow the tile vertically). |

### Configuration

- **Visual `<ha-form>` config editor** — boolean toggles, entity pickers, schema-driven labels and helpers, fully theme-consistent with HA core. Migrating tab-by-tab; v2.0 covers 4 of 13 tabs (the rest land in v2.1).
- **Conditional visibility** — every section and every room can be gated by `{ entity, state }` predicates (e.g. "show Energy section only when sensor.power_threshold = high").
- **Sparse YAML** — every default-valued option is stripped from the saved config, so the YAML you see in the raw editor only contains your deliberate choices.

### Architecture / quality

- **HA 2026.5+ baseline** with modern design tokens (`--ha-space-*`, `--ha-card-*`, `--ha-font-*`), CSS container queries, `<ha-form>`-driven editors, `actionHandler` directive support on every interactive surface.
- **Code-split bundles** (main + lit + core + views + editor), lazy-loaded — the editor chunk never loads unless the user opens it.
- **Source maps in production** for crash-report symbolication.
- **Built-in test suite** (vitest + happy-dom) covering setConfig, getCardSize/getGridOptions, picker registration, density reflection.
- **Quality gates in CI**: HACS validation, unit tests, ESLint, translation parity check, `npm audit --audit-level=high`.
- **Dependabot** watching both GitHub Actions and npm dependencies (Lit, TypeScript, webpack, vitest grouped).

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheDave94&repository=dashboard-strategy-enhanced&category=plugin)

### Via HACS (recommended)

1. HACS → **Custom repositories** → add `https://github.com/TheDave94/dashboard-strategy-enhanced`, type **Dashboard**.
2. Install. Hard-refresh your browser.
3. Create a new dashboard (Settings → Dashboards → Add dashboard → New dashboard from scratch).
4. Open the dashboard → edit mode → ⋮ → **Raw configuration editor** → replace contents with:

```yaml
strategy:
  type: custom:simon42-dashboard
```

Save, exit the raw editor without modifying any auto-generated views. The strategy regenerates the dashboard on every page load.

> The strategy element name is kept as `simon42-dashboard` (matching the original) for backwards compatibility with existing installs.

### Manual installation

1. Copy `dist/*.js` (plus `.gz`, `.br`, `.map` companions) to `/config/www/community/dashboard-strategy/`.
2. Add to `configuration.yaml`:

```yaml
lovelace:
  mode: storage
  resources:
    - url: /local/community/dashboard-strategy/simon42-dashboard-strategy.js
      type: module
```

3. Restart HA.

## Prerequisites

Home Assistant does most of the work for you:

- **Set up areas and floors** — Settings → Areas & zones. Assign devices to areas; the strategy auto-discovers them.
- **Per-area temperature / humidity sensors** — assign them under Settings → Areas → Edit area. These power the area card badges. (HA's own Home strategy works the same way.)
- **Hide entities you don't want on the dashboard** — three options, in order of preference:
  1. Mark the entity *not visible* in entity settings (best — affects all auto-generated dashboards globally).
  2. Add the label `no-dboard` to entities (HA Settings → Labels). They stay visible in manual dashboards but disappear from this strategy.
  3. Use the per-entity hide controls in the strategy editor (most granular).

## Configuration

The visual editor surfaces every option:

- Dashboard structure (section order, conditional visibility, header badges)
- Overview (clock card, alarm, search card, person badges, density override)
- Summaries (light/cover/security/battery/climate toggles, battery thresholds, sort order)
- Areas (per-area visibility, drag-drop ordering, per-domain entity filters)
- Custom content (custom cards, custom sections, custom badges, custom views — all with YAML editors and target-section assignment)
- Weather sensors, room pins, light favorites, favorites

YAML is always editable directly via the raw config editor — every editor-driven config maps 1:1 to YAML keys (documented per release).

## Custom card configuration

Each custom card is also usable standalone — pick it from HA's "Add card" picker and configure via the `<ha-form>` dialog.

**Example: zone-presence card with curated entities and per-zone icons/colors**

```yaml
type: custom:simon42-zone-presence-card
name: Living Room Presence
entities:
  - { entity: binary_sensor.couch_occupied, icon: mdi:sofa, color: light-blue }
  - { entity: binary_sensor.desk_occupied, icon: mdi:desk, color: red }
  - { entity: binary_sensor.bed_occupied, icon: mdi:bed, color: purple }
  - binary_sensor.kitchen_motion
```

**Example: density override (forces compact regardless of cell width)**

```yaml
strategy:
  type: custom:simon42-dashboard
  dashboard_density: compact   # default: omit (container queries auto-scale per card)
```

**Example: presence_entities shared by favorites pin AND Room view**

```yaml
strategy:
  type: custom:simon42-dashboard
  areas_options:
    living_room:
      pin_zone_presence_to_favorites: true
      presence_entities:
        - { entity: binary_sensor.couch_occupied, icon: mdi:sofa, color: light-blue }
        - { entity: binary_sensor.desk_occupied, icon: mdi:desk, color: red }
```

The `presence_entities` list is the single source — the favorites pin and the Room view auto-render both consume it. Falls back to device_class auto-detect when unset.

## Versioning

- **2.0+** — current line, HA 2026.5+ baseline. See [release notes](https://github.com/TheDave94/dashboard-strategy-enhanced/releases) per version.
- **2.1 (in progress)** — completes the editor migration to `<ha-form>` tab modules.
- **2.x** — bugfixes + incremental feature work on the v2.0 baseline.

## Acknowledgments

This project started as a fork of [TheRealSimon42/simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) — credit to [@TheRealSimon42](https://github.com/TheRealSimon42) for the original strategy that established the UX foundation (auto-generated room views, summary tiles, area grid) preserved here. As of v2.0 this fork has diverged substantially with custom cards, container-query scaling, ha-form editor migration, and HA 2026.5+ architectural updates that aren't going back upstream.

## License

[CC BY-NC-SA 4.0](LICENSE). Non-commercial use, share-alike. Attribution required.

## Contributing

Bug reports, feature requests, and PRs welcome at [TheDave94/dashboard-strategy-enhanced](https://github.com/TheDave94/dashboard-strategy-enhanced/issues). Translations into additional locales are particularly appreciated — drop a `src/translations/<lang>.json` mirroring `en.json` and submit a PR.
