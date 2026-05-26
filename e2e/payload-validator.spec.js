import { test, expect } from '@playwright/test';

test('payload validator shows success and structured errors for order-event', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('subject-list')).toBeVisible({ timeout: 15000 });
  await page
    .getByTestId('subject-list')
    .getByRole('button', { name: /^order-event \(\d+ v\)$/ })
    .click();

  const input = page.getByTestId('payload-validator-input');
  const output = page.getByTestId('payload-validator-output');
  const button = page.getByTestId('payload-validator-button');

  await input.fill(JSON.stringify({ orderId: 'ord-1', amount: 99.5 }, null, 2));
  await button.click();

  await expect(output.getByTestId('payload-validator-success')).toBeVisible({ timeout: 10000 });
  await expect(output).toContainText('valid');

  await input.fill(JSON.stringify({ orderId: 'ord-1', amount: 'not-a-number' }, null, 2));
  await button.click();

  await expect(output.getByTestId('payload-validator-errors')).toBeVisible({ timeout: 10000 });
  await expect(output.getByTestId('payload-validator-error-item').first()).toContainText('amount');
});
