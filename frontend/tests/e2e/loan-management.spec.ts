import { test, expect } from '@playwright/test';

test.describe('Loan Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new loan application', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Click new loan button
    await page.click('[data-testid="new-loan-btn"]');
    await expect(page.locator('[data-testid="loan-modal"]')).toBeVisible();
    
    // Select client
    await page.click('[data-testid="client-select"]');
    await page.click('[data-testid="client-option"]:first-child');
    
    // Select loan product
    await page.click('[data-testid="product-select"]');
    await page.click('[data-testid="product-option"]:first-child');
    
    // Fill loan details
    await page.fill('[data-testid="loan-amount"]', '15000');
    await page.fill('[data-testid="loan-purpose"]', 'Business expansion');
    
    // Set loan duration
    await page.fill('[data-testid="loan-duration"]', '6');
    
    // Add guarantor
    await page.click('[data-testid="add-guarantor"]');
    await page.fill('[data-testid="guarantor-name"]', 'John Doe');
    await page.fill('[data-testid="guarantor-phone"]', '0712345678');
    await page.fill('[data-testid="guarantor-occupation"]', 'Teacher');
    await page.fill('[data-testid="guarantor-residence"]', 'Nairobi');
    
    // Add collateral
    await page.click('[data-testid="add-collateral"]');
    await page.fill('[data-testid="collateral-name"]', 'Land Title');
    await page.fill('[data-testid="collateral-serial"]', 'LT12345');
    await page.fill('[data-testid="collateral-value"]', '50000');
    
    // Submit loan application
    await page.click('[data-testid="submit-loan"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Loan application created successfully');
    
    // Verify loan appears in the list
    await page.waitForTimeout(1000); // Wait for refresh
    const loanRow = page.locator('[data-testid="loan-row"]:first-child');
    await expect(loanRow).toBeVisible();
    await expect(loanRow.locator('[data-testid="loan-status"]')).toContainText('pending');
  });

  test('should approve a loan application', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Find a pending loan
    const pendingLoan = page.locator('[data-testid="loan-row"][data-status="pending"]:first-child');
    if (await pendingLoan.isVisible()) {
      // Click on the loan
      await pendingLoan.click();
      
      // Wait for loan details page
      await expect(page.locator('[data-testid="loan-details"]')).toBeVisible();
      
      // Click approve button
      await page.click('[data-testid="approve-loan-btn"]');
      
      // Fill approval details
      await page.fill('[data-testid="approval-notes"]', 'Loan approved after review');
      
      // Submit approval
      await page.click('[data-testid="confirm-approval"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify status changed to approved
      await expect(page.locator('[data-testid="loan-status"]')).toContainText('approved');
    }
  });

  test('should disburse an approved loan', async ({ page }) => {
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
      
      // Fill phone number (should be pre-filled with client's phone)
      await expect(page.locator('[data-testid="mpesa-phone"]')).toHaveValue(/07\d{8}/);
      
      // Add notes
      await page.fill('[data-testid="disbursement-notes"]', 'M-Pesa disbursement');
      
      // Submit disbursement
      await page.click('[data-testid="confirm-disbursement"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify status changed to disbursed
      await expect(page.locator('[data-testid="loan-status"]')).toContainText('disbursed');
    }
  });

  test('should process loan repayment', async ({ page }) => {
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
      
      // Fill repayment details
      await page.fill('[data-testid="repayment-amount"]', '3000');
      await page.selectOption('[data-testid="payment-method"]', 'mpesa');
      await page.fill('[data-testid="transaction-id"]', 'MP123456789');
      await page.fill('[data-testid="repayment-notes"]', 'Monthly repayment');
      
      // Submit repayment
      await page.click('[data-testid="confirm-repayment"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify repayment is recorded
      await expect(page.locator('[data-testid="repayment-history"]')).toBeVisible();
      const repaymentRow = page.locator('[data-testid="repayment-row"]:first-child');
      await expect(repaymentRow).toBeVisible();
      await expect(repaymentRow.locator('[data-testid="repayment-amount"]')).toContainText('3000');
    }
  });

  test('should view loan repayment schedule', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Click on a loan
    const loanRow = page.locator('[data-testid="loan-row"]:first-child');
    await loanRow.click();
    
    // Wait for loan details page
    await expect(page.locator('[data-testid="loan-details"]')).toBeVisible();
    
    // Click on schedule tab
    await page.click('[data-testid="schedule-tab"]');
    
    // Verify schedule is displayed
    await expect(page.locator('[data-testid="repayment-schedule"]')).toBeVisible();
    
    // Check schedule table headers
    await expect(page.locator('th:has-text("Installment")')).toBeVisible();
    await expect(page.locator('th:has-text("Due Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Amount")')).toBeVisible();
    await expect(page.locator('th:has-text("Balance")')).toBeVisible();
    
    // Verify schedule rows
    const scheduleRows = page.locator('[data-testid="schedule-row"]');
    await expect(scheduleRows.first()).toBeVisible();
  });

  test('should search and filter loans', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForTimeout(500); // Wait for search results
    
    // Verify search results
    const searchResults = page.locator('[data-testid="loan-row"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first()).toBeVisible();
    }
    
    // Test status filter
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-option-approved"]');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter-approved"]')).toBeVisible();
    
    // Test date range filter
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    await page.click('[data-testid="apply-date-filter"]');
    
    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
  });

  test('should export loan data', async ({ page }) => {
    // Navigate to loans page
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('/loans');
    
    // Click export button
    await page.click('[data-testid="export-btn"]');
    
    // Select export format
    await page.click('[data-testid="export-format-excel"]');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
