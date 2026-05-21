# Roadmap — proposed feature work beyond v2.2

This document drafts features that aren't bugs, aren't audit items, and aren't blocked on external dependencies. Each entry is a proposal — a starting point for discussion or implementation, not a commitment.

Effort estimates use **S** (≤ 1 day), **M** (1-3 days), **L** (1-2 weeks), **XL** (longer).

Organised in three parts:
- **Part 0** — Community-validated pain points (research, May 2026). Drives prioritisation.
- **Part A** — Near-term, concrete features with full design proposals.
- **Part B** — Ambitious / blue-sky features that would take the dashboard "to the next level". Less detail per item, more direction.

---

# Part 0 — What the HA community is asking for (research synthesis)

Based on a survey of the HA forum, Reddit, GitHub frontend/core issues, and competing dashboard projects (Apple Home, Google Home, SmartThings, Mushroom, Bubble Card) — researched May 2026.

## Top community pain points, ranked by frequency

1. **Per-user / per-device default dashboards and favorites** — *the* most-cited frustration. Default dashboard lives in browser localStorage, so non-technical family members keep landing on the wrong view. Multiple long-running threads: GitHub frontend #30023, #17325, #28455; forum "WTH can't I set a default dashboard per user?", "Default dashboard per user/device?"
2. **Sections-view resizing limitations** — cards can't shrink below built-in mins, columns aren't resizable, multi-card-per-screen is hard on mobile. Forum: "Sections - Possibility to resize cards or fill to screen", "Sections View - resizing cards within", core issue #34065.
3. **Performance degradation on large installs** — 2025.6 / 2025.7 introduced 30-second graph lags + 6-second camera previews on instances with 2,500+ entities. core #146799, #148758, frontend #25579.
4. **Mobile swipe / pull-to-refresh / thumb-reach** — frontend PR #14324, forum threads spanning years on swipe gestures between dashboards, Android #607.
5. **Role-based visibility, not just per-user** — current user-condition takes hex IDs and requires listing every individual. Forum: "Restricting visibility of dashboards by users", "Set user permissions on all dashboards".
6. **Richer tiles** — multi-sensor tiles, template-driven content, embedded sparklines. Forum: "Tile Card Improvements", "Enhanced Tile Card".
7. **Wall-panel / kiosk support** — no built-in screensaver, no nav lockdown, no remote screen wake. Forum: "Full Kiosk Mode for HA Companion App", HA discussion #2403.
8. **Editor is YAML-heavy for power features** — card-mod (1M+ views) and Button card (700K) thrive because the GUI gives up. Visual editors keep being requested.
9. **History/sparkline in tiles** — repeated asks; the dev team itself flagged this in [Dashboard chapter 2 blog post](https://www.home-assistant.io/blog/2024/07/26/dashboard-chapter-2/).
10. **Persistence regressions** — 2025.x silently swapped users to the new Home dashboard, lost custom layouts. frontend #29472, #30011.

## Patterns worth stealing from competing dashboards

- **Apple Home** — intent-based surfacing ("arriving home" / "going to sleep" reshuffles tiles); two distinct tile sizes per slot; per-loadout pages.
- **Google Home** — per-device-class favorites (watch vs tablet vs phone); empty-state intelligence (suggested favorites for new users).
- **SmartThings** — routines as first-class dashboard primitives (not buried in settings).
- **SharpTools** — visual rule engine that can target the dashboard itself (`flash_view`, `surface_tile` as service calls).
- **Bubble Card** — pop-up sub-views / sub-buttons — one tap reveals a contextual drawer instead of navigating away.
- **Mushroom** — ubiquitous `<ha-form>` visual editor (already adopted by this fork).
- **Mini-graph-card / ApexCharts** — micro-history inline with the entity.
- **HomeKit-Dashboard / apple-home-dashboard** — state-aware iconography (closed-vs-open garage, locked-vs-unlocked) that "speaks the right visual language" without per-entity config.
- **visionOS** — glanceable widgets that persist in space; sub-2-second status reads.
- **Card-mod culture** — CSS escape hatches: power users want CSS custom properties to override.

## Top 10 by impact × validated demand

This is the prioritised list. Cross-referenced with the entries below — items marked 🎯 in Part A/B map to one of these.

1. **Per-user/per-role layout resolution** — fixes the #1 family-usability complaint. (→ Part B A10, expanded)
2. **Density / viewport presets baked into the strategy** — three-line config addresses Sections-resize pain. (→ NEW: see C1 below)
3. **LLM "describe your dashboard" generator** — strategy is uniquely positioned (it already owns layout synthesis). (→ Part B A1)
4. **Context-aware re-ordering driven by `room_mode` / `house_mode`** — fork already depends on these modes; promote/demote sections by mode is small code, high perceived intelligence. (→ Part B A2 reframed)
5. **Sparkline + secondary-metric slots on the summary tile** — addresses HA dev team's own ask. (→ Part B A5 + Part A #6)
6. **First-class Routines auto-view from scenes/scripts ranked by usage** — exploits data HA already records. (→ Part B A8)
7. **Wall-panel variant with screensaver + thumb-reach safe-area** — small CSS + a `panel: wall` flag. (→ NEW: see C2)
8. **Voice FAB on every view, view-aware context** — bridges the "voice exists but feels bolted-on" gap. (→ Part B A7)
9. **Visibility editor rewrite (roles, time-of-day, mode) in ha-form** — the visual-editor pillar of this fork extended to its weakest area. (→ Part A #7 expanded)
10. **Ephemeral alert banner slot** (doorbell / smoke / intruder) — turns dashboards from "dumb display" into a notification surface. (→ Part B A9)

---

# Part A — Near-term

---

## 1. Plugin extension API — `s42-strategy-extension`

**Effort:** XL. **User impact:** high if other HACS plugins adopt; zero if nobody does.

### Problem

Today, third-party HACS plugins can't add sections, badges, or card features to a `custom:simon42-dashboard` view without monkey-patching the strategy. The closest a user can do is `custom_sections` with hand-written YAML, which is verbose and doesn't compose with plugin updates.

### Proposed solution

Define a small registration API that other plugins can call at load time:

```typescript
// In a third-party plugin's entry point:
declare global {
  interface Window {
    simon42Strategy?: {
      registerSection(spec: SectionExtensionSpec): void;
      registerBadge(spec: BadgeExtensionSpec): void;
    };
  }
}

window.simon42Strategy?.registerSection({
  key: 'my-plugin-music',
  labelKey: 'sections.my_plugin_music',
  icon: 'mdi:music',
  // Async because plugins may need to look up entities.
  build: async (ctx) => {
    // ctx: { hass, dashboardConfig, getAreaEntities }
    return { type: 'grid', cards: [...] };
  },
});
```

Strategy reads the registry during `generate()`, merges plugin sections alongside built-in ones, respects user's `sections_order` and `hidden_section_headings`. Plugin sections appear in the editor's section-order list with the plugin's icon and label.

### Code shape

- New `src/extension/registry.ts` — a typed singleton with `registerSection`, `registerBadge`, `list*` accessors.
- `simon42-dashboard-strategy.ts` exposes `window.simon42Strategy` on load (one-line addition).
- `OverviewViewStrategy.generate()` iterates registered sections after built-ins.
- Editor's section-order tab reads from the registry, shows plugin sections with a "plugin" badge to differentiate from built-ins.

### Open questions

- **Ordering**: do plugin sections default to the end of the overview, or to a position the plugin specifies? Probably end + user can reorder.
- **Versioning**: if the strategy's `SectionExtensionSpec` shape changes, do older-registered plugins break silently? Need a `apiVersion` field in spec and reject unknown versions.
- **Discovery**: how do users learn about extension-compatible plugins? Tag convention in HACS? README banner?

### Acceptance criteria

- Build a reference extension plugin (separate repo) that adds one section to the overview, tag both v1.0.
- Strategy emits the section identically to a built-in one — same heading styling, same `column_span` rules.
- Disabling the extension plugin (HACS uninstall) cleanly removes the section without strategy errors.

---

## 2. PWA / offline support

**Effort:** L. **User impact:** medium — primarily helps mobile dashboard users on flaky networks.

### Problem

HA's frontend itself is a PWA, but when the home connection drops, the strategy's lazy-loaded chunks (`-views`, `-editor`) fail to fetch. Users see broken dashboards mid-navigation.

### Proposed solution

Ship a service worker that pre-caches the dist chunks on first load. Strategy boot opportunistically registers it; users on browsers without SW support (rare) get the current behaviour.

```typescript
// simon42-dashboard-strategy.ts
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/hacsfiles/simon42-dashboard-strategy/sw.js')
    .catch(() => { /* silent — non-critical */ });
}
```

Service worker uses workbox-style stale-while-revalidate: dashboard works offline with last-known chunks, refresh fetches updates in the background.

### Open questions

- HACS install path: would the SW scope conflict with HA's own SW? Need to test against the `/hacsfiles/` prefix.
- Cache invalidation on plugin update: SW needs to recognise new chunk hashes (the `[contenthash:8].js` pattern helps here).
- Permissions / HA security model: do HA's CSP rules allow registering a third-party SW?

### Acceptance criteria

- Dashboard renders offline after one online visit, against current data (last hass state).
- Plugin update via HACS triggers cache refresh on next online visit, no manual clear.
- Lighthouse PWA score ≥ 90 against the strategy dashboard.

---

## 3. Theme packs

**Effort:** M. **User impact:** medium — design-conscious users currently have to write CSS by hand.

### Problem

The cards consume HA design tokens (`--ha-space-*`, `--ha-card-*`, `--ha-font-*`) consistently. A user wanting "compact, high-contrast" or "rounded, warm-tone" has to write a theme YAML covering 30+ variables.

### Proposed solution

Ship a small set of curated `themes/` YAML files in the repo. Users add one line to their HA `themes:` config to apply.

```yaml
# in HA configuration.yaml:
frontend:
  themes: !include_dir_merge_named themes/

# Then in the strategy config:
strategy:
  type: custom:simon42-dashboard
  recommended_theme: simon42-compact   # editor surfaces this
```

Reference themes:
- `simon42-default` — current visual baseline.
- `simon42-compact` — tight spacing, smaller icons; mobile-first.
- `simon42-glass` — translucent surfaces, blur backdrops; modern aesthetic.
- `simon42-warm` — earth tones, larger typography; older-user-friendly.

Editor's Overview tab gets a "theme" `<ha-form>` field (select) that previews the chosen theme.

### Code shape

- `src/themes/*.yaml` — 4-5 curated theme files.
- `scripts/build-themes.mjs` — copy + checksum to `dist/themes/` so HACS publishes them.
- Editor surfaces a `recommended_theme` selector with preview swatches.

### Open questions

- HA's theme system is dashboard-wide, not strategy-wide. We can recommend, not enforce.
- Should themes ship as part of this HACS plugin or as a sibling `simon42-themes` plugin? Probably this plugin — theme + strategy stay in sync.

### Acceptance criteria

- All four reference themes pass a Playwright screenshot test (no broken contrast, all icons visible, no overflow at 320px viewport).
- Editor surfaces theme selector and HA applies the choice without a reload.

---

## 4. Additional locales — community contribution flow

**Effort:** S (per locale). **User impact:** scales linearly with locales added.

### Problem

`en` and `de` ship today. Other locales need:
1. A new `src/translations/<lang>.json` mirroring `en.json`.
2. CI to validate parity (already in place — `lint-translations.mjs` auto-discovers).
3. Documentation on how to contribute.

### Proposed solution

- Add a `CONTRIBUTING.md` section: "Translating the strategy" with the parity rules and where the strings live.
- For each requested locale, accept a PR + run lint-translations to verify completeness.
- Possible candidates based on HA usage stats: `fr`, `es`, `it`, `nl`, `pt`, `pl`, `cs`.

### Open questions

- Machine-translated initial pass acceptable? (Probably yes for first draft, native speaker review before merge.)
- How to keep translations in sync when new strings are added in en.json? Lint failure surfaces it; PRs against each locale.

### Acceptance criteria

- Each new locale ships with 100% key parity vs en.json.
- Quick smoke test: switch HA's locale and verify the strategy emits the right strings.

---

## 5. Storybook for visual review

**Effort:** M. **User impact:** zero direct (developer tooling). Indirect: faster design iteration, lower regression risk.

### Problem

Visual changes to the cards (density tokens, container-query breakpoints, color states) are validated by eye against a live HA. No deterministic snapshot, no isolation per state.

### Proposed solution

Add Storybook with one story per card per state:
- `SummaryCard` — lights on, all off, batteries critical, with/without density override, container widths 200/400/600px
- `ZonePresenceCard` — 2/4/6 zones, mixed active/inactive, custom colors
- `LightsGroupCard` — flat list, nested groups, multi-floor
- `CoversGroupCard` — open/partial/closed mix, with awnings/windows split

Bonus: Storybook + Chromatic-style visual regression captures every PR.

### Code shape

- `npm i -D @storybook/web-components-vite`
- `.storybook/` config, `src/**/*.stories.ts` files per card
- Mock hass fixture mirroring `tests/fixtures/hass.ts`

### Open questions

- Vite-based Storybook + webpack-based prod build — two bundlers. Acceptable since Storybook never runs in production?
- Hosted Storybook on GitHub Pages? Free for public repos.

### Acceptance criteria

- All four cards have at least 3 stories each covering primary states.
- Storybook builds in CI; broken stories fail the PR.

---

## 6. Card-level templating — `state_content` and friends

**Effort:** M. **User impact:** medium — power users currently configure each tile by hand.

### Problem

HA's tile-card has `state_content: ['hvac_action', 'current_temperature']` to compose what the tile shows. Our cards don't propagate similar config — users can't customise what the summary tile says, what the zone-presence label reads, etc.

### Proposed solution

Each custom card grows a `state_content` option mirroring HA's tile-card pattern:

```yaml
type: custom:simon42-summary-card
summary_type: batteries
state_content:
  - count
  - last_critical   # entity name of the lowest battery
```

`simon42-zone-presence-card`:

```yaml
entities:
  - entity: binary_sensor.couch
    state_content: ['last_changed_relative']   # "active 5 min ago"
```

### Code shape

- New `src/utils/state-content.ts` — registry of named content formatters (count, last_changed_relative, friendly_name, current_value).
- Each card adds a `state_content?: string | string[]` to its config schema; render reads the formatter map.

### Open questions

- Compatibility with HA's tile-card `state_content` — same names where they overlap?
- Live updates: formatters that read `hass.states[id].last_changed` need to re-render on state change (already do via Lit reactivity).

### Acceptance criteria

- Each card documents its `state_content` options in README.
- Setting `state_content` in the visual editor previews the change live.

---

## 7. Per-area view customisation — `room_view_overrides`

**Effort:** L. **User impact:** medium — users with one weird room want to tweak just that room.

### Problem

The Room view emits a fixed structure (lights, climate, blinds, media, scenes, miscellaneous, zone-presence). Users with eg. a workshop area might want a custom layout for that one room while keeping defaults elsewhere. Today: only `presence_entities` is per-area; the rest is global.

### Proposed solution

Extend `areas_options.<area>` with `room_view_overrides`:

```yaml
areas_options:
  workshop:
    room_view_overrides:
      sections:
        - { type: heading, heading: Tools }
        - { type: tile, entity: switch.workshop_compressor }
      append_default: false   # skip the auto-generated lights/climate/etc.
```

When `append_default` is true (default), overrides extend the standard view. When false, they replace it entirely.

### Code shape

- `Simon42AreaOptions` gains `room_view_overrides: { sections: LovelaceSectionConfig[]; append_default?: boolean }`.
- `RoomViewStrategy.generate()` reads it and merges/replaces accordingly.
- Editor's Areas tab gets a "Customise room view" expansion per area.

### Open questions

- Override schema lives in user YAML. Validating it without compromising the editor's structure?
- Backwards compat with `groups_options.*.hidden` (the per-area entity hide list)? Probably orthogonal — overrides are about layout, hiding is about which entities show.

### Acceptance criteria

- A user can pin a custom card in one room view while every other room stays auto-generated.
- Disabling the override at runtime reverts to the auto-generated layout.

---

## 8. Custom view templates — `view_templates`

**Effort:** M. **User impact:** medium — users who want repeating dashboard sections.

### Problem

`custom_views` lets users define one-off dashboard views. If they want three nearly-identical views (eg. "Floor 1 Kids' Rooms", "Floor 2 Kids' Rooms", "Basement Kids' Rooms"), they have to duplicate YAML.

### Proposed solution

Top-level `view_templates` defines reusable view shapes; `custom_views` can extend a template.

```yaml
strategy:
  type: custom:simon42-dashboard
  view_templates:
    kids_room:
      sections:
        - { type: grid, cards: [{ type: custom:simon42-zone-presence-card, entities: ['{{ presence_entity }}'] }] }

  custom_views:
    - title: Floor 1 Kids' Rooms
      path: kids-f1
      icon: mdi:account-child
      template: kids_room
      template_args:
        presence_entity: binary_sensor.f1_kids_presence
    - title: Floor 2 Kids' Rooms
      path: kids-f2
      template: kids_room
      template_args:
        presence_entity: binary_sensor.f2_kids_presence
```

Lightweight Jinja-style `{{ var }}` interpolation, no full Jinja runtime.

### Open questions

- Should template args also support `{{ area.<area_id>.* }}` reads, or stay strictly user-defined?
- Editor support: visual editor probably stays YAML-only for templates (too dynamic to expose via ha-form schemas).

### Acceptance criteria

- Three views from one template renders without duplication in the saved YAML.
- Template-argument validation flags missing or extra args.

---

## 9. Custom card: weather-glance

**Effort:** S. **User impact:** small — niche.

A standalone `simon42-weather-glance-card` that summarises current weather + 3-day forecast in a single tile. The current `weather_sensors` config covers the related row above the weather card; this would complement it as a compact tile users can pin in favorites.

Not in any other request stream; lower priority. Listed here for completeness.

---

## 10. Custom tile feature: cover-position-slider

**Effort:** S. **User impact:** small — cover users.

A `simon42-cover-position-slider` tile feature (analogous to `simon42-sticky-lock-feature`) that slots a horizontal position slider into the cover tile's feature row. HA's built-in `cover-position` feature does this; this would add finer-grain control + the strategy's design-token styling.

Probably duplicates HA core too much to justify. Listed for completeness.

---

## Prioritisation

If I had to pick three to do next, in order:

1. **Plugin extension API (#1)** — highest leverage. One feature opens the door for an ecosystem.
2. **Theme packs (#3)** — quick win, immediately visible to users, builds on the design-token work already done.
3. **Per-area view customisation (#7)** — addresses a real "I want to tweak just one room" need that comes up frequently in HA strategy projects.

The rest are nice-to-have or speculative. Wait for user feedback before committing.

---

## Cancelled / explicitly not doing

- **Card-level Jinja runtime** — too heavy, browser-side Jinja for power-user templating opens a security + perf can of worms. The lightweight `{{ var }}` in #8 is the limit.
- **Direct integration with non-HACS dashboard tools** — out of scope; this is a HA strategy plugin.
- **Mobile-app-specific layout** — HA's own mobile app handles density via its own viewport rules. Container queries (already shipping) cover the responsive case.

---

# Part B — Ambitious / blue-sky

Features below would meaningfully change what the strategy is for, not just what it does. Each could become a small project on its own. Listed in rough order of "impact if it lands well." Not all of these should ship — they're a brainstorm to be triaged.

---

## A1. AI dashboard assistant — natural-language editing

**Effort:** XL. **Impact:** transformative for non-technical users.

### Idea

Embed an Assist conversation surface in the strategy editor. The user describes the change in plain language; the assistant edits the strategy YAML.

> "Hide the plants section, move the Energy section to the top, and add a tile for the garage door."

The assistant calls a structured tool exposing a small set of operations: `addSection`, `removeSection`, `reorderSections`, `addCustomCard`, `setOption`. Each operation validates against the strategy schema before applying.

### Why this is interesting

HA's Conversation integration ships LLM-backed agents (OpenAI, Anthropic, local Ollama). They already understand HA entities and areas. A small adapter that exposes "edit my dashboard" as a tool gives them a powerful surface without a custom LLM stack.

### Sketch

```typescript
// New: src/editor/assistant.ts
async function editStrategyWithAssist(
  userPrompt: string,
  hass: HomeAssistant,
  currentConfig: Simon42StrategyConfig,
): Promise<Simon42StrategyConfig> {
  // HA Conversation API: hass.callApi('POST', 'conversation/process', {...})
  // with tools=[addSection, removeSection, reorderSections, ...]
  // Each tool call is validated against the schema before mutation.
}
```

Editor surfaces a chat-style input below the section list. Power users keep the form fields; everyone else can type.

### Open questions

- Which model? HA users vary in their setup (cloud / local / none).
- Confirmation flow: dry-run preview before applying? Most users will want this.
- How to surface what the assistant changed without a giant diff dialog?

### Risk

- LLM hallucinates entity IDs or fabricates options. Schema validation pre-apply catches most cases; some won't be caught.
- API cost (cloud LLM) — not zero. Acceptable as opt-in.

---

## A2. Predictive surfacing — usage-aware section ordering

**Effort:** L. **Impact:** medium-high. Subtle but visible improvement to perceived quality.

### Idea

Track which sections + cards the user interacts with most (via `tap_action` dispatched events). After ~2 weeks of data, propose a new section order optimised for the user's actual usage. One-click apply.

A weaker form just bubbles "favorites you tap a lot" to the top of the favorites grid automatically — no proposal UI needed.

### Why

The current default order is "what most users want" — but the long-tail user with a workshop, a wine cellar, and three thermostats has different priorities. The data is right there in HA's `last_changed` and (with opt-in) usage stats.

### Sketch

- New `src/utils/usage-tracker.ts` records `tap` events to local storage with timestamp.
- Background calculation every N taps: which sections / cards rank highest?
- Editor surfaces a "Suggested layout based on your usage" banner with "Apply" / "Dismiss".

### Open questions

- Privacy: all data stays local-storage on the user's browser. Document this prominently.
- Cold start: needs interaction history; no signal in the first week. Banner appears only after threshold met.
- Multi-user: HA dashboards can have multiple users on the same install. Per-user tracking via HA user ID?

---

## A3. Live dashboard preview in editor — no save-to-see

**Effort:** L. **Impact:** high. Currently the editor requires save+refresh to see changes — friction at every step.

### Idea

Editor renders a thumbnail preview of the dashboard live as the user edits. Sub-second feedback for toggle / reorder / theme changes.

### Sketch

- Editor mounts a sandboxed iframe / shadow-DOM with the strategy's `generate()` output.
- Each form change re-runs `generate()` against the current config and re-renders the preview.
- Use the existing perf benchmark (median 2ms): generate is fast enough to run on every keystroke.

### Open questions

- Iframe vs shadow-DOM — iframe is safer (HA frontend doesn't bleed in) but heavier; shadow-DOM is lighter but inherits HA styles.
- Preview at scale: a real dashboard has 50+ tiles. Render only the section being edited?
- HA's editor framework conventions: do other custom-card editors do this? Usually no, but our config is small enough.

---

## A4. Drag-drop dashboard editor — visual reordering

**Effort:** L. **Impact:** medium-high for the section-order tab specifically.

### Idea

The section-order tab already supports drag-drop reorder. Extend it to:
- **Drag cards across sections** — eg. move a favorites tile into the maintenance section.
- **Drag custom cards into specific positions inside built-in sections** — currently `target_section` is a dropdown; make it a drop target.
- **Drag the preview itself** — combined with #A3, drag tiles directly on the rendered dashboard.

### Sketch

- HTML5 drag-drop already used for section reordering — extend the pattern.
- Each card gets a drag handle; drop targets are sections (with `target_section` config) and inter-section gaps.

### Risk

- Drag-drop is fiddly on touch devices. Need to test on tablets.

---

## A5. History sparklines on every tile

**Effort:** M. **Impact:** medium. Information-density boost for power users.

### Idea

Every emitted tile (light count, battery %, temperature) gets a small inline sparkline showing the last 24h of values. Tap to expand to a full graph.

### Why

HA stores history out of the box. The data's right there. Adding sparklines makes "is this normal?" answerable at a glance.

### Sketch

- New `simon42-sparkline` mini-card or feature. Pulls history via `hass.callApi('GET', 'history/period/...')` once on mount, caches.
- Renders inline SVG (no Chart.js dependency — too heavy).
- Opt-in via `state_content: [..., 'sparkline_24h']`.

### Open questions

- HA's history API isn't lightweight if called per-tile. Need a coalesced fetch per dashboard load.
- Sparkline UX patterns vary — bar chart? line? area? Test with users.

---

## A6. Anomaly detection badges

**Effort:** M. **Impact:** medium. Catches "wait, why's that on?" moments.

### Idea

Compute a baseline for each entity (eg. "this light is usually off at 3am") and flag anomalies in real time. A small red dot on the tile draws attention.

### Sketch

- Per-entity time-of-day histogram, refreshed weekly from HA history.
- Current state compared to typical state; if Z-score > threshold, flag.
- Computation runs in a Web Worker so the strategy `generate()` stays fast.
- Tap the badge → "this is unusual because X" tooltip.

### Risk

- Privacy / on-device only — all stats stay local-storage.
- False positives in the first weeks until baseline is built.

---

## A7. Voice-first interaction — Assist widget embed

**Effort:** M. **Impact:** medium. Mostly a "wow" factor for first-time users.

### Idea

A persistent floating voice-input widget on every strategy dashboard. Tap to speak; the request goes to HA's Assist pipeline. Results render inline (eg. spoken response surfaces a tile that the assistant identified as relevant).

### Sketch

- Embed `<ha-voice-command-button>` (HA's own widget) into the strategy's emitted view.
- Per-user opt-in via `show_voice_widget: true` in strategy config.

### Open questions

- HA Mobile already has voice. This adds it to the web frontend specifically.
- Discoverability: a small mic icon hidden in the corner won't be found.

---

## A8. Routine / scene-suggestion cards

**Effort:** M. **Impact:** high if users adopt them. Common ask in HA forums.

### Idea

Watch which scenes / scripts the user runs and propose **routines** (chained actions with predictable timing). Surface them as one-tap cards on the dashboard.

> Detected pattern: "You turn off the kitchen lights → enable Sleep mode → start the bedroom fan" 4 nights a week. Save as a routine?

### Sketch

- Background watcher tracks scene/script invocations + adjacent state changes within a small time window.
- Editor surfaces "suggested routines" as opt-in cards. Tap to accept → creates an HA script with the chained actions.

### Open questions

- Overlaps significantly with HA's own automation suggestions. Coordinate or differentiate?
- Privacy: pattern detection is local.

---

## A9. Notification cards — ephemeral surface for critical state

**Effort:** M. **Impact:** medium-high.

### Idea

When a smoke detector triggers, a water leak fires, a doorbell rings — surface a full-width notification card at the top of the dashboard with one-tap action (silence, view camera, etc.). Auto-dismiss when the condition clears.

### Sketch

- New `simon42-notification-card` component, conditionally inserted at the top of the overview when matching entities are in alarm state.
- Configurable triggers in strategy config: `notification_triggers: ['smoke', 'gas', 'water_leak', 'doorbell']`.
- Renders with `position: sticky` to stay visible on scroll.

### Open questions

- Dismissal persistence: if the user taps "snooze", how long?
- Sound: should it trigger audio? Browsers restrict autoplay, but `Audio` API works on user-initiated context.

---

## A10. Multi-user dashboards

**Effort:** XL. **Impact:** medium. Touches privacy and HA's user model.

### Idea

A single HA install often serves a family. The current dashboard is identical for everyone. Multi-user lets per-HA-user customisation: kids' dashboard hides the alarm panel, adults' shows everything, guest sees only the living-room.

### Sketch

- Strategy reads `hass.user?.id` and `hass.user?.is_admin` at `generate()` time.
- `areas_options.<area>.user_access` filters which HA users can see the area's room view.
- New `dashboard_profiles` config: `{ adult: {...}, kid: {...} }` — each profile is a strategy config override.

### Risk

- Per-user dashboard access ≠ access control. HA still enforces actual entity-level permissions; this is layout-only.
- Doc this clearly so users don't think it's a security boundary.

---

## A11. Camera-first room views

**Effort:** M. **Impact:** medium for camera users.

### Idea

For areas with a camera entity, the room view leads with a live camera feed at the top, area card tiles below. Tap the camera to expand fullscreen.

HA already has `<picture-glance>` for this; the strategy could auto-emit it when an area has a camera.

### Sketch

- `RoomViewStrategy` checks `Registry.getVisibleEntitiesForArea(areaId)` for `camera.*` entries; emits a `picture-glance` card at the top.
- Per-area override: `areas_options.<area>.camera_header: false` opts out.

### Open questions

- Bandwidth: live camera feeds are not free. Default off, opt-in via config?

---

## A12. Comparative / "today vs yesterday" overlays

**Effort:** M. **Impact:** medium. Information-design improvement.

### Idea

Every summary tile gets an optional "today vs yesterday" delta indicator:

> Lights on: **5** (yesterday at this time: 3) ↑
> Power: **2.4 kW** (yesterday: 1.8 kW) +33%

### Sketch

- Re-uses the history API (same fetch as #A5 sparklines — coalesce).
- `simon42-summary-card` config gains `show_delta: true`.

---

## A13. Adaptive icons — state-driven morphing

**Effort:** S. **Impact:** small but delightful.

### Idea

Light tile icon shows as bulb-outline when off, filling proportionally with brightness as the user drags the slider. Cover tile icon morphs from "closed" to "open" silhouette as position changes. Currently all states use the same MDI icon with color changes.

### Sketch

- Pre-author a small set of SVG icon morphs (light brightness, cover position) as CSS-only animations.
- Each tile feature reads the live state and applies the matching `--icon-fill: 0..1` CSS variable.

### Open questions

- SVG morph library? Or hand-author each pair?

---

## A14. Energy cost overlay

**Effort:** M. **Impact:** high in regions with variable tariffs.

### Idea

Pull HA's Energy dashboard data + the user's tariff schedule. Surface "what each running device is costing right now" on the relevant tiles:

> Dishwasher (running): 0.40 € / hour
> EV charger (charging at 11 kW): 2.80 € / hour

### Sketch

- New `simon42-cost-overlay-feature` (custom tile feature). Reads tariff config + entity power.
- Per-entity opt-in: `features: [{ type: 'custom:simon42-cost-overlay-feature', ... }]`.

### Open questions

- Where does the tariff schedule live? HA has `sensor.electricity_price` patterns; could read from there.
- Multi-rate / day-night tariff handling.

---

## A15. PWA mobile-widget exports

**Effort:** XL. **Impact:** small (depends on iOS/Android adoption of PWA widgets).

### Idea

Export the strategy's overview as a PWA widget the user can pin to their phone home screen. iOS 17+ and Android 14+ support PWA widgets via the `widgets` member in the manifest.

### Sketch

- Generate a separate web manifest at build time pointing at a stripped-down rendering of the dashboard.
- Service worker (from #2) caches the widget assets.

### Open questions

- Standardisation: PWA widgets are still evolving. Implementation may not work cross-browser.
- HA frontend's own SW already does some of this; coordinate.

---

## A16. Spatial / 3D area visualisation (very experimental)

**Effort:** XL. **Impact:** speculative.

### Idea

Top-down floorplan rendering of the home with live entity overlays — sparkline-style colored dots per area showing presence, lights, climate state. Tap an area to drill into its room view.

### Sketch

- User provides a floorplan SVG via config (`floorplan_url: /local/myhouse.svg`).
- Strategy emits a new overview section: `<simon42-floorplan-card>` that anchors area dots to SVG path coordinates.
- Alternative: auto-generate a floorplan from HA's areas (no positional data — would be a fake grid).

### Open questions

- Floorplan SVG creation isn't trivial. Probably gated on user willingness to invest.
- Existing custom card `floorplan-card` already does something close — coordinate?

---

## A17. Public strategy preset marketplace

**Effort:** XL. **Impact:** community-builder. Long-term ecosystem win.

### Idea

Users share their `Simon42StrategyConfig` as presets on a public registry. Other users browse, preview, and one-click install.

### Sketch

- A static JSON index hosted on GitHub Pages or similar.
- Editor surfaces a "Browse presets" tab with thumbnails and descriptions.
- "Install" copies the preset config into the user's dashboard.

### Risk

- Curation: who decides what's in the marketplace?
- Privacy: presets must scrub user-specific entity IDs before publishing.

---

## A18. Strategy debugging panel

**Effort:** M. **Impact:** small (developer-focused).

### Idea

A hidden debug panel (`?s42_debug=1` URL parameter) that overlays the dashboard showing:
- `generate()` execution time
- Which areas were considered / hidden and why
- Which sections rendered vs auto-hid and why
- Registry stats (entity count, device count)

### Sketch

- Build on the existing `[s42-timing]` console log infrastructure.
- New `src/debug/strategy-panel.ts` reads timing + decision logs, renders an overlay.
- Always available behind the URL param; never in production rendering.

---

## A19. Auto-generated migration assistants

**Effort:** M. **Impact:** small but useful at major version bumps.

### Idea

When v3 ships and breaks config X, surface an in-editor migration banner: "Your config uses `<old_field>`. Click to migrate to `<new_field>`." One-tap apply.

### Sketch

- Per-version migration registry: `src/migrations/v2-to-v3.ts` describes the transformations.
- Editor calls the matching migrator on mount; banner appears only if anything to migrate.

---

## A20. WebGPU-accelerated chart cards (very experimental)

**Effort:** XL. **Impact:** small.

### Idea

For users with hundreds of thousands of history data points (eg. solar panel arrays), pure SVG sparklines hit a perf wall. WebGPU-accelerated charts (similar to deck.gl) render at 60fps regardless of point count.

### Sketch

- Not a strategy concern strictly — but the strategy could emit `simon42-perf-chart-card` for users who opt in.
- Probably a sibling plugin, not part of this strategy.

### Open questions

- Significant dependency footprint. Likely not justified.

---

# Part C — From community research (May 2026)

Features surfaced by the research synthesis in Part 0 that weren't in the original draft. Each addresses a top-ranked community pain point with high signal.

---

## 🎯 C1. Density / viewport presets baked into the strategy

**Effort:** S-M. **Impact:** high (Part 0 #2 community pain). Quick win.

### Problem

HA Sections view has hard-coded card min-sizes. Users can't fit more than 2-3 cards per row on phones. The fork's container queries already adapt, but the user can't tell the strategy "I want it denser" at the dashboard level.

### Idea

Top-level strategy config gains a `density` field:

```yaml
strategy:
  type: custom:simon42-dashboard
  density: cozy   # 'compact' | 'cozy' | 'comfortable' (default)
```

Distinct from `dashboard_density` (which is the per-card token override) — this controls **grid sizing**: how many columns the sections-view targets, how many cards per row, the gap between sections.

Three preset bundles:

| Preset | Sections columns | Card gap | Tile min-width |
|---|---|---|---|
| compact | 4 | 8px | 200px |
| cozy | 3 | 16px | 280px |
| comfortable | auto | 24px | 360px |

Editor surfaces it as a segmented control on the Overview tab.

### Sketch

- New `src/utils/density-presets.ts` exporting the 3 presets.
- Strategy emits view configs with the chosen `max_columns`, sections `column_span` hints.
- `--ha-view-sections-column-min-width` overridden per preset via inline style on the strategy view root.

### Why it's a win

The dashboard mode that fits 8 tiles on a phone is a single config line away. No card-by-card YAML.

---

## 🎯 C2. Wall-panel / kiosk variant

**Effort:** M. **Impact:** high (Part 0 #7 community pain). Makes the fork the obvious choice for tablet installs.

### Problem

Wall-mounted tablets are a common HA use case. Default dashboards don't dim, don't lock down nav, don't have thumb-reach optimization. Users assemble custom solutions from Browser Mod + 3-4 plugins.

### Idea

Strategy gains a `panel_mode: 'wall'` variant that emits:
- A bottom-anchored navigation row (within thumb reach).
- Auto-dim after 60s of no interaction (configurable).
- Tap-anywhere-to-wake.
- Hide unwanted nav elements (top bar, settings link).
- Optional "screensaver" view that replaces the dashboard after N minutes — clock + weather only.
- A `simon42-wall-panel` view variant that's full-screen, sticky on scroll.

```yaml
strategy:
  type: custom:simon42-dashboard
  panel_mode: wall
  panel_dim_after_seconds: 60
  panel_screensaver_after_minutes: 5
  panel_screensaver_entity: weather.home
```

### Sketch

- New `src/views/WallPanelView.ts` — alternative top-level view emission when `panel_mode === 'wall'`.
- New `simon42-screensaver-card` — minimal Lit element that listens for interaction events and toggles a full-screen clock+weather.
- Bottom-nav: emit a `type: tile` strip pinned to `position: sticky; bottom: 0`.

### Why it's a win

Out-of-the-box wall-panel UX without Browser Mod + Kiosk Mode + multiple HACS components.

### Open questions

- HA's frontend mode `panel` already exists at the view level — does panel_mode interfere?
- Power management: dimming via CSS opacity vs requesting OS-level brightness change?

---

## 🎯 C3. Mobile swipe-gesture navigation

**Effort:** M. **Impact:** medium-high (Part 0 #4 community pain).

### Problem

HA Companion App has tabs at the top. On phones with notches/dynamic islands, tapping them is awkward. Long-running ask: swipe between dashboards / views.

### Idea

Emit a horizontal-swipe-aware navigation layer at the view root. Drag left/right transitions to the previous/next view; pull-down refreshes the dashboard (triggers strategy regenerate).

Per-view opt-in via `swipe_nav: true` (or default-on with `panel_mode: 'wall'`).

### Sketch

- New `src/views/SwipeNavWrapper.ts` — small Lit element wrapping the view content with touch handlers.
- Use the [Web Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) with deceleration physics matching iOS / Android system gestures.
- Doesn't replace HA's tab nav — it's additive (tablet/phone both have tabs, mobile gets gestures too).

### Open questions

- Does HA's frontend already swallow horizontal drags? Need to check at the panel level.
- Pull-to-refresh: how to indicate progress visually? Custom spinner overlay?

---

## 🎯 C4. Context-aware section reorder (room_mode / house_mode driven)

**Effort:** M. **Impact:** medium-high (Part 0 #4 from Top 10).

### Problem

Sections are a fixed order. But what matters at 7am (lights, calendar, energy) is different from what matters at 10pm (security, scenes for bedtime). The fork already depends on `room_mode` and `house_mode` for room-level behavior — extend to top-level.

### Idea

Per-mode section-order overrides:

```yaml
strategy:
  type: custom:simon42-dashboard
  sections_order_by_mode:
    morning:    [overview, weather, energy, summaries, areas]
    evening:    [overview, summaries, areas, favorites, weather]
    night:      [overview, security, alarm, areas]
    away:       [overview, security, areas, weather]
```

Strategy reads `input_select.house_mode` (or whatever the user names it) and picks the matching order.

### Sketch

- `OverviewViewStrategy.generate()` reads the current mode state, picks the matching `sections_order_by_mode` entry or falls back to `sections_order`.
- Editor's section-order tab gets a "Configure per mode" expansion.

### Why it's a win

Already-existing data (`room_mode` / `house_mode`) gets surfaced as visible dashboard intelligence. No new sensors, no ML, just config.

---

## 🎯 C5. Visibility editor with roles + time-of-day + mode

**Effort:** M. **Impact:** medium-high (Part 0 #5 + #8 combined).

### Problem

The current `section_visibility` and `room_visibility` take a single `{entity, state}` predicate. Users with families want role-based visibility (kids see fewer sections), time-of-day visibility (energy section only during day), and mode-based (security section only when armed).

### Idea

Visibility predicates become composable:

```yaml
section_visibility:
  energy:
    any:    # OR
      - { entity: sun.sun, state: above_horizon }
      - { mode: at_home }   # references input_select.house_mode
  agenda:
    role: [admin, resident]   # hidden from kids/guests
    time_after: '06:00'
    time_before: '20:00'
```

Editor expands to surface these as `<ha-form>` schema-driven fields per section.

### Sketch

- New `src/utils/visibility.ts` — pure-function predicate evaluator. Takes a visibility spec + hass + user, returns boolean.
- Editor sections get a "Visibility…" expansion with role chips, time pickers, mode chips.
- Existing `{entity, state}` shape is grandfathered (kept as `any:`).

### Why it's a win

Replaces a frequent forum question ("how do I hide X from kids?") with one config block. Builds on the fork's existing visibility primitive instead of starting fresh.

---

## 🎯 C6. Bubble-style drawer / detail pop-up primitive

**Effort:** M. **Impact:** medium.

### Problem

To configure a light from a card today, user taps → more-info dialog opens → modal experience. For multiple quick adjustments (light + temperature + media), you tap-close-tap-close-tap. Bubble Card popularised the in-place drawer — a panel slides out from the card without leaving the dashboard.

### Idea

A `simon42-detail-drawer` primitive. Each strategy-emitted tile gains a `drawer_action` config that opens an inline drawer instead of navigating / modal-dialog.

```yaml
# Internal config the strategy emits — user usually doesn't touch directly:
type: tile
entity: light.living
features: [{ type: 'light-brightness' }]
drawer_action:
  controls: ['light-brightness', 'light-color-temp', 'light-color']
```

Tap the tile → drawer slides up from the bottom with the controls. Tap outside → drawer dismisses. Multiple drawers stack.

### Sketch

- New `src/cards/DetailDrawer.ts` Lit element. Renders a `<dialog>` (native modal-less popover) with the configured feature controls.
- Strategy emits `drawer_action` on light / climate / cover tiles where it makes sense.

### Open questions

- HA core might add this someday — would we deprecate?

---

## 🎯 C7. Performance: lazy-mount off-screen sections (IntersectionObserver)

**Effort:** M. **Impact:** medium (Part 0 #3 community pain).

### Problem

Users with 2,500+ entities report 30-second initial load. Every tile subscribes to its state on mount. Sections below the fold subscribe even though the user can't see them.

### Idea

Wrap each emitted section in an `<intersection-observer>` element that defers child mounting until the section enters the viewport (or near it).

### Sketch

- New `src/utils/lazy-section.ts` — wrapper element using `IntersectionObserver` with rootMargin: '200px'.
- `OverviewViewStrategy` wraps sections beyond the first N (configurable, default 3) in the lazy wrapper.
- First viewport load: 3 sections subscribe. Scroll: each subsequent section subscribes as it enters view.

### Why it's a win

Solves the perf cliff for large installs without per-user config. Sections nobody scrolls to never cost anything.

### Open questions

- Card-mod / templated cards that need state on mount might break. Need a `lazy: false` opt-out per section.

---

## 🎯 C8. State-iconography registry

**Effort:** M. **Impact:** medium.

### Problem

A locked door uses `mdi:lock`, an unlocked door uses `mdi:lock-open`. A closed garage is `mdi:garage`, open is `mdi:garage-open`. Today each tile renders the same icon regardless of state, with color changes. HomeKit-style iconography uses different glyphs per state — much more glanceable.

### Idea

A central registry of `(domain, device_class, state) → icon`. Strategy emits tiles with state-aware icon configs:

```typescript
// src/utils/state-iconography.ts
export const STATE_ICONS: Record<string, Record<string, string>> = {
  'lock.locked': { active: 'mdi:lock', inactive: 'mdi:lock-open' },
  'cover.garage.closed': { active: 'mdi:garage', inactive: 'mdi:garage-open' },
  // ...
};
```

Existing HA tile-card already supports per-state icons via the `state_color` + custom feature config. Strategy populates them.

### Sketch

- New `src/utils/state-iconography.ts` table.
- Strategy tile-emission helpers consult the table when building tile configs.
- User-overridable per area in `areas_options`.

---

## C9. Per-device-class favorites (phone vs tablet vs wall)

**Effort:** L. **Impact:** medium. Combines with C2 (wall panel) and per-user (A10).

### Problem

Google Home does this. HA users want it ("phone shows my pinned favs, wall panel shows the kitchen-relevant ones"). Today: one favorites list per dashboard.

### Idea

`favorite_entities` becomes a map by viewport class:

```yaml
favorite_entities:
  default: [light.living, sensor.outside_temp]   # fallback
  phone: [light.living, sensor.outside_temp, lock.front]
  tablet: [...]
  wall: [...]
```

Strategy detects viewport class at generate() time via media-query proxies; emits the matching list.

### Sketch

- New `src/utils/viewport-class.ts` — heuristic from `window.innerWidth` and `hass.user-agent`.
- Schema for `favorite_entities` grows from `string[]` to `string[] | Record<ViewportClass, string[]>`.
- Backwards-compat: plain array still works.

---

## C10. SharpTools-style strategy services

**Effort:** L. **Impact:** small (power-user feature).

### Problem

Automations can't directly affect the dashboard. Want to "flash the entryway tile red when someone rings the doorbell"? Hack with `hass.callService('persistent_notification.create')` and hope a notification shows.

### Idea

Expose strategy primitives as HA service calls:

- `strategy.flash_view(view_path, color, duration_ms)`
- `strategy.surface_tile(entity_id, view_path)` — promote a tile to the top of its view temporarily
- `strategy.popup_card(card_yaml)` — show a one-off card as a notification overlay

### Sketch

- New `src/services/strategy-services.ts` — registers services at strategy load via HA's frontend service-registry hooks.
- Each service mutates a `_strategyOverlayState` global that emitted views observe via `@property`.

### Open questions

- HA's frontend service-registry hooks aren't well-documented for strategies. Need to check feasibility.

---

## C11. visionOS-style depth / glass theming

**Effort:** L. **Impact:** small. Aesthetic only.

### Idea

A `simon42-glass` theme that uses CSS backdrop-filter + layered translucent surfaces, inspired by visionOS. Auto-activates on tablets ≥1024px when `panel_mode: 'wall'` is set.

### Sketch

- Add to the theme-pack list in Part A #3.
- Each card's `<ha-card>` gets `backdrop-filter: blur(20px) saturate(180%)` + `background: color-mix(in srgb, var(--ha-card-background) 70%, transparent)`.

### Why it's a niche feature

Looks great on iPads, doesn't help anyone using a phone.

---

## How to pick next steps

Final ranking — combining the Part 0 community research signal with implementation cost:

### Tier 1 — Ship these next (validated demand, manageable effort)

1. **C1 — Density / viewport presets** (S-M) — addresses Part 0 #2. Single config knob, hours of work, immediate visible payoff. Lowest-risk fastest win on the roadmap.
2. **C4 — Context-aware section reorder by mode** (M) — addresses Part 0 #4 from Top 10. Builds on existing `room_mode`/`house_mode` infrastructure.
3. **C7 — Lazy-mount off-screen sections** (M) — addresses Part 0 #3 (perf cliff on large installs). Pure perf win, no UX risk.
4. **A11 — Camera-first room views** (M) — small lift, immediate visual impact. Easy to test.
5. **C5 — Visibility editor with roles + time-of-day + mode** (M) — addresses Part 0 #5 + #8 combined.

### Tier 2 — Higher impact, more work

6. **C2 — Wall-panel / kiosk variant** (M) — Part 0 #7. Differentiator for tablet installs.
7. **A10 expanded — Per-user/per-role dashboards (server-side)** (XL) — Part 0 #1, the biggest community pain. But XL means it should follow the lower-effort tier 1 wins.
8. **A8 — Routine suggestions** (M) — Part 0 #10 (the synthesis), exploits HA's logbook data.
9. **A1 — AI dashboard assistant** (XL) — biggest "wow" if it lands well, biggest risk if it doesn't. Worth doing after the simpler wins ship and the user base grows.
10. **A3 — Live preview in editor** (L) — pure dev quality, no privacy/AI risk, huge UX win. Excellent infrastructure for the AI assistant later.

### Tier 3 — Speculative / niche / wait for signal

C3 (swipe nav), C6 (Bubble-style drawer), C8 (state iconography), C9 (per-device favorites), C10 (strategy services), C11 (visionOS depth), A2/A4/A5/A6/A12-A20.

These either depend on tier 1-2 landing first, or address a niche use case not surfaced by research. Don't commit until at least 2-3 from tier 1 ship and the user base provides feedback.

### Rough cadence

Doing **all of tier 1** would be ~v2.3 (4 medium features, ~2 weeks total). **All of tier 2** would be ~v2.4 + v3.0 (the per-user dashboards XL is a v3 breaking change).

---

# Reading order if you came here cold

If you're a contributor wondering where to start:
1. Read **MIGRATION.md** for the v1.x → v2.x lay of the land.
2. Read **Part A** of this file for concrete features ready to pick up.
3. Read **Part B** if you want to scope an ambitious project; assume each one is at least a month of work.
