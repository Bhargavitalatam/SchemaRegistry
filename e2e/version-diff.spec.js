import { test, expect } from '@playwright/test';

test('version-diff-view compares two selected user-profile versions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('subject-list')).toBeVisible({ timeout: 15000 });
  await page
    .getByTestId('subject-list')
    .getByRole('button', { name: /^user-profile \(\d+ v\)$/ })
    .click();

  await page.getByTestId('version-1').click();
  await page.getByTestId('version-2').click();

  const diffView = page.getByTestId('version-diff-view');
  await expect(diffView).toBeVisible({ timeout: 15000 });

  // v2 adds "status" compared to v1 — diff should surface that change
  await expect(diffView).toContainText('status');
  await expect(diffView).toContainText('userId');

  // react-diff-viewer highlights additions/changes
  const hasDiffHighlight =
    (await diffView.locator('[class*="diff-added"], [class*="added"]').count()) > 0 ||
    (await diffView.locator('td[style*="background"]').count()) > 0;
  expect(hasDiffHighlight).toBeTruthy();
});
