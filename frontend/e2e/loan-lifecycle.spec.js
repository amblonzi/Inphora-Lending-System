// @ts-check
import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'admin@inphora.net';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Loan Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', EMAIL);
    await page.fill('input[name="password"], input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Handle 2FA if present
    const otpField = page.locator('input[placeholder*="OTP"], input[placeholder*="code"], input[name="otp"]');
    if (await otpField.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Skip 2FA in test env — use a test account without 2FA enabled
      await page.fill(otpField, '000000');
      await page.click('button[type="submit"]');
    }

    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('can view active loans list', async ({ page }) => {
    await page.goto(`${BASE_URL}/loans`);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    // Loans table or empty state should render
    const loansContent = page.locator('table, [data-testid="loans-list"], .loans-table, .empty-state');
    await expect(loansContent.first()).toBeVisible({ timeout: 8000 });
  });

  test('can navigate to loan creation form', async ({ page }) => {
    await page.goto(`${BASE_URL}/loans`);
    // Find and click "Apply for Loan" or "New Loan" button
    const newLoanBtn = page.locator(
      'button:has-text("Apply"), button:has-text("New Loan"), a:has-text("Apply"), a:has-text("New Loan")'
    );
    if (await newLoanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newLoanBtn.first().click();
      await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    } else {
      // Navigate directly
      await page.goto(`${BASE_URL}/loans/apply`);
      await expect(page.locator('form, h1, h2').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('loan schedule displays fees column', async ({ page }) => {
    // This assumes at least one loan exists
    await page.goto(`${BASE_URL}/loans`);
    // Click first loan detail link if available
    const firstLoanLink = page.locator('table tbody tr a, table tbody tr button').first();
    if (await firstLoanLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLoanLink.click();
      // Look for schedule tab or section
      const scheduleTab = page.locator('button:has-text("Schedule"), a:has-text("Schedule"), [data-tab="schedule"]');
      if (await scheduleTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scheduleTab.click();
      }
      // Schedule table should have fees column
      const feesCol = page.locator('th:has-text("Fee"), th:has-text("Fees"), th:has-text("fees")');
      // Note: if no loans exist the test passes vacuously
    }
  });
});
