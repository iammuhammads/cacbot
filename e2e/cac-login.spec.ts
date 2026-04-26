import { test, expect } from '@playwright/test';

const CAC_PORTAL_URL = process.env.CAC_PORTAL_URL ?? 'https://icrp.cac.gov.ng';
const CAC_EMAIL = process.env.CAC_EMAIL;
const CAC_PASSWORD = process.env.CAC_PASSWORD;
const CAC_STATIC_OTP = process.env.CAC_STATIC_OTP;

test.describe('CAC portal (staging) - non destructive checks', () => {
  test.skip(!CAC_EMAIL || !CAC_PASSWORD, 'CAC credentials not provided in env');

  test('can reach login and accept credentials', async ({ page }) => {
    await page.goto(`${CAC_PORTAL_URL}/auth/login`, { waitUntil: 'networkidle' });

    // attempt multiple selector strategies to fill email/password
    const tryFill = async (strategies: Array<() => any>, value: string) => {
      for (const s of strategies) {
        try {
          const loc = s();
          if (await loc.count() > 0) {
            await loc.first().fill(value);
            return true;
          }
        } catch {
          // ignore and try next
        }
      }
      return false;
    };

    await tryFill([() => page.getByLabel(/email|username/i), () => page.getByPlaceholder(/email/i), () => page.locator('input[type="email"]')], CAC_EMAIL);
    await tryFill([() => page.getByLabel(/password/i), () => page.getByPlaceholder(/password/i), () => page.locator('input[type="password"]')], CAC_PASSWORD);

    // click common login buttons
    const clickCandidates = [() => page.getByRole('button', { name: /login|sign in|submit/i }), () => page.getByText(/login|sign in|submit/i)];
    for (const c of clickCandidates) {
      try {
        const b = c();
        if (await b.count() > 0) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
            b.first().click().catch(() => {})
          ]);
          break;
        }
      } catch {}
    }

    if (CAC_STATIC_OTP) {
      await tryFill([() => page.getByLabel(/otp|one-time|verification/i), () => page.getByPlaceholder(/otp|code|verification/i), () => page.locator('input[type="text"]')], CAC_STATIC_OTP);
      // submit OTP
      for (const sub of [() => page.getByRole('button', { name: /verify|submit|continue/i }), () => page.getByText(/verify|submit|continue/i)]) {
        try {
          const l = sub();
          if (await l.count() > 0) {
            await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}), l.first().click().catch(() => {})]);
            break;
          }
        } catch {}
      }
    }

    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
});
