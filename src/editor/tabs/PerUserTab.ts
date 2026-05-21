// ====================================================================
// Per-user dashboards editor tab (v4.3.0)
// ====================================================================
// Edit per-user / per-role overrides without writing YAML. Covers the
// `users` (keyed by HA user_id) + `users_by_role` (keyed by role name)
// config shapes. Picks from a curated list of override flags so the
// editor stays focused on the high-value knobs; full power via YAML.
//
// Discovers HA users via `config/auth/list` (admin-only). Non-admin
// sessions fall back to a "type the user ID manually" path — the
// strategy still resolves overrides correctly at generate(), the
// editor just can't enumerate users for them.
// ====================================================================

import { html, nothing, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../../types/homeassistant';
import type { OrielConfig } from '../../types/strategy';
import { localize } from '../../utils/localize';

interface HaUser {
  id: string;
  name: string;
  is_admin?: boolean;
  is_owner?: boolean;
}

// Override flags surfaced in the per-user editor. Each one is a boolean
// toggle that maps to the matching strategy config key. Stays small on
// purpose — power users can write extra fields directly into YAML and
// they'll be deep-merged.
interface OverrideFlag {
  configKey: string;
  label: string;
  /** Default value when the flag is "unset" (shown as ☐). */
  defaultValue: boolean;
}

const OVERRIDE_FLAGS: OverrideFlag[] = [
  { configKey: 'show_summary_views', label: 'Show summary views (lights/covers/etc.)', defaultValue: false },
  { configKey: 'show_room_views', label: 'Show per-room views', defaultValue: false },
  { configKey: 'show_security_summary', label: 'Show security summary', defaultValue: true },
  { configKey: 'show_battery_summary', label: 'Show battery summary', defaultValue: true },
  { configKey: 'show_climate_summary', label: 'Show climate summary', defaultValue: false },
  { configKey: 'show_routines_section', label: 'Show routines section', defaultValue: false },
  { configKey: 'show_voice_fab', label: 'Show voice FAB', defaultValue: false },
  { configKey: 'panel_mode', label: 'Wall-panel mode', defaultValue: false }, // wall when true, normal when unset
];

export interface PerUserTabContext {
  hass: HomeAssistant;
  config: OrielConfig;
  /** Map of discovered HA users. Empty when session is non-admin. */
  users: HaUser[];
  onUsersConfigChange: (users: NonNullable<OrielConfig['users']>) => void;
  onUsersByRoleChange: (usersByRole: NonNullable<OrielConfig['users_by_role']>) => void;
}

export function renderPerUserTab(ctx: PerUserTabContext): TemplateResult {
  const usersCfg =
    (ctx.config.users as Record<string, { override?: Record<string, unknown> }> | undefined) ?? {};
  const rolesCfg =
    (ctx.config.users_by_role as Record<string, { override?: Record<string, unknown> }> | undefined) ?? {};

  // Combine: configured users (by id) + discovered users (so admins can
  // see at-a-glance who's available).
  const configuredUserIds = new Set(Object.keys(usersCfg));
  const discoveredUserIds = new Set(ctx.users.map((u) => u.id));
  const allUserIds = [...new Set([...configuredUserIds, ...discoveredUserIds])];

  return html`
    <div class="section">
      <div class="section-title">${localize('editor.per_user_title') || 'Per-user / per-role overrides'}</div>
      <div class="description" style="margin-bottom: 12px;">
        ${localize('editor.per_user_desc') ||
          'Different dashboard layouts per HA user or role. Each user inherits the global config; their overrides win.'}
      </div>

      ${ctx.users.length === 0
        ? html`<div class="description" style="color: var(--warning-color);">
            ${localize('editor.per_user_no_discovery') ||
              'Could not list HA users (admin permission required). Add users manually by ID below.'}
          </div>`
        : nothing}

      <h4 style="margin-top: 16px;">${localize('editor.per_user_by_user') || 'By user'}</h4>
      ${allUserIds.map((userId) => {
        const cfg = usersCfg[userId];
        const override = (cfg?.override ?? {}) as Record<string, unknown>;
        const known = ctx.users.find((u) => u.id === userId);
        const label = known
          ? `${known.name}${known.is_admin ? ' (admin)' : ''}`
          : userId;
        const hasOverride = Object.keys(override).length > 0;
        return renderUserOrRoleRow({
          rowId: userId,
          label,
          isConfigured: configuredUserIds.has(userId),
          override,
          onToggleFlag: (configKey, enabled, defaultValue) => {
            const next = { ...usersCfg };
            const userEntry = { ...(next[userId] ?? { override: {} }) };
            const overrideNext = { ...(userEntry.override ?? {}) };
            if (enabled === defaultValue) delete overrideNext[configKey];
            else if (configKey === 'panel_mode') overrideNext[configKey] = enabled ? 'wall' : 'normal';
            else overrideNext[configKey] = enabled;
            userEntry.override = overrideNext;
            if (Object.keys(overrideNext).length === 0) delete next[userId];
            else next[userId] = userEntry;
            ctx.onUsersConfigChange(next);
          },
          onRemove: () => {
            const next = { ...usersCfg };
            delete next[userId];
            ctx.onUsersConfigChange(next);
          },
        });
      })}
      ${renderAddRow({
        label: localize('editor.per_user_add_user') || 'Add user override',
        placeholder: 'user-id (UUID)',
        onAdd: (uid) => {
          const next = { ...usersCfg, [uid]: { override: {} } };
          ctx.onUsersConfigChange(next);
        },
      })}

      <h4 style="margin-top: 24px;">${localize('editor.per_user_by_role') || 'By role / label'}</h4>
      <div class="description" style="margin-bottom: 8px;">
        ${localize('editor.per_user_role_desc') ||
          "Role keys: 'admin' matches all admin users; any other key matches users with that label."}
      </div>
      ${Object.keys(rolesCfg).map((roleKey) => {
        const cfg = rolesCfg[roleKey];
        const override = (cfg?.override ?? {}) as Record<string, unknown>;
        return renderUserOrRoleRow({
          rowId: roleKey,
          label: roleKey,
          isConfigured: true,
          override,
          onToggleFlag: (configKey, enabled, defaultValue) => {
            const next = { ...rolesCfg };
            const entry = { ...(next[roleKey] ?? { override: {} }) };
            const overrideNext = { ...(entry.override ?? {}) };
            if (enabled === defaultValue) delete overrideNext[configKey];
            else if (configKey === 'panel_mode') overrideNext[configKey] = enabled ? 'wall' : 'normal';
            else overrideNext[configKey] = enabled;
            entry.override = overrideNext;
            if (Object.keys(overrideNext).length === 0) delete next[roleKey];
            else next[roleKey] = entry;
            ctx.onUsersByRoleChange(next);
          },
          onRemove: () => {
            const next = { ...rolesCfg };
            delete next[roleKey];
            ctx.onUsersByRoleChange(next);
          },
        });
      })}
      ${renderAddRow({
        label: localize('editor.per_user_add_role') || 'Add role / label override',
        placeholder: 'admin | kid | resident | guest',
        onAdd: (role) => {
          const next = { ...rolesCfg, [role]: { override: {} } };
          ctx.onUsersByRoleChange(next);
        },
      })}
    </div>
  `;
}

interface RowParams {
  rowId: string;
  label: string;
  isConfigured: boolean;
  override: Record<string, unknown>;
  onToggleFlag: (configKey: string, enabled: boolean, defaultValue: boolean) => void;
  onRemove: () => void;
}

function renderUserOrRoleRow(p: RowParams): TemplateResult {
  return html`
    <div
      style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 10px; margin-bottom: 10px;"
    >
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong>${p.label}</strong>
        ${p.isConfigured
          ? html`<button
              class="btn-remove"
              style="background: transparent; border: 1px solid var(--divider-color); border-radius: 4px; padding: 2px 8px; cursor: pointer; color: var(--secondary-text-color);"
              @click=${p.onRemove}
            >
              ${localize('editor.remove') || 'Remove'}
            </button>`
          : nothing}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;">
        ${OVERRIDE_FLAGS.map((flag) => {
          const currentRaw = p.override[flag.configKey];
          const current =
            flag.configKey === 'panel_mode'
              ? currentRaw === 'wall'
              : typeof currentRaw === 'boolean'
                ? currentRaw
                : flag.defaultValue;
          return html`
            <label
              style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;"
              title=${flag.configKey}
            >
              <input
                type="checkbox"
                ?checked=${current}
                @change=${(e: Event) =>
                  p.onToggleFlag(
                    flag.configKey,
                    (e.target as HTMLInputElement).checked,
                    flag.defaultValue,
                  )}
              />
              ${flag.label}
            </label>
          `;
        })}
      </div>
      ${Object.keys(p.override).filter((k) => !OVERRIDE_FLAGS.some((f) => f.configKey === k)).length > 0
        ? html`<div class="description" style="margin-top: 6px; font-size: 11px;">
            ${localize('editor.per_user_extra_fields') ||
              'This entry also has extra override fields set via YAML (not shown in the editor — power-user territory).'}
          </div>`
        : nothing}
    </div>
  `;
}

function renderAddRow(p: {
  label: string;
  placeholder: string;
  onAdd: (id: string) => void;
}): TemplateResult {
  return html`
    <div class="form-row" style="margin-top: 4px;">
      <input
        type="text"
        style="flex: 1;"
        placeholder=${p.placeholder}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v) {
              p.onAdd(v);
              (e.target as HTMLInputElement).value = '';
            }
          }
        }}
      />
      <button
        class="btn-primary"
        @click=${(e: Event) => {
          const input = ((e.target as HTMLElement)
            .previousElementSibling as HTMLInputElement | null);
          const v = input?.value.trim();
          if (v) {
            p.onAdd(v);
            if (input) input.value = '';
          }
        }}
      >
        ${p.label}
      </button>
    </div>
  `;
}
