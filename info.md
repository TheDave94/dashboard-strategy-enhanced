# Dashboard Strategy — Enhanced Edition (v2.0+)

A substantially improved fork of [simon42's dashboard strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy) for Home Assistant. Auto-generates views based on areas, entities, and their states — with significant additions in custom cards, configuration UI, and architectural quality.

## What's in v2.0

- **Five custom cards / features**: zone-presence, summary tiles, lights group, covers group, sticky-lock feature. All with `<ha-form>` config editors, "Add card" picker integration, and container-query scaling.
- **Six optional overview sections**: plants, agenda, todos, persons, vacuums, maintenance.
- **Five opt-in header badges**: power, unavailable alerts, now-playing, sun, updates.
- **Per-section + per-room conditional visibility** (entity/state predicates).
- **`presence_entities` per-area config**: single source of truth for favorites pin + Room view zone-presence.
- **Modern HA baseline**: 2026.5+, design tokens, CSS container queries, source maps in production, ESLint + npm audit + happy-dom card tests gated in CI.

## Installation

HACS custom repository → `TheDave94/dashboard-strategy-enhanced`, category Lovelace.

Then create a dashboard with:

```yaml
strategy:
  type: custom:simon42-dashboard
```

See [README](README.MD) for detailed configuration.

Original by [@TheRealSimon42](https://github.com/TheRealSimon42), enhanced by [@TheDave94](https://github.com/TheDave94).
