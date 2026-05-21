# Changelog

All notable changes to **Oriel Dashboard** are documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Full release notes with diffs and asset bundles: [GitHub releases](https://github.com/TheDave94/oriel-dashboard/releases).

---

## [4.6.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.5.0...v4.6.0) (2026-05-21)


### Features

* v4.6 review follow-ups + adversarial tests + new editor surfaces ([#24](https://github.com/TheDave94/oriel-dashboard/issues/24)) ([0049d84](https://github.com/TheDave94/oriel-dashboard/commit/0049d84b156c2baa138954809b4c0f05f62185d0))

## v4.1.0 — Rebrand to Oriel Dashboard (2026-05-21)

Rebranded from `dashboard-strategy-enhanced` to **Oriel Dashboard**. Repo renamed to `TheDave94/oriel-dashboard`. **Breaking change** — every user-facing identifier renamed; see [MIGRATION.md](MIGRATION.md) for the upgrade path.

- Strategy type: `custom:oriel`
- Card prefix: `oriel-*`
- HACS install dir: `/hacsfiles/oriel-dashboard/`
- CSS variables: `--oriel-*`
- Debug URL param: `?oriel_debug=1`
- Console banner: `Oriel Dashboard vX.Y.Z loaded`
- Plugin extension entry point: `window.oriel`

## v4.0.0 — First post-fork rebrand (2026-05-21, retired)

Interim `dashboard-enhanced` brand. Superseded by v4.1.0; do not install.

## v3.x — Feature shipping (2026-05)

Shipped over one batch on 2026-05-21:

- **v3.1.0** — Onboarding wizard framework. Auto-detects installed HACS plugins via `customElements`.
- **v3.2.0** — Bubble Card detail drawer integration.
- **v3.2.1** — ApexCharts sparkline replacement (per-card `use_apexcharts: true` opt-in).
- **v3.2.2** — decluttering-card pass-through via `decluttering_templates` config.
- **v3.2.3** — floorplan-card view emission via `floorplan_view` config.
- **v3.2.4** — Voice FAB custom card.
- **v3.3.0** — `state_content` field on summary cards (mirrors HA tile-card convention).
- **v3.3.1** — State-iconography registry (auto-applied per-state icons on locks + covers).
- **v3.4.0** — Per-area `room_view_overrides` (replace or extend per-room layouts).
- **v3.4.2** — Strategy debug panel via `?oriel_debug=1`.
- **v3.4.3** — Migration assistants in the editor (one-tap apply for deprecated fields).
- **v3.4.4** — Today-vs-yesterday tile overlays on summary cards.
- **v3.5.0** — Plugin extension API (`window.oriel.registerSection / registerBadge`).
- **v3.5.1** — Usage-aware section ordering (localStorage tap tracker + editor banner).
- **v3.5.2** — Anomaly detection utility (hour-of-day modal state detector).
- **v3.5.3** — Energy cost overlay tile feature (€/h from power × tariff).
- **v3.5.4** — Mobile swipe-gesture navigation.
- **v3.5.5** — Per-device-class favorites (viewport-keyed map).
- **v3.5.6** — Internal release.
- **v3.5.7** — Webpack publicPath hotfix.

## v3.0.0 — Per-user / per-role dashboards

Resolved the #1 community pain point — different layouts per HA user via `hass.user.id` and `hass.user.labels`. See the v3.0.0 release notes for the full config schema.

## v2.x — Pre-v3 baseline

Tracked in [GitHub releases v2.x](https://github.com/TheDave94/oriel-dashboard/releases?q=v2). These releases predate the Oriel rebrand and are not supported.

## v1.x — Upstream fork era

Inherited from the upstream [simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy). See the upstream changelog for v1.x history.
