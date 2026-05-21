# Oriel Dashboard

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/TheDave94/oriel-dashboard?style=for-the-badge&color=green)](https://github.com/TheDave94/oriel-dashboard/releases)
[![GitHub Stars](https://img.shields.io/github/stars/TheDave94/oriel-dashboard?style=for-the-badge&color=yellow)](https://github.com/TheDave94/oriel-dashboard/stargazers)
![AI-Assisted](https://img.shields.io/badge/AI--Assisted-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey?style=for-the-badge)](LICENSE)

A modular, highly-configurable Lovelace strategy for Home Assistant that **auto-generates a complete dashboard from your areas, devices, and entities** — no per-card YAML, no manual layout. Includes a setup wizard, ten custom cards, a visual config editor, per-user dashboards, mode-driven section reordering, and integration shims for popular HACS plugins (Bubble Card, ApexCharts, decluttering-card, floorplan-card).

> An oriel is a bay window jutting out from a wall — "a window that lets you see more." The plugin is named after the metaphor.

Optimised for HA **2026.5+** with modern design tokens, CSS container queries, and the `<ha-form>` editor pattern.

## What you get

### Auto-generated views

- **Overview** — clock, alarm tile, area cards (with optional alert / temperature badges), summary tiles for lights / covers / security / batteries / climate, customisable header badges (power, unavailable alerts, now-playing, sun, updates).
- **Per-room views** — one detailed view per HA area with lights, climate, blinds, media, scenes, miscellaneous, plus an auto-rendered zone-presence card.
- **Specialised summary views** — Lights, Blinds & Covers, Security (locks, doors, garages, windows, smoke/gas), Batteries (with custom thresholds + critical/low/good buckets), Climate.
- **Six opt-in extra overview sections** — Plants, Agenda, Todos, Persons, Vacuums, Maintenance.
- **Custom views** — declare extra dashboard views with arbitrary card YAML, fully editor-supported.

### Setup wizard (v3.1+)

The strategy editor opens with a **Setup** panel that auto-detects every installed HACS plugin via `customElements` and surfaces each advanced feature with:

- A description of what the feature does.
- Detection of whether the underlying plugin is installed (`bubble-card`, `apexcharts-card`, `decluttering-card`, `floorplan-card`).
- A "missing — install via HACS" hint with a direct link when the plugin isn't there yet.
- An enable toggle that mutates the strategy config in place.

External plugins remain strictly optional — features auto-light-up when their dependency appears.

### Custom cards & features

Ten custom elements that the strategy emits internally, all also available as standalone cards in HA's "Add card" picker:

| Element | What it does |
|---|---|
| `oriel-summary-card` | Reactive count tile for a domain bucket (lights on, partially-open covers, low batteries, etc.). Tap → navigate to the corresponding summary view. CSS container-query sized. Supports `state_content: ['count']` and today-vs-yesterday delta indicators. |
| `oriel-zone-presence-card` | Per-area presence indicator strip. Icons + colours per zone, theme-aware. Curated entity list via `presence_entities` or auto-detected from device_class. |
| `oriel-lights-group-card` | Reactive on/off light tile grid. Nested groups (HA light groups expand inline), floor grouping, inline batch controls. |
| `oriel-covers-group-card` | Open / partially-open / closed groups with batch open/close. Awnings and windows get their own buckets. |
| `oriel-sparkline-card` | Inline 24h history sparkline tile. SVG-only by default; delegates to `apexcharts-card` (HACS) when `use_apexcharts: true` is set and the plugin is installed. |
| `oriel-notification-card` | Sticky banner for safety triggers (smoke, leak, doorbell). Severity styling, auto-dismiss on clear. |
| `oriel-routines-card` | Auto-collected scenes + scripts grid, ranked by last-used. |
| `oriel-screensaver-card` | Full-screen clock + weather overlay for wall-panel idle state. |
| `oriel-voice-fab` | Floating voice-command FAB wrapping HA's `<ha-voice-command-button>`. |
| `oriel-sticky-lock-feature` | Custom tile feature that pins a room-mode `input_select` against auto-changes. |
| `oriel-cost-overlay-feature` | Custom tile feature rendering per-device €/h from power × tariff. |

### Layout intelligence (v3.0+)

- **Per-user / per-role dashboards** — different layouts per HA user or label, resolved at `generate()` via `hass.user`.
- **Density / viewport presets** — `density: compact | cozy | comfortable` as a one-line config, applies to every view.
- **Lazy-mounting** — sections below the fold defer state subscriptions until scrolled into view. Optional via `lazy_sections: true`.
- **Mode-driven section reorder** — `sections_order_by_mode` reshuffles sections based on `input_select.house_mode`.
- **Composable visibility rules** — `role`, `time_after`, `time_before`, `mode_entity`, `mode_is`, `any[]`, `all[]` predicates per section.
- **Wall-panel mode** — `panel_mode: wall` adds a screensaver overlay + bottom-anchored navigation for tablet installs.
- **Per-area room view overrides** — `areas_options.<area>.room_view_overrides` to customise one room's layout while the rest stay auto-generated.
- **Per-device-class favorites** — viewport-keyed favorite lists (`phone` / `tablet` / `wall`).
- **Mobile swipe navigation** — opt-in horizontal-swipe between views via `swipe_nav: true`.

### Configuration

- **Visual `<ha-form>` config editor** — every option is in the editor; boolean toggles, entity pickers, schema-driven labels and helpers.
- **Conditional visibility** — every section and every room can be gated by composable predicate rules.
- **Sparse YAML** — every default-valued option is stripped from the saved config; raw YAML reflects only your deliberate choices.
- **Migration assistants** — the editor shows a banner with one-tap apply when deprecated fields are detected.
- **Usage-aware section ordering** — local-storage tap tracker proposes a layout based on which sections you actually use.

### Plugin extension API

Third-party HACS plugins can extend the strategy at load time:

```typescript
window.oriel?.registerSection({
  apiVersion: 1,
  key: 'my-plugin-section',
  label: 'My plugin',
  build: async (ctx) => ({ type: 'grid', cards: [...] }),
});
```

`registerBadge` works analogously. Plugin contributions appear alongside built-in sections and survive editor reorder.

### Architecture / quality

- **HA 2026.5+ baseline** with modern design tokens (`--ha-space-*`, `--ha-card-*`, `--ha-font-*`), CSS container queries, `<ha-form>`-driven editors, `actionHandler` directive support on every interactive surface.
- **Code-split bundles** (main + lit + core + views + editor), lazy-loaded — the editor chunk never loads unless the user opens it.
- **Source maps in production** for crash-report symbolication.
- **Built-in test suite** (vitest + happy-dom + Playwright against live HA) — currently 65 unit tests + 2 browser tests.
- **Quality gates in CI** — HACS validation, unit tests, ESLint, translation parity check, `npm audit --audit-level=high`.
- **Dependabot** watching GitHub Actions and npm dependencies (Lit, TypeScript, webpack, vitest grouped).

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheDave94&repository=oriel-dashboard&category=plugin)

### Via HACS (recommended)

1. HACS → **Custom repositories** → add `https://github.com/TheDave94/oriel-dashboard`, type **Dashboard**.
2. Install. Hard-refresh your browser.
3. Create a new dashboard (Settings → Dashboards → Add dashboard → New dashboard from scratch).
4. Open the dashboard → edit mode → ⋮ → **Raw configuration editor** → replace contents with:

```yaml
strategy:
  type: custom:oriel
```

Save, exit the raw editor without modifying any auto-generated views. The strategy regenerates the dashboard on every page load.

### Manual installation

1. Copy `dist/*.js` (plus `.gz`, `.br`, `.map` companions) to `/config/www/community/oriel-dashboard/`.
2. Add to `configuration.yaml`:

```yaml
lovelace:
  mode: storage
  resources:
    - url: /local/community/oriel-dashboard/oriel.js
      type: module
```

3. Restart HA.

## Prerequisites

Home Assistant does most of the work for you:

- **Set up areas and floors** — Settings → Areas & zones. Assign devices to areas; the strategy auto-discovers them.
- **Per-area temperature / humidity sensors** — assign them under Settings → Areas → Edit area. These power the area card badges.
- **Hide entities you don't want on the dashboard** — three options, in order of preference:
  1. Mark the entity *not visible* in entity settings (best — affects all auto-generated dashboards globally).
  2. Add the label `no-dboard` to entities (HA Settings → Labels). They stay visible in manual dashboards but disappear from this strategy.
  3. Use the per-entity hide controls in the strategy editor (most granular).

## Configuration examples

### Zone-presence card with curated entities and per-zone icons / colours

```yaml
type: custom:oriel-zone-presence-card
name: Living Room Presence
entities:
  - { entity: binary_sensor.couch_occupied, icon: mdi:sofa, color: light-blue }
  - { entity: binary_sensor.desk_occupied, icon: mdi:desk, color: red }
  - { entity: binary_sensor.bed_occupied, icon: mdi:bed, color: purple }
  - binary_sensor.kitchen_motion
```

### Density override

```yaml
strategy:
  type: custom:oriel
  density: cozy   # 'compact' | 'cozy' | 'comfortable' (default). Applies to every view.
```

### `presence_entities` shared by favorites pin AND Room view

```yaml
strategy:
  type: custom:oriel
  areas_options:
    living_room:
      pin_zone_presence_to_favorites: true
      presence_entities:
        - { entity: binary_sensor.couch_occupied, icon: mdi:sofa, color: light-blue }
        - { entity: binary_sensor.desk_occupied, icon: mdi:desk, color: red }
```

The list is the single source — favorites pin and Room view auto-render both consume it. Falls back to device_class auto-detect when unset.

### Per-user dashboards

```yaml
strategy:
  type: custom:oriel
  users_by_role:
    admin:
      override: { show_security_summary: true }
    kid:
      override: { show_security_summary: false, show_routines_section: false }
```

### Today-vs-yesterday tile

```yaml
type: custom:oriel-summary-card
summary_type: lights
state_content: ['count']
show_delta: true
```

## Migrating from upstream Simon42 Dashboard Strategy

See [MIGRATION.md](MIGRATION.md) for the full guide. Tl;dr: replace `custom:simon42-dashboard` with `custom:oriel` and every `simon42-*` card tag with `oriel-*`. Every config field stays identical.

## Versioning

Oriel follows [Semantic Versioning](https://semver.org). The current line is **v4.x** on the HA 2026.5+ baseline. See [release notes](https://github.com/TheDave94/oriel-dashboard/releases) per version.

The plugin started life as a fork of the upstream simon42 dashboard strategy and was rebranded in v4.1.0. The v1.x–v3.x history reflects intermediate brand names — those releases are not supported.

## Acknowledgments

This project began as a fork of [TheRealSimon42/simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) — credit to [@TheRealSimon42](https://github.com/TheRealSimon42) for establishing the UX foundation (auto-generated room views, summary tiles, area grid) preserved here. As of v4.0 the project has diverged substantially: setup wizard, plugin extension API, per-user dashboards, HACS-plugin auto-detection, custom cards beyond the original five, the migration-assistant infrastructure, and an HA 2026.5+ architectural baseline — none of which are intended to go back upstream.

## License

[CC BY-NC-SA 4.0](LICENSE). Non-commercial use, share-alike. Attribution required.

## Contributing

Bug reports, feature requests, and PRs welcome at [TheDave94/oriel-dashboard](https://github.com/TheDave94/oriel-dashboard/issues). Translations into additional locales are particularly appreciated — drop a `src/translations/<lang>.json` mirroring `en.json` and submit a PR.
