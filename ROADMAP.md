# Roadmap

A current-state snapshot — not a list of aspirations. The project's working pattern is measured-and-reactive: features ship when a real signal justifies them. See [PRINCIPLES.md §5](PRINCIPLES.md) for the why.

## 1. Current state

Oriel Dashboard is a Home Assistant Lovelace strategy at **v4.9.0**. It auto-generates dashboards from areas, devices, and entities, and exposes every advanced feature through a visual editor instead of YAML. For "what changed" by version, read [CHANGELOG.md](CHANGELOG.md) or the [GitHub releases](https://github.com/TheDave94/oriel-dashboard/releases) page; this file does not duplicate that.

The strategy targets HA 2025.5+. The infrastructure-side state (release loop, branch hygiene, dependency posture) is documented in [docs/RELEASE-INFRASTRUCTURE.md](docs/RELEASE-INFRASTRUCTURE.md). The design principles every feature has to clear are in [PRINCIPLES.md](PRINCIPLES.md).

## 2. Near-term plan

Currently empty. See §4 Reactive next steps for how items get added.

## 3. Deliberately deferred

Items that were considered during a review cycle and explicitly held back, with the reasoning recorded so the decision survives staff turnover. Each entry: **what** the item is, **why deferred** at the time it was considered, **trigger to revisit** — the concrete condition that would make it worth shipping.

### StrategyEditor file split

- **What**: decompose `src/editor/StrategyEditor.ts` along a three-axis split (state vs. rendering vs. config mutators).
- **Why deferred** (follow-up #1): the file is 4140 lines / 148 cohesive methods, but extracting the per-tab render templates already captured the high-value ~40% of the win. The remaining split would require either ~80 lines of mixin plumbing or 100+ call-site changes for marginal benefit on the current scale.
- **Trigger to revisit**: a specific tab needs independent reuse or testing in isolation from the rest of the editor.

### Registry-rebuild perf mitigations

- **What**: optimizations (memoization, incremental rebuild, dirty-tracking) for the `Registry` rebuild path.
- **Why deferred** (follow-up #2): the perf bench measured 2.2–5.6ms on a 300-entity fixture; the spec's original 250ms budget was overstated by ~50–100×. There is no real problem to solve at current scale.
- **Trigger to revisit**: a user with a 1000+ entity install reports editor lag. The Registry-churn benchmark stays in CI as a regression guard against accidental slowdowns.

### Registry per-card render cost

- **What**: optimizations for per-card render cost when HA pushes irrelevant `hass` updates (the `@property hass` decorator re-renders cards regardless of whether any entity they care about actually changed).
- **Why deferred** (Registry.ts:115-125, v4.7.0): real cost but architecturally separate from Registry-rebuild. v4.7.0 shipped Registry-rebuild measurement + coalescing; this remaining axis was acknowledged but not actioned because there was no signal that it mattered in practice.
- **Trigger to revisit**: stutter / dropped-frame report on a large install, or a profiler trace showing the render path dominates a real workload.

### Dashboard-level axe-core scan

- **What**: an axe-core a11y sweep that covers the rendered dashboard (cards in their actual mount position) on top of the existing editor scan.
- **Why deferred** (follow-up #3): cards live ~7 shadow boundaries deep inside HA's frontend (`home-assistant → home-assistant-main → ha-drawer → partial-panel-resolver → ha-panel-lovelace → hui-root → hui-view → hui-section → oriel-*-card`). axe's `.include()` API needs either a light-DOM selector or an exact shadow-piercing path, both brittle against HA frontend churn. Card a11y is already covered by `lit-a11y/click-events-have-key-events` at lint time and by the `keyboard-a11y.spec.ts` Playwright spec at runtime.
- **Trigger to revisit**: axe gains a public API for HA-shadow-piercing scope, or a real a11y bug surfaces against a card that lit-a11y missed.

### Editor color-token migration

- **What**: migrate the editor's CSS from legacy HA variable names (`--primary-color` family) to modern design tokens, matching the migration done for cards.
- **Why deferred** (follow-up #2, partial migration): cards finished the migration in v4.7.0. The editor stays on legacy because the HA components it embeds (`ha-form`, `ha-switch`, `ha-combo-box`) still use the legacy names internally, and migrating only the editor's outer chrome would create token-inconsistency seams with the embedded HA components. The README claim about design-token coverage was qualified accordingly.
- **Trigger to revisit**: HA's own theme system drops the legacy variable names, forcing all consumers to migrate together.

### Bubble Card full tile rewiring

- **What**: when `use_bubble_drawers: true`, auto-rewrite per-tile `tap_action` to open the matching Bubble Card pop-up drawer instead of HA's default more-info dialog.
- **Why deferred** (OverviewViewStrategy.ts:415): pop-up *registrations* ship today, but auto-rewiring every emitted tile's `tap_action` could break dashboards where the user has tested Bubble Card integration only partially. The conservative choice was to land the pop-up infrastructure without forcing the behavior change on existing installs.
- **Trigger to revisit**: a user with `use_bubble_drawers: true` requests an opt-in "rewire all tiles" mode, or a signal that the feature is adopted broadly enough to justify changing the default.

## 4. Reactive next steps

Future work is driven by what surfaces — bug reports, feature requests on this repo or upstream simon42, deferred items above whose trigger condition fires, gaps revealed when the HA frontend evolves. There is no static roadmap, and items that look interesting in the abstract don't reach §2 unless something real has validated them. See [PRINCIPLES.md §5](PRINCIPLES.md) for the rationale; the previous shape of this file (long aspirational tiers) is exactly what that principle exists to discourage.

## 5. Out of scope

Explicit boundary statements — useful for setting expectations even when no one's asking. Each line is a thing this project has decided not to do, with the reason it stays decided.

- **Backend HA service integration** — Oriel is frontend-only. Surfaces like `strategy.flash_view` would require a Python integration component; that's a different project.
- **Backwards-compat layer for upstream simon42 identifiers** — the clean break is intentional. Migration is a one-shot YAML edit; see [MIGRATION.md](MIGRATION.md).
- **Hard dependency on any HACS plugin** — every feature must work in a clean fallback path. See [PRINCIPLES.md §2](PRINCIPLES.md).
