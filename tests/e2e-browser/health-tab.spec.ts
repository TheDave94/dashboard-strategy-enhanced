// ====================================================================
// E2E — Health tab surfaces orphan refs and the Fix button clears them
// ====================================================================
// Mounts `<oriel-editor>` directly inside a loaded HA frontend so we
// can drive setConfig + read the rendered shadow DOM without
// depending on HA's dashboard-edit UI (which is brittle to drive
// from outside).
//
// Setup: navigate to the dashboard (loads strategy + editor modules),
// pull the live `hass` off `<home-assistant>` for the mounted editor,
// then run two assertion passes — one with a clean config, one with
// a stale favorite_entities reference. Then click Fix and assert the
// issue clears.
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

/**
 * Wait for HA's bootstrap to finish AND trigger the editor-chunk
 * import. The strategy code-splits the editor module: it only loads
 * when HA calls `getConfigElement()`. From the dashboard route alone
 * the editor isn't registered, so we invoke the static method
 * directly to trigger the import + customElements.define.
 */
async function waitForHaReady(page: Page): Promise<void> {
  // 1. Wait for HA's hass + the strategy element to be ready.
  await page.waitForFunction(
    () => {
      const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
      return !!ha?.hass && !!customElements.get('ll-strategy-dashboard-oriel');
    },
    { timeout: 60_000 },
  );
  // 2. Trigger the editor-chunk import via the strategy's static
  //    getConfigElement() — HA's normal "edit dashboard" path also
  //    goes through this. The returned element is discarded; we just
  //    want the side-effect of registering `oriel-editor`.
  await page.evaluate(async () => {
    const StrategyClass = customElements.get('ll-strategy-dashboard-oriel') as
      | { getConfigElement?: () => Promise<HTMLElement> }
      | undefined;
    if (!StrategyClass?.getConfigElement) {
      throw new Error('strategy class missing getConfigElement');
    }
    await StrategyClass.getConfigElement();
  });
  // 3. Confirm the editor is now registered.
  await page.waitForFunction(
    () => !!customElements.get('oriel-editor'),
    { timeout: 30_000 },
  );
}

/**
 * Mount an `<oriel-editor>` element inside the page using the live
 * `hass` from `<home-assistant>`. Returns a selector path the test
 * can use to interact with the editor's shadow root.
 */
async function mountEditor(page: Page, initialConfig: Record<string, unknown>): Promise<void> {
  await waitForHaReady(page);
  await page.evaluate(async (config) => {
    // Custom elements are already registered (waitForHaReady gated on it).
    // Pull hass off the live <home-assistant> element.
    const haRoot = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
    if (!haRoot || !haRoot.hass) {
      throw new Error('home-assistant element does not expose hass yet');
    }
    // Stash the editor in a top-level container so subsequent
    // page.evaluate calls can find it by id.
    let host = document.querySelector('#oriel-test-host');
    if (host) host.remove();
    host = document.createElement('div');
    host.id = 'oriel-test-host';
    (host as HTMLElement).style.position = 'fixed';
    (host as HTMLElement).style.zIndex = '99999';
    (host as HTMLElement).style.top = '0';
    (host as HTMLElement).style.right = '0';
    (host as HTMLElement).style.width = '600px';
    (host as HTMLElement).style.maxHeight = '90vh';
    (host as HTMLElement).style.overflow = 'auto';
    (host as HTMLElement).style.background = 'var(--card-background-color, white)';
    (host as HTMLElement).style.padding = '12px';
    (host as HTMLElement).style.border = '1px solid red';
    document.body.appendChild(host);
    const editor = document.createElement('oriel-editor') as HTMLElement & {
      hass?: unknown;
      setConfig: (cfg: unknown) => void;
      updateComplete?: Promise<unknown>;
    };
    editor.hass = haRoot.hass;
    editor.setConfig(config);
    host.appendChild(editor);
    if (editor.updateComplete) await editor.updateComplete;
  }, initialConfig);
}

/**
 * Read out the number of Health-tab issue rows currently rendered
 * inside the editor's shadow DOM. Returns 0 when the section is not
 * present (which is the expected state for clean configs).
 */
async function countHealthIssues(page: Page): Promise<number> {
  return page.evaluate(() => {
    const host = document.querySelector('#oriel-test-host');
    const editor = host?.querySelector('oriel-editor') as HTMLElement | null;
    if (!editor?.shadowRoot) return -1;
    // The HealthTab renders rows inside a `.section` containing the
    // `editor.health.title` localized text. We look up the title's
    // surrounding section, then count direct children whose first
    // child icon belongs to the severity meta set.
    const sections = editor.shadowRoot.querySelectorAll('.section');
    for (const section of sections) {
      const titleEl = section.querySelector('.section-title');
      const titleText = titleEl?.textContent?.trim() ?? '';
      // Match in both en + de — title is "Dashboard health check" or
      // "Dashboard-Gesundheitscheck"
      if (titleText.includes('health') || titleText.includes('Gesundheitscheck')) {
        // Count issue rows: each is a div with the severity icon.
        const rows = section.querySelectorAll('div[style*="border-left"]');
        return rows.length;
      }
    }
    return 0;
  });
}

/**
 * Click the first "Fix" button rendered in the Health section.
 */
async function clickFirstFix(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = document.querySelector('#oriel-test-host');
    const editor = host?.querySelector('oriel-editor') as HTMLElement | null;
    if (!editor?.shadowRoot) throw new Error('editor not mounted');
    const sections = editor.shadowRoot.querySelectorAll('.section');
    for (const section of sections) {
      const title = section.querySelector('.section-title')?.textContent ?? '';
      if (!title.includes('health') && !title.includes('Gesundheitscheck')) continue;
      const fixBtn = section.querySelector('button.btn-primary') as HTMLButtonElement | null;
      if (!fixBtn) throw new Error('No Fix button found');
      fixBtn.click();
      return;
    }
    throw new Error('Health section not found');
  });
  // Editor's _fireConfigChanged → requestUpdate → render is async
  await page.waitForTimeout(300);
}

test.describe('Health tab', () => {
  test.setTimeout(120_000);
  test('hidden on clean config, surfaces stale favorite_entities, Fix clears it', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);

    // ----- Pass 1: clean config (no orphans) -----
    await mountEditor(page, {
      type: 'custom:oriel',
    });
    let issues = await countHealthIssues(page);
    expect(issues, 'Health section must NOT appear on clean config').toBe(0);

    // ----- Pass 2: config with a stale favorite_entities reference -----
    // The entity ID is intentionally absurd so it can't exist on
    // any test HA install.
    await mountEditor(page, {
      type: 'custom:oriel',
      favorite_entities: ['light.this_entity_does_not_exist_xyz999'],
    });
    issues = await countHealthIssues(page);
    expect(issues, 'Health section should show ≥1 issue with stale favorite').toBeGreaterThanOrEqual(1);

    // ----- Click Fix and assert the issue clears -----
    await clickFirstFix(page);
    issues = await countHealthIssues(page);
    expect(issues, 'Health section should clear after Fix').toBe(0);
  });
});
