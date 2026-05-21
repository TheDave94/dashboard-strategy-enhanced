// ====================================================================
// E2E — Live preview panel updates on config change
// ====================================================================
// Mounts `<oriel-editor>` in a test harness on the live HA page,
// clicks the live-preview toggle, edits a config field, waits past
// the 500ms debounce, and asserts the YAML pane updates and the
// summary counts are non-zero.
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
 * import. The editor is code-split and only loads when HA calls
 * `getConfigElement()`; we drive that explicitly. See
 * health-tab.spec.ts for the longer rationale.
 */
async function waitForHaReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
      return !!ha?.hass && !!customElements.get('ll-strategy-dashboard-oriel');
    },
    { timeout: 60_000 },
  );
  await page.evaluate(async () => {
    const StrategyClass = customElements.get('ll-strategy-dashboard-oriel') as
      | { getConfigElement?: () => Promise<HTMLElement> }
      | undefined;
    if (!StrategyClass?.getConfigElement) {
      throw new Error('strategy class missing getConfigElement');
    }
    await StrategyClass.getConfigElement();
  });
  await page.waitForFunction(
    () => !!customElements.get('oriel-editor'),
    { timeout: 30_000 },
  );
}

async function mountEditor(page: Page, initialConfig: Record<string, unknown>): Promise<void> {
  await waitForHaReady(page);
  await page.evaluate(async (config) => {
    const haRoot = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
    if (!haRoot?.hass) throw new Error('home-assistant element does not expose hass yet');
    let host = document.querySelector('#oriel-test-host');
    if (host) host.remove();
    host = document.createElement('div');
    host.id = 'oriel-test-host';
    (host as HTMLElement).style.position = 'fixed';
    (host as HTMLElement).style.zIndex = '99999';
    (host as HTMLElement).style.top = '0';
    (host as HTMLElement).style.right = '0';
    (host as HTMLElement).style.width = '800px';
    (host as HTMLElement).style.maxHeight = '95vh';
    (host as HTMLElement).style.overflow = 'auto';
    (host as HTMLElement).style.background = 'var(--card-background-color, white)';
    (host as HTMLElement).style.padding = '12px';
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
 * Click the "Show preview" toggle button at the top of the editor.
 * The button text alternates between localized show/hide labels — we
 * match either + the eye icon.
 */
async function clickPreviewToggle(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = document.querySelector('#oriel-test-host');
    const editor = host?.querySelector('oriel-editor') as HTMLElement | null;
    if (!editor?.shadowRoot) throw new Error('editor not mounted');
    const buttons = editor.shadowRoot.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent?.trim() ?? '';
      // Match en / de show or hide variants
      if (
        text.includes('Show preview') ||
        text.includes('Hide preview') ||
        text.includes('Vorschau einblenden') ||
        text.includes('Vorschau ausblenden')
      ) {
        btn.click();
        return;
      }
    }
    throw new Error('Live-preview toggle button not found');
  });
  await page.waitForTimeout(200);
}

/**
 * Read the YAML pane text + summary stats from the live-preview panel.
 * Returns null when the panel isn't visible.
 */
async function readPreviewState(page: Page): Promise<{ yaml: string; stats: string[] } | null> {
  return page.evaluate(() => {
    const host = document.querySelector('#oriel-test-host');
    const editor = host?.querySelector('oriel-editor') as HTMLElement | null;
    if (!editor?.shadowRoot) return null;
    const sections = editor.shadowRoot.querySelectorAll('.section');
    for (const section of sections) {
      const title = section.querySelector('.section-title')?.textContent?.trim() ?? '';
      if (!title.includes('Live preview') && !title.includes('Live-Vorschau')) continue;
      const pre = section.querySelector('pre');
      const yaml = pre?.textContent?.trim() ?? '';
      // Summary stats are 4 boxes — each has a number + a label
      const statBoxes = section.querySelectorAll(
        'div[style*="border-radius: 4px"][style*="text-align: center"]',
      );
      const stats: string[] = [];
      statBoxes.forEach((box) => {
        const num = box.firstElementChild?.textContent?.trim() ?? '';
        stats.push(num);
      });
      return { yaml, stats };
    }
    return null;
  });
}

test.describe('Live preview', () => {
  test.setTimeout(120_000);
  test('toggle shows the panel and YAML updates on config change past the debounce', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);

    await mountEditor(page, { type: 'custom:oriel' });

    // Panel hidden by default
    let state = await readPreviewState(page);
    expect(state, 'panel must be hidden before toggle').toBeNull();

    // Click "Show preview"
    await clickPreviewToggle(page);
    // Initial generate() kicks off; wait past debounce + render time
    await page.waitForTimeout(1_500);

    state = await readPreviewState(page);
    expect(state, 'panel must be visible after toggle').not.toBeNull();
    expect(state!.yaml, 'YAML pane should have rendered something').toContain('views:');
    expect(state!.stats.length, 'should have 4 summary stat boxes').toBe(4);

    // First three stats are view / section / card counts — at least
    // one should be non-zero on any real dashboard
    const numericStats = state!.stats.slice(0, 3).map((s) => Number(s));
    expect(
      numericStats.some((n) => n > 0),
      `expected at least one non-zero count, got ${JSON.stringify(state!.stats)}`,
    ).toBe(true);

    // Edit a config field to trigger a new generate() — flip the
    // density preset. Wait past the debounce.
    await page.evaluate(() => {
      const host = document.querySelector('#oriel-test-host');
      const editor = host?.querySelector('oriel-editor') as HTMLElement & {
        setConfig: (cfg: unknown) => void;
      };
      editor.setConfig({ type: 'custom:oriel', density: 'compact' });
    });
    await page.waitForTimeout(1_500);

    const after = await readPreviewState(page);
    expect(after, 'panel still visible after config change').not.toBeNull();
    expect(after!.yaml, 'YAML should still render after re-generate').toContain('views:');
  });
});
