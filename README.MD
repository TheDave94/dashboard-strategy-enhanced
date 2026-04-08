# simon42 Dashboard Strategy

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/TheRealSimon42/simon42-dashboard-strategy?style=for-the-badge&color=green)](https://github.com/TheRealSimon42/simon42-dashboard-strategy/releases)
[![GitHub Stars](https://img.shields.io/github/stars/TheRealSimon42/simon42-dashboard-strategy?style=for-the-badge&color=yellow)](https://github.com/TheRealSimon42/simon42-dashboard-strategy/stargazers)
![AI-Assisted](https://img.shields.io/badge/AI--Assisted-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey?style=for-the-badge)](LICENSE)

Eine modulare und hochkonfigurierbare Dashboard-Strategy fuer Home Assistant, die automatisch Views basierend auf Bereichen, Entitaeten und deren Zustaenden generiert.

<p align="center">
  <a href="https://youtu.be/XU7DfQrfJ2w">
    <img src="assets/video-thumbnail.png" alt="simon42 Dashboard Strategy — Video Tutorial" width="600" />
  </a>
  <br/>
  <em>Video-Anleitung auf YouTube ansehen</em>
</p>

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheRealSimon42&repository=simon42-dashboard-strategy&category=plugin)

---

## Unterstuetze dieses Projekt

Wenn dir die simon42 Dashboard Strategy hilft, unterstuetze die Weiterentwicklung:

<p align="center">
  <a href="https://youtube.com/@simon42/join">
    <img src="https://img.shields.io/badge/YouTube-Kanalmitglied_werden-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube Kanalmitglied werden" />
  </a>
  <br/>
  <em>Bevorzugte Unterstuetzung: Werde Kanalmitglied auf YouTube!</em>
  <br/><br/>
  <a href="https://www.buymeacoffee.com/simon42official">
    <img src="https://img.shields.io/badge/Buy_Me_A_Coffee-Spende_einen_Kaffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
  </a>
</p>

---

## Features

- **Grafischer Konfigurator** — Keine YAML-Kenntnisse erforderlich, Drag & Drop fuer Bereiche
- **Automatische Raum-Erkennung** — Nutzt Home Assistant Areas, Devices & Floors
- **Spezialisierte Views** — Lichter, Rollos, Sicherheit, Batterien jeweils mit Status-Gruppierung
- **Granulare Filterung** — Per Label (`no_dboard`), pro Bereich, pro Domain, pro Entity
- **Batch-Aktionen** — Heading-Badges fuer Gruppensteuerung (alle ein/aus, alle oeffnen/schliessen)
- **Reaktive Updates** — Echtzeit-Aktualisierung via LitElement Custom Cards
- **Performance-optimiert** — Code-Split Bundles, Registry-Caching, Tile-Card-Pooling

## Installation

### HACS (empfohlen)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheRealSimon42&repository=simon42-dashboard-strategy&category=plugin)

<details>
<summary>Alternative zum Button</summary>

1. Gehe zu HACS → **Custom repositories**
2. Fuege das Repository hinzu: `https://github.com/TheRealSimon42/simon42-dashboard-strategy`
3. Installiere die "Simon42 Dashboard Strategy"
4. Folge den Anweisungen in HACS fuer die Resource-Registrierung

</details>

### Manuelle Installation

<details>
<summary>Manuelle Installationsschritte</summary>

1. Kopiere alle Dateien aus `dist/` nach `/config/www/simon42-strategy/`
2. Fuege in `configuration.yaml` hinzu:

```yaml
lovelace:
  mode: storage
  resources:
    - url: /local/simon42-strategy/simon42-dashboard-strategy.js
      type: module
```

3. Starte Home Assistant neu

</details>

## Dashboard erstellen

1. **Einstellungen** → **Dashboards** → **Dashboard hinzufuegen**
2. **Neues Dashboard von Grund auf**, Name vergeben
3. Dashboard oeffnen → **Edit-Modus** (oben rechts)
4. **Drei Punkte** (⋮) → **Raw-Konfigurationseditor**
5. Einfuegen:

```yaml
strategy:
  type: custom:simon42-dashboard
```

6. Speichern — der grafische Editor oeffnet sich automatisch.

## Konfiguration

### Basis

```yaml
strategy:
  type: custom:simon42-dashboard
  show_weather: true
  show_energy: true
  show_summary_views: false
  show_room_views: true
  show_covers_summary: true
  group_by_floors: false
  summaries_columns: 2
  hide_mobile_app_batteries: false
```

### Entity-Filterung pro Bereich

```yaml
strategy:
  type: custom:simon42-dashboard
  areas_display:
    hidden: [garage]
    order: [wohnzimmer, kueche, schlafzimmer]
  areas_options:
    wohnzimmer:
      groups_options:
        lights:
          hidden: [light.alte_lampe]
          order: [light.decke, light.couch]
```

### Label-System

| Label | Funktion |
|-------|----------|
| `no_dboard` | Entity wird global aus dem Dashboard ausgeblendet |

Labels und `groups_options.hidden` ergaenzen sich: Labels filtern global, `hidden` filtert nur im jeweiligen Bereich.

### Filterlogik (Reihenfolge)

1. `no_dboard` Label → Globale Exklusion
2. `areas_options.groups_options.hidden` → Bereich-spezifisch
3. Entity Registry Status → Hidden/Disabled
4. Entity Category → Config/Diagnostic
5. State Availability → Muss in `hass.states` existieren

### Raum-Pins

Spezielle Entitaeten, die nur in ihren zugeordneten Raeumen erscheinen:

```yaml
strategy:
  type: custom:simon42-dashboard
  room_pin_entities:
    - sensor.wetterstation_temperatur
```

## Architektur

**TypeScript** (ES2020, strict) → **Webpack** → Code-Split Chunks:

| Chunk | Groesse | Inhalt |
|-------|---------|--------|
| main | ~5 KB | Entry Point, Custom Element Registrierung |
| lit | ~15 KB | Lit Framework (shared) |
| core | ~27 KB | Registry, Utils, Overview, Custom Cards |
| views | ~14 KB | Lichter, Rollos, Sicherheit, Batterien, Raum-Detail |
| editor | ~84 KB | Konfigurations-UI (nur bei Bedarf geladen) |

Custom Cards (LightsGroupCard, CoversGroupCard, SummaryCard) nutzen **LitElement** mit reaktiven Properties und Tile-Card-Pooling. View-Strategien generieren statische Card-Configs die HA's Rendering-Engine uebernimmt.

Registry liest synchron aus dem `hass`-Objekt und baut pre-computed Maps fuer O(1)-Lookups.

### Performance-Design

Die Strategy folgt denselben Patterns wie HA's offizielle Home- und Areas-Strategien:

- **Pre-filtered Area-Controls:** Area-Cards bekommen nur Controls die im Raum tatsaechlich existieren (`controls: ['light', 'cover-shutter']`), nicht pauschal alle. Ohne Pre-Filtering muss jede Card selbst alle Entities scannen — bei vielen Raeumen und Entities fuehrt das auf schwachen Geraeten (Tablets) zu massiven Ladezeiten.
- **Pre-resolved Views:** Alle Views (Raeume, Lichter, etc.) werden in `generate()` vollstaendig aufgeloest statt als Strategy-Stubs zurueckgegeben. Das eliminiert verzoegerte Strategy-Aufloesung bei Navigation (analog zu `expandLovelaceConfigStrategies` im HA Home Panel).
- **Eager Chunk Loading:** JS-Chunks werden sofort beim Laden des Entry-Points gestartet, nicht erst wenn `generate()` aufgerufen wird.

## Contributing

Issues und Pull Requests sind willkommen! Bitte teste PRs gruendlich in einem lokalen HA-Setup.

## Lizenz

**Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

- **Teilen & Bearbeiten** erlaubt
- **Namensnennung** erforderlich
- **Nicht kommerziell** — Fuer kommerzielle Nutzung: **[Kontaktformular](https://www.simon42.com/contact/)**
- **Weitergabe unter gleichen Bedingungen**

Siehe LICENSE-Datei fuer vollstaendige Details.

## Credits

- Home Assistant Community
- [js-yaml](https://github.com/nodeca/js-yaml) (MIT) — YAML-Parser
- **Claude** (Anthropic) — Co-Entwickler und Nachtschicht-Begleiter

## Support

- **[GitHub Issues](https://github.com/TheRealSimon42/simon42-dashboard-strategy/issues)**
- **[simon42 Community](https://community.simon42.com/)**

---

**Entwickelt mit Leidenschaft fuer die Home Assistant Community**
