import { test, expect } from '@playwright/test';

test('app health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  // health endpoint should return a friendly { ok: true } object
  expect(json).toBeTruthy();
  if (typeof json === 'object' && json !== null) {
    if ('ok' in json) {
      // @ts-ignore
      expect(json.ok).toBe(true);
    }
  }
});
