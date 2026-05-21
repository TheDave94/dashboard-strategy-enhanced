# Oriel Dashboard

**Customization without YAML.** Auto-generates your dashboard from areas, devices, and entities — then lets you customise every piece via a visual editor. For Home Assistant users who want maximum flexibility without editing config files.

## Highlights

- **Setup wizard** in the editor — auto-detects installed HACS plugins (Bubble Card, ApexCharts, decluttering-card, floorplan-card, weather/energy card swaps) and surfaces each as an additional option when present.
- **Visual editor for every advanced feature** — per-user dashboards, mode-driven section reorder, composable visibility rules, wall-panel mode, all reachable without writing YAML.
- **Ten custom cards / features** — summary, zone-presence, lights group, covers group, sparkline, notification banners, routines, screensaver, voice FAB, sticky-lock + cost-overlay features.
- **HACS plugins always optional.** Built-in fallback path works without any of them. Less shiny without HACS, but never broken.
- **Plugin extension API** — third-party plugins can `window.oriel.registerSection(...)` to add sections.
- **HA 2026.5+** baseline with modern design tokens, container queries, and code-split bundles.

## Installation

HACS custom repository → `TheDave94/oriel-dashboard`, category Dashboard.

Then create a dashboard with:

```yaml
strategy:
  type: custom:oriel
```

See [README](README.MD) for the full configuration surface.

## Origin

Forked from [@TheRealSimon42](https://github.com/TheRealSimon42)'s dashboard strategy — credit there for the auto-generation pattern. Oriel takes that core in a different direction: maximum configurability + integration surface, all reachable through the editor. simon42 stays the focused, opinionated option; Oriel is for users who want the configurable one. See [MIGRATION.md](MIGRATION.md) to switch.

Built by [@TheDave94](https://github.com/TheDave94).
