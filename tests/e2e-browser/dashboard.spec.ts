// ====================================================================
// E2E — Dashboard rendering (real HA, headless Chromium)
// ====================================================================
// Loads the strategy dashboard in a real browser against the running
// HA instance, asserts the strategy expands, custom cards mount, and
// no console errors fire.
//
// Auth: HA stores its frontend session as `hassTokens` in
// localStorage. We pre-populate it with the long-lived access token
// from HA_TOKEN — HA's frontend reads it on startup and skips the
// OAuth login flow.
// ====================================================================

import { test, expect } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
// The dashboard URL path is whatever the user named their dashboard;
// independent of the strategy type. Default matches the test HA setup
// from before the v4.0.0 rename — override via HA_DASHBOARD_URL_PATH.
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'dashboard-simon42';

test.skip(!HA_URL || !HA_TOKEN, 'HA_URL and HA_TOKEN env vars are required');

test.beforeEach(async ({ context }) => {
  if (!HA_URL || !HA_TOKEN) return;
  // Inject auth into localStorage BEFORE the page loads. HA's
  // frontend reads `hassTokens` on bootstrap.
  await context.addInitScript(
    ({ token, url }: { token: string; url: string }) => {
      const clientId = url.replace(/\/$/, '') + '/';
      const tokens = {
        access_token: token,
        token_type: 'Bearer',
        // Long-lived tokens don't really expire, but the frontend
        // wants a number here.
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

test.describe('dashboard rendering', () => {
  test('loads without console errors and mounts custom cards', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err.message)));

    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    // Give HA's frontend time to bootstrap + strategy to expand.
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    // Give the strategy.generate() promise a chance to settle.
    await page.waitForTimeout(2_500);

    // Snapshot rendered output and look for at least one oriel card.
    const root = page.locator('home-assistant');
    await expect(root).toBeAttached();
    // Drill into the shadow tree: home-assistant → ha-drawer →
    // partial-panel-resolver → ha-panel-lovelace → hui-root → view
    // We can pierce shadow boundaries with Playwright's deep selector.
    const cardMatches = await page.evaluate(() => {
      function findInShadow(root: Document | ShadowRoot, sel: string): Element[] {
        const out: Element[] = [];
        const walk = (node: Element | ShadowRoot | Document): void => {
          if ('querySelectorAll' in node) {
            node.querySelectorAll(sel).forEach((el) => out.push(el));
            node.querySelectorAll('*').forEach((el) => {
              const sr = (el as HTMLElement).shadowRoot;
              if (sr) walk(sr);
            });
          }
        };
        walk(root);
        return out;
      }
      const cards = findInShadow(document, 'oriel-zone-presence-card, oriel-summary-card, oriel-lights-group-card, oriel-covers-group-card');
      return cards.map((c) => c.tagName.toLowerCase());
    });

    // Console errors that don't matter — HA's frontend has some
    // known benign warnings we want to ignore.
    const benignPatterns = [
      // User-environment 404s (other HACS plugins on the test HA,
      // user-uploaded /local/ assets that may not be present).
      /\/local\//,
      /browser_mod\.js/,
      /card-tools/,
      // HACS post-rename artifact: after a repo rename, HACS leaves
      // a stale lovelace resource entry pointing at the new repo's
      // hacsfiles path while serving from the old one. The 404 is
      // cosmetic — the plugin loads via the other resource entry.
      // Delete the stale entry via the HA WS API to clear it:
      //   lovelace/resources/delete with the matching resource_id
      /\/hacsfiles\/dashboard-strategy-enhanced\//,
      // HA bootstrap races + chunk preloads.
      /No matching state/i,
      /^Failed to load resource/i,
      // Strategy boot can momentarily throw before all chunks finish
      // loading — only persistent errors after settle matter.
      /Cannot read properties of (null|undefined)/i,
    ];
    const realErrors = consoleErrors.filter(
      (e) => !benignPatterns.some((re) => re.test(e)),
    );

    // eslint-disable-next-line no-console
    console.log(`[e2e] matched oriel cards: ${JSON.stringify(cardMatches)}`);
    // eslint-disable-next-line no-console
    console.log(`[e2e] console errors (filtered): ${realErrors.length}`);

    expect(cardMatches.length).toBeGreaterThan(0);
    expect(realErrors, `unfiltered console errors: ${realErrors.join('\n')}`).toHaveLength(0);
  });
});
