# Changelog

All notable changes to **Oriel Dashboard** are documented here. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Full release notes with diffs and asset bundles: [GitHub releases](https://github.com/TheDave94/oriel-dashboard/releases).

---

## [4.11.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.10.0...v4.11.0) (2026-05-28)


### Features

* camera overview view ([#68](https://github.com/TheDave94/oriel-dashboard/issues/68)) ([b175efe](https://github.com/TheDave94/oriel-dashboard/commit/b175efe15f3c3eb13408c97eac43a0233a2115de))
* custom_cards placement — overview top, summaries, and per-room ([#76](https://github.com/TheDave94/oriel-dashboard/issues/76)) ([186c348](https://github.com/TheDave94/oriel-dashboard/commit/186c3484d7977710417dc6a94b0970d50e0870a4))
* dynamic house_mode vocabulary in adaptive hint ([#54](https://github.com/TheDave94/oriel-dashboard/issues/54)) ([7d729bf](https://github.com/TheDave94/oriel-dashboard/commit/7d729bf4c42ae41946c1d1a1861e830d675e97bb))
* **editor:** reorder custom views with move up/down controls ([#66](https://github.com/TheDave94/oriel-dashboard/issues/66)) ([35d7f7b](https://github.com/TheDave94/oriel-dashboard/commit/35d7f7bd2980852ed747a35d1f75550d46df850d))
* entity-name-only naming toggle for room tiles ([#69](https://github.com/TheDave94/oriel-dashboard/issues/69)) ([4a53e08](https://github.com/TheDave94/oriel-dashboard/commit/4a53e08df5d217dffdff819fec69901d03d007a1))
* humidity summary view ([#65](https://github.com/TheDave94/oriel-dashboard/issues/65)) ([930cf17](https://github.com/TheDave94/oriel-dashboard/commit/930cf1762337e3728f43237976fd669ac327e59b))
* include heat detectors in the Security view ([#73](https://github.com/TheDave94/oriel-dashboard/issues/73)) ([5ca2e7a](https://github.com/TheDave94/oriel-dashboard/commit/5ca2e7a7d23a361f1575164caa6ac9f647fd99ac))
* live-reference views from other dashboards ([#67](https://github.com/TheDave94/oriel-dashboard/issues/67)) ([f366f05](https://github.com/TheDave94/oriel-dashboard/commit/f366f057ea550dd0623fcd2064da37bbe436e087))
* reorderable section order within room views ([#71](https://github.com/TheDave94/oriel-dashboard/issues/71)) ([ba438aa](https://github.com/TheDave94/oriel-dashboard/commit/ba438aa6d924d47557d6b4412e16772f58e6bdd2))


### Bug Fixes

* covers view groups overlap when a bucket exceeds its grid rows ([#75](https://github.com/TheDave94/oriel-dashboard/issues/75)) ([e1b3470](https://github.com/TheDave94/oriel-dashboard/commit/e1b347014c6e7356ce718798368ededb134cb0cd))

## [4.10.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.9.1...v4.10.0) (2026-05-23)


### Features

* complete Bubble Card tile tap_action rewiring ([#50](https://github.com/TheDave94/oriel-dashboard/issues/50)) ([beec2c1](https://github.com/TheDave94/oriel-dashboard/commit/beec2c19a11083508f72fe7f9873b6fb8004cf09))
* expose camera_hero per-area knob in the editor ([#52](https://github.com/TheDave94/oriel-dashboard/issues/52)) ([fb018fc](https://github.com/TheDave94/oriel-dashboard/commit/fb018fc64ed3fe331d749f02e6d53416072f44e3))

## [4.9.1](https://github.com/TheDave94/oriel-dashboard/compare/v4.9.0...v4.9.1) (2026-05-22)


### Bug Fixes

* remove no-op use_apexcharts_sparklines dashboard toggle ([#40](https://github.com/TheDave94/oriel-dashboard/issues/40)) ([81b81cc](https://github.com/TheDave94/oriel-dashboard/commit/81b81ccd094d245da7ae7a19c5198daf4b96515f))

## [4.9.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.8.0...v4.9.0) (2026-05-22)


### Features

* **editor:** keyboard-equivalent reorder for SectionOrderTab ([a2e9e37](https://github.com/TheDave94/oriel-dashboard/commit/a2e9e373db8dbbb46178d733c5222c2501bd16c8))

## [4.8.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.7.0...v4.8.0) (2026-05-21)


### Features

* v4.8 follow-up [#3](https://github.com/TheDave94/oriel-dashboard/issues/3) — editor audit, axe-core sweep, camera generalization, strict-CSP harness ([#28](https://github.com/TheDave94/oriel-dashboard/issues/28)) ([f0601c0](https://github.com/TheDave94/oriel-dashboard/commit/f0601c07cad6d9d0a1a5dff7f4966dcee6a5c71a))

## [4.7.0](https://github.com/TheDave94/oriel-dashboard/compare/v4.6.0...v4.7.0) (2026-05-21)


### Features

* v4.7 follow-up [#2](https://github.com/TheDave94/oriel-dashboard/issues/2) — lit-a11y, HA pin audit, card design-tokens, registry churn bench ([#26](https://github.com/TheDave94/oriel-dashboard/issues/26)) ([3483945](https://github.com/TheDave94/oriel-dashboard/commit/3483945efdf81345e82ef15f6e58a8389eaccc03))

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
