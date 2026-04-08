// ====================================================================
// VIEW STRATEGY — SECURITY (Locks, Doors, Garages, Windows)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig, LovelaceCardConfig, LovelaceSectionConfig } from '../types/lovelace';
import { Registry } from '../Registry';

class Simon42ViewSecurityStrategy extends HTMLElement {
  static async generate(config: any, hass: HomeAssistant): Promise<LovelaceViewConfig> {
    // Ensure Registry is initialized (idempotent — no-op if already done)
    Registry.initialize(hass, config.config || {});

    // Use pre-filtered visible entities from Registry
    // Covers lock, cover, binary_sensor domains across all areas
    const allVisibleByDomain = (domain: string) => Registry.getVisibleEntityIdsForDomain(domain);

    // Categorize entities
    const locks: string[] = [];
    const doors: string[] = [];
    const garages: string[] = [];
    const windows: string[] = [];

    for (const id of [
      ...allVisibleByDomain('lock'),
      ...allVisibleByDomain('cover'),
      ...allVisibleByDomain('binary_sensor'),
    ]) {
      if (!hass.states[id]) continue;

      const state = hass.states[id];
      const deviceClass = state.attributes?.device_class;

      if (id.startsWith('lock.')) {
        locks.push(id);
      } else if (id.startsWith('cover.')) {
        if (deviceClass === 'garage') garages.push(id);
        else if (deviceClass === 'door' || deviceClass === 'gate') doors.push(id);
      } else if (id.startsWith('binary_sensor.')) {
        if (deviceClass && ['door', 'window', 'garage_door', 'opening'].includes(deviceClass)) windows.push(id);
      }
    }

    const sections: LovelaceSectionConfig[] = [];

    // Locks
    if (locks.length > 0) {
      const unlocked = locks.filter((e) => hass.states[e]?.state === 'unlocked');
      const locked = locks.filter((e) => hass.states[e]?.state === 'locked');
      const cards: LovelaceCardConfig[] = [];

      if (unlocked.length > 0) {
        cards.push({
          type: 'heading',
          heading: '🔓 Schlösser - Entriegelt',
          heading_style: 'subtitle',
          badges: [
            {
              type: 'entity',
              entity: unlocked[0],
              show_name: false,
              show_state: false,
              tap_action: { action: 'perform-action', perform_action: 'lock.lock', target: { entity_id: unlocked } },
              icon: 'mdi:lock',
            },
          ],
        });
        cards.push(
          ...unlocked.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'lock-commands' }],
            state_content: 'last_changed',
          }))
        );
      }
      if (locked.length > 0) {
        cards.push({ type: 'heading', heading: '🔒 Schlösser - Verriegelt', heading_style: 'subtitle' });
        cards.push(
          ...locked.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'lock-commands' }],
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Doors/Gates
    if (doors.length > 0) {
      const open = doors.filter((e) => hass.states[e]?.state === 'open');
      const closed = doors.filter((e) => hass.states[e]?.state === 'closed');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({
          type: 'heading',
          heading: '🚪 Türen & Tore - Offen',
          heading_style: 'subtitle',
          badges: [
            {
              type: 'entity',
              entity: open[0],
              show_name: false,
              show_state: false,
              tap_action: {
                action: 'perform-action',
                perform_action: 'cover.close_cover',
                target: { entity_id: open },
              },
              icon: 'mdi:arrow-down',
            },
          ],
        });
        cards.push(
          ...open.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: '🚪 Türen & Tore - Geschlossen', heading_style: 'subtitle' });
        cards.push(
          ...closed.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Garages
    if (garages.length > 0) {
      const open = garages.filter((e) => hass.states[e]?.state === 'open');
      const closed = garages.filter((e) => hass.states[e]?.state === 'closed');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({
          type: 'heading',
          heading: '🏠 Garagen - Offen',
          heading_style: 'subtitle',
          badges: [
            {
              type: 'entity',
              entity: open[0],
              show_name: false,
              show_state: false,
              tap_action: {
                action: 'perform-action',
                perform_action: 'cover.close_cover',
                target: { entity_id: open },
              },
              icon: 'mdi:arrow-down',
            },
          ],
        });
        cards.push(
          ...open.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: '🏠 Garagen - Geschlossen', heading_style: 'subtitle' });
        cards.push(
          ...closed.map((e) => ({
            type: 'tile',
            entity: e,
            features: [{ type: 'cover-open-close' }],
            features_position: 'inline',
            state_content: 'last_changed',
          }))
        );
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    // Windows/Openings
    if (windows.length > 0) {
      const open = windows.filter((e) => hass.states[e]?.state === 'on');
      const closed = windows.filter((e) => hass.states[e]?.state === 'off');
      const cards: LovelaceCardConfig[] = [];

      if (open.length > 0) {
        cards.push({ type: 'heading', heading: '🪟 Fenster & Öffnungen - Offen', heading_style: 'subtitle' });
        cards.push(...open.map((e) => ({ type: 'tile', entity: e, state_content: 'last_changed' })));
      }
      if (closed.length > 0) {
        cards.push({ type: 'heading', heading: '🪟 Fenster & Öffnungen - Geschlossen', heading_style: 'subtitle' });
        cards.push(...closed.map((e) => ({ type: 'tile', entity: e, state_content: 'last_changed' })));
      }
      if (cards.length > 0) sections.push({ type: 'grid', cards });
    }

    return { type: 'sections', sections };
  }
}

customElements.define('ll-strategy-simon42-view-security', Simon42ViewSecurityStrategy);
