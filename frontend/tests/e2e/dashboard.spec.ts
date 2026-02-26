import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display dashboard metrics', async ({ page }) => {
    // Check key metrics are displayed
    await expect(page.locator('[data-testid="total-loans"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-loans"]')).toBeVisible();
    await expect(page.locator('[data-testid="portfolio-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="repayment-rate"]')).toBeVisible();
  });

  test('should display recent loans table', async ({ page }) => {
    // Check recent loans section
    await expect(page.locator('[data-testid="recent-loans"]')).toBeVisible();
    await expect(page.locator('[data-testid="loans-table"]')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("Client")')).toBeVisible();
    await expect(page.locator('th:has-text("Amount")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
  });

  test('should display charts and graphs', async ({ page }) => {
    // Check if charts are rendered
    await expect(page.locator('[data-testid="loan-portfolio-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="repayment-trend-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="loan-status-chart"]')).toBeVisible();
  });

  test('should allow navigation to different sections', async ({ page }) => {
    // Test navigation menu
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    await expect(page.locator('h1')).toContainText('Loans');
    
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    await expect(page.locator('h1')).toContainText('Clients');
    
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show notifications', async ({ page }) => {
    // Click notifications icon
    await page.click('[data-testid="notifications"]');
    
    // Check notifications dropdown
    await expect(page.locator('[data-testid="notifications-dropdown"]')).toBeVisible();
    
    // Should show notification items or empty state
    const notifications = page.locator('[data-testid="notification-item"]');
    if (await notifications.count() > 0) {
      await expect(notifications.first()).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="no-notifications"]')).toBeVisible();
    }
  });

  test('should display quick actions', async ({ page }) => {
    // Check quick action buttons
    await expect(page.locator('[data-testid="new-loan-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-client-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-reports-btn"]')).toBeVisible();
    
    // Test new loan button
    await page.click('[data-testid="new-loan-btn"]');
    await expect(page.locator('[data-testid="loan-modal"]')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test navigation in mobile
    await page.click('[data-testid="mobile-nav-loans"]');
    await page.waitForURL('/loans');
  });
});
