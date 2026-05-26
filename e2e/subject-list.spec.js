import { test, expect } from '@playwright/test';

test('subject-list shows seeded subjects from API', async ({ page }) => {
  await page.goto('/');

  const subjectList = page.getByTestId('subject-list');
  await expect(subjectList).toBeVisible({ timeout: 15000 });

  await expect(subjectList).toContainText('user-profile');
  await expect(subjectList).toContainText('order-event');
});
