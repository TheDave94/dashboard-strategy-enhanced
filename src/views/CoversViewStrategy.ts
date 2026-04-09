// ====================================================================
// VIEW STRATEGY — COVERS (reactive group cards)
// ====================================================================

import type { LovelaceViewConfig } from '../types/lovelace';

class Simon42ViewCoversStrategy extends HTMLElement {
  static async generate(config: any, _hass: any): Promise<LovelaceViewConfig> {
    const strategyConfig = config.config || {};
    const showPartiallyOpen = strategyConfig.show_partially_open_covers === true;

    // Separate awnings from other covers — awnings have inverted open/close semantics
    const allDeviceClasses = config.device_classes || ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'];
    const coverClasses = allDeviceClasses.filter((dc: string) => dc !== 'awning');
    const hasAwnings = allDeviceClasses.includes('awning');

    const baseConfig = { entities: config.entities, config: config.config };

    // Rollos & Vorhänge
    const cards: any[] = [
      {
        type: 'custom:simon42-covers-group-card',
        ...baseConfig,
        device_classes: coverClasses,
        group_type: 'open',
        show_partially_open: showPartiallyOpen,
      },
    ];

    if (showPartiallyOpen) {
      cards.push({
        type: 'custom:simon42-covers-group-card',
        ...baseConfig,
        device_classes: coverClasses,
        group_type: 'partially_open',
        show_partially_open: true,
      });
    }

    cards.push({
      type: 'custom:simon42-covers-group-card',
      ...baseConfig,
      device_classes: coverClasses,
      group_type: 'closed',
      show_partially_open: showPartiallyOpen,
    });

    // Markisen (separate group with own headings/batch actions)
    if (hasAwnings) {
      const awningConfig = {
        ...baseConfig,
        device_classes: ['awning'],
        heading_open: 'Ausgefahrene Markisen',
        heading_closed: 'Eingefahrene Markisen',
        heading_partial: 'Teilweise ausgefahrene Markisen',
        batch_open_text: 'Alle ausfahren',
        batch_close_text: 'Alle einfahren',
      };

      cards.push({
        type: 'custom:simon42-covers-group-card',
        ...awningConfig,
        group_type: 'open',
        show_partially_open: showPartiallyOpen,
      });

      if (showPartiallyOpen) {
        cards.push({
          type: 'custom:simon42-covers-group-card',
          ...awningConfig,
          group_type: 'partially_open',
          show_partially_open: true,
        });
      }

      cards.push({
        type: 'custom:simon42-covers-group-card',
        ...awningConfig,
        group_type: 'closed',
        show_partially_open: showPartiallyOpen,
      });
    }

    return {
      type: 'sections',
      sections: [{ type: 'grid', cards }],
    };
  }
}

customElements.define('ll-strategy-simon42-view-covers', Simon42ViewCoversStrategy);
