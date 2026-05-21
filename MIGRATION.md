# Migration guide

Upgrade notes for users moving between major versions. Reverse-chronological — read top-down to skip ahead.

## v1.x → v2.0+

The v2.0 release diverged substantially from the simon42 upstream and introduced changes that aren't backward-compatible with v1.x. If you're coming from a v1.x install (HACS will offer the upgrade), here's what to expect.

### Home Assistant version

- **Minimum HA version is now 2026.5.0.** v1.x ran on 2024.7+. Upgrade HA first if you're on an older version; HACS will warn you.

### Element name conventions (HA-internal, transparent to most users)

- The legacy element registration `ll-strategy-simon42-dashboard` was removed. Only `ll-strategy-dashboard-simon42-dashboard` remains (the canonical naming HA enforces in 2026.5+).
- View strategies renamed from `ll-strategy-simon42-view-*` → `ll-strategy-view-simon42-view-*`.

**You don't need to update anything.** Existing dashboards using `type: custom:simon42-dashboard` keep working — the strategy type name is unchanged for backwards compatibility.

### Config field renames

Two legacy field names were removed. If your YAML uses them, rename:

| Old (v1.x) | New (v2.0+) |
|---|---|
| `areas_options.<area>.pin_zone_presence_to_favorites_entities` | `areas_options.<area>.presence_entities` |
| `summary_card_density: 'compact'` | `dashboard_density: 'compact'` |

The new `presence_entities` field is now the single source of truth for both the favorites pin AND the Room view's zone-presence card. Set it once per area and both surfaces consume it.

The new `dashboard_density` field is the manual override for all custom cards. By default cards now auto-scale via CSS container queries — most users can drop both old fields and let containers handle it.

### New configuration surface

v2.0 added several new optional fields. Everything defaults to off, so existing dashboards aren't affected.

- **`areas_options.<area>.presence_entities`** — curated zone list per area, with per-entry `{entity, icon, color}` overrides.
- **`dashboard_density: 'compact' | 'comfortable'`** — global density override.
- Various opt-in header badges (`show_unavailable_alert_badge`, `show_now_playing_badge`, `show_sun_badge`, `show_updates_badge`, `power_badge_entity`).
- Six opt-in overview sections (`show_plants_section`, `show_agenda_section`, `show_todos_section`, `show_persons_section`, `show_vacuums_section`, `show_maintenance_section`).
- Custom content collections (`custom_cards`, `custom_sections`, `custom_badges`, `custom_views`).

All of these are configurable via the visual editor — open Edit dashboard, no YAML required.

### Custom cards now available standalone

The five custom elements the strategy emits internally — `simon42-summary-card`, `simon42-zone-presence-card`, `simon42-lights-group-card`, `simon42-covers-group-card`, `simon42-sticky-lock-feature` — are now also pickable from HA's "Add card" picker. Each has a visual `<ha-form>` config editor.

If you want one of these cards outside a strategy-managed dashboard, just pick it from the picker. Existing strategy dashboards keep using them automatically.

### Visual / behavioural

- Container-query scaling means cards auto-size to their cell. The same card looks different in the favorites pin (compact) vs. a wide section (generous). This is intentional.
- Custom cards now use HA's design tokens (`--ha-space-*`, `--ha-card-*`, `--ha-font-*`) so themes can re-skin them.
- Lights / covers / presence groups now have configurable item icons + colors.
- aria-labels are localized (en/de). No more English labels showing on German HAs.

### Repo URL

The repository was renamed `TheDave94/simon42-dashboard-strategy` → `TheDave94/dashboard-strategy-enhanced`. GitHub keeps a redirect, so existing HACS installs and external links keep working. New installs should reference the new URL.

The package on HACS still ships as `simon42-dashboard-strategy.js` — the filename is unchanged for backwards compat.

### Performance

Bundle sizes (gzipped) on v2.1.x:

| Chunk | Size |
|---|---|
| main | 2 KB |
| lit | 6 KB |
| views | 5 KB |
| core | 32 KB |
| editor | 31 KB |

The editor chunk lazy-loads only when you open the visual editor, so day-to-day dashboard rendering pulls ~45 KB.

### Reporting bugs / requesting features

[github.com/TheDave94/dashboard-strategy-enhanced/issues](https://github.com/TheDave94/dashboard-strategy-enhanced/issues). Mention your HA version + a screenshot of the issue.

## Coming in v2.2

- **Lit 4 readiness:** internal migration to stage-3 decorator syntax (`@property accessor`). No user-visible change; sets us up for Lit 4 when it ships (likely 2027+, gated on browser support for native decorators).
- **`getCreateSuggestions`:** HA's "Add card" picker will surface curated starting configs.
- **More test coverage:** render-output tests + container-query visual regression.

## Coming in v3.0 (speculative)

- Plugin extension API: let other HACS plugins register sections / badges into the strategy's overview.
- Migration to ha-form for the remaining option-A editor tabs once we've nailed the per-row picker patterns in HA itself.

No fixed timeline on either — driven by user feedback and HA's own roadmap.
