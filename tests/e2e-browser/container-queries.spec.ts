// ====================================================================
// E2E — Container-query scaling
// ====================================================================
// Verifies the cards' container-query infrastructure resolves to
// valid CSS values across mobile and desktop viewports. Regression
// guard for the CQ system landed in v2.0.
//
// We don't assert exact pixel values — they depend on which CQ
// bucket the card's actual rendered width falls into, which is a
// function of HA's sections layout and the user's viewport. We
// assert:
//   1. The CSS custom properties resolve to non-empty values at
//      every viewport width (the cards bind them at `:host` and at
//      every `@container` rule, so something always wins).
//   2. The resolved value parses as a valid px length (sanity check).
// ====================================================================

import { test, expect } from '@playwright/test';

const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;
const DASHBOARD_PATH = process.env.HA_DASHBOARD_URL_PATH || 'dashboard-simon42';

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

// Resolve a CSS custom property on the first matching oriel zone-
// presence card, piercing shadow boundaries. Returns the string the
// browser computed for the property at that viewport.
async function readCardCssVar(page: import('@playwright/test').Page, varName: string): Promise<string> {
  return page.evaluate((name) => {
    function findInShadow(root: Document | ShadowRoot, sel: string): Element | null {
      if ('querySelector' in root) {
        const direct = root.querySelector(sel);
        if (direct) return direct;
        const all = root.querySelectorAll('*');
        for (const el of all) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) {
            const found = findInShadow(sr, sel);
            if (found) return found;
          }
        }
      }
      return null;
    }
    const card = findInShadow(document, 'oriel-zone-presence-card');
    if (!card) return '';
    return getComputedStyle(card).getPropertyValue(name).trim();
  }, varName);
}

const PX = /^\d+(\.\d+)?px$/;

test.describe('container-query scaling', () => {
  test('zone-presence card resolves --oriel-* tokens at desktop + mobile', async ({ page }) => {
    // Desktop width.
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/${DASHBOARD_PATH}/0`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await page.waitForTimeout(2_500);
    const desktopIconWrap = await readCardCssVar(page, '--oriel-icon-wrap');
    const desktopPadBlock = await readCardCssVar(page, '--oriel-pad-block');

    // Mobile width.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(800);
    const mobileIconWrap = await readCardCssVar(page, '--oriel-icon-wrap');
    const mobilePadBlock = await readCardCssVar(page, '--oriel-pad-block');

    // eslint-disable-next-line no-console
    console.log(`[cq] zone-presence desktop: icon-wrap="${desktopIconWrap}" pad-block="${desktopPadBlock}"`);
    // eslint-disable-next-line no-console
    console.log(`[cq] zone-presence mobile:  icon-wrap="${mobileIconWrap}"  pad-block="${mobilePadBlock}"`);

    // Both viewports must resolve every token to a valid px length —
    // proves the cascade of :host defaults + @container overrides
    // never leaves a property undefined.
    for (const v of [desktopIconWrap, mobileIconWrap, desktopPadBlock, mobilePadBlock]) {
      expect(v, `expected a px length, got "${v}"`).toMatch(PX);
    }
  });
});
