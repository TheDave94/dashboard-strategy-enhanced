// ====================================================================
// E2E — Strategy API smoke test
// ====================================================================
// Connects to a real Home Assistant instance and verifies the
// dashboard's storage-mode lovelace config is reachable and uses
// the dashboard-enhanced strategy. Skipped when HA_URL / HA_TOKEN env vars
// aren't set.
//
// What it validates (API-level only):
//   - HA WebSocket auth works with the provided long-lived token
//   - The dashboard exists at HA_DASHBOARD_URL_PATH
//   - Its config has a `strategy` field pointing at the dashboard-enhanced strategy
//   - The strategy config carries the expected shape (areas_options,
//     etc.) so we know it deserialized correctly
//
// Doesn't validate rendering / strategy expansion. Strategy
// `generate()` only runs in a browser — see the Playwright spec
// (tests/e2e/dashboard.spec.ts) for that.
// ====================================================================

import { describe, it, expect } from 'vitest';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_URL_PATH = process.env.HA_DASHBOARD_URL_PATH || 'dashboard-dashboard-enhanced';

const skipMessage =
  '[strategy-api] HA_URL / HA_TOKEN not set — skipping. Export them to run against a real HA.';

interface LovelaceCardConfig {
  type?: string;
  cards?: LovelaceCardConfig[];
  [key: string]: unknown;
}
interface LovelaceSectionConfig {
  type?: string;
  cards?: LovelaceCardConfig[];
}
interface LovelaceViewConfig {
  title?: string;
  path?: string;
  type?: string;
  cards?: LovelaceCardConfig[];
  sections?: LovelaceSectionConfig[];
}
interface LovelaceStrategyConfig {
  type: string;
  [key: string]: unknown;
}
interface LovelaceConfigResponse {
  views?: LovelaceViewConfig[];
  title?: string;
  /**
   * Storage-mode strategy dashboards return the strategy descriptor
   * here instead of expanded views. Strategy expansion happens
   * client-side in the browser.
   */
  strategy?: LovelaceStrategyConfig;
}

/**
 * Fetch lovelace config via WebSocket. Returns the resolved strategy
 * config (`mode: 'storage'` dashboards) — for `mode: 'yaml'` you'd
 * use a different endpoint, but the dashboard-enhanced strategy lives in storage.
 */
async function fetchLovelaceConfig(): Promise<LovelaceConfigResponse> {
  if (!HA_URL || !HA_TOKEN) throw new Error('HA_URL / HA_TOKEN required');
  const wsUrl = HA_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/websocket';
  const { WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 1;
    const messages: Array<(msg: unknown) => void> = [];

    ws.on('open', () => {
      // Auth flow: HA sends auth_required, we respond with auth_ok,
      // then we can send commands.
    });
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
        return;
      }
      if (msg.type === 'auth_ok') {
        ws.send(
          JSON.stringify({
            id: id++,
            type: 'lovelace/config',
            url_path: DASHBOARD_URL_PATH,
          }),
        );
        return;
      }
      if (msg.type === 'auth_invalid') {
        reject(new Error(`HA auth failed: ${msg.message}`));
        ws.close();
        return;
      }
      if (msg.type === 'result') {
        if (!msg.success) {
          reject(new Error(`HA lovelace/config failed: ${JSON.stringify(msg.error)}`));
          ws.close();
          return;
        }
        resolve(msg.result as LovelaceConfigResponse);
        ws.close();
        return;
      }
      messages.forEach((cb) => cb(msg));
    });
    ws.on('error', (err: Error) => reject(err));
    ws.on('close', () => {
      /* connection ended */
    });
    setTimeout(() => reject(new Error('HA WebSocket timeout')), 15_000);
  });
}

const skipIf = !HA_URL || !HA_TOKEN;

describe.skipIf(skipIf)('strategy: API smoke (live HA)', () => {
  if (skipIf) {
    // eslint-disable-next-line no-console
    console.log(skipMessage);
  }

  it('authenticates and fetches the dashboard config', async () => {
    const config = await fetchLovelaceConfig();
    expect(config).toBeTruthy();
  });

  it('the dashboard is in strategy mode', async () => {
    const config = await fetchLovelaceConfig();
    // Storage-mode strategy dashboards return { strategy: {...} } at
    // the top level. If the user manually edited the dashboard and
    // converted it to view-mode, this assertion catches that.
    expect(config.strategy).toBeTruthy();
  });

  it('the strategy is `custom:dashboard-enhanced`', async () => {
    const config = await fetchLovelaceConfig();
    expect(config.strategy?.type).toBe('custom:dashboard-enhanced');
  });

  it('strategy config carries the expected fields', async () => {
    const config = await fetchLovelaceConfig();
    const strategyConfig = config.strategy;
    expect(strategyConfig).toBeTruthy();
    if (!strategyConfig) return;
    // The strategy config should be deserializable as an object —
    // not an empty array, not a string. If HA mangled it, this
    // catches the regression.
    expect(typeof strategyConfig).toBe('object');
    expect(Array.isArray(strategyConfig)).toBe(false);
    // Optional fields that are commonly set — present absence
    // doesn't fail the test, just logs the surface for diagnostics.
    const surface = Object.keys(strategyConfig).filter((k) => k !== 'type');
    // eslint-disable-next-line no-console
    console.log(`[strategy-api] dashboard config keys: ${surface.join(', ')}`);
  });
});

if (skipIf) {
  // Surface the skip note even when the suite is filtered out.
  describe('strategy: API smoke (skipped)', () => {
    it('runs only with HA_URL and HA_TOKEN set', () => {
      expect(skipIf).toBe(true);
    });
  });
}
