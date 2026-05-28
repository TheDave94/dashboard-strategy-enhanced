// ====================================================================
// VIEW STRATEGY — COVERS (reactive group cards)
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type { LovelaceViewConfig } from '../types/lovelace';
import type { OrielConfig } from '../types/strategy';
import { localize } from '../utils/localize';
import { resolveDensity } from '../utils/density';
import { isBubbleCardInstalled } from '../utils/bubble-integration';

interface CoversViewStrategyParams {
  entities?: string[];
  device_classes?: string[];
  config?: OrielConfig;
}

class OrielViewCovers extends HTMLElement {
  static async generate(
    config: CoversViewStrategyParams,
    _hass: HomeAssistant,
  ): Promise<LovelaceViewConfig> {
    const strategyConfig: OrielConfig = config.config || {};
    const showPartiallyOpen = strategyConfig.show_partially_open_covers === true;
    const groupByFloors = strategyConfig.group_covers_by_floors === true;

    // Separate awnings and windows from other covers — they have different semantics
    const allDeviceClasses = config.device_classes || ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window'];
    const coverClasses = allDeviceClasses.filter((dc: string) => dc !== 'awning' && dc !== 'window');
    const hasAwnings = allDeviceClasses.includes('awning');
    const hasWindows = allDeviceClasses.includes('window');

    const density = resolveDensity(strategyConfig);
    const bubbleEnabled =
      strategyConfig.use_bubble_drawers === true && isBubbleCardInstalled();
    const baseConfig = {
      entities: config.entities,
      config: config.config,
      ...(density ? { density } : {}),
      ...(bubbleEnabled ? { bubble_drawers: true } : {}),
    };

    // Rollos & Vorhänge
    const cards: any[] = [
      {
        type: 'custom:oriel-covers-group-card',
        ...baseConfig,
        device_classes: coverClasses,
        group_type: 'open',
        show_partially_open: showPartiallyOpen,
        group_by_floors: groupByFloors,
      },
    ];

    if (showPartiallyOpen) {
      cards.push({
        type: 'custom:oriel-covers-group-card',
        ...baseConfig,
        device_classes: coverClasses,
        group_type: 'partially_open',
        show_partially_open: true,
        group_by_floors: groupByFloors,
      });
    }

    cards.push({
      type: 'custom:oriel-covers-group-card',
      ...baseConfig,
      device_classes: coverClasses,
      group_type: 'closed',
      show_partially_open: showPartiallyOpen,
      group_by_floors: groupByFloors,
    });

    // Markisen (separate group with own headings/batch actions)
    if (hasAwnings) {
      const awningConfig = {
        ...baseConfig,
        device_classes: ['awning'],
        heading_open: localize('covers.awnings_open'),
        heading_closed: localize('covers.awnings_closed'),
        heading_partial: localize('covers.awnings_partial'),
        batch_open_text: localize('covers.awnings_open_all'),
        batch_close_text: localize('covers.awnings_close_all'),
        icon_open: strategyConfig.awning_icon_open || 'mdi:storefront-outline',
        icon_closed: strategyConfig.awning_icon_closed || 'mdi:storefront',
        icon_partial: strategyConfig.awning_icon_partial || 'mdi:storefront-outline',
      };

      cards.push({
        type: 'custom:oriel-covers-group-card',
        ...awningConfig,
        group_type: 'open',
        show_partially_open: showPartiallyOpen,
      });

      if (showPartiallyOpen) {
        cards.push({
          type: 'custom:oriel-covers-group-card',
          ...awningConfig,
          group_type: 'partially_open',
          show_partially_open: true,
        });
      }

      cards.push({
        type: 'custom:oriel-covers-group-card',
        ...awningConfig,
        group_type: 'closed',
        show_partially_open: showPartiallyOpen,
      });
    }

    // Fenster (separate group — windows are not shading)
    if (hasWindows) {
      const windowConfig = {
        ...baseConfig,
        device_classes: ['window'],
        heading_open: localize('covers.windows_open'),
        heading_closed: localize('covers.windows_closed'),
        heading_partial: localize('covers.windows_partial'),
        batch_open_text: localize('covers.windows_open_all'),
        batch_close_text: localize('covers.windows_close_all'),
      };

      cards.push({
        type: 'custom:oriel-covers-group-card',
        ...windowConfig,
        group_type: 'open',
        show_partially_open: showPartiallyOpen,
      });

      if (showPartiallyOpen) {
        cards.push({
          type: 'custom:oriel-covers-group-card',
          ...windowConfig,
          group_type: 'partially_open',
          show_partially_open: true,
        });
      }

      cards.push({
        type: 'custom:oriel-covers-group-card',
        ...windowConfig,
        group_type: 'closed',
        show_partially_open: showPartiallyOpen,
      });
    }

    // One group card per SECTION — HA lays sections out side-by-side
    // (responsive, wrapping on narrow), each at full section width. Putting
    // multiple group cards in a single width-capped section squeezed and
    // overlapped them; separate sections give each group its own column.
    return {
      type: 'sections',
      sections: cards.map((c) => ({ type: 'grid', cards: [c] })),
    };
  }
}

customElements.define('ll-strategy-view-oriel-covers', OrielViewCovers);
