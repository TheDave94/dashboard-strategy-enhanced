// ====================================================================
// Plugin extension API (v3.5.0)
// ====================================================================
// Third-party HACS plugins can extend the strategy at load time by
// calling `window.dashboardEnhanced.registerSection(spec)` or
// `registerBadge(spec)`. The strategy reads both registries at
// generate() and merges plugin contributions alongside built-ins.
//
// Each spec carries an `apiVersion` so the strategy can reject
// incompatible plugins gracefully (warn + skip).
// ====================================================================

import type { HomeAssistant } from '../types/homeassistant';
import type {
  LovelaceSectionConfig,
  LovelaceBadgeConfig,
} from '../types/lovelace';
import type { DashboardEnhancedStrategyConfig } from '../types/strategy';

/** Highest API version this strategy understands. */
export const EXTENSION_API_VERSION = 1;

export interface ExtensionContext {
  hass: HomeAssistant;
  dashboardConfig: DashboardEnhancedStrategyConfig;
}

export interface SectionExtensionSpec {
  apiVersion: number;
  /** Stable id; must be unique across plugins. */
  key: string;
  /** Display label for the section heading + editor. */
  label: string;
  /** Optional MDI icon used in the editor. */
  icon?: string;
  /** Build the section content. Return `null` to skip (e.g. no entities). */
  build: (ctx: ExtensionContext) =>
    | LovelaceSectionConfig
    | null
    | Promise<LovelaceSectionConfig | null>;
}

export interface BadgeExtensionSpec {
  apiVersion: number;
  key: string;
  build: (ctx: ExtensionContext) =>
    | LovelaceBadgeConfig
    | null
    | Promise<LovelaceBadgeConfig | null>;
}

const sectionRegistry = new Map<string, SectionExtensionSpec>();
const badgeRegistry = new Map<string, BadgeExtensionSpec>();

function isCompatible(apiVersion: number, key: string): boolean {
  if (apiVersion > EXTENSION_API_VERSION) {
    console.warn(
      `[dashboard-enhanced] extension "${key}" requires apiVersion ${apiVersion} but strategy supports max ${EXTENSION_API_VERSION}. Skipping.`,
    );
    return false;
  }
  return true;
}

function registerSection(spec: SectionExtensionSpec): void {
  if (!spec || !spec.key || typeof spec.build !== 'function') {
    console.warn('[dashboard-enhanced] registerSection: invalid spec', spec);
    return;
  }
  if (!isCompatible(spec.apiVersion, spec.key)) return;
  if (sectionRegistry.has(spec.key)) {
    console.warn(
      `[dashboard-enhanced] extension section "${spec.key}" is already registered; ignoring duplicate.`,
    );
    return;
  }
  sectionRegistry.set(spec.key, spec);
}

function registerBadge(spec: BadgeExtensionSpec): void {
  if (!spec || !spec.key || typeof spec.build !== 'function') {
    console.warn('[dashboard-enhanced] registerBadge: invalid spec', spec);
    return;
  }
  if (!isCompatible(spec.apiVersion, spec.key)) return;
  if (badgeRegistry.has(spec.key)) {
    console.warn(
      `[dashboard-enhanced] extension badge "${spec.key}" is already registered; ignoring duplicate.`,
    );
    return;
  }
  badgeRegistry.set(spec.key, spec);
}

export function listSections(): SectionExtensionSpec[] {
  return [...sectionRegistry.values()];
}

export function listBadges(): BadgeExtensionSpec[] {
  return [...badgeRegistry.values()];
}

/**
 * Build every registered section in registry-insertion order. Failed
 * builds (rejected promises, thrown sync errors) are logged + skipped
 * — a buggy plugin must not break the dashboard.
 */
export async function buildExtensionSections(
  ctx: ExtensionContext,
): Promise<LovelaceSectionConfig[]> {
  const out: LovelaceSectionConfig[] = [];
  for (const spec of sectionRegistry.values()) {
    try {
      const result = await spec.build(ctx);
      if (result) out.push(result);
    } catch (err) {
      console.warn(`[dashboard-enhanced] extension section "${spec.key}" failed:`, err);
    }
  }
  return out;
}

export async function buildExtensionBadges(
  ctx: ExtensionContext,
): Promise<LovelaceBadgeConfig[]> {
  const out: LovelaceBadgeConfig[] = [];
  for (const spec of badgeRegistry.values()) {
    try {
      const result = await spec.build(ctx);
      if (result) out.push(result);
    } catch (err) {
      console.warn(`[dashboard-enhanced] extension badge "${spec.key}" failed:`, err);
    }
  }
  return out;
}

/**
 * Install the global registration entry point. Called once at strategy
 * module load. After this, plugins can call `window.dashboardEnhanced.*`
 * from their own scripts.
 */
export function installExtensionEntryPoint(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as {
    dashboardEnhanced?: {
      apiVersion: number;
      registerSection: (spec: SectionExtensionSpec) => void;
      registerBadge: (spec: BadgeExtensionSpec) => void;
    };
  }).dashboardEnhanced = {
    apiVersion: EXTENSION_API_VERSION,
    registerSection,
    registerBadge,
  };
}
