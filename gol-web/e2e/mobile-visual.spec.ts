import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * モバイルビジュアル確認テスト
 *
 * 目的: スマートフォン対応の修正作業中に、レイアウト崩れをスクリーンショットで確認する。
 * 実行: npm run test:e2e:mobile (dev サーバー起動中に実行)
 *       または npx playwright test e2e/mobile-visual.spec.ts --reporter=html
 * 結果: test-results/ にスクリーンショット保存、playwright-report/ で HTML レポート確認
 *
 * 認証不要なページのみ対象（認証情報を埋め込まない）。
 */
test.describe('モバイルビジュアル確認', () => {
  test.setTimeout(30_000);

  test('ログインページ - モバイル表示', async ({ page }, testInfo) => {
    const res = await page.goto('/login', { waitUntil: 'load', timeout: 20_000 });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(/GOL/);

    await page.screenshot({
      path: path.join('test-results', `login-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test('トップ → ログインへリダイレクト', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'load', timeout: 20_000 });
    expect(res?.status()).toBeLessThan(400);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });
});
