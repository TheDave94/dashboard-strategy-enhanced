// ====================================================================
// Live preview panel (F-5, v4.6.0)
// ====================================================================
// Debounced re-render of `Oriel.generate()` output as the user edits.
// Shows two things side by side with the editor:
//
//   1. A glanceable summary line: view count, section count, card
//      count, generation time
//   2. The full emitted YAML — clipped to a height-bounded
//      <pre> so the panel doesn't push the editor off-screen
//
// First cut intentionally text-only. A real visual preview would need
// to render a sandboxed <hui-view> which HA doesn't expose as an
// embeddable component, so we ship the structure-level preview now
// and revisit visual rendering later if there's signal for it.
//
// Debounce: 500ms. The perf benchmark pins generate() at ~80ms on a
// 300-entity fixture, so 500ms leaves comfortable headroom — we never
// queue more than one pending render even when the user mashes
// keystrokes in a YAML textarea.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import yaml from 'js-yaml';
import type { HomeAssistant } from '../types/homeassistant';
import type { OrielConfig } from '../types/strategy';
import type { LovelaceConfig, LovelaceViewConfig } from '../types/lovelace';
import { localize } from '../utils/localize';

const DEBOUNCE_MS = 500;
const PREVIEW_MAX_HEIGHT_PX = 480;

export interface LivePreviewState {
  /** Whether the panel is currently visible. */
  visible: boolean;
  /** Last computed preview output. */
  result?: {
    yaml: string;
    summary: { views: number; sections: number; cards: number; ms: number };
  };
  /** Error from the most recent generate() call. */
  error?: string;
  /** Whether a generate() call is currently in flight. */
  busy: boolean;
}

export interface LivePreviewContext {
  hass: HomeAssistant;
  config: OrielConfig;
  state: LivePreviewState;
  onTogglePanel: () => void;
}

export function renderLivePreviewToggle(ctx: LivePreviewContext): TemplateResult {
  return html`
    <button
      class="btn-secondary"
      title=${localize('editor.live_preview_toggle_help') ||
        'Show the YAML that would be emitted for the current config'}
      @click=${ctx.onTogglePanel}
    >
      <ha-icon icon=${ctx.state.visible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} style="--mdc-icon-size: 18px; margin-right: 4px;"></ha-icon>
      ${ctx.state.visible
        ? localize('editor.live_preview_hide') || 'Hide preview'
        : localize('editor.live_preview_show') || 'Show preview'}
    </button>
  `;
}

export function renderLivePreviewPanel(ctx: LivePreviewContext): TemplateResult | typeof nothing {
  if (!ctx.state.visible) return nothing;

  return html`
    <div
      class="section"
      style="position: sticky; top: 8px; max-height: calc(100vh - 32px); overflow-y: auto;"
    >
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"
      >
        <div class="section-title">
          ${localize('editor.live_preview_title') || 'Live preview'}
        </div>
        ${ctx.state.busy
          ? html`<ha-icon
              icon="mdi:loading"
              style="--mdc-icon-size: 18px; animation: spin 1s linear infinite;"
            ></ha-icon>`
          : nothing}
      </div>

      ${ctx.state.error
        ? html`<div
            style="background: color-mix(in srgb, var(--error-color) 12%, transparent); border: 1px solid var(--error-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; color: var(--error-color); font-size: 0.85rem;"
          >
            ${ctx.state.error}
          </div>`
        : nothing}

      ${ctx.state.result
        ? html`
            <div
              style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;"
            >
              ${renderStat(localize('editor.live_preview_views') || 'Views', ctx.state.result.summary.views)}
              ${renderStat(localize('editor.live_preview_sections') || 'Sections', ctx.state.result.summary.sections)}
              ${renderStat(localize('editor.live_preview_cards') || 'Cards', ctx.state.result.summary.cards)}
              ${renderStat(
                localize('editor.live_preview_ms') || 'ms',
                `${ctx.state.result.summary.ms.toFixed(0)}`,
              )}
            </div>
            <pre
              style="max-height: ${PREVIEW_MAX_HEIGHT_PX}px; overflow: auto; background: var(--code-editor-background-color, var(--card-background-color)); border: 1px solid var(--divider-color); border-radius: 4px; padding: 8px; margin: 0; font-size: 0.78rem; line-height: 1.4;"
            >${ctx.state.result.yaml}</pre>
          `
        : ctx.state.busy
          ? nothing
          : html`<div class="description">
              ${localize('editor.live_preview_pending') || 'Waiting for first config change…'}
            </div>`}
    </div>
  `;
}

function renderStat(label: string, value: number | string): TemplateResult {
  return html`
    <div
      style="text-align: center; padding: 6px 4px; border: 1px solid var(--divider-color); border-radius: 4px;"
    >
      <div style="font-size: 1.1rem; font-weight: 500;">${value}</div>
      <div style="font-size: 0.7rem; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.05em;">
        ${label}
      </div>
    </div>
  `;
}

// ====================================================================
// Debounced generator
// ====================================================================

/** Encapsulates the debounce timer + last-config tracking so the
 *  editor can call `schedule(config, hass)` on every change without
 *  thrashing. The returned `cancel()` is called on unmount. */
export class LivePreviewRunner {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inflight = false;
  private latestConfig?: OrielConfig;
  private latestHass?: HomeAssistant;

  constructor(
    private readonly onResult: (
      result: LivePreviewState['result'],
      error: string | undefined,
    ) => void,
    private readonly onBusy: (busy: boolean) => void,
  ) {}

  schedule(config: OrielConfig, hass: HomeAssistant): void {
    this.latestConfig = config;
    this.latestHass = hass;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, DEBOUNCE_MS);
  }

  cancel(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private async run(): Promise<void> {
    if (this.inflight || !this.latestConfig || !this.latestHass) return;
    this.inflight = true;
    this.onBusy(true);
    const t0 = performance.now();
    try {
      // Resolve the strategy via the customElements registry. An earlier
      // version of this file used `await import('../oriel')` for the
      // appeal of lazy-loading the strategy chunk, but that path was
      // abandoned: the strategy is the entry point that defines the
      // editor's own custom element, so by the time any editor code
      // (including this preview) runs, the strategy class is already
      // registered. The customElements path is synchronous, dependency-
      // free, and pins the right contract — both sides ship together.
      const StrategyClass = customElements.get('ll-strategy-dashboard-oriel') as
        | { generate(config: OrielConfig, hass: HomeAssistant): Promise<LovelaceConfig> }
        | undefined;
      if (!StrategyClass) {
        throw new Error('Oriel strategy element not registered yet');
      }
      const generated = await StrategyClass.generate(this.latestConfig, this.latestHass);
      const ms = performance.now() - t0;
      const summary = summarizeGenerated(generated, ms);
      const text = yaml.dump(generated, { noRefs: true, lineWidth: 100 });
      this.onResult({ yaml: text, summary }, undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.onResult(undefined, msg);
    } finally {
      this.inflight = false;
      this.onBusy(false);
    }
  }
}

function summarizeGenerated(
  generated: LovelaceConfig,
  ms: number,
): { views: number; sections: number; cards: number; ms: number } {
  const views = Array.isArray(generated.views) ? generated.views.length : 0;
  let sections = 0;
  let cards = 0;
  if (Array.isArray(generated.views)) {
    for (const v of generated.views as LovelaceViewConfig[]) {
      const vSections = (v as { sections?: unknown[] }).sections;
      if (Array.isArray(vSections)) {
        sections += vSections.length;
        for (const s of vSections) {
          const sCards = (s as { cards?: unknown[] })?.cards;
          if (Array.isArray(sCards)) cards += sCards.length;
        }
      }
      const vCards = (v as { cards?: unknown[] }).cards;
      if (Array.isArray(vCards)) cards += vCards.length;
    }
  }
  return { views, sections, cards, ms };
}
