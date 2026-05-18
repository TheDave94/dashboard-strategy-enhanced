// ====================================================================
// VIEW STRATEGY — OVERVIEW (main dashboard view)
// ====================================================================
// Extracted from the dashboard entry point so HA can resolve this view
// concurrently with other view strategies via Promise.all, enabling
// progressive rendering instead of blocking on Registry init.
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, SectionKey, CustomCard } from '../types/strategy';
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
import { createOverviewView } from '../utils/view-builder';
import { timeStart, timeEnd, debugLog } from '../utils/debug';

/**
 * Normalizes a sections_order array: removes invalid/duplicate keys,
 * appends any missing keys at the end (forward compatibility).
 */
function normalizeSectionsOrder(order: SectionKey[]): SectionKey[] {
  const validKeys = new Set<SectionKey>(['overview', 'custom_cards', 'areas', 'weather', 'energy', 'plants']);
  const validKeys = new Set<SectionKey>(['overview', 'custom_cards', 'areas', 'weather', 'energy', 'agenda']);
  const validKeys = new Set<SectionKey>(['overview', 'custom_cards', 'areas', 'weather', 'energy', 'todos']);
  const validKeys = new Set<SectionKey>(['overview', 'custom_cards', 'areas', 'weather', 'energy', 'persons']);
  const validKeys = new Set<SectionKey>(['overview', 'custom_cards', 'areas', 'weather', 'energy', 'vacuums']);
  const seen = new Set<SectionKey>();
  const result: SectionKey[] = [];
  for (const key of order) {
    if (validKeys.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  for (const key of DEFAULT_SECTIONS_ORDER) {
    if (!seen.has(key)) result.push(key);
  }
  return result;
}

/**
 * If the card gates its own visibility via a `conditional` wrapper or an
 * explicit `visibility:` block, return the condition list so the strategy
 * can mirror it onto a sibling heading. Returns undefined for plain cards.
 *
 * Without this, a hidden conditional custom card leaves an orphaned title
 * visible — see issue #224.
 */
function inheritVisibilityFromCard(parsedConfig: unknown): unknown[] | undefined {
  if (!parsedConfig || typeof parsedConfig !== 'object') return undefined;
  const pc = parsedConfig as { type?: string; conditions?: unknown; visibility?: unknown };
  if (pc.type === 'conditional' && Array.isArray(pc.conditions)) return pc.conditions;
  if (Array.isArray(pc.visibility)) return pc.visibility;
  return undefined;
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

class Simon42ViewOverviewStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    timeStart('overview-generate');
    const dashboardConfig: Simon42StrategyConfig = config.dashboardConfig || {};

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
      // eslint-disable-next-line security/detect-object-injection -- entity ID is user-picked from the editor weather.* dropdown
      configuredWeather && hass.states[configuredWeather]
        ? configuredWeather
        : findWeatherEntity(hass);
    const someSensorId = findDummySensor(hass);

    // Person badges (default-on; user can suppress via config to swap in
    // their own person badges through custom_badges instead)
    const showPersonBadges = dashboardConfig.show_person_badges !== false;
    const personBadges = showPersonBadges ? createPersonBadges(persons, hass) : [];

    // Config flags
    const showWeather = dashboardConfig.show_weather !== false;
    const showEnergy = dashboardConfig.show_energy !== false;
    const showSearchCard = dashboardConfig.show_search_card === true;
    const groupByFloors = dashboardConfig.group_by_floors === true;

    // Group custom cards by target section
    const allCustomCards = dashboardConfig.custom_cards || [];
    const customCardsBySection = new Map<SectionKey, CustomCard[]>();
    for (const card of allCustomCards) {
      const target = card.target_section || 'custom_cards';
      const list = customCardsBySection.get(target) || [];
      list.push(card);
      customCardsBySection.set(target, list);
    }

    // Hidden section headings (per-section opt-in)
    const hiddenHeadings = new Set(dashboardConfig.hidden_section_headings || []);

    // Build sections
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

    // Section map: key → section(s) or null
    const sectionMap = new Map<SectionKey, LovelaceSectionConfig | LovelaceSectionConfig[] | null>([
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
          dashboardConfig.weather_presentation
        ),
      ],
      [
        'energy',
        createEnergySection(
          showEnergy,
          dashboardConfig.energy_link_dashboard !== false,
          dashboardConfig.show_energy_distribution_card !== false
        ),
      ],
      ['weather', createWeatherSection(weatherEntity ?? null, showWeather, hiddenHeadings.has('weather'))],
      ['energy', createEnergySection(showEnergy, dashboardConfig.energy_link_dashboard !== false, hiddenHeadings.has('energy'))],
      ['weather', createWeatherSection(weatherEntity ?? null, showWeather)],
      ['energy', createEnergySection(showEnergy, dashboardConfig.energy_link_dashboard !== false)],
      ['plants', createPlantsSection(hass, dashboardConfig.show_plants_section === true)],
      ['agenda', createAgendaSection(
        hass,
        dashboardConfig.show_agenda_section === true,
        dashboardConfig.agenda_calendar_entities,
      )],
      ['todos', createTodosSection(hass, dashboardConfig.show_todos_section === true, dashboardConfig.todos_entities)],
      ['persons', createPersonsSection(hass, dashboardConfig.show_persons_section === true)],
      ['vacuums', createVacuumsSection(hass, dashboardConfig.show_vacuums_section === true)],
    ]);

    // Assemble in configured order, appending assigned custom cards to each section
    const sectionsOrder = normalizeSectionsOrder(dashboardConfig.sections_order ?? DEFAULT_SECTIONS_ORDER);
    const overviewSections: LovelaceSectionConfig[] = [];
    for (const key of sectionsOrder) {
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
            if (lastSection.cards) {
              lastSection.cards.push(...extraCards);
            }
          }
        }
      }
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
    // eslint-disable-next-line security/detect-object-injection -- entity ID is user-picked from the editor sensor dropdown
    if (powerEntity && hass.states[powerEntity]) {
      powerBadges.push({
        type: 'entity',
        entity: powerEntity,
        show_name: false,
        color: 'orange',
      });
    }

    return createOverviewView(overviewSections, [...personBadges, ...powerBadges, ...customBadges]);
    // Optional "unavailable entities" alert badge — count entities whose
    // state is "unavailable", skipping ones the user hid (no_dboard label,
    // hidden_by, or hidden via Registry config). Auto-hide at zero.
    const alertBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_unavailable_alert_badge === true) {
      let count = 0;
      for (const [entityId, state] of Object.entries(hass.states)) {
        if (state.state !== 'unavailable') continue;
        if (Registry.isExcludedByLabel(entityId)) continue;
        if (Registry.isHiddenByConfig(entityId)) continue;
        const entry = Registry.getEntity(entityId);
        if (entry?.hidden) continue;
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
    // Optional "now playing" badge — first media_player in 'playing' state
    const nowPlayingBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_now_playing_badge === true) {
      const playing = Registry.getVisibleEntityIdsForDomain('media_player').find((id) => {
        // eslint-disable-next-line security/detect-object-injection -- entity IDs from Registry
        return hass.states[id]?.state === 'playing';
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

    return createOverviewView(overviewSections, [...personBadges, ...alertBadges, ...customBadges]);
    return createOverviewView(overviewSections, [...personBadges, ...nowPlayingBadges, ...customBadges]);
    // Optional sun badge — shows sun.sun with next sunrise/sunset
    // (state_content auto-picks next_dawn/next_dusk from HA's sun integration).
    // Auto-hide when no sun.sun entity present.
    const sunBadges: LovelaceBadgeConfig[] = [];
    if (dashboardConfig.show_sun_badge === true && hass.states['sun.sun']) {
      const isAbove = hass.states['sun.sun'].state === 'above_horizon';
      sunBadges.push({
        type: 'entity',
        entity: 'sun.sun',
        name: '',
        icon: isAbove ? 'mdi:weather-sunset-down' : 'mdi:weather-sunset-up',
        color: isAbove ? 'amber' : 'indigo',
        tap_action: { action: 'more-info' },
      });
    }

    return createOverviewView(overviewSections, [...personBadges, ...sunBadges, ...customBadges]);
  }
}

customElements.define('ll-strategy-simon42-view-overview', Simon42ViewOverviewStrategy);
