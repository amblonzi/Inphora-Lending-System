import { test, expect } from '@playwright/test';

test.describe('M-Pesa Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should show M-Pesa registration page', async ({ page }) => {
    // Navigate to public registration page
    await page.goto('/register');
    
    // Verify registration form is displayed
    await expect(page.locator('h1')).toContainText('Register for Loan');
    await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('[data-testid="full-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone"]')).toBeVisible();
    await expect(page.locator('[data-testid="id-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="address"]')).toBeVisible();
    
    // Verify M-Pesa branding
    await expect(page.locator('[data-testid="mpesa-logo"]')).toBeVisible();
    await expect(page.locator('text=M-Pesa Registration')).toBeVisible();
  });

  test('should submit M-Pesa registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[data-testid="full-name"]', 'John Doe');
    await page.fill('[data-testid="phone"]', '0712345678');
    await page.fill('[data-testid="id-number"]', '12345678');
    await page.fill('[data-testid="email"]', 'john.doe@test.com');
    await page.fill('[data-testid="address"]', '123 Test Street, Nairobi');
    
    // Submit registration
    await page.click('[data-testid="submit-registration"]');
    
    // Verify payment instructions are shown
    await expect(page.locator('[data-testid="payment-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="paybill-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="account-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="registration-fee"]')).toBeVisible();
    
    // Verify M-Pesa payment details
    await expect(page.locator('text=Paybill Number')).toBeVisible();
    await expect(page.locator('text=Account Number')).toBeVisible();
    await expect(page.locator('text=Amount')).toBeVisible();
  });

  test('should handle M-Pesa loan disbursement', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Find an approved loan
    const approvedLoan = page.locator('[data-testid="loan-row"][data-status="approved"]:first-child');
    if (await approvedLoan.isVisible()) {
      // Click on the loan
      await approvedLoan.click();
      
      // Wait for loan details page
      await expect(page.locator('[data-testid="loan-details"]')).toBeVisible();
      
      // Click disburse button
      await page.click('[data-testid="disburse-loan-btn"]');
      
      // Wait for disbursement modal
      await expect(page.locator('[data-testid="disbursement-modal"]')).toBeVisible();
      
      // Select M-Pesa disbursement
      await page.click('[data-testid="disbursement-method-mpesa"]');
      
      // Verify M-Pesa specific fields
      await expect(page.locator('[data-testid="mpesa-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="mpesa-instructions"]')).toBeVisible();
      
      // Fill phone number
      await page.fill('[data-testid="mpesa-phone"]', '0712345678');
      
      // Add notes
      await page.fill('[data-testid="disbursement-notes"]', 'M-Pesa disbursement to client');
      
      // Submit disbursement
      await page.click('[data-testid="confirm-disbursement"]');
      
      // Verify success message with M-Pesa reference
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('M-Pesa');
      
      // Verify transaction details
      await expect(page.locator('[data-testid="transaction-reference"]')).toBeVisible();
      await expect(page.locator('[data-testid="mpesa-confirmation"]')).toBeVisible();
    }
  });

  test('should process M-Pesa loan repayment', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Find an active loan
    const activeLoan = page.locator('[data-testid="loan-row"][data-status="disbursed"]:first-child');
    if (await activeLoan.isVisible()) {
      // Click on the loan
      await activeLoan.click();
      
      // Wait for loan details page
      await expect(page.locator('[data-testid="loan-details"]')).toBeVisible();
      
      // Click repay button
      await page.click('[data-testid="repay-loan-btn"]');
      
      // Wait for repayment modal
      await expect(page.locator('[data-testid="repayment-modal"]')).toBeVisible();
      
      // Select M-Pesa payment method
      await page.selectOption('[data-testid="payment-method"]', 'mpesa');
      
      // Verify M-Pesa specific fields
      await expect(page.locator('[data-testid="transaction-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="mpesa-instructions"]')).toBeVisible();
      
      // Fill repayment details
      await page.fill('[data-testid="repayment-amount"]', '3000');
      await page.fill('[data-testid="transaction-id"]', 'MP123456789');
      await page.fill('[data-testid="repayment-notes"]', 'M-Pesa repayment');
      
      // Submit repayment
      await page.click('[data-testid="confirm-repayment"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('M-Pesa');
      
      // Verify repayment is recorded with M-Pesa details
      await expect(page.locator('[data-testid="repayment-history"]')).toBeVisible();
      const repaymentRow = page.locator('[data-testid="repayment-row"]:first-child');
      await expect(repaymentRow).toBeVisible();
      await expect(repaymentRow.locator('[data-testid="payment-method"]')).toContainText('M-Pesa');
    }
  });

  test('should display M-Pesa transaction history', async ({ page }) => {
    // Navigate to reports page
    await page.click('[data-testid="nav-reports"]');
    await page.waitForURL('/reports');
    
    // Click on M-Pesa transactions
    await page.click('[data-testid="mpesa-transactions"]');
    
    // Verify M-Pesa transactions page
    await expect(page.locator('h1')).toContainText('M-Pesa Transactions');
    await expect(page.locator('[data-testid="transactions-table"]')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("Transaction ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Amount")')).toBeVisible();
    await expect(page.locator('th:has-text("Phone")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    
    // Test filtering
    await page.click('[data-testid="transaction-type-filter"]');
    await page.click('[data-testid="filter-disbursement"]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter-disbursement"]')).toBeVisible();
    
    // Test date range filter
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    await page.click('[data-testid="apply-date-filter"]');
    
    // Export M-Pesa transactions
    await page.click('[data-testid="export-btn"]');
    await page.click('[data-testid="export-format-csv"]');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/mpesa-transactions.*\.csv$/);
  });

  test('should handle M-Pesa callback simulation', async ({ page }) => {
    // This test would typically be done at the API level
    // But we can test the UI updates when callbacks are processed
    
    // Navigate to a specific loan page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Find a loan with pending M-Pesa transaction
    const pendingLoan = page.locator('[data-testid="loan-row"][data-mpesa-status="pending"]:first-child');
    if (await pendingLoan.isVisible()) {
      // Click on the loan
      await pendingLoan.click();
      
      // Wait for loan details page
      await expect(page.locator('[data-testid="loan-details"]')).toBeVisible();
      
      // Check for M-Pesa status indicator
      await expect(page.locator('[data-testid="mpesa-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="mpesa-status"]')).toContainText('pending');
      
      // Simulate receiving callback (this would normally be done via API)
      // For UI testing, we can manually trigger a refresh
      await page.click('[data-testid="refresh-status"]');
      
      // Wait for status update
      await page.waitForTimeout(2000);
      
      // Verify status is updated (this depends on the callback being processed)
      const mpesaStatus = page.locator('[data-testid="mpesa-status"]');
      await expect(mpesaStatus).toBeVisible();
    }
  });

  test('should show M-Pesa integration settings', async ({ page }) => {
    // Navigate to settings page
    await page.click('[data-testid="nav-settings"]');
    await page.waitForURL('/settings');
    
    // Click on M-Pesa settings
    await page.click('[data-testid="mpesa-settings"]');
    
    // Verify M-Pesa settings page
    await expect(page.locator('h1')).toContainText('M-Pesa Settings');
    await expect(page.locator('[data-testid="mpesa-config"]')).toBeVisible();
    
    // Check configuration fields
    await expect(page.locator('[data-testid="paybill-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="api-key"]')).toBeVisible();
    await expect(page.locator('[data-testid="callback-url"]')).toBeVisible();
    
    // Test configuration update (if user has permissions)
    const saveButton = page.locator('[data-testid="save-mpesa-config"]');
    if (await saveButton.isVisible()) {
      await page.fill('[data-testid="paybill-number"]', '123456');
      await page.click(saveButton);
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    }
  });
});
