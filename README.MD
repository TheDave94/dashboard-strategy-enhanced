# simon42 Dashboard Strategy

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/TheRealSimon42/simon42-dashboard-strategy?style=for-the-badge&color=green)](https://github.com/TheRealSimon42/simon42-dashboard-strategy/releases)
[![GitHub Stars](https://img.shields.io/github/stars/TheRealSimon42/simon42-dashboard-strategy?style=for-the-badge&color=yellow)](https://github.com/TheRealSimon42/simon42-dashboard-strategy/stargazers)
![AI-Assisted](https://img.shields.io/badge/AI--Assisted-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey?style=for-the-badge)](LICENSE)

Eine modulare und hochkonfigurierbare Dashboard-Strategy fuer Home Assistant, die automatisch Views basierend auf Bereichen, Entitaeten und deren Zustaenden generiert.

<p align="center">
  <img src="assets/Screenshot-simon42-strategy.png" alt="simon42 Dashboard Strategy — Uebersicht" width="800" />
</p>

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheRealSimon42&repository=simon42-dashboard-strategy&category=plugin)

---

## Video-Anleitung

<p align="center">
  <a href="https://youtu.be/XU7DfQrfJ2w">
    <img src="assets/video-thumbnail.png" alt="simon42 Dashboard Strategy — Video Tutorial" width="600" />
  </a>
  <br/>
  <em>Schritt-fuer-Schritt Anleitung auf YouTube ansehen</em>
</p>

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
- **Spezialisierte Views** — Lichter, Rollos, Sicherheit, Batterien, Klima — jeweils mit Status-Gruppierung
- **Zusammenfassungskarten** — Einzeln ein-/ausschaltbar fuer Lichter, Rollos, Sicherheit, Batterien und Klima
- **Etagen-Gruppierung** — Bereiche und Lichter optional nach Etagen gliedern
- **Favoriten** — Beliebige Entitaeten als Kacheln auf der Uebersicht anpinnen
- **Alarm-Panel** — Optionale Alarmanlage neben der Uhr
- **Granulare Filterung** — Per Label (`no_dboard`), pro Bereich, pro Domain, pro Entity
- **Batch-Aktionen** — Heading-Badges fuer Gruppensteuerung (alle ein/aus, alle oeffnen/schliessen)
- **Eigene Karten** `🆕 Beta` — Beliebige Karten via YAML auf der Uebersicht einbinden
- **Custom Views** — Eigene Dashboard-Views mit beliebigen Cards via YAML
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

## Voraussetzungen

Die Strategy generiert das Dashboard automatisch aus deiner Home Assistant Konfiguration. Damit alles korrekt angezeigt wird:

**Bereiche & Etagen einrichten** — Lege in Home Assistant unter **Einstellungen → Bereiche & Zonen** deine Raeume an und weise sie optional Etagen zu. Geraete muessen einem Bereich zugeordnet sein, damit sie im Dashboard erscheinen.

<p align="center">
  <img src="assets/Etagen-und-Bereiche.gif" alt="Etagen und Bereiche in Home Assistant einrichten" width="800" />
</p>

**Geraete zuweisen** — Weise deine Geraete (Lampen, Sensoren, Rollos etc.) in den HA-Einstellungen einem Bereich zu. Die Strategy erkennt automatisch, welche Entitaeten in welchem Raum sind.

**Unerwuenschte Entitaeten ausblenden** — Nicht jede Entitaet soll im Dashboard auftauchen. Es gibt zwei Wege:

- **Label `no_dboard`** — Erstelle in Home Assistant unter **Einstellungen → Labels** ein Label `no_dboard` und weise es Entitaeten zu, um sie global aus dem gesamten Dashboard auszublenden.
- **Entity verstecken** — Setze eine Entitaet in den HA-Einstellungen auf "Versteckt" (`hidden_by: user`). Versteckte Entitaeten werden automatisch ignoriert.

<p align="center">
  <img src="assets/no-dboard-label.png" alt="Label no_dboard in Home Assistant erstellen" width="800" />
</p>

Mehr zur Filterung findest du im Abschnitt [Entity-Filterung](#entity-filterung).

## Dashboard erstellen

<p align="center">
  <img src="assets/simon42-Strategy-Download-DashboardAnlegen-StrategyCodeEinfugen.gif" alt="Dashboard erstellen — Schritt fuer Schritt" width="800" />
</p>

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

Alle Einstellungen lassen sich bequem ueber den **grafischen Editor** vornehmen (Stift-Icon → Drei Punkte → Dashboard bearbeiten). Die folgenden Abschnitte dokumentieren die verfuegbaren Optionen.

<p align="center">
  <img src="assets/Editor-oeffnen.gif" alt="Editor oeffnen" width="800" />
</p>

### Uebersicht

Die Hauptseite des Dashboards zeigt eine Uebersicht mit folgenden Bereichen:

**Uhr & Alarm** — Die Uhr wird standardmaessig angezeigt. Optional kann eine Alarmanlage daneben eingeblendet werden.

**Zusammenfassungen** — Kacheln die den Status aller Lichter, Rollos, Sicherheits-Entitaeten, Batterien und Klimageraete zusammenfassen. Jede Zusammenfassung kann einzeln ein- oder ausgeschaltet werden. Das Layout ist als 2-Spalten-Grid (Standard) oder 4-Spalten-Reihe konfigurierbar.

<p align="center">
  <img src="assets/Klima-Zusammenfassung.gif" alt="Klima-Zusammenfassung aktivieren" width="800" />
</p>

**Batterie-Optionen** — Mobile-App-Batterien (Smartphones, Tablets) koennen ausgeblendet werden. Die Schwellwerte fuer die Statusgruppen (Kritisch / Niedrig / Gut) sind frei einstellbar. Nicht erreichbare Sensoren werden automatisch als kritisch eingestuft.

<p align="center">
  <img src="assets/Batterie-Schwellwerte-und-MobileAppBatt.gif" alt="Batterie-Schwellwerte und Mobile-App-Batterien" width="800" />
</p>

**Info-Karten** — Optionale Wetter- und Energie-Karten auf der Uebersicht.

**Favoriten** — Beliebige Entitaeten, die als Kacheln unter den Zusammenfassungen erscheinen. Im Editor per Dropdown hinzufuegen.

<p align="center">
  <img src="assets/Favoriten-entity-hinzufügen.gif" alt="Favoriten hinzufuegen" width="800" />
</p>

### Bereiche & Raeume

**Etagen-Gruppierung** — Bereiche koennen nach Etagen gegliedert werden. Jede Etage bekommt eine eigene Section mit Ueberschrift.

<p align="center">
  <img src="assets/Bereiche-nach-Etagen-Gliedern.gif" alt="Bereiche nach Etagen gliedern" width="800" />
</p>

**Schloesser in Raeumen** — Optional koennen Schloesser (z.B. Nuki) in den Raum-Views angezeigt werden. Unabhaengig davon erscheinen sie immer in der Sicherheits-Uebersicht.

**Bereichssortierung** — Wahlweise die Reihenfolge aus Home Assistant verwenden oder im Editor per Drag & Drop festlegen.

<p align="center">
  <img src="assets/Home-Assistant-Bereichs-Sortierung-verwenden.gif" alt="HA-Bereichssortierung verwenden" width="800" />
</p>

**Bereichs-Verwaltung** — Bereiche ein-/ausblenden, Reihenfolge anpassen, Entitaeten pro Bereich und Domain filtern — alles im Editor.

**Raum-Pins** — Spezielle Entitaeten die in ihren zugeordneten Raeumen ganz oben erscheinen. Ideal fuer Entitaeten die nicht automatisch erkannt werden (z.B. Wetterstationen).

**Ansichten** — Summary-Views (Lichter, Rollos, etc.) und Raum-Views koennen optional in der oberen Navigation angezeigt werden.

**Lichter nach Etagen** — In der Lichter-View koennen Lichter nach Etagen gruppiert werden, mit Ein-/Ausschalt-Button pro Etage.

<p align="center">
  <img src="assets/Lichter-nach-Etagen-Gliedern.gif" alt="Lichter nach Etagen gliedern" width="800" />
</p>

### Erweiterte Funktionen

#### Eigene Karten `🆕 Beta`

Beliebige Lovelace-Karten via YAML zur Uebersicht hinzufuegen. Die Karten erscheinen in einer eigenen Section zwischen den Zusammenfassungen und den Bereichen. Ueberschrift und Icon der Section sind frei waehlbar.

**Tipp:** Erstelle die Karte zuerst in einem normalen Dashboard, kopiere den YAML-Code und fuege ihn im Editor ein.

```yaml
# Beispiel: Markdown-Karte
type: markdown
content: "Willkommen zuhause!"
```

<p align="center">
  <img src="assets/Eigene-Karten-hinzufugen.gif" alt="Eigene Karten hinzufuegen" width="800" />
</p>

#### Custom Views

Eigene Dashboard-Views mit beliebigen Cards erstellen. Jede Custom View benoetigt einen Titel, Pfad und Icon. Der YAML-Code definiert den Inhalt der View.

```yaml
# Beispiel: View mit Sections-Layout
type: sections
sections:
  - type: grid
    cards:
      - type: markdown
        content: "Meine eigene View"
```

<p align="center">
  <img src="assets/Custom-View-hinzufugen.gif" alt="Custom View hinzufuegen" width="800" />
</p>

### Entity-Filterung

Entitaeten koennen auf mehreren Ebenen gefiltert werden:

| Methode | Ebene | Beschreibung |
|---------|-------|-------------|
| Label `no_dboard` | Global | Entity wird ueberall ausgeblendet |
| `groups_options.hidden` | Pro Bereich | Entity nur in bestimmtem Bereich ausblenden |
| Entity Registry | Automatisch | Hidden/Disabled Entities werden ignoriert |
| Entity Category | Automatisch | Config/Diagnostic Entities werden ignoriert |

Labels und `groups_options.hidden` ergaenzen sich: Labels filtern global, `hidden` filtert nur im jeweiligen Bereich.

### Alle Optionen (Referenz)

<details>
<summary>Vollstaendige Konfigurationsreferenz aufklappen</summary>

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|-------------|
| `show_clock_card` | boolean | `true` | Uhr auf der Uebersicht |
| `alarm_entity` | string | — | Alarm-Panel Entity neben der Uhr |
| `show_search_card` | boolean | `false` | Such-Karte (benoetigt custom:search-card) |
| `show_light_summary` | boolean | `true` | Lichter-Zusammenfassung |
| `show_covers_summary` | boolean | `true` | Rollo-Zusammenfassung |
| `show_security_summary` | boolean | `true` | Sicherheits-Zusammenfassung |
| `show_climate_summary` | boolean | `false` | Klima-Zusammenfassung |
| `show_battery_summary` | boolean | `true` | Batterie-Zusammenfassung |
| `summaries_columns` | 2 \| 4 | `2` | Spalten-Layout der Zusammenfassungen |
| `hide_mobile_app_batteries` | boolean | `false` | Mobile-App-Batterien ausblenden |
| `battery_critical_threshold` | number | `20` | Schwellwert fuer kritische Batterien (%) |
| `battery_low_threshold` | number | `50` | Schwellwert fuer niedrige Batterien (%) |
| `show_weather` | boolean | `true` | Wetter-Karte |
| `show_energy` | boolean | `true` | Energie-Dashboard |
| `favorite_entities` | string[] | `[]` | Favoriten-Entitaeten auf der Uebersicht |
| `group_by_floors` | boolean | `false` | Bereiche nach Etagen gliedern |
| `show_locks_in_rooms` | boolean | `false` | Schloesser in Raum-Views |
| `use_default_area_sort` | boolean | `false` | HA-Sortierung fuer Bereiche verwenden |
| `areas_display.hidden` | string[] | `[]` | Ausgeblendete Bereiche |
| `areas_display.order` | string[] | `[]` | Reihenfolge der Bereiche |
| `areas_options` | object | `{}` | Entity-Filterung pro Bereich |
| `room_pin_entities` | string[] | `[]` | Raum-Pin Entitaeten |
| `show_summary_views` | boolean | `false` | Summary-Views in Navigation |
| `show_room_views` | boolean | `false` | Raum-Views in Navigation |
| `group_lights_by_floors` | boolean | `false` | Lichter nach Etagen gruppieren |
| `custom_cards` | object[] | `[]` | Eigene Karten via YAML `🆕 Beta` |
| `custom_cards_heading` | string | `"Eigene Karten"` | Ueberschrift der Custom Cards Section `🆕 Beta` |
| `custom_cards_icon` | string | `"mdi:cards"` | Icon der Custom Cards Section `🆕 Beta` |
| `custom_views` | object[] | `[]` | Eigene Views via YAML |

</details>

## Fehlerbehebung

| Problem | Loesung |
|---------|---------|
| Dashboard zeigt alte Version | **Hard-Refresh:** `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows) |
| Aenderungen werden nicht uebernommen | In einem **Incognito-/Privat-Fenster** testen — wenn das Problem dort nicht auftritt, ist es ein Browser-Cache-Problem |
| Welche Version ist installiert? | Browser-Konsole oeffnen (F12) → Meldung `Simon42 Dashboard Strategy vX.Y.Z loaded` suchen |
| Strategy-Timeout auf langsamen Verbindungen | Normal bei Slow 4G — HA hat ein festes 5-Sekunden-Limit fuer Custom Elements. Bei normalen Verbindungen kein Problem |

## Contributing

Issues und Pull Requests sind willkommen! Bitte teste PRs gruendlich in einem lokalen HA-Setup.

<details>
<summary>Architektur</summary>

### Code-Split Bundles

**TypeScript** (ES2020, strict) → **Webpack** → Code-Split Chunks:

| Chunk | Groesse | Inhalt |
|-------|---------|--------|
| main | ~5 KB | Entry Point, Custom Element Registrierung |
| lit | ~15 KB | Lit Framework (shared) |
| core | ~31 KB | Registry, Utils, Overview, Custom Cards |
| views | ~16 KB | Lichter, Rollos, Sicherheit, Batterien, Klima, Raum-Detail |
| editor | ~98 KB | Konfigurations-UI (nur bei Bedarf geladen) |

### Performance-Design

Die Strategy folgt denselben Patterns wie HA's offizielle Home- und Areas-Strategien:

- **Pre-filtered Area-Controls:** Area-Cards bekommen nur Controls die im Raum tatsaechlich existieren, nicht pauschal alle.
- **Pre-resolved Views:** Alle Views werden in `generate()` vollstaendig aufgeloest statt als Strategy-Stubs zurueckgegeben.
- **Eager Chunk Loading:** JS-Chunks werden sofort beim Laden des Entry-Points gestartet, nicht erst wenn `generate()` aufgerufen wird.
- **Reaktive Custom Cards:** LitElement mit `willUpdate()` — nur relevante State-Aenderungen loesen Re-Renders aus.
- **Tile-Card-Pooling:** DOM-Elemente werden wiederverwendet statt neu erstellt.

</details>

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
