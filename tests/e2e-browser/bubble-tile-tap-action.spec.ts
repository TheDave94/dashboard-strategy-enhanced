// ====================================================================
// E2E — Bubble Card tile tap_action rewiring (ROADMAP §2)
// ====================================================================
// On a live HA install with `use_bubble_drawers: true` AND the
// bubble-card HACS plugin installed, every emitted tile of an
// actionable domain (light/climate/cover/fan/media_player) carries
// `tap_action = { action: 'navigate', navigation_path:
// '#bubble-<entity-id>' }` — replacing HA's default more-info dialog.
//
// The spec verifies two layers:
//   1. The live tile's `_config.tap_action` matches the bubble hash
//      for its entity — this is the strategy-output check that's
//      robust to HA's event-dispatch internals.
//   2. Driving a real Playwright click on the tile sets
//      `window.location.hash` to that path — confirming HA's action
//      pipeline honours the rewritten action. If HA's click plumbing
//      doesn't surface here (some renderer/event variants don't), the
//      observation falls back to the data-level assertion above and
//      logs a note; we do not fake a click-path pass.
//
// Hard prerequisites — the test skips entirely when:
//   - HA_URL / HA_TOKEN env vars are missing
//   - the dashboard strategy config has `use_bubble_drawers !== true`
//   - bubble-card is not registered in the browser
// Per-domain soft skips:
//   - no entity of that domain rendered as a tile on the dashboard
// ====================================================================

import { test, expect, type Page } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'oriel-dashboard';

test.skip(!HA_URL || !HA_TOKEN, 'HA_URL and HA_TOKEN env vars are required');

test.beforeEach(async ({ context }) => {
  if (!HA_URL || !HA_TOKEN) return;
  await context.addInitScript(
    ({ token, url }: { token: string; url: string }) => {
      const clientId = url.replace(/\/$/, '') + '/';
      const tokens = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 365 * 24 * 60 * 60,
        refresh_token: '',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        hassUrl: url.replace(/\/$/, ''),
        clientId,
      };
      localStorage.setItem('hassTokens', JSON.stringify(tokens));
    },
    { token: HA_TOKEN, url: HA_URL },
  );
});

const ACTIONABLE_DOMAINS = ['light', 'climate', 'cover', 'fan', 'media_player'] as const;
type ActionableDomain = (typeof ACTIONABLE_DOMAINS)[number];

interface TileProbe {
  entity: string;
  domain: ActionableDomain;
  tapAction: { action?: string; navigation_path?: string } | undefined;
}

function expectedHashFor(entityId: string): string {
  return `#bubble-${entityId.replace(/\./g, '-')}`;
}

/**
 * Walk the full shadow tree and return the first <hui-tile-card> seen
 * for each actionable domain, along with its rendered tap_action.
 */
async function probeActionableTiles(page: Page): Promise<Record<ActionableDomain, TileProbe | null>> {
  return await page.evaluate((domains) => {
    function walk(root: Document | ShadowRoot, sel: string, into: Element[]): void {
      root.querySelectorAll(sel).forEach((el) => into.push(el));
      root.querySelectorAll('*').forEach((el) => {
        const sr = (el as HTMLElement).shadowRoot;
        if (sr) walk(sr, sel, into);
      });
    }
    const tiles: Element[] = [];
    walk(document, 'hui-tile-card', tiles);
    const out: Record<string, TileProbe | null> = {};
    for (const d of domains as string[]) out[d] = null;
    for (const t of tiles as Array<HTMLElement & {
      _config?: { entity?: string; tap_action?: { action?: string; navigation_path?: string } };
    }>) {
      const entity = t._config?.entity;
      if (!entity || typeof entity !== 'string') continue;
      const domain = entity.split('.')[0];
      if (domain && (domains as string[]).includes(domain) && !out[domain]) {
        out[domain] = { entity, domain: domain as ActionableDomain, tapAction: t._config?.tap_action };
      }
    }
    return out as Record<ActionableDomain, TileProbe | null>;
  }, ACTIONABLE_DOMAINS as unknown as string[]);
}

async function dashboardHasBubbleDrawersOn(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    function walkOne(root: Document | ShadowRoot, sel: string): Element | null {
      const direct = root.querySelector(sel);
      if (direct) return direct;
      const nodes = root.querySelectorAll('*');
      for (const el of nodes) {
        const sr = (el as HTMLElement).shadowRoot;
        if (sr) {
          const inner = walkOne(sr, sel);
          if (inner) return inner;
        }
      }
      return null;
    }
    const panel = walkOne(document, 'ha-panel-lovelace') as (HTMLElement & {
      lovelace?: { config?: { strategy?: { use_bubble_drawers?: boolean } } };
    }) | null;
    return panel?.lovelace?.config?.strategy?.use_bubble_drawers === true;
  });
}

async function bubbleCardRegistered(page: Page): Promise<boolean> {
  return await page.evaluate(() => !!customElements.get('bubble-card'));
}

test.describe('Bubble tile tap_action rewiring', () => {
  test.setTimeout(120_000);

  test('every actionable-domain tile carries the bubble navigate action, and clicking navigates to its hash', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);

    const bubbleOn = await dashboardHasBubbleDrawersOn(page);
    test.skip(
      !bubbleOn,
      'strategy config has use_bubble_drawers !== true on this harness — set it on the test dashboard or skip.',
    );

    const bubbleInstalled = await bubbleCardRegistered(page);
    test.skip(
      !bubbleInstalled,
      'bubble-card HACS plugin not registered in the browser — install it on the test HA or skip.',
    );

    const probes = await probeActionableTiles(page);
    const found = (Object.values(probes) as Array<TileProbe | null>).filter((p): p is TileProbe => !!p);
    test.skip(
      found.length === 0,
      'No actionable-domain tiles rendered on the dashboard — add light/climate/cover/fan/media_player entities or skip.',
    );

    // eslint-disable-next-line no-console
    console.log(
      '[bubble-tap-action] covering:',
      found.map((p) => `${p.domain}=${p.entity}`).join(', '),
    );
    const missing = ACTIONABLE_DOMAINS.filter((d) => !probes[d]);
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[bubble-tap-action] no entity on this harness for:', missing.join(', '));
    }

    // Data-level pin: every found tile carries the bubble navigate
    // action for its entity. This is what the strategy is responsible
    // for; if this fails, the rewiring is broken regardless of how
    // HA's click pipeline behaves.
    for (const probe of found) {
      expect(
        probe.tapAction,
        `tile for ${probe.entity} missing rewritten tap_action`,
      ).toEqual({ action: 'navigate', navigation_path: expectedHashFor(probe.entity) });
    }

    // Click-path observation: drive a real click on each tile and
    // confirm the URL hash matches the bubble navigation_path. HA's
    // tile action-handler dispatches navigate via history.pushState
    // for hash-only paths, so window.location.hash updates.
    for (const probe of found) {
      await page.evaluate(() => {
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      });
      const clicked = await page.evaluate((entity) => {
        function walk(root: Document | ShadowRoot, sel: string, into: Element[]): void {
          root.querySelectorAll(sel).forEach((el) => into.push(el));
          root.querySelectorAll('*').forEach((el) => {
            const sr = (el as HTMLElement).shadowRoot;
            if (sr) walk(sr, sel, into);
          });
        }
        const tiles: Element[] = [];
        walk(document, 'hui-tile-card', tiles);
        const tile = (tiles as Array<HTMLElement & { _config?: { entity?: string }; click?: () => void }>).find(
          (t) => t._config?.entity === entity,
        );
        if (!tile) return false;
        // hui-tile-card forwards .click() to its internal action
        // handler in current HA frontends. If a future HA revision
        // moves to a pointer-only handler, the data-level pin above
        // still catches breakage and this observation degrades — see
        // the harness skip note above.
        tile.click?.();
        return true;
      }, probe.entity);
      expect(clicked, `failed to dispatch click on ${probe.entity} tile`).toBe(true);
      await page.waitForTimeout(150);
      const finalHash = await page.evaluate(() => window.location.hash);
      expect(
        finalHash,
        `clicking ${probe.entity} tile should navigate to ${expectedHashFor(probe.entity)}, got "${finalHash}"`,
      ).toBe(expectedHashFor(probe.entity));
    }
  });
});
