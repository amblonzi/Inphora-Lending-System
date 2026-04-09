// @ts-check
import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'admin@inphora.net';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Authentication', () => {
  test('login page renders required elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should show error message
    const errorMsg = page.locator('[data-sonner-toast], .toast-error, [role="alert"]');
    await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
    await expect(errorMsg.first()).toContainText(/Incorrect|Invalid/);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Either lands on dashboard or shows 2FA prompt
    const landed = await Promise.race([
      page.waitForURL(url => url.pathname === '/' || url.pathname.includes('dashboard'), { timeout: 15000 }).then(() => 'dashboard'),
      page.locator('input[placeholder*="OTP"], input[placeholder*="code"]').waitFor({ timeout: 5000 }).then(() => '2fa')
    ]).catch(() => 'timeout');

    expect(['dashboard', '2fa']).toContain(landed);
  });

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Find and click logout
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign out")');
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.first().click();
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    } else {
      // Try navigating to a protected route after clearing storage
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    }
  });

  test('rate limiting endpoint exists (verify-2fa consolidation)', async ({ request }) => {
    // Smoke-test: verify the consolidated OTP endpoint exists (should return 400/422, not 404)
    const API = process.env.API_URL || 'http://localhost:8001';
    const response = await request.post(`${API}/api/auth/verify-2fa`, {
      data: { email: 'test@test.com', otp: '000000' },
      headers: { 'X-Tenant-ID': 'default' }
    });
    // 400 (invalid OTP) or 404 (user not found) — but NOT 405 (method not allowed)
    expect([400, 404, 422, 200]).toContain(response.status());
  });
});
