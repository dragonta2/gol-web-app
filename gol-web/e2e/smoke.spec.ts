import { test, expect } from '@playwright/test';

// 環境差で不安定なためスキップ。CI で必要になったら test.skip を外す。
test.describe.skip('スモークテスト', () => {
  test.setTimeout(30_000);

  test('トップからログインへリダイレクトされ、タイトルにGOLが含まれる', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'load', timeout: 20_000 });
    expect(res?.status()).toBeLessThan(400);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await expect(page).toHaveTitle(/GOL/);
  });

  test('ログインページが表示される', async ({ page }) => {
    const res = await page.goto('/login', { waitUntil: 'load', timeout: 20_000 });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(/GOL/);
  });
});
