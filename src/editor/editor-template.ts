// ====================================================================
// SIMON42 EDITOR TEMPLATE
// ====================================================================
// HTML-Template für den Dashboard Strategy Editor

import type { CustomView, CustomCard, CustomBadge, RoomEntities } from '../types/strategy';
import type { AreaRegistryEntry } from '../types/registries';

// -- Editor-specific entity shape (enriched for editor UI) ------------

interface EditorEntity {
  entity_id: string;
  name: string;
  area_id?: string | null;
  device_area_id?: string | null;
}

interface AlarmEntity {
  entity_id: string;
  name: string;
}

// -- Main render params -----------------------------------------------

export interface EditorHTMLParams {
  allAreas: AreaRegistryEntry[];
  hiddenAreas: string[];
  areaOrder: string[];
  showEnergy: boolean;
  showWeather: boolean;
  showSummaryViews: boolean;
  showRoomViews: boolean;
  showSearchCard: boolean;
  hasSearchCardDeps: boolean;
  summariesColumns: 2 | 4;
  alarmEntity: string;
  alarmEntities: AlarmEntity[];
  favoriteEntities: string[];
  roomPinEntities: string[];
  allEntities: EditorEntity[];
  groupByFloors: boolean;
  showClockCard: boolean;
  showLightSummary: boolean;
  groupLightsByFloors: boolean;
  showCoversSummary: boolean;
  showPartiallyOpenCovers: boolean;
  showSecuritySummary: boolean;
  showBatterySummary: boolean;
  showClimateSummary: boolean;
  hideMobileAppBatteries: boolean;
  batteryCriticalThreshold: number;
  batteryLowThreshold: number;
  showLocksInRooms: boolean;
  showAutomationsInRooms: boolean;
  showScriptsInRooms: boolean;
  useDefaultAreaSort: boolean;
  customViews: CustomView[];
  customCards: CustomCard[];
  customCardsHeading: string;
  customCardsIcon: string;
  customBadges: CustomBadge[];
}

// -- Hass-like subset needed by renderAreaEntitiesHTML -----------------

interface HassStatesSubset {
  states: Record<string, { attributes: { friendly_name?: string; [key: string]: any } } | undefined>;
}

// ====================================================================
// PUBLIC API
// ====================================================================

export function renderEditorHTML({
  allAreas,
  hiddenAreas,
  areaOrder,
  showEnergy,
  showWeather,
  showSummaryViews,
  showRoomViews,
  showSearchCard,
  hasSearchCardDeps,
  summariesColumns,
  alarmEntity,
  alarmEntities,
  favoriteEntities,
  roomPinEntities,
  allEntities,
  groupByFloors,
  showClockCard,
  showLightSummary,
  groupLightsByFloors,
  showCoversSummary,
  showPartiallyOpenCovers,
  showSecuritySummary,
  showBatterySummary,
  showClimateSummary,
  hideMobileAppBatteries,
  batteryCriticalThreshold,
  batteryLowThreshold,
  showLocksInRooms,
  showAutomationsInRooms,
  showScriptsInRooms,
  useDefaultAreaSort,
  customViews,
  customCards,
  customCardsHeading,
  customCardsIcon,
  customBadges,
}: EditorHTMLParams): string {
  return `
    <div class="card-config">

      <div class="section">
        <div class="section-title">Übersicht</div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-clock-card"
            ${showClockCard !== false ? 'checked' : ''}
          />
          <label for="show-clock-card">Uhrzeit-Karte anzeigen</label>
        </div>
        <div class="description">
          Zeigt die Uhrzeit-Karte in der Übersicht an.
        </div>
        <div class="form-row">
          <label for="alarm-entity" style="margin-right: 8px; min-width: 120px;">Alarm-Entität:</label>
          <select id="alarm-entity" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            <option value="">Keine (Uhr in voller Breite)</option>
            ${alarmEntities
              .map(
                (entity) => `
              <option value="${entity.entity_id}" ${entity.entity_id === alarmEntity ? 'selected' : ''}>
                ${entity.name}
              </option>
            `
              )
              .join('')}
          </select>
        </div>
        <div class="description">
          Wähle eine Alarm-Control-Panel-Entität aus. Wenn die Uhrzeit-Karte aktiv ist, wird das Alarm-Panel daneben angezeigt. Ohne Uhrzeit-Karte erscheint das Alarm-Panel in voller Breite.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-search-card"
            ${showSearchCard ? 'checked' : ''}
            ${!hasSearchCardDeps ? 'disabled' : ''}
          />
          <label for="show-search-card" ${!hasSearchCardDeps ? 'class="disabled-label"' : ''}>
            Such-Karte anzeigen
          </label>
        </div>
        <div class="description">
          ${
            hasSearchCardDeps
              ? 'Zeigt die custom:search-card direkt unter der Uhr in der Übersicht an.'
              : '⚠️ Benötigt <strong>custom:search-card</strong> und <strong>card-tools</strong>. Bitte installieren Sie beide Komponenten, um diese Funktion zu nutzen.'
          }
        </div>
      </div>

      <div class="section">
        <div class="section-title">Zusammenfassungen</div>
        <div class="form-row">
          <input
            type="radio"
            id="summaries-2-columns"
            name="summaries-columns"
            value="2"
            ${summariesColumns === 2 ? 'checked' : ''}
          />
          <label for="summaries-2-columns">2 Spalten (2x2 Grid)</label>
        </div>
        <div class="form-row">
          <input
            type="radio"
            id="summaries-4-columns"
            name="summaries-columns"
            value="4"
            ${summariesColumns === 4 ? 'checked' : ''}
          />
          <label for="summaries-4-columns">4 Spalten (1x4 Reihe)</label>
        </div>
        <div class="description">
          Wähle aus, wie die Zusammenfassungskarten angezeigt werden sollen. Das Layout passt sich automatisch an, wenn Karten ausgeblendet werden.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-light-summary"
            ${showLightSummary !== false ? 'checked' : ''}
          />
          <label for="show-light-summary">Licht-Zusammenfassung anzeigen</label>
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="group-lights-by-floors"
            ${groupLightsByFloors ? 'checked' : ''}
          />
          <label for="group-lights-by-floors">Lichter nach Etagen gruppieren</label>
        </div>
        <div class="description">
          Gruppiert die Lichter in der Lichter-Ansicht nach Etagen. Jede Etage erhält einen eigenen Bereich mit Ein-/Ausschalt-Button.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-covers-summary"
            ${showCoversSummary !== false ? 'checked' : ''}
          />
          <label for="show-covers-summary">Rollo-Zusammenfassung anzeigen</label>
        </div>
        <div style="margin-left: 26px; margin-bottom: 8px;">
          <div class="form-row">
            <input
              type="checkbox"
              id="show-partially-open-covers"
              ${showPartiallyOpenCovers ? 'checked' : ''}
            />
            <label for="show-partially-open-covers">Teiloffene Rollos separat anzeigen</label>
          </div>
          <div class="description">
            Zeigt teiloffene Rollos (weder ganz offen noch geschlossen) in einer eigenen Gruppe an.
          </div>
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-security-summary"
            ${showSecuritySummary !== false ? 'checked' : ''}
          />
          <label for="show-security-summary">Sicherheits-Zusammenfassung anzeigen</label>
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-climate-summary"
            ${showClimateSummary ? 'checked' : ''}
          />
          <label for="show-climate-summary">Klima-Zusammenfassung anzeigen</label>
        </div>
        <div class="description">
          Zeigt die Klima-Zusammenfassungskarte in der Übersicht an. Zählt aktive Thermostate und Klimageräte.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-battery-summary"
            ${showBatterySummary !== false ? 'checked' : ''}
          />
          <label for="show-battery-summary">Batterie-Zusammenfassung anzeigen</label>
        </div>
        <div style="margin-left: 26px; margin-bottom: 8px;">
          <div class="form-row">
            <input
              type="checkbox"
              id="hide-mobile-app-batteries"
              ${hideMobileAppBatteries ? 'checked' : ''}
            />
            <label for="hide-mobile-app-batteries">Mobile-App-Batterien ausblenden</label>
          </div>
          <div class="description">
            Blendet Batterien von Smartphones, Tablets und Watches (Mobile App) in der Batterie-Übersicht und -Zusammenfassung aus.
          </div>
          <div style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 12px; margin-bottom: 4px;">Batterie-Schwellwerte</div>
          <div class="form-row">
            <label for="battery-critical-threshold" style="min-width: 140px;">Kritisch unter</label>
            <input
              type="number"
              id="battery-critical-threshold"
              min="1" max="99"
              value="${batteryCriticalThreshold}"
              style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);"
            /> %
          </div>
          <div class="form-row">
            <label for="battery-low-threshold" style="min-width: 140px;">Niedrig unter</label>
            <input
              type="number"
              id="battery-low-threshold"
              min="1" max="99"
              value="${batteryLowThreshold}"
              style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);"
            /> %
          </div>
          <div class="description">
            Schwellwerte für die Batterie-Statusgruppen (Kritisch / Niedrig / Gut).
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Info-Karten</div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-weather"
            ${showWeather !== false ? 'checked' : ''}
          />
          <label for="show-weather">Wetter-Karte anzeigen</label>
        </div>
        <div class="description">
          Zeigt die Wettervorhersage-Karte in der Übersicht an, wenn eine Wetter-Entität verfügbar ist.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-energy"
            ${showEnergy ? 'checked' : ''}
          />
          <label for="show-energy">Energie-Dashboard anzeigen</label>
        </div>
        <div class="description">
          Zeigt die Energie-Verteilungskarte in der Übersicht an, wenn Energiedaten verfügbar sind.
        </div>
      </div>

      <div class="section">
        <div class="section-title">Favoriten</div>
        <div id="favorites-list" style="margin-bottom: 12px;">
          ${renderFavoritesList(favoriteEntities, allEntities)}
        </div>
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <select id="favorite-entity-select" style="flex: 1; min-width: 0; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            <option value="">Entität auswählen...</option>
            ${allEntities
              .map(
                (entity) => `
              <option value="${entity.entity_id}">${entity.name}</option>
            `
              )
              .join('')}
          </select>
          <button id="add-favorite-btn" style="flex-shrink: 0; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--primary-color); color: var(--text-primary-color); cursor: pointer; white-space: nowrap;">
            + Hinzufügen
          </button>
        </div>
        <div class="description">
          Wähle Entitäten aus, die als Favoriten unter den Zusammenfassungen angezeigt werden sollen. Die Entitäten werden als Kacheln angezeigt.
        </div>
      </div>

      <div style="border-top: 2px solid var(--divider-color); margin: 24px 0 16px; padding-top: 16px;">
        <div style="font-size: 16px; font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px;">Bereiche & Räume</div>
      </div>

      <div class="section">
        <div class="section-title">Bereiche</div>
        <div class="form-row">
          <input
            type="checkbox"
            id="group-by-floors"
            ${groupByFloors ? 'checked' : ''}
          />
          <label for="group-by-floors">Bereiche in Etagen gliedern</label>
        </div>
        <div class="description">
          Gruppiert die Bereiche in der Übersicht nach Etagen. Wenn aktiviert, wird für jede Etage eine separate Section erstellt.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-locks-in-rooms"
            ${showLocksInRooms ? 'checked' : ''}
          />
          <label for="show-locks-in-rooms">Schlösser in Raum-Ansichten anzeigen</label>
        </div>
        <div class="description">
          Zeigt Schlösser (z.B. Nuki) in den jeweiligen Raum-Ansichten an. Schlösser erscheinen unabhängig davon immer in der Sicherheits-Übersicht.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-automations-in-rooms"
            ${showAutomationsInRooms ? 'checked' : ''}
          />
          <label for="show-automations-in-rooms">Automationen in Raum-Ansichten anzeigen</label>
        </div>
        <div class="description">
          Zeigt dem Bereich zugeordnete Automationen in den jeweiligen Raum-Ansichten an.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-scripts-in-rooms"
            ${showScriptsInRooms ? 'checked' : ''}
          />
          <label for="show-scripts-in-rooms">Skripte in Raum-Ansichten anzeigen</label>
        </div>
        <div class="description">
          Zeigt dem Bereich zugeordnete Skripte in den jeweiligen Raum-Ansichten an.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="use-default-area-sort"
            ${useDefaultAreaSort ? 'checked' : ''}
          />
          <label for="use-default-area-sort">Home Assistant Sortierung verwenden</label>
        </div>
        <div class="description">
          Verwendet die Sortierung der Bereiche aus Home Assistant anstelle der hier 👇 im Dashboard konfigurierten Reihenfolge.
        </div>
        <div class="description" style="margin-left: 0; margin-top: 16px; margin-bottom: 12px;">
          Wähle aus, welche Bereiche im Dashboard angezeigt werden sollen und in welcher Reihenfolge. Klappe Bereiche auf, um einzelne Entitäten zu verwalten.
        </div>
        <div class="area-list" id="area-list">
          ${renderAreaItems(allAreas, hiddenAreas, areaOrder)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Raum-Pins</div>
        <div id="room-pins-list" style="margin-bottom: 12px;">
          ${renderRoomPinsList(roomPinEntities, allEntities, allAreas)}
        </div>
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <select id="room-pin-entity-select" style="flex: 1; min-width: 0; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);">
            <option value="">Entität auswählen...</option>
            ${allEntities
              .filter((entity) => entity.area_id || entity.device_area_id)
              .map(
                (entity) => `
                <option value="${entity.entity_id}">${entity.name}</option>
              `
              )
              .join('')}
          </select>
          <button id="add-room-pin-btn" style="flex-shrink: 0; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--primary-color); color: var(--text-primary-color); cursor: pointer; white-space: nowrap;">
            + Hinzufügen
          </button>
        </div>
        <div class="description">
          Wähle Entitäten aus, die in ihren zugeordneten Räumen als erstes angezeigt werden sollen. Ideal für Entitäten die normalerweise nicht automatisch erfasst werden (z.B. Wetterstationen, spezielle Sensoren). <strong>Nur Entitäten mit Raum-Zuordnung können ausgewählt werden.</strong> Diese Pins erscheinen nur im jeweiligen Raum, nicht in der Übersicht.
        </div>
      </div>

      <div class="section">
        <div class="section-title">Ansichten</div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-summary-views"
            ${showSummaryViews ? 'checked' : ''}
          />
          <label for="show-summary-views">Zusammenfassungs-Views anzeigen</label>
        </div>
        <div class="description">
          Zeigt die Zusammenfassungs-Views (Lichter, Rollos, Sicherheit, Batterien) in der oberen Navigation an.
        </div>
        <div class="form-row">
          <input
            type="checkbox"
            id="show-room-views"
            ${showRoomViews ? 'checked' : ''}
          />
          <label for="show-room-views">Raum-Views anzeigen</label>
        </div>
        <div class="description">
          Zeigt die einzelnen Raum-Views in der oberen Navigation an.
        </div>
      </div>

      <div style="border-top: 2px solid var(--divider-color); margin: 24px 0 16px; padding-top: 16px;">
        <div style="font-size: 16px; font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px;">Erweiterte Funktionen</div>
      </div>

      <div class="section">
        <div class="section-title">Eigene Karten</div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="text" id="custom-cards-heading" value="${customCardsHeading}" placeholder="Eigene Karten" style="flex: 2; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
          <input type="text" id="custom-cards-icon" value="${customCardsIcon}" placeholder="mdi:cards" style="flex: 1; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
        </div>
        <div class="description" style="margin-bottom: 8px;">
          Überschrift und Icon der Section für die eigenen Karten auf dem Dashboard. Leer lassen für Standardwerte.
        </div>
        <div id="custom-cards-list">
          ${renderCustomCardsList(customCards)}
        </div>
        <button id="add-custom-card-btn" style="margin-top: 8px; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--primary-color); color: var(--text-primary-color); cursor: pointer;">
          + Neue Karte hinzufügen
        </button>
        <div class="description">
          Füge eigene Karten zur Übersicht hinzu. Die Karten erscheinen in einer eigenen Section zwischen Zusammenfassung und Bereichen. Tipp: Erstelle die Karte zuerst in einem normalen Dashboard, kopiere den YAML-Code und füge ihn hier ein.
        </div>
      </div>

      <div class="section">
        <div class="section-title">Eigene Badges</div>
        <div id="custom-badges-list">
          ${renderCustomBadgesList(customBadges)}
        </div>
        <button id="add-custom-badge-btn" style="margin-top: 8px; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--primary-color); color: var(--text-primary-color); cursor: pointer;">
          + Neues Badge hinzufügen
        </button>
        <div class="description">
          Füge eigene Badges zum Header der Übersicht hinzu (neben den Personen-Chips). Beispiel: <code>type: entity</code> + <code>entity: sun.sun</code>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Custom Views</div>
        <div id="custom-views-list">
          ${renderCustomViewsList(customViews)}
        </div>
        <button id="add-custom-view-btn" style="margin-top: 8px; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--primary-color); color: var(--text-primary-color); cursor: pointer;">
          + Neue View hinzufügen
        </button>
        <div class="description">
          Erstelle eigene Views mit beliebigen Cards. Tipp: Erstelle die View zuerst in einem normalen Dashboard, kopiere den YAML-Code und füge ihn hier ein.
        </div>
      </div>

    </div>
  `;
}

// ====================================================================
// PRIVATE HELPERS
// ====================================================================

function renderFavoritesList(favoriteEntities: string[], allEntities: EditorEntity[]): string {
  if (!favoriteEntities || favoriteEntities.length === 0) {
    return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine Favoriten hinzugefügt</div>';
  }

  // Erstelle Map für schnellen Zugriff auf Entity-Namen
  const entityMap = new Map<string, string>(allEntities.map((e) => [e.entity_id, e.name]));

  return `
    <div style="border: 1px solid var(--divider-color); border-radius: 4px; overflow: hidden;">
      ${favoriteEntities
        .map((entityId: string, _index: number) => {
          const name = entityMap.get(entityId) || entityId;
          return `
          <div class="favorite-item" data-entity-id="${entityId}" style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--divider-color); background: var(--card-background-color);">
            <span class="drag-handle" style="margin-right: 12px; cursor: grab; color: var(--secondary-text-color);">☰</span>
            <span style="flex: 1; font-size: 14px;">
              <strong>${name}</strong>
              <span style="margin-left: 8px; font-size: 12px; color: var(--secondary-text-color); font-family: monospace;">${entityId}</span>
            </span>
            <button class="remove-favorite-btn" data-entity-id="${entityId}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">
              ✕
            </button>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

export function renderRoomPinsList(
  roomPinEntities: string[],
  allEntities: EditorEntity[],
  allAreas: AreaRegistryEntry[]
): string {
  if (!roomPinEntities || roomPinEntities.length === 0) {
    return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine Raum-Pins hinzugefügt</div>';
  }

  // Erstelle Maps für schnellen Zugriff
  const entityMap = new Map<string, EditorEntity>(allEntities.map((e) => [e.entity_id, e]));
  const areaMap = new Map<string, string>(allAreas.map((a) => [a.area_id, a.name]));

  return `
    <div style="border: 1px solid var(--divider-color); border-radius: 4px; overflow: hidden;">
      ${roomPinEntities
        .map((entityId: string, _index: number) => {
          const entity = entityMap.get(entityId);
          const name = entity?.name || entityId;
          const areaId = entity?.area_id || entity?.device_area_id;
          const areaName = areaId ? areaMap.get(areaId) || areaId : 'Kein Raum';

          return `
          <div class="room-pin-item" data-entity-id="${entityId}" style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--divider-color); background: var(--card-background-color);">
            <span class="drag-handle" style="margin-right: 12px; cursor: grab; color: var(--secondary-text-color);">☰</span>
            <span style="flex: 1; font-size: 14px;">
              <strong>${name}</strong>
              <span style="margin-left: 8px; font-size: 12px; color: var(--secondary-text-color); font-family: monospace;">${entityId}</span>
              <br>
              <span style="font-size: 11px; color: var(--secondary-text-color);">📍 ${areaName}</span>
            </span>
            <button class="remove-room-pin-btn" data-entity-id="${entityId}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">
              ✕
            </button>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

export function renderCustomViewsList(customViews: CustomView[]): string {
  if (!customViews || customViews.length === 0) {
    return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine Custom Views erstellt</div>';
  }

  return customViews
    .map((view: CustomView, index: number) => {
      const validationMsg = view._yaml_error
        ? `<span style="color: var(--error-color);">❌ ${view._yaml_error}</span>`
        : view.yaml
          ? '<span style="color: var(--success-color, green);">✅ YAML gültig</span>'
          : '';

      return `
      <div class="custom-view-item" data-index="${index}" style="border: 1px solid var(--divider-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: var(--card-background-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${view.title || 'Neue View'}</strong>
          <button class="remove-custom-view-btn" data-index="${index}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <input type="text" class="custom-view-title" data-index="${index}" value="${view.title || ''}" placeholder="Titel" style="flex: 2; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
            <input type="text" class="custom-view-path" data-index="${index}" value="${view.path || ''}" placeholder="Pfad (z.B. mein-view)" style="flex: 2; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
            <input type="text" class="custom-view-icon" data-index="${index}" value="${view.icon || ''}" placeholder="mdi:star" style="flex: 1; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
          </div>
          <textarea class="custom-view-yaml" data-index="${index}" rows="8" placeholder="YAML-Code hier einfügen..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box;">${view.yaml || ''}</textarea>
          <div class="custom-view-validation" data-index="${index}" style="font-size: 12px; min-height: 16px;">
            ${validationMsg}
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

export function renderCustomCardsList(customCards: CustomCard[]): string {
  if (!customCards || customCards.length === 0) {
    return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine eigenen Karten erstellt</div>';
  }

  return customCards
    .map((card: CustomCard, index: number) => {
      const validationMsg = card._yaml_error
        ? `<span style="color: var(--error-color);">❌ ${card._yaml_error}</span>`
        : card.yaml
          ? '<span style="color: var(--success-color, green);">✅ YAML gültig</span>'
          : '';

      return `
      <div class="custom-card-item" data-index="${index}" style="border: 1px solid var(--divider-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: var(--card-background-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${card.title || 'Neue Karte'}</strong>
          <button class="remove-custom-card-btn" data-index="${index}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">✕</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <input type="text" class="custom-card-title" data-index="${index}" value="${card.title || ''}" placeholder="Titel (optional, wird als Heading angezeigt)" style="padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);" />
          <textarea class="custom-card-yaml" data-index="${index}" rows="6" placeholder="YAML-Code hier einfügen..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box;">${card.yaml || ''}</textarea>
          <div class="custom-card-validation" data-index="${index}" style="font-size: 12px; min-height: 16px;">
            ${validationMsg}
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

export function renderCustomBadgesList(customBadges: CustomBadge[]): string {
  if (!customBadges || customBadges.length === 0) {
    return '<div class="empty-state" style="padding: 12px; text-align: center; color: var(--secondary-text-color); font-style: italic;">Keine eigenen Badges erstellt</div>';
  }

  return customBadges
    .map((badge: CustomBadge, index: number) => {
      const validationMsg = badge._yaml_error
        ? `<span style="color: var(--error-color);">❌ ${badge._yaml_error}</span>`
        : badge.yaml
          ? '<span style="color: var(--success-color, green);">✅ YAML gültig</span>'
          : '';

      return `
      <div class="custom-badge-item" data-index="${index}" style="border: 1px solid var(--divider-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: var(--card-background-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">Badge ${index + 1}</strong>
          <button class="remove-custom-badge-btn" data-index="${index}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer;">✕</button>
        </div>
        <textarea class="custom-badge-yaml" data-index="${index}" rows="4" placeholder="type: entity&#10;entity: sun.sun" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: monospace; font-size: 12px; resize: vertical; box-sizing: border-box;">${badge.yaml || ''}</textarea>
        <div class="custom-badge-validation" data-index="${index}" style="font-size: 12px; min-height: 16px;">
          ${validationMsg}
        </div>
      </div>
    `;
    })
    .join('');
}

function renderAreaItems(allAreas: AreaRegistryEntry[], hiddenAreas: string[], areaOrder: string[]): string {
  if (allAreas.length === 0) {
    return '<div class="empty-state">Keine Bereiche verfügbar</div>';
  }

  return allAreas
    .map((area: AreaRegistryEntry, index: number) => {
      const isHidden = hiddenAreas.includes(area.area_id);
      const orderIndex = areaOrder.indexOf(area.area_id);
      const displayOrder = orderIndex !== -1 ? orderIndex : 9999 + index;

      return `
      <div class="area-item"
           data-area-id="${area.area_id}"
           data-order="${displayOrder}">
        <div class="area-header">
          <span class="drag-handle" draggable="true">☰</span>
          <input
            type="checkbox"
            class="area-checkbox"
            data-area-id="${area.area_id}"
            ${!isHidden ? 'checked' : ''}
          />
          <span class="area-name">${area.name}</span>
          ${area.icon ? `<ha-icon class="area-icon" icon="${area.icon}"></ha-icon>` : ''}
          <button class="expand-button" data-area-id="${area.area_id}" ${isHidden ? 'disabled' : ''}>
            <span class="expand-icon">▶</span>
          </button>
        </div>
        <div class="area-content" data-area-id="${area.area_id}" style="display: none;">
          <div class="loading-placeholder">Lade Entitäten...</div>
        </div>
      </div>
    `;
    })
    .join('');
}

// -- Domain group definition for entity rendering ---------------------

interface DomainGroup {
  key: keyof RoomEntities;
  label: string;
  icon: string;
}

export function renderAreaEntitiesHTML(
  areaId: string,
  groupedEntities: Record<string, string[]>,
  hiddenEntities: Record<string, string[]>,
  entityOrders: Record<string, string[]>,
  hass: HassStatesSubset
): string {
  const domainGroups: DomainGroup[] = [
    { key: 'lights', label: 'Beleuchtung', icon: 'mdi:lightbulb' },
    { key: 'climate', label: 'Klima', icon: 'mdi:thermostat' },
    { key: 'covers', label: 'Rollos & Jalousien', icon: 'mdi:window-shutter' },
    { key: 'covers_curtain', label: 'Vorhänge', icon: 'mdi:curtains' },
    { key: 'media_player', label: 'Medien', icon: 'mdi:speaker' },
    { key: 'scenes', label: 'Szenen', icon: 'mdi:palette' },
    { key: 'vacuum', label: 'Staubsauger', icon: 'mdi:robot-vacuum' },
    { key: 'fan', label: 'Ventilatoren', icon: 'mdi:fan' },
    { key: 'switches', label: 'Schalter', icon: 'mdi:light-switch' },
    { key: 'locks', label: 'Schlösser', icon: 'mdi:lock' },
  ];

  let html = '<div class="entity-groups">';

  domainGroups.forEach((group: DomainGroup) => {
    const entities = groupedEntities[group.key] || [];
    if (entities.length === 0) return;

    const hiddenInGroup = hiddenEntities[group.key] || [];
    const allHidden = entities.every((e) => hiddenInGroup.includes(e));
    const someHidden = entities.some((e) => hiddenInGroup.includes(e)) && !allHidden;

    html += `
      <div class="entity-group" data-group="${group.key}">
        <div class="entity-group-header">
          <input
            type="checkbox"
            class="group-checkbox"
            data-area-id="${areaId}"
            data-group="${group.key}"
            ${!allHidden ? 'checked' : ''}
            ${someHidden ? 'data-indeterminate="true"' : ''}
          />
          <ha-icon icon="${group.icon}"></ha-icon>
          <span class="group-name">${group.label}</span>
          <span class="entity-count">(${entities.length})</span>
          <button class="expand-button-small" data-area-id="${areaId}" data-group="${group.key}">
            <span class="expand-icon-small">▶</span>
          </button>
        </div>
        <div class="entity-list" data-area-id="${areaId}" data-group="${group.key}" style="display: none;">
          ${entities
            .map((entityId: string) => {
              const state = hass.states[entityId];
              const name = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
              const isHidden = hiddenInGroup.includes(entityId);

              return `
              <div class="entity-item">
                <input
                  type="checkbox"
                  class="entity-checkbox"
                  data-area-id="${areaId}"
                  data-group="${group.key}"
                  data-entity-id="${entityId}"
                  ${!isHidden ? 'checked' : ''}
                />
                <span class="entity-name">${name}</span>
                <span class="entity-id">${entityId}</span>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
  });

  html += '</div>';

  if (html === '<div class="entity-groups"></div>') {
    return '<div class="empty-state">Keine Entitäten in diesem Bereich gefunden</div>';
  }

  return html;
}
