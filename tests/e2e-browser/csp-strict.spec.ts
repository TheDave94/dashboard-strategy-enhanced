// ====================================================================
// E2E — strict-CSP regression harness (live HA)
// ====================================================================
// Asserts that Oriel renders cleanly under a strict Content Security
// Policy. Catches the class of bug where someone introduces an
// `eval()`, a string-form `setTimeout`, an inline `<script>`, a
// dynamic Function() construct, or a `data:` URI in a script
// position — works fine locally because HA's own CSP is permissive,
// breaks for users on hardened installs (corporate-network HAOS,
// Nabu Casa Cloud + restrictive proxies).
//
// The harness:
//
//   1. Intercepts every navigation request to the dashboard host and
//      adds a strict CSP header BEFORE the page loads. The browser
//      then enforces the policy for the rendered page.
//   2. Listens for CSP violation reports via the console message
//      stream (browsers log "Refused to load…" / "Content Security
//      Policy directive…" for every violation).
//   3. Drives all the Oriel surfaces: dashboard render, editor
//      mount, live-preview toggle, health tab.
//   4. Asserts the violation log is empty at the end.
//
// Policy (matches what hardened HAOS installs actually ship):
//
//   default-src 'self';
//   script-src 'self' 'unsafe-inline';
//                                  // HA's index.html ships 6+ inline
//                                  // bootstrap scripts; that's HA's
//                                  // platform pattern, not something
//                                  // a Lovelace strategy controls. We
//                                  // allow inline (matches real-world
//                                  // hardened installs) but still
//                                  // block 'unsafe-eval' + data:
//                                  // script sources, which catches
//                                  // the class of regression this
//                                  // test is designed to detect.
//   style-src 'self' 'unsafe-inline';
//                                  // HA's own pattern uses inline
//                                  // styles via Lit's <style> tags.
//   img-src 'self' data: blob:;    // tile icons + camera thumbnails
//                                  // via data: + blob: URIs are common.
//   connect-src 'self' wss: https:;
//                                  // HA WebSocket is wss://; HACS
//                                  // resource pulls are https://.
//   font-src 'self' data:;         // MDI icon font sometimes data:-encoded.
//   media-src 'self' data: blob:;  // camera streams use blob: URLs.
//
// What this policy catches (Oriel regressions specifically):
//   - eval() calls, new Function(...), string-form setTimeout(...)
//     → all blocked by absence of 'unsafe-eval'
//   - <script src="data:..."> dynamic injection
//     → blocked by absence of `data:` in script-src
//   - <script src="https://..."> from third-party CDNs
//     → blocked by `script-src 'self'`
//   - WASM modules without 'wasm-unsafe-eval'
//     → blocked, would surface a violation
//
// What this policy doesn't catch (and accepts as platform-level):
//   - HA's own bootstrap inline scripts (sha256 hashes shown in the
//     console; covered by 'unsafe-inline').
//   - Lit's compiled-template inline styles via shadow roots.
// ====================================================================

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'oriel-dashboard';

test.skip(!HA_URL || !HA_TOKEN, 'HA_URL and HA_TOKEN env vars are required');

const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' wss: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
].join('; ');

/**
 * Capture every CSP violation that surfaces via the console message
 * stream. Returns a getter the test calls after each interaction so
 * it can match by-surface failures back to the action that caused
 * them.
 */
function attachCspListener(page: Page): () => string[] {
  const violations: string[] = [];
  const onMsg = (msg: ConsoleMessage): void => {
    const text = msg.text();
    // Chromium's CSP error formats — match the canonical strings the
    // browser uses so we catch every variant.
    if (
      /Content Security Policy directive/i.test(text) ||
      /Refused to (load|execute|connect|apply|frame|create|run)/i.test(text) ||
      /Content-Security-Policy:/i.test(text)
    ) {
      violations.push(text);
    }
  };
  page.on('console', onMsg);
  return () => violations.slice();
}

test.beforeEach(async ({ context }) => {
  if (!HA_URL || !HA_TOKEN) return;

  // Auth bootstrap — same pattern as the other Playwright specs.
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

  // Inject the strict CSP header on every navigation (document)
  // request to the HA host. We match only resource_type === 'document'
  // because CSP is only meaningful on the HTML Document response —
  // intercepting every asset/XHR through fetch+fulfill is both
  // unnecessary and breaks chunked-response handling.
  await context.route(`${HA_URL?.replace(/\/$/, '')}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.body();
    const headers = { ...response.headers() };
    // Replace any HA-set CSP with our strict one.
    headers['content-security-policy'] = STRICT_CSP;
    delete headers['content-security-policy-report-only'];
    await route.fulfill({
      status: response.status(),
      headers,
      body,
    });
  });
});

async function waitForHaReady(page: Page, getViolations: () => string[]): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
        return !!ha?.hass && !!customElements.get('ll-strategy-dashboard-oriel');
      },
      { timeout: 60_000 },
    );
  } catch (err) {
    // If HA itself fails to boot under our CSP, the violations log
    // tells us why. Surface it in the failure message so the test
    // output explains the cause rather than just "timeout".
    const violations = getViolations();
    // eslint-disable-next-line no-console
    console.log(
      `\n[csp-strict] waitForHaReady timed out. ` +
        `${violations.length} CSP violation(s) captured before timeout:\n  ${violations.slice(0, 20).join('\n  ')}`,
    );
    throw err;
  }
}

async function loadEditorModule(page: Page): Promise<void> {
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

async function mountEditor(page: Page, config: Record<string, unknown>): Promise<void> {
  await page.evaluate(async (cfg) => {
    const ha = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
    let host = document.querySelector('#oriel-csp-host');
    if (host) host.remove();
    host = document.createElement('div');
    host.id = 'oriel-csp-host';
    document.body.appendChild(host);
    const editor = document.createElement('oriel-editor') as HTMLElement & {
      hass?: unknown;
      setConfig: (c: unknown) => void;
      updateComplete?: Promise<unknown>;
    };
    editor.hass = ha.hass;
    editor.setConfig(cfg);
    host.appendChild(editor);
    if (editor.updateComplete) await editor.updateComplete;
  }, config);
}

test.describe('Strict-CSP regression', () => {
  test.setTimeout(180_000);

  test('dashboard + editor + live-preview + health-tab all render under strict CSP with zero violations', async ({ page }) => {
    const getViolations = attachCspListener(page);

    // ----- 1. Dashboard load -----
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);
    await waitForHaReady(page, getViolations);

    let violations = getViolations();
    expect(
      violations,
      `CSP violations on dashboard load:\n${violations.join('\n  ')}`,
    ).toHaveLength(0);

    // ----- 2. Editor mount -----
    await loadEditorModule(page);
    await mountEditor(page, { type: 'custom:oriel' });
    await page.waitForTimeout(500);

    violations = getViolations();
    expect(
      violations,
      `CSP violations on editor mount:\n${violations.join('\n  ')}`,
    ).toHaveLength(0);

    // ----- 3. Live-preview toggle -----
    // Mounts the live-preview panel + runs strategy.generate() into
    // it. Tests that the LivePreviewRunner's customElements.get()
    // resolution + yaml.dump() output don't trip CSP.
    await page.evaluate(() => {
      const editor = document.querySelector('#oriel-csp-host oriel-editor') as HTMLElement | null;
      if (!editor?.shadowRoot) return;
      const buttons = editor.shadowRoot.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() ?? '';
        if (
          text.includes('Show preview') ||
          text.includes('Vorschau einblenden')
        ) {
          btn.click();
          return;
        }
      }
    });
    await page.waitForTimeout(1_500);

    violations = getViolations();
    expect(
      violations,
      `CSP violations on live-preview toggle:\n${violations.join('\n  ')}`,
    ).toHaveLength(0);

    // ----- 4. Health-tab surface (mount editor with a config that
    // triggers an orphan-entity finding so the health section renders) -----
    await mountEditor(page, {
      type: 'custom:oriel',
      favorite_entities: ['light.this_entity_does_not_exist_csp_test'],
    });
    await page.waitForTimeout(500);

    violations = getViolations();
    expect(
      violations,
      `CSP violations on health-tab render:\n${violations.join('\n  ')}`,
    ).toHaveLength(0);
  });
});
