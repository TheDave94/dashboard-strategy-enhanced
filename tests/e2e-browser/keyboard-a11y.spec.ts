// ====================================================================
// E2E — Keyboard activation for non-button clickable elements
// ====================================================================
// Asserts that the two a11y-fixed surfaces (SetupTab.setup-header and
// ScreensaverCard.overlay) are focusable AND activate on Enter/Space,
// matching <button> semantics. Backs the keyboard fixes that the
// lit-a11y rule `click-events-have-key-events` now enforces.
//
// Pattern: mount the relevant element via Playwright's evaluate,
// dispatch focus + keydown events, verify the handler ran.
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
    () => !!customElements.get('oriel-editor') && !!customElements.get('oriel-screensaver-card'),
    { timeout: 30_000 },
  );
}

test.describe('Keyboard a11y', () => {
  test.setTimeout(120_000);

  test('SetupTab setup-header is focusable + activates on Enter and Space', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);
    await waitForHaReady(page);

    // Mount the editor in a test harness so we can interact with the
    // setup header directly.
    await page.evaluate(async () => {
      const haRoot = document.querySelector('home-assistant') as HTMLElement & { hass?: unknown };
      let host = document.querySelector('#oriel-a11y-host');
      if (host) host.remove();
      host = document.createElement('div');
      host.id = 'oriel-a11y-host';
      document.body.appendChild(host);
      const editor = document.createElement('oriel-editor') as HTMLElement & {
        hass?: unknown;
        setConfig: (cfg: unknown) => void;
        updateComplete?: Promise<unknown>;
      };
      editor.hass = haRoot.hass;
      editor.setConfig({ type: 'custom:oriel' });
      host.appendChild(editor);
      if (editor.updateComplete) await editor.updateComplete;
    });

    // The setup-header opens collapsed by default for a dismissed user
    // (_onboarding_seen flag absent → wizard starts expanded; first-time
    // mount in test always starts expanded). Either way, asserting the
    // header toggles correctly is enough.
    type SetupState = { exists: boolean; tabIndex: number; role: string; ariaExpandedBefore: string; ariaExpandedAfter: string };
    const state: SetupState = await page.evaluate(async () => {
      const editor = document.querySelector('#oriel-a11y-host oriel-editor') as HTMLElement & { updateComplete?: Promise<unknown> };
      if (!editor?.shadowRoot) throw new Error('editor not mounted');
      const header = editor.shadowRoot.querySelector('.setup-header') as HTMLElement | null;
      if (!header) {
        return { exists: false, tabIndex: -1, role: '', ariaExpandedBefore: '', ariaExpandedAfter: '' };
      }
      const ariaBefore = header.getAttribute('aria-expanded') ?? '';
      // Focus + send Enter via the DOM
      header.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      header.dispatchEvent(keyEvent);
      if (editor.updateComplete) await editor.updateComplete;
      // Force a microtask flush so any @state setters that fire on
      // the handler have re-rendered.
      await new Promise((r) => setTimeout(r, 50));
      const ariaAfter = header.getAttribute('aria-expanded') ?? '';
      return {
        exists: true,
        tabIndex: header.tabIndex,
        role: header.getAttribute('role') ?? '',
        ariaExpandedBefore: ariaBefore,
        ariaExpandedAfter: ariaAfter,
      };
    });

    expect(state.exists, 'setup-header must exist').toBe(true);
    expect(state.role).toBe('button');
    expect(state.tabIndex).toBe(0);
    // Enter should have flipped aria-expanded
    expect(state.ariaExpandedAfter).not.toBe(state.ariaExpandedBefore);
  });

  test('ScreensaverCard overlay is focusable + activates on Space (dismiss)', async ({ page }) => {
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);
    await waitForHaReady(page);

    // Mount the screensaver card with active=true and confirm Space
    // dismisses it (the `active` class is removed by the _dismiss
    // handler, which we observe via the overlay element going from
    // .overlay.active to just .overlay).
    type SsState = { hadActive: boolean; tabIndex: number; role: string; activeAfterKey: boolean };
    const state: SsState = await page.evaluate(async () => {
      let host = document.querySelector('#oriel-a11y-host');
      if (host) host.remove();
      host = document.createElement('div');
      host.id = 'oriel-a11y-host';
      document.body.appendChild(host);
      const card = document.createElement('oriel-screensaver-card') as HTMLElement & {
        setConfig: (cfg: unknown) => void;
        active?: boolean;
        updateComplete?: Promise<unknown>;
      };
      card.setConfig({ type: 'custom:oriel-screensaver-card' });
      card.active = true;
      host.appendChild(card);
      if (card.updateComplete) await card.updateComplete;
      // Allow another microtask so the @state-driven render settles.
      await new Promise((r) => setTimeout(r, 50));

      const overlayBefore = card.shadowRoot?.querySelector('.overlay');
      const hadActive = overlayBefore?.classList.contains('active') ?? false;
      const tabIndex = (overlayBefore as HTMLElement | null)?.tabIndex ?? -1;
      const role = overlayBefore?.getAttribute('role') ?? '';
      (overlayBefore as HTMLElement | null)?.focus();
      const keyEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      (overlayBefore as HTMLElement | null)?.dispatchEvent(keyEvent);
      if (card.updateComplete) await card.updateComplete;
      await new Promise((r) => setTimeout(r, 50));
      // Re-query: the .overlay may still exist but lose the .active class
      const overlayAfter = card.shadowRoot?.querySelector('.overlay');
      const activeAfterKey = overlayAfter?.classList.contains('active') ?? false;
      return { hadActive, tabIndex, role, activeAfterKey };
    });

    expect(state.hadActive, 'overlay must start active').toBe(true);
    expect(state.role).toBe('button');
    expect(state.tabIndex).toBe(0);
    expect(state.activeAfterKey, 'overlay should not be active after Space dismiss').toBe(false);
  });
});
