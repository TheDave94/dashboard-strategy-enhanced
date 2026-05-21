// ====================================================================
// SetupTab — onboarding wizard (v3.1.0)
// ====================================================================
// First-thing-users-see panel that surfaces every advanced feature
// (built-in or HACS-backed) with: a description, install hint when
// missing, and an enable toggle. Runs off the FEATURE_REGISTRY in
// src/onboarding/features.ts.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';

import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig } from '../../types/strategy';
import {
  FEATURE_REGISTRY,
  type FeatureCategory,
  type FeatureEntry,
} from '../../onboarding/features';
import { PERSONAS, suggestPersonas, type Persona, type StepperAnswers } from '../../onboarding/personas';
import { detectHints, type AdaptiveHint } from '../../onboarding/hints';
import { onActivateKey } from '../../utils/keyboard-activation';

interface SetupTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onDismiss: () => void;
  onFeatureToggle: (id: string, enabled: boolean) => void;
  onApplyPersona: (personaId: string) => void;
  onApplyHint: (hint: AdaptiveHint) => void;
  onDismissHint: (hintId: string) => void;
  onRerunSetup: () => void;
}

const CATEGORY_META: Record<FeatureCategory, { label: string; icon: string }> = {
  layout: { label: 'Layout & display', icon: 'mdi:view-grid-outline' },
  tiles: { label: 'Tiles & sections', icon: 'mdi:apps' },
  panel: { label: 'Wall panel / kiosk', icon: 'mdi:tablet-dashboard' },
  users: { label: 'Per-user', icon: 'mdi:account-multiple' },
  data: { label: 'Data & history', icon: 'mdi:chart-line' },
  integration: { label: 'HACS integrations', icon: 'mdi:puzzle' },
};

// -- Public renderer --------------------------------------------------

export function renderSetupTab(ctx: SetupTabContext): TemplateResult {
  const grouped: Partial<Record<FeatureCategory, FeatureEntry[]>> = {};
  for (const f of FEATURE_REGISTRY) {
    (grouped[f.category] ||= []).push(f);
  }

  // Stats for the collapsed header (so users get a glanceable summary).
  let activeCount = 0;
  let availableCount = 0;
  for (const f of FEATURE_REGISTRY) {
    const detect = f.detect(ctx.hass);
    if (detect.installed) availableCount++;
    if (
      detect.installed &&
      f.isEnabled &&
      f.isEnabled(ctx.config as Record<string, unknown>)
    ) {
      activeCount++;
    }
  }

  const currentPersona = (ctx.config as { _persona_applied?: string })._persona_applied;
  const hints = detectHints(ctx.hass, ctx.config);

  return html`
    <div class="setup-panel">
      <div
        class="setup-header"
        role="button"
        tabindex="0"
        aria-expanded=${ctx.collapsed ? 'false' : 'true'}
        @click=${ctx.onToggleCollapsed}
        @keydown=${onActivateKey(ctx.onToggleCollapsed)}
      >
        <div class="setup-header-title">
          <ha-icon icon="mdi:rocket-launch-outline"></ha-icon>
          <span>Setup &amp; advanced features</span>
        </div>
        <div class="setup-header-stats">
          <span>${activeCount} active</span>
          <span class="setup-header-divider">·</span>
          <span>${availableCount}/${FEATURE_REGISTRY.length} available</span>
          <ha-icon icon=${ctx.collapsed ? 'mdi:chevron-down' : 'mdi:chevron-up'}></ha-icon>
        </div>
      </div>

      ${ctx.collapsed
        ? nothing
        : html`
            <div class="setup-intro">
              Choose what your dashboard does. Pick a persona below to apply a
              curated bundle in one click, or toggle individual features further
              down.
              <div style="display: flex; gap: 8px;">
                <button class="setup-dismiss" @click=${ctx.onRerunSetup}>
                  Re-run setup
                </button>
                <button class="setup-dismiss" @click=${ctx.onDismiss}>
                  Hide this section
                </button>
              </div>
            </div>

            ${renderPersonas(ctx, currentPersona)}
            ${hints.length > 0 ? renderHints(hints, ctx) : nothing}

            <div class="setup-section-divider">
              <span>Individual features</span>
            </div>

            ${(Object.keys(grouped) as FeatureCategory[]).map((cat) =>
              renderCategory(cat, grouped[cat] ?? [], ctx),
            )}
          `}
    </div>
  `;
}

// -- Persona row + hint cards ----------------------------------------

function renderPersonas(ctx: SetupTabContext, currentPersona?: string): TemplateResult {
  // No answers context inside the editor — pass an empty answers object;
  // every persona's baseline score still surfaces them.
  const ranked = suggestPersonas(ctx.hass, {});
  if (ranked.length === 0) return html``;
  return html`
    <div class="setup-personas">
      <div class="setup-personas-title">
        ${currentPersona
          ? html`Current persona: <strong>${PERSONAS.find((p) => p.id === currentPersona)?.label ?? currentPersona}</strong>. Switch any time.`
          : 'Pick a starting point — toggles a bundle of features in one click.'}
      </div>
      <div class="setup-personas-grid">
        ${ranked.map(({ persona }) => renderPersonaCard(persona, ctx, currentPersona === persona.id))}
      </div>
    </div>
  `;
}

function renderPersonaCard(p: Persona, ctx: SetupTabContext, isActive: boolean): TemplateResult {
  return html`
    <button
      class="setup-persona-card ${isActive ? 'setup-persona-card--active' : ''}"
      @click=${() => ctx.onApplyPersona(p.id)}
      title=${p.description}
    >
      <ha-icon icon=${p.icon}></ha-icon>
      <div class="setup-persona-label">${p.label}</div>
      <div class="setup-persona-desc">${p.description}</div>
    </button>
  `;
}

function renderHints(hints: AdaptiveHint[], ctx: SetupTabContext): TemplateResult {
  return html`
    <div class="setup-hints">
      ${hints.map(
        (h) => html`
          <div class="setup-hint">
            <ha-icon class="setup-hint-icon" icon=${h.icon}></ha-icon>
            <div class="setup-hint-body">
              <div class="setup-hint-title">${h.title}</div>
              <div class="setup-hint-desc">${h.description}</div>
            </div>
            <div class="setup-hint-actions">
              <button class="setup-hint-apply" @click=${() => ctx.onApplyHint(h)}>
                ${h.ctaLabel ?? 'Apply'}
              </button>
              <button class="setup-hint-dismiss" @click=${() => ctx.onDismissHint(h.id)}>
                Dismiss
              </button>
            </div>
          </div>
        `,
      )}
    </div>
  `;
}

// -- Category & feature renderers ------------------------------------

function renderCategory(
  cat: FeatureCategory,
  features: FeatureEntry[],
  ctx: SetupTabContext,
): TemplateResult {
  if (features.length === 0) return html``;
  const meta = CATEGORY_META[cat];

  return html`
    <div class="setup-category">
      <div class="setup-category-header">
        <ha-icon icon=${meta.icon}></ha-icon>
        <span>${meta.label}</span>
      </div>
      ${features.map((f) => renderFeature(f, ctx))}
    </div>
  `;
}

function renderFeature(f: FeatureEntry, ctx: SetupTabContext): TemplateResult {
  const detect = f.detect(ctx.hass);
  const isEnabled = f.isEnabled
    ? f.isEnabled(ctx.config as Record<string, unknown>)
    : false;
  const canToggle = !!f.toggle && detect.installed;
  const statusIcon = !detect.installed
    ? 'mdi:download'
    : isEnabled
      ? 'mdi:check-circle'
      : 'mdi:circle-outline';
  const statusClass = !detect.installed
    ? 'missing'
    : isEnabled
      ? 'active'
      : 'inactive';

  return html`
    <div class="setup-feature setup-feature--${statusClass}">
      <ha-icon class="setup-feature-status" icon=${statusIcon}></ha-icon>
      <div class="setup-feature-body">
        <div class="setup-feature-title">${f.label}</div>
        <div class="setup-feature-desc">${f.description}</div>
        ${detect.detail
          ? html`<div class="setup-feature-detail">${detect.detail}</div>`
          : nothing}
        ${!detect.installed && f.hacs
          ? html`
              <div class="setup-feature-hacs">
                Requires
                <a
                  href=${`https://github.com/${f.hacs.repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  >${f.hacs.name}</a
                >
                — install via HACS, then refresh this page.
              </div>
            `
          : nothing}
      </div>
      <div class="setup-feature-action">
        ${canToggle
          ? html`
              <ha-switch
                .checked=${isEnabled}
                @change=${(e: Event) =>
                  ctx.onFeatureToggle(f.id, (e.target as HTMLInputElement).checked)}
              ></ha-switch>
            `
          : !detect.installed
            ? html`<span class="setup-feature-tag">missing</span>`
            : !f.toggle
              ? html`<span class="setup-feature-tag">always on</span>`
              : nothing}
      </div>
    </div>
  `;
}

// -- CSS (returned as raw string, the editor unsafe-inlines per-tab) --

export const SETUP_TAB_CSS = `
.setup-panel {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
}
.setup-header:hover { background: var(--secondary-background-color); }

.setup-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 1.05rem;
}
.setup-header-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--secondary-text-color);
  font-size: 0.9rem;
}
.setup-header-divider { opacity: 0.5; }

.setup-intro {
  padding: 0 18px 12px;
  color: var(--secondary-text-color);
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.setup-dismiss {
  background: transparent;
  border: 1px solid var(--divider-color);
  color: var(--secondary-text-color);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.setup-dismiss:hover { background: var(--secondary-background-color); }

.setup-category {
  padding: 6px 18px 14px;
  border-top: 1px solid var(--divider-color);
}
.setup-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--secondary-text-color);
  padding: 8px 0;
}

.setup-feature {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  padding: 10px 0;
  align-items: start;
  border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 50%, transparent);
}
.setup-feature:last-child { border-bottom: none; }

.setup-feature-status {
  margin-top: 2px;
  --mdc-icon-size: 22px;
}
.setup-feature--active .setup-feature-status { color: var(--success-color, #4caf50); }
.setup-feature--inactive .setup-feature-status { color: var(--secondary-text-color); }
.setup-feature--missing .setup-feature-status { color: var(--warning-color, #ff9800); }

.setup-feature-title { font-weight: 500; }
.setup-feature-desc {
  color: var(--secondary-text-color);
  font-size: 0.88rem;
  margin-top: 2px;
}
.setup-feature-detail {
  color: var(--primary-text-color);
  font-size: 0.8rem;
  margin-top: 4px;
  opacity: 0.75;
}
.setup-feature-hacs {
  margin-top: 6px;
  font-size: 0.82rem;
  background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent);
  border-left: 3px solid var(--warning-color, #ff9800);
  padding: 6px 10px;
  border-radius: 4px;
}
.setup-feature-hacs a {
  color: var(--primary-color);
  text-decoration: underline;
}
.setup-feature-action { display: flex; align-items: center; min-width: 60px; justify-content: flex-end; }
.setup-feature-tag {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--secondary-text-color);
  opacity: 0.7;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  padding: 2px 6px;
}

/* Personas (v4.4.0) */
.setup-personas {
  padding: 0 18px 12px;
}
.setup-personas-title {
  font-size: 0.85rem;
  color: var(--secondary-text-color);
  margin-bottom: 10px;
}
.setup-personas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.setup-persona-card {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s, transform 0.1s;
  font: inherit;
  color: inherit;
}
.setup-persona-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-1px);
}
.setup-persona-card ha-icon {
  --mdc-icon-size: 24px;
  color: var(--primary-color);
}
.setup-persona-card--active {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
}
.setup-persona-label { font-weight: 500; }
.setup-persona-desc {
  font-size: 0.82rem;
  color: var(--secondary-text-color);
  line-height: 1.3;
}

/* Adaptive hints (v4.4.0) */
.setup-hints { padding: 4px 18px 8px; }
.setup-hint {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  background: color-mix(in srgb, var(--accent-color, #ff9800) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-color, #ff9800) 40%, transparent);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.setup-hint-icon { --mdc-icon-size: 22px; color: var(--accent-color, #ff9800); }
.setup-hint-title { font-weight: 500; font-size: 0.92rem; }
.setup-hint-desc {
  font-size: 0.82rem;
  color: var(--secondary-text-color);
  margin-top: 2px;
}
.setup-hint-actions { display: flex; gap: 6px; }
.setup-hint-apply {
  background: var(--primary-color);
  color: var(--text-primary-color, white);
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.82rem;
}
.setup-hint-dismiss {
  background: transparent;
  color: var(--secondary-text-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.82rem;
}

.setup-section-divider {
  padding: 8px 18px 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--secondary-text-color);
  border-top: 1px solid var(--divider-color);
}
.setup-section-divider span { display: block; margin-top: 8px; }
`;
