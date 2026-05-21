// ====================================================================
// VIEW STRATEGY — OVERVIEW (main dashboard view)
// ====================================================================
// Extracted from the dashboard entry point so HA can resolve this view
// concurrently with other view strategies via Promise.all, enabling
// progressive rendering instead of blocking on Registry init.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig, CustomCard, CustomSection } from '../types/strategy';
import { DEFAULT_SECTIONS_ORDER } from '../types/strategy';
import type { LovelaceViewConfig, LovelaceSectionConfig, LovelaceBadgeConfig, LovelaceCardConfig } from '../types/lovelace';
import { Registry } from '../Registry';
import { collectPersons, findWeatherEntity, findDummySensor } from '../utils/entity-filter';
import { getVisibleAreas } from '../utils/name-utils';
import { createPersonBadges } from '../utils/badge-builder';
import { createOverviewSection, createCustomCardsSection } from '../sections/OverviewSection';
import { createAreasSection } from '../sections/AreasSection';
import { createWeatherSection, createEnergySection } from '../sections/WeatherEnergySection';
import { createPlantsSection } from '../sections/PlantsSection';
import { createAgendaSection } from '../sections/AgendaSection';
import { createTodosSection } from '../sections/TodosSection';
import { createPersonsSection } from '../sections/PersonsSection';
import { createVacuumsSection } from '../sections/VacuumsSection';
import { createMaintenanceSection } from '../sections/MaintenanceSection';
import { createPresenceZonesSection } from '../sections/PresenceZonesSection';
import { createOverviewView } from '../utils/view-builder';
import { timeStart, timeEnd, debugLog } from '../utils/debug';
import { localize } from '../utils/localize';

/** Built-in section keys (collision check for custom_sections). */
const BUILTIN_SECTION_KEYS = new Set<string>(['overview', 'custom_cards', 'areas', 'weather', 'energy']);

/**
 * Normalizes a sections_order array: removes invalid/duplicate keys,
 * appends any missing keys at the end (forward compatibility).
 *
 * Accepts user-defined custom_section keys alongside built-in SectionKeys.
 * Unknown keys (typos, removed sections) are dropped silently.
 */
function normalizeSectionsOrder(order: string[], customSectionKeys: string[]): string[] {
  const validKeys = new Set<string>([...BUILTIN_SECTION_KEYS, ...customSectionKeys]);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of order) {
    if (validKeys.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  // Append any missing built-ins in their default order
  for (const key of DEFAULT_SECTIONS_ORDER) {
    if (!seen.has(key)) result.push(key);
  }
  // Append any custom sections the user didn't explicitly position
  for (const key of customSectionKeys) {
    if (!seen.has(key)) result.push(key);
  }
  return result;
}

/**
 * If the card gates its own visibility via a `conditional` wrapper or an
 * explicit `visibility:` block, return the condition list so the strategy
 * can mirror it onto a sibling heading. Returns undefined for plain cards.
 *
 * Without this, a hidden conditional custom card leaves an orphaned
 * title visible. Original analysis: upstream
 * TheRealSimon42/simon42-dashboard-strategy#224.
 */
function inheritVisibilityFromCard(parsedConfig: unknown): unknown[] | undefined {
  if (!parsedConfig || typeof parsedConfig !== 'object') return undefined;
  const pc = parsedConfig as { type?: string; conditions?: unknown; visibility?: unknown };
  if (pc.type === 'conditional' && Array.isArray(pc.conditions)) return pc.conditions;
  if (Array.isArray(pc.visibility)) return pc.visibility;
  return undefined;
}

/**
 * Build a LovelaceSectionConfig from a user-declared CustomSection.
 * Returns null when the section has no cards (auto-hide).
 *
 * Defensive: only accepts an array of card configs (the editor parses YAML
 * to that shape). Malformed entries are dropped.
 */
function buildCustomSection(section: CustomSection): LovelaceSectionConfig | null {
  if (!Array.isArray(section.parsed_config) || section.parsed_config.length === 0) return null;
  const validCards = section.parsed_config.filter(
    (c): c is LovelaceCardConfig => typeof (c as { type?: unknown }).type === 'string'
  );
  if (validCards.length === 0) return null;
  const cards: LovelaceCardConfig[] = [];
  if (section.heading) {
    cards.push({
      type: 'heading',
      heading: section.heading,
      heading_style: 'title',
      ...(section.icon ? { icon: section.icon } : {}),
    });
  }
  cards.push(...validCards);
  return { type: 'grid', cards };
}

/**
 * Renders custom cards into an array of LovelaceCardConfigs (without section wrapper).
 * Used to append assigned custom cards to existing sections.
 */
function renderCustomCards(cards: CustomCard[]): LovelaceCardConfig[] {
  const result: LovelaceCardConfig[] = [];
  for (const card of cards) {
    if (!card.parsed_config) continue;
    if (Array.isArray(card.parsed_config)) {
      result.push(...card.parsed_config);
    } else {
      if (card.title) {
        const headingCard: LovelaceCardConfig = {
          type: 'heading',
          heading: card.title,
          heading_style: 'subtitle',
        };
        const inherited = inheritVisibilityFromCard(card.parsed_config);
        if (inherited) (headingCard as { visibility?: unknown }).visibility = inherited;
        result.push(headingCard);
      }
      result.push(card.parsed_config as LovelaceCardConfig);
    }
  }
  return result;
}

interface OverviewViewStrategyParams {
  dashboardConfig?: OrielConfig;
}

class OrielViewOverview extends HTMLElement {
  static async generate(
    config: OverviewViewStrategyParams,
    hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    timeStart('overview-generate');
    const dashboardConfig: OrielConfig = config.dashboardConfig || {};

    // Initialize Registry (idempotent — skips if already done by another view)
    Registry.initialize(hass, dashboardConfig);

    // Visible areas (filtered + sorted by config)
    const visibleAreas = getVisibleAreas(Registry.areas, dashboardConfig.areas_display, dashboardConfig.use_default_area_sort);

    // Collect data for overview
    const persons = collectPersons(hass, dashboardConfig);
    // Resolve the weather entity: explicit config wins when the entity
    // exists in this hass instance, otherwise fall back to auto-discovery.
    const configuredWeather = dashboardConfig.weather_entity;
    const weatherEntity =
      configuredWeather && hass.states[configuredWeather]
        ? configuredWeather
        : findWeatherEntity(hass);
    const someSensorId = findDummySensor(hass);

    // Person badges (default-on; user can suppress via config to swap in
    // their own person badges through custom_badges instead).
    // Zone-aware: HA's person.state already returns the zone name when the
    // person is in a non-home zone, so the 'with_state' layout surfaces
    // "Work" / "Office" / etc. automatically.
    const showPersonBadges = dashboardConfig.show_person_badges !== false;
    const personBadgeLayout = dashboardConfig.person_badge_layout || 'with_state';
    const personBadges = showPersonBadges ? createPersonBadges(persons, hass, personBadgeLayout) : [];

    // Config flags
    const showWeather = dashboardConfig.show_weather !== false;
    const showEnergy = dashboardConfig.show_energy !== false;
    const showSearchCard = dashboardConfig.show_search_card === true;
    const groupByFloors = dashboardConfig.group_by_floors === true;

    // Group custom cards by target section (built-in OR user-defined custom_sections key)
    const allCustomCards = dashboardConfig.custom_cards || [];
    const customCardsBySection = new Map<string, CustomCard[]>();
    for (const card of allCustomCards) {
      const target = card.target_section || 'custom_cards';
      const list = customCardsBySection.get(target) || [];
      list.push(card);
      customCardsBySection.set(target, list);
    }

    // Hidden section headings (per-section opt-in)
    const hiddenHeadings = new Set(dashboardConfig.hidden_section_headings || []);

    // Process custom_sections: validate keys (no collision with built-ins, no duplicates)
    // and pre-build their LovelaceSectionConfig. Invalid entries are dropped silently.
    const rawCustomSections = dashboardConfig.custom_sections || [];
    const seenCustomKeys = new Set<string>();
    const customSections: { key: string; section: LovelaceSectionConfig | null }[] = [];
    for (const cs of rawCustomSections) {
      if (!cs.key || typeof cs.key !== 'string') continue;
      if (BUILTIN_SECTION_KEYS.has(cs.key)) continue; // can't shadow built-ins
      if (seenCustomKeys.has(cs.key)) continue; // first wins on duplicates
      seenCustomKeys.add(cs.key);
      customSections.push({ key: cs.key, section: buildCustomSection(cs) });
    }
    const customSectionKeys = customSections.map((s) => s.key);

    // Build built-in sections
    const overviewSection = createOverviewSection({ someSensorId, showSearchCard, config: dashboardConfig, hass });
    const customCardsSection = createCustomCardsSection(
      customCardsBySection.get('custom_cards') || [],
      dashboardConfig.custom_cards_heading,
      dashboardConfig.custom_cards_icon,
      hiddenHeadings.has('custom_cards')
    );
    const areasSections = createAreasSection(
      visibleAreas,
      groupByFloors,
      hass,
      hiddenHeadings.has('areas'),
      hiddenHeadings.has('areas_other'),
    );

    // Section map: key → section(s) or null. Keyed by string so custom keys fit alongside built-ins.
    const sectionMap = new Map<string, LovelaceSectionConfig | LovelaceSectionConfig[] | null>([
      ['overview', overviewSection],
      ['custom_cards', customCardsSection],
      ['areas', areasSections],
      [
        'weather',
        createWeatherSection(
          weatherEntity ?? null,
          showWeather,
          dashboardConfig.show_weather_forecast_card !== false,
          dashboardConfig.weather_sensors || [],
          dashboardConfig.weather_presentation,
          hiddenHeadings.has('weather'),
        ),
      ],
      [
        'energy',
        createEnergySection(
          showEnergy,
          dashboardConfig.energy_link_dashboard !== false,
          // Legacy boolean still controls the built-in distribution card
          // when energy_presentation is unset. When set, createEnergySection
          // routes to either the built-in, a registry-known custom card,
          // or no card at all.
          dashboardConfig.show_energy_distribution_card !== false,
          hiddenHeadings.has('energy'),
          dashboardConfig.energy_presentation,
        ),
      ],
      ['plants', createPlantsSection(
        hass,
        dashboardConfig.show_plants_section === true,
        hiddenHeadings.has('plants'),
        dashboardConfig.plants_presentation,
      )],
      ['agenda', createAgendaSection(
        hass,
        dashboardConfig.show_agenda_section === true,
        dashboardConfig.agenda_calendar_entities,
      )],
      ['todos', createTodosSection(hass, dashboardConfig.show_todos_section === true, dashboardConfig.todos_entities)],
      ['persons', createPersonsSection(hass, dashboardConfig.show_persons_section === true)],
      ['vacuums', createVacuumsSection(
        hass,
        dashboardConfig.show_vacuums_section === true,
        hiddenHeadings.has('vacuums'),
        dashboardConfig.vacuums_presentation,
      )],
      ['maintenance', createMaintenanceSection(hass, dashboardConfig.show_maintenance_section === true)],
      [
        'presence',
        createPresenceZonesSection(
          dashboardConfig.presence_zones,
          dashboardConfig.presence_zones_name,
          dashboardConfig.presence_zones_icon,
        ),
      ],
    ]);
    for (const { key, section } of customSections) {
      sectionMap.set(key, section);
    }

    // Per-section conditional visibility (e.g. show agenda only on workdays).
    const sectionVisibility = dashboardConfig.section_visibility || {};

    // Mode-driven section ordering (roadmap C4). If
    // `sections_order_by_mode` is configured AND the strategy's
    // house_mode_entity is set AND the entity's current state
    // matches a key (case- and underscore-insensitive), use that
    // override. Otherwise fall back to `sections_order`.
    const modeMap = dashboardConfig.sections_order_by_mode;
    const houseModeEnt = dashboardConfig.house_mode_entity;
    let baseOrder: string[] | undefined = dashboardConfig.sections_order;
    if (modeMap && houseModeEnt) {
      const state = hass.states[houseModeEnt]?.state;
      if (typeof state === 'string') {
        const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '_');
        const stateKey = normalize(state);
        for (const [key, order] of Object.entries(modeMap)) {
          if (normalize(key) === stateKey) {
            baseOrder = order;
            break;
          }
        }
      }
    }

    // Assemble in configured order, appending assigned custom cards to each section
    const sectionsOrder = normalizeSectionsOrder(
      baseOrder ?? DEFAULT_SECTIONS_ORDER,
      customSectionKeys,
    );
    // Visibility checker — handles legacy { entity, state } shape
    // AND the new composable rule shape (role / time / mode).
    const { getSectionVisibilityChecker } = await import('../utils/visibility');
    const sectionVisible = getSectionVisibilityChecker(dashboardConfig, hass);

    const overviewSections: LovelaceSectionConfig[] = [];
    for (const key of sectionsOrder) {
      if (!sectionVisible(key)) continue;
      const result = sectionMap.get(key);
      if (!result) continue;
      if (Array.isArray(result)) {
        overviewSections.push(...result);
      } else {
        overviewSections.push(result);
      }
      // Append custom cards assigned to this section (skip 'custom_cards' — handled by createCustomCardsSection)
      if (key !== 'custom_cards') {
        const assigned = customCardsBySection.get(key);
        if (assigned && assigned.length > 0) {
          const extraCards = renderCustomCards(assigned);
          if (extraCards.length > 0) {
            // Append to the last section added (handles array sections like areas)
            const lastSection = overviewSections[overviewSections.length - 1];
            if (lastSection?.cards) {
              lastSection.cards.push(...extraCards);
            }
          }
        }
      }
    }

    // Lazy-mount sections beyond the initial viewport (Roadmap C7).
    // First N sections render eagerly; beyond N, each card is wrapped
    // in a `oriel-lazy-card` that defers mounting until the
    // IntersectionObserver fires. Threshold default 3 sections.
    // Opt-out via `dashboardConfig.lazy_sections: false`.
    const lazyEnabled = dashboardConfig.lazy_sections !== false;
    const lazyThreshold = dashboardConfig.lazy_sections_threshold ?? 3;
    if (lazyEnabled && overviewSections.length > lazyThreshold) {
      for (let i = lazyThreshold; i < overviewSections.length; i++) {
        const section = overviewSections[i];
        if (!section?.cards) continue;
        section.cards = section.cards.map((card) => {
          // Heading cards stay eager — they're tiny and headings being
          // visible-but-deferred would create a "stub" effect.
          if (card.type === 'heading') return card;
          return {
            type: 'custom:oriel-lazy-card',
            card,
          } as LovelaceCardConfig;
        });
      }
    }

    // Routines section — when `show_routines_section: true`, append
    // a `oriel-routines-card` (auto-collects scene + script entities
    // ranked by last_changed). Skipped silently if no routines exist.
    if (dashboardConfig.show_routines_section === true) {
      overviewSections.push({
        type: 'grid',
        cards: [
          {
            type: 'heading',
            heading: localize('sections.routines') || 'Routines',
            heading_style: 'title',
            icon: 'mdi:script-text-play',
          },
          {
            type: 'custom:oriel-routines-card',
            max: dashboardConfig.routines_max ?? 8,
            grid_options: { columns: 'full', rows: 'auto' },
          } as LovelaceCardConfig,
        ],
      });
    }

    // Notification banner — prepend a `oriel-notification-card` to
    // the overview when notification_triggers are configured. The
    // card auto-hides when no trigger is active, sticky-positions
    // itself when something fires. Always emitted (cost is one tiny
    // custom element that renders nothing when idle).
    if (
      Array.isArray(dashboardConfig.notification_triggers) &&
      dashboardConfig.notification_triggers.length > 0
    ) {
      overviewSections.unshift({
        type: 'grid',
        cards: [
          {
            type: 'custom:oriel-notification-card',
            triggers: dashboardConfig.notification_triggers,
            grid_options: { columns: 'full', rows: 'auto' },
          } as LovelaceCardConfig,
        ],
      });
    }

    // Bubble Card pop-up registrations — when `use_bubble_drawers` is
    // enabled AND `bubble-card` is loaded, emit one pop-up definition
    // per actionable entity (light / climate / cover / fan / media_player).
    // Pop-ups are invisible until their hash is active, so adding them
    // here doesn't change the visible overview. The strategy's emitted
    // tiles keep their existing tap_action (more-info) — full tile
    // rewiring is deferred to a later patch to avoid breaking users
    // who haven't tested bubble-card with the rest of their dashboard.
    if (dashboardConfig.use_bubble_drawers === true) {
      const { isBubbleCardInstalled, buildBubblePopupCards, collectBubbleCandidates } =
        await import('../utils/bubble-integration');
      if (isBubbleCardInstalled()) {
        const candidates = collectBubbleCandidates(hass);
        const popupCards = buildBubblePopupCards(candidates, hass);
        if (popupCards.length > 0) {
          overviewSections.push({
            type: 'grid',
            cards: popupCards,
          });
        }
      }
    }

    // Plugin extension sections (v3.5.0) — append plugin-contributed
    // sections at the end of the overview. Each plugin's build()
    // failures are caught + logged inside buildExtensionSections so
    // a buggy plugin never breaks the dashboard. Badges live in a
    // separate array that's merged into the final return statement.
    const pluginBadges: LovelaceBadgeConfig[] = [];
    try {
      const { buildExtensionSections, buildExtensionBadges } = await import(
        '../extension/registry'
      );
      const pluginSections = await buildExtensionSections({ hass, dashboardConfig });
      for (const s of pluginSections) overviewSections.push(s);
      const extBadges = await buildExtensionBadges({ hass, dashboardConfig });
      for (const b of extBadges) pluginBadges.push(b);
    } catch (err) {
      debugLog('extension registry import failed', err);
    }

    // Voice FAB (v3.2.4) — when `show_voice_fab: true`, append a
    // floating mic button to the overview. The card is position:fixed
    // so it floats over the layout; sections is just a mount point.
    if (dashboardConfig.show_voice_fab === true) {
      overviewSections.push({
        type: 'grid',
        cards: [
          {
            type: 'custom:oriel-voice-fab',
            grid_options: { columns: 'full', rows: 0 },
          } as LovelaceCardConfig,
        ],
      });
    }

    // Wall-panel screensaver — when `panel_mode: 'wall'`, append a
    // single full-screen screensaver card to the overview. The card
    // itself is `position: fixed` so it sits above everything; the
    // section is just a container so HA mounts it. Idle minutes +
    // optional entity come from the strategy config.
    if (dashboardConfig.panel_mode === 'wall') {
      overviewSections.push({
        type: 'grid',
        cards: [
          {
            type: 'custom:oriel-screensaver-card',
            idle_minutes: dashboardConfig.panel_screensaver_after_minutes ?? 5,
            ...(dashboardConfig.panel_screensaver_entity
              ? { entity: dashboardConfig.panel_screensaver_entity }
              : {}),
            grid_options: { columns: 'full', rows: 0 },
          } as LovelaceCardConfig,
        ],
      });
    }

    const totalCards = overviewSections.reduce((sum, s) => sum + (s.cards?.length || 0), 0);
    timeEnd('overview-generate');
    debugLog(`Overview: ${overviewSections.length} sections, ${totalCards} cards, ${personBadges.length} badges`);

    // Custom badges from YAML config
    const customBadges = (dashboardConfig.custom_badges || [])
      .filter((b) => b.parsed_config)
      .map((b) => b.parsed_config as LovelaceBadgeConfig);

    // Optional live power badge — auto-hide when entity missing
    const powerBadges: LovelaceBadgeConfig[] = [];
    const powerEntity = dashboardConfig.power_badge_entity;
    if (powerEntity && hass.states[powerEntity]) {
      powerBadges.push({
        type: 'entity',
        entity: powerEntity,
        show_name: false,
        color: 'orange',
      });
    }

    // Optional "unavailable entities" alert badge — count entities whose
    // state is "unavailable", skipping ones the user hid (no_dboard label,
    // hidden_by, or hidden via Registry config). Auto-hide at zero.
    const alertBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_unavailable_alert_badge === true) {
      let count = 0;
      let someSensorId: string | undefined;
      for (const [entityId, state] of Object.entries(hass.states)) {
        if (state.state !== 'unavailable') continue;
        if (Registry.isExcludedByLabel(entityId)) continue;
        if (Registry.isHiddenByConfig(entityId)) continue;
        const entry = Registry.getEntity(entityId);
        if (entry?.hidden) continue;
        if (!someSensorId) someSensorId = entityId;
        count++;
      }
      if (count > 0 && someSensorId) {
        alertBadges.push({
          type: 'entity',
          entity: someSensorId,
          name: String(count),
          icon: 'mdi:alert-circle-outline',
          color: 'red',
          show_state: false,
        });
      }
    }

    // Optional "now playing" badge — first media_player in 'playing' state
    const nowPlayingBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_now_playing_badge === true) {
      const playing = Registry.getVisibleEntityIdsForDomain('media_player').find((id) => {
        const st = Reflect.get(hass.states as Record<string, unknown>, id) as { state?: string } | undefined;
        return st?.state === 'playing';
      });
      if (playing) {
        nowPlayingBadges.push({
          type: 'entity',
          entity: playing,
          icon: 'mdi:play-circle',
          color: 'green',
          show_state: false,
          tap_action: { action: 'more-info' },
        });
      }
    }

    // Optional "pending updates count" badge — Registry-filtered update.* in state 'on'.
    const updatesBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_updates_badge === true) {
      let count = 0;
      let firstId: string | undefined;
      for (const id of Registry.getVisibleEntityIdsForDomain('update')) {
        const st = Reflect.get(hass.states as Record<string, unknown>, id) as { state?: string } | undefined;
        if (st?.state === 'on') {
          count++;
          if (!firstId) firstId = id;
        }
      }
      if (count > 0 && firstId) {
        updatesBadges.push({
          type: 'entity',
          entity: firstId,
          name: String(count),
          icon: 'mdi:update',
          color: 'orange',
          show_state: false,
          tap_action: { action: 'navigate', navigation_path: '/config/updates' },
        });
      }
    }

    // Optional house-mode badge — typically an input_select.house_mode
    // (At Home / Away / Holiday). Renders the current state right in the
    // header so the user can see — and tap to change — without opening
    // any submenu. Auto-hide when the configured entity is missing.
    const houseModeBadges: LovelaceBadgeConfig[] = [];
    const houseModeEntity = dashboardConfig.house_mode_entity;
    if (
      houseModeEntity &&
      Reflect.get(hass.states as Record<string, unknown>, houseModeEntity)
    ) {
      houseModeBadges.push({
        type: 'entity',
        entity: houseModeEntity,
        show_name: false,
        show_state: true,
        icon: dashboardConfig.house_mode_icon || 'mdi:home-account',
        color: 'accent',
        tap_action: { action: 'more-info' },
      });
    }

    // Optional sun badge — shows sun.sun with next sunrise/sunset
    // (state_content auto-picks next_dawn/next_dusk from HA's sun integration).
    // Auto-hide when no sun.sun entity present.
    const sunBadges: LovelaceBadgeConfig[] = [];
    const sunState = Reflect.get(hass.states as Record<string, unknown>, 'sun.sun') as { state?: string } | undefined;
    if (dashboardConfig.show_sun_badge === true && sunState) {
      const isAbove = sunState.state === 'above_horizon';
      sunBadges.push({
        type: 'entity',
        entity: 'sun.sun',
        name: '',
        icon: isAbove ? 'mdi:weather-sunset-down' : 'mdi:weather-sunset-up',
        color: isAbove ? 'amber' : 'indigo',
        tap_action: { action: 'more-info' },
      });
    }

    return createOverviewView(overviewSections, [
      ...personBadges,
      ...houseModeBadges,
      ...powerBadges,
      ...alertBadges,
      ...nowPlayingBadges,
      ...updatesBadges,
      ...sunBadges,
      ...customBadges,
      ...pluginBadges,
    ]);
  }
}

customElements.define('ll-strategy-view-oriel-overview', OrielViewOverview);
