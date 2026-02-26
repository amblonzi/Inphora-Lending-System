import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to login successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if login page is displayed
    await expect(page.locator('h1')).toContainText('Welcome Back');
    
    // Fill in login credentials
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Verify dashboard is loaded
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should support two-factor authentication', async ({ page }) => {
    await page.goto('/');
    
    // Login with 2FA enabled user
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Check if 2FA screen appears (if enabled)
    const otpInput = page.locator('input[placeholder*="OTP"]');
    if (await otpInput.isVisible()) {
      await otpInput.fill('123456');
      await page.click('button:has-text("Verify")');
      
      // Should navigate to dashboard after successful 2FA
      await page.waitForURL('/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
    }
  });

  test('should allow user to logout', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Click user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login page
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });
});
