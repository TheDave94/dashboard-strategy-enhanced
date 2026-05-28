# Oriel Dashboard

Custom Lovelace strategy for Home Assistant — auto-generates the whole dashboard from area / device / entity metadata, then layers a setup wizard, per-user layouts, HACS plugin shims (Bubble Card, ApexCharts, decluttering-card, floorplan-card), a plugin extension API, and ten custom cards on top.

Built on the foundation [simon42-dashboard-strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) established (auto-generated room views, summary tiles, area grid) and extends it with power-user surface above. Not aimed at replacing the upstream — Simon42 remains the right pick for users who want a focused, opinionated auto-dashboard. Oriel is for those who want more handles to pull. Simon42 users can migrate over with a one-shot YAML edit; see MIGRATION.md.

## Architecture

**Language:** TypeScript (ES2020, strict mode)
**Build:** Webpack → code-split chunks (main + lit + core + views + editor on-demand)
**Distribution:** HACS-compatible (Custom Repository), deployed to `/config/www/community/oriel-dashboard/`

### Module Overview

```
src/
├── oriel.ts    # Entry point: generate(config, hass) → {title, views[]}
├── Registry.ts                      # Singleton registry (synchronous init from hass object, pre-computed Maps)
├── types/                           # Type definitions
│   ├── homeassistant.ts             #   HA interfaces (hass object, callWS, formatters)
│   ├── registries.ts                #   Entity/device/area/floor registry types
│   ├── strategy.ts                  #   Oriel config types
│   └── lovelace.ts                  #   Lovelace card/view/section/badge types
├── utils/
│   ├── entity-filter.ts             #   Entity collection (collectPersons, findWeatherEntity, findDummySensor)
│   ├── name-utils.ts                #   Name/entity helpers (stripAreaName, getVisibleAreas, sortByLastChanged)
│   ├── badge-builder.ts             #   Person badge creation
│   └── view-builder.ts              #   View generation (overview, utility, area views)
├── sections/
│   ├── OverviewSection.ts           #   Clock, alarm, search, summaries, favorites
│   ├── AreasSection.ts              #   Area cards (with optional floor grouping)
│   └── WeatherEnergySection.ts      #   Weather forecast + energy distribution
├── cards/                           # LitElement custom cards (reactive, tile card pooling)
│   ├── SummaryCard.ts               #   Reactive summary tiles (lights, covers, security, batteries, climate)
│   ├── LightsGroupCard.ts           #   On/off light grouping (heading badges + tile card pool + floor grouping)
│   └── CoversGroupCard.ts           #   Open/closed cover grouping (heading badges + tile card pool)
├── views/                           # Specialized view strategies
│   ├── RoomViewStrategy.ts          #   Room detail view (15+ device classes, Reolink + Aqara cameras)
│   ├── LightsViewStrategy.ts        #   Light aggregation (optional floor grouping)
│   ├── CoversViewStrategy.ts        #   Cover/blind aggregation
│   ├── SecurityViewStrategy.ts      #   Security overview (locks, doors, windows, garages, smoke/gas detectors)
│   ├── BatteriesViewStrategy.ts     #   Battery status (critical/low/ok)
│   └── ClimateViewStrategy.ts       #   Climate/thermostat overview (heating/cooling/idle/off)
└── editor/                          # Configuration UI
    ├── StrategyEditor.ts            #   Editor class (largest file — config form, state management)
    ├── editor-handlers.ts           #   Event listeners, drag/drop area reordering
    ├── editor-template.ts           #   HTML template generation
    └── editor-styles.ts             #   CSS styling
```

Output:
```
dist/
├── oriel.js                        # Entry point (instant custom element registration)
├── oriel-core.<hash>.js            # Registry, cards, utils
├── oriel-lit.<hash>.js             # Lit framework (shared)
├── oriel-views.<hash>.js           # All view strategies
├── oriel-editor.<hash>.js          # Editor (lazy-loaded on demand)
├── *.js.gz / *.js.br                                    # Pre-compressed variants
└── *.LICENSE.txt                                        # License files
```

### Data Flow

1. **Entry Point** registers custom elements, calls `Registry.initialize(hass, config)` synchronously
2. **Registry** reads entity/device/area data from `hass` object (synchronous), builds pre-computed Maps/Sets
3. **Utils** collect persons, weather, favorites using pre-filtered Registry methods
4. **Section Builders** generate overview, areas, weather/energy sections
5. **View Builders** generate utility views (lights, covers, security, batteries, climate) + per-area room views
6. **Custom Cards** render reactive UI (real-time `hass` updates via `set hass()`)

### Registry — Core Design

The Registry is a **static singleton** (no instance, all static members). Initialized once, then provides O(1) lookups everywhere.

**Synchronous Init** (reads directly from hass object, no WebSocket needed):
```
Object.values(hass.entities)  → EntityRegistryDisplayEntry[]
Object.values(hass.devices)   → DeviceRegistryEntry[]
Object.values(hass.areas)     → AreaRegistryEntry[]
```
Called once in dashboard strategy `generate()` before views are returned. Idempotent — subsequent calls in view strategies are no-ops.

**Pre-Computed Maps:**

| Map | Key | Value | Filtered? |
|-----|-----|-------|-----------|
| `_entityById` | entity_id | EntityRegistryDisplayEntry | Raw |
| `_deviceById` | device_id | DeviceRegistryEntry | Raw |
| `_entitiesByDevice` | device_id | entity_id[] | Raw |
| `_entitiesByDomain` | domain | entity_id[] | Raw |
| `_entitiesByArea` | area_id | EntityRegistryDisplayEntry[] | Raw |
| `_visibleEntitiesByArea` | area_id | EntityRegistryDisplayEntry[] | **Pre-filtered** |
| `_visibleEntitiesByDomain` | domain | entity_id[] | **Pre-filtered** |
| `_configDiagEntitiesByArea` | area_id | EntityRegistryDisplayEntry[] | Config/diagnostic only |

Raw Maps stay available for the Editor (needs all entities for show/hide toggles).

**Pre-Filtering** (applied once during init via `_isEntityVisible()`):
- Not in `_excludeSet` (no "no_dboard" label)
- Not in `_hiddenFromConfig` (not in `areas_options.*.groups_options.*.hidden`)
- Not `hidden_by` (user or integration)
- Not `disabled_by` (user or integration)
- Not `entity_category` "config" or "diagnostic"

Downstream code uses pre-filtered methods directly — no redundant inline checks.

### Entity Filtering Pipeline

```
Entity → no_dboard label? → areas_options hidden? → Registry status (hidden_by, disabled_by)?
      → Category check (config/diagnostic excluded) → Platform filter → Dedup → Display
```

### HA Entity Registry vs. State-Attributes (CRITICAL)

Many entity properties exist ONLY in the Entity Registry, NOT in state attributes. Always use the registry as primary source:

| Property | Registry (`hass.entities[id]`) | State attributes |
|----------|-------------------------------|-----------------|
| `hidden_by` | "user", "integration", null | NOT available |
| `disabled_by` | "user", "integration", null | NOT available |
| `entity_category` | "config", "diagnostic", null | Sometimes copied, often missing |
| `platform` | "mobile_app", "mqtt", etc. | NOT available |
| `device_id` | device UUID | NOT available |

**Rule:** Always read `hidden_by`, `disabled_by`, `entity_category`, and `platform` from the registry. Group cards (lights, covers) get entities pre-filtered from the registry array — they have these fields directly on the entity object. The summary card works with `hass.states` keys and must look up registry entries via `hass.entities?.[id]`.

### Config Hierarchy

- **Global toggles**: show_weather, show_energy, show_summary_views, show_room_views, group_by_floors, show_covers_summary, show_clock_card, show_light_summary, show_security_summary, show_battery_summary, show_climate_summary, show_search_card, show_locks_in_rooms, hide_mobile_app_batteries, group_lights_by_floors, use_default_area_sort, show_switches_on_areas, show_alerts_on_areas
- **Layout**: summaries_columns (2 | 4)
- **Area-level**: areas_display.hidden, areas_display.order
- **Entity-level**: areas_options.{areaId}.groups_options.{domain}.hidden
- **Special**: room_pin_entities, alarm_entity, favorite_entities, custom_views

## Complexity Hotspots

These files require extra care — changes here most likely cause regressions:

1. **editor/StrategyEditor.ts** — Editor state management, expand state persistence, config-changed events
2. **views/RoomViewStrategy.ts** — Entity categorization across 15+ device classes
3. **Registry.ts** — Central data layer, all views depend on its Maps/Sets
4. **utils/name-utils.ts** — Utilities used everywhere (changes ripple through entire codebase)

## Development Workflow

1. Create a feature branch from `main` (e.g. `feature/climate-summary-view`)
2. Build: `npm run build` (production) or `npm run build-dev` (with source maps)
3. Deploy: copy `dist/` contents to your local HA's `www/community/oriel-dashboard/` directory for live testing
4. Delete stale `.gz` and `.br` files after copying (HA serves compressed over `.js` if present)
5. Hard-refresh browser (Cmd+Shift+R). HA restart only needed for structural changes, not logic changes
6. **Test on the live system** — always before pushing to GitHub!
7. Test via Playwright and/or HA MCP tools

**Build scripts:**
```
npm run build       # Production (minified, no source maps)
npm run build-dev   # Development (source maps)
npm run watch       # Dev + auto-rebuild on file changes
```

## Git & Release Workflow

**Never commit directly to `main`.** Always use feature branches.

### Feature Development
1. `git checkout -b feature/<name>` from `main`
2. Develop, build, test on live system
3. Commit source changes only. **Don't commit `dist/`** — it's rebuilt fresh from source at release time (see Release Flow below)
4. `git push -u origin feature/<name>`
5. Create PR from feature branch → `main` (triggers HACS validation workflow)
6. Wait for CI to pass, then merge
7. Delete feature branch (local + remote)

### Release Flow

What happens after your PR merges to `main`:

1. **release-please** opens (or updates) a chore PR titled `chore(main): release <next-version>` — bumps `package.json` + appends a CHANGELOG entry. Conventional-commit prefixes drive the bump: `fix:` → patch, `feat:` → minor, `feat!:` → major. `docs:` and `chore:` don't trigger a release; `test:` triggers a patch but doesn't appear in the changelog (release-please default config).
2. **Merging the release PR** tags the new version and publishes a GitHub Release.
3. **`release-build.yml`** triggers on the `release: published` event, checks out the tagged commit, runs `npm ci && npm run build`, and uploads every file in `dist/` as an individual release asset (`gh release upload <tag> dist/* --clobber`).
4. **HACS users fetch the release assets**, not the source tree. The source-tree `dist/` is not load-bearing for users — release-build.yml builds it fresh on every release.

See [docs/RELEASE-INFRASTRUCTURE.md](docs/RELEASE-INFRASTRUCTURE.md) for the GitHub App + release-please auth setup that lets the `release: published` event actually fire `release-build.yml` (the suppression-rule workaround).

### Porting Community PRs
When PRs were created against the old codebase and cannot be merged directly:
1. Manually port the changes into the current TypeScript codebase
2. Credit the original author as `Co-Authored-By: Name <user@users.noreply.github.com>` in the commit
3. Close the original PR with a friendly comment + link to the release
4. Issue reference in the commit (`Closes #XX`) automatically closes the issue on merge

## How we work

**Default to action within scope; pause at boundaries.** When a task has a clear spec — a [ROADMAP.md](ROADMAP.md) §2 entry, or explicit acceptance criteria — execute through implementation, testing, PR, CI, squash-merge, branch delete, and wait for release-please without intermediate check-ins. The release PR is the review point. Report when it's ready for the user's approval.

**The spec is the contract.** If the work fits the spec, execute it. If it doesn't, surface why before adapting.

**Investigate before deciding.** When evidence is missing, gather it read-only and report findings — don't guess and ship.

**Audits are how the docs stay honest.** Run them deliberately; treat findings as evidence, not action items. Audits happen when docs get used, not on a schedule — trying to follow an instruction or use a reference is itself an audit, and drift surfaces under pressure of actual use. When you notice a doc claim doesn't match reality during normal work, treat it as an audit finding: open a follow-up, don't paper over.

**The user picks direction. You pick implementation.**

**Stop and surface when:**

- Scope grew past the spec.
- Two valid paths exist and the choice changes the product.
- Evidence contradicts the spec.
- A [PRINCIPLES.md](PRINCIPLES.md) principle would be violated to complete the task.

**Cross-fork PR safety.** `TheDave94/oriel-dashboard` hosts head branches for open PRs in `TheRealSimon42/simon42-dashboard-strategy`. Deleting any such branch in this repo auto-closes the upstream PR. Before any **bulk** branch deletion — manual or automated — check [`docs/protected-branches.md`](docs/protected-branches.md) (the snapshot of currently-protected branches) and refresh it via the procedure in that file's header. **Single-branch** deletions during normal merge-and-cleanup flow only need the check if the branch name matches a pattern that could plausibly be an upstream PR head (e.g. `feat/*`, `fix/*`, `grouped/*`, `chore/*` are all in the protected set today; `release-please--*`, `docs/*`, `feature/*` (with the trailing `ure`), and `investigation/*` are not). The `.github/workflows/protect-upstream-pr-branches.yml` workflow is a smoke alarm that fails loudly post-deletion with a recovery command — it does not prevent the deletion, since GitHub doesn't expose pre-delete hooks on standard repos. Treat the alarm as a hard stop: recover and surface, don't proceed.

## Design Decisions

Deliberate architecture decisions that should not be changed:

### Code-Split Chunk Architecture (PERFORMANCE-CRITICAL)
The bundle is deliberately split into 5 chunks:

| Chunk | Contents | Size | Loads |
|-------|----------|------|-------|
| `main` (Entry) | Custom element registration | tiny | Immediately — must register before HA's 5s timeout |
| `lit` | Lit framework (shared) | small | Async, shared by core/views/editor |
| `core` | Registry, Utils, Cards, OverviewView | medium | Async, for the home screen |
| `views` | Lights/Covers/Security/Batteries/Climate/Room Views | small | Async, on navigation |
| `editor` | StrategyEditor + js-yaml | large | On-demand, only when user opens config |

**Why:** Without code splitting, the entry point was a single large bundle. HA has a fixed 5-second timeout for custom element registration. On slow connections (Slow 4G), the JS file competes with all other HA chunks and custom cards for max. 6 browser connections. With the tiny entry point, the element registers instantly while the rest loads in the background.

**Content-Hash Chunk Filenames:** Chunks include a `[contenthash:8]` in their filename (e.g. `oriel-core.c6a1e2e6.js`). HACS only sets its cache-busting `hacstag` on the entry file — without content hashes, browsers would serve stale cached chunks after a HACS update.

### No Auto-Detection for Temperature/Humidity on Area Cards
The overview area cards only show `sensor_classes` (temperature, humidity) when the user has explicitly assigned an entity in the **HA area settings** (`area.temperature_entity_id`, `area.humidity_entity_id`). No auto-detection because:
- Wrong sensors would be displayed (e.g. printer temperature in the office)
- The user would have no way to remove them
- HA's own Home Strategy does it the same way

**Note:** In room detail views (RoomViewStrategy), sensors ARE auto-detected — they appear as badges and can be filtered via `no_dboard` label or `groups_options.hidden`.

### Pre-filtered Features on Area Cards and Tile Cards (PERFORMANCE-CRITICAL)
Area cards only receive `controls` that actually exist in the area (e.g. `['light', 'cover-shutter']`), not all possible controls. Tile cards only receive `features` that the entity supports (e.g. `light-brightness` only for lights with brightness support, `climate-hvac-modes` only for climate entities).

**Why:** Without pre-filtering, each card must scan all entities itself — with many areas and entities, this causes massive load times on weak devices (tablets, wall panels). Check here first when investigating performance issues!

### Custom Cards: LitElement with Reactive willUpdate() (PERFORMANCE-CRITICAL)
All custom cards (SummaryCard, LightsGroupCard, CoversGroupCard) use LitElement with `willUpdate(changedProps)` instead of the previous innerHTML rebuild pattern. This means:
- HA calls `card.hass = ...` on **every** state change (any entity in the entire system) — this happens hundreds of times per minute
- Without the reactive pattern, each card would rebuild its entire DOM on every `set hass()` call → massive performance problems
- With `willUpdate()`, cards check whether relevant states actually changed and only re-render when needed
- SummaryCard additionally caches relevant entity IDs (`_relevantEntityIds`) and only invalidates the cache on registry changes (`oldHass.entities !== this.hass.entities`)
- LightsGroupCard and CoversGroupCard use tile card pooling (DOM elements are reused instead of recreated)

**Why:** The migration from innerHTML to LitElement + willUpdate was extensive, but without this pattern the dashboard is unusable on weak devices (tablets, wall panels). Do not revert!

### Climate Summary Default: Off
`show_climate_summary` defaults to `false` because not every user has thermostats. All other summaries (lights, covers, security, batteries) default to on.

## Credentials and HA API access

*Based on `/opt/autocoder/CREDENTIAL_CONVENTIONS_TEMPLATE.md` (canonical), adapted for this repo.*

**Scope.** Only the test layer needs credentials. `npm run build`, `npm run build-dev`, `npm run watch`, `npm run lint`, type-checks — none of these touch the HA API. Playwright (`tests/e2e/*.ts`, `tests/e2e-browser/*.spec.ts`) and the strategy-API test use HA_URL + HA_TOKEN to hit the live HA instance.

**Where credentials live.** `.env.local` in this repo (gitignored). Values: `HA_URL`, `HA_TOKEN`, optionally `HA_DASHBOARD_URL_PATH` (path string, not a credential). Schema documented in `.env.example` (committed).

**Loading.** `source .env.local` before running tests. `playwright.config.ts` reads `process.env.HA_URL` (defaults to `http://localhost:8123` if unset, so unloaded tests fail informatively rather than hanging).

**Verifying without echoing.** Length-check or API round-trip:

```bash
node -e "const t=process.env.HA_TOKEN||''; console.log('HA_TOKEN loaded: len='+t.length+', expect 183')"
# Or hit HA's /api/ endpoint to confirm auth works:
node -e "fetch(process.env.HA_URL+'/api/',{headers:{Authorization:'Bearer '+process.env.HA_TOKEN}}).then(r=>console.log('HA API status='+r.status))"
```

**Token scope.** HA 2026.5.x does not support fine-grained access tokens — `HA_TOKEN` is full admin scope. The same long-lived token also lives in `~/.hermes/.env` and `/opt/repos/homeassistant-config/.env.local`. When HA upstream gains per-token scoping, this repo's copy can become read-only (Oriel's tests only need entity-state reads + dashboard-render verification; no writes).

**Rotation.** Central runbook lives at `/opt/autocoder/ROTATION_RUNBOOK.md`. For HA-token rotation, the runbook lists the three holder files. **Rotation triggers** beyond scheduled cadence: any time a CC transcript may have been shared externally, rotate `HA_TOKEN`.

**Conventions for credentialed work in this session.** Never `cat`, `echo`, `od`, `xxd`, `head`, or otherwise render credential bytes to stdout. Values flow through process memory (Node `process.env`, shell `$VAR` expansion) only. Verify by length or by API round-trip success, not by inspection.

## Knowledge map

In-repo docs and when to load each. Inline references to these files elsewhere in CLAUDE.md remain authoritative for context-specific use; the table below is the index.

| File | When to load |
|------|--------------|
| `EXTERNAL_COUPLING.md` | Renaming or removing a config field that Oriel reads from HA entities; any house_mode-related work; any change to the dashboard-rename detection story. Mirrored verbatim from the HA-config repo — both repos own the contract. |

## References

Local reference copies for architecture and pattern lookup (sparse checkouts, read-only):

| Local Path | Repository | Contents |
|------------|------------|----------|
| `../references/ha-strategies/` | `home-assistant/frontend` → `src/panels/lovelace/strategies/` | Official HA strategies (TypeScript, architecture reference) |
| `../references/mushroom-strategy/` | `DigiLive/mushroom-strategy` | Community dashboard strategy (TypeScript + build pipeline reference) |
| `../references/hacs-docs/` | `hacs/documentation` → `source/docs/publish/` | HACS publishing documentation (hacs.json options, release handling) |

**HA Release Notes (Markdown)**: `https://github.com/home-assistant/home-assistant.io/blob/rc/source/_posts/` — Blog posts in MD format. Example for April 2026: `2026-04-01-release-20264.markdown`. Useful for checking which HA features/changes are current and whether issues have become obsolete due to HA updates.
