// ====================================================================
// ENTITY FILTER — Central entity filtering utilities
// ====================================================================
// Uses Registry for pre-computed exclusion sets and Maps.
// Replaces the scattered filtering logic from data-collectors.js.
// ====================================================================

import { Registry } from '../Registry';
import type { HomeAssistant } from '../types/homeassistant';
import type { Simon42StrategyConfig, PersonData } from '../types/strategy';

/**
 * Collects person entities with home/away state.
 * Uses pre-filtered Registry method — no manual exclusion checks needed.
 */
export function collectPersons(hass: HomeAssistant, config: Simon42StrategyConfig): PersonData[] {
  const personIds = Registry.getVisibleEntityIdsForDomain('person');

  return personIds
    .filter((id) => !!hass.states[id])
    .map((id) => {
      const state = hass.states[id];
      return {
        entity_id: id,
        name: state.attributes?.friendly_name || id.split('.')[1],
        state: state.state,
        isHome: state.state === 'home',
      };
    });
}

/**
 * Finds the first available weather entity.
 * Uses pre-filtered Registry method — no manual exclusion checks needed.
 */
export function findWeatherEntity(hass: HomeAssistant): string | undefined {
  const weatherIds = Registry.getVisibleEntityIdsForDomain('weather');
  return weatherIds.find((id) => !!hass.states[id]);
}

/**
 * Finds a dummy sensor entity for tile card color rendering.
 * Uses pre-filtered Registry method — no manual exclusion checks needed.
 * Cached per call — should only be called once per generate().
 */
export function findDummySensor(hass: HomeAssistant): string {
  const sensorIds = Registry.getVisibleEntityIdsForDomain('sensor');
  for (const id of sensorIds) {
    const state = hass.states[id];
    if (!state) continue;
    if (state.state === 'unavailable' || state.state === 'unknown') continue;
    return id;
  }
  // Fallback: try any visible light
  const lightIds = Registry.getVisibleEntityIdsForDomain('light');
  for (const id of lightIds) {
    const state = hass.states[id];
    if (state) return id;
  }
  return 'sun.sun';
}
