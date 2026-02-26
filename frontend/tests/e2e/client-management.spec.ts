import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@inphora.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new client', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Click new client button
    await page.click('[data-testid="new-client-btn"]');
    await expect(page.locator('[data-testid="client-modal"]')).toBeVisible();
    
    // Fill personal information
    await page.fill('[data-testid="client-first-name"]', 'Jane');
    await page.fill('[data-testid="client-last-name"]', 'Smith');
    await page.fill('[data-testid="client-email"]', 'jane.smith@test.com');
    await page.fill('[data-testid="client-phone"]', '0723456789');
    await page.fill('[data-testid="client-id-number"]', '87654321');
    await page.fill('[data-testid="client-address"]', '123 Test Street, Nairobi');
    
    // Select branch and group
    await page.click('[data-testid="branch-select"]');
    await page.click('[data-testid="branch-option"]:first-child');
    
    await page.click('[data-testid="group-select"]');
    await page.click('[data-testid="group-option"]:first-child');
    
    // Fill M-Pesa details
    await page.fill('[data-testid="mpesa-phone"]', '0723456789');
    await page.selectOption('[data-testid="preferred-disbursement"]', 'mpesa');
    
    // Add next of kin
    await page.click('[data-testid="add-next-of-kin"]');
    await page.fill('[data-testid="kin-name"]', 'John Smith');
    await page.fill('[data-testid="kin-phone"]', '0712345678');
    await page.fill('[data-testid="kin-relationship"]', 'Spouse');
    
    // Submit client form
    await page.click('[data-testid="submit-client"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Client created successfully');
    
    // Verify client appears in the list
    await page.waitForTimeout(1000); // Wait for refresh
    const clientRow = page.locator('[data-testid="client-row"]:first-child');
    await expect(clientRow).toBeVisible();
    await expect(clientRow.locator('[data-testid="client-name"]')).toContainText('Jane Smith');
  });

  test('should edit existing client', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Click on first client
    const clientRow = page.locator('[data-testid="client-row"]:first-child');
    await clientRow.click();
    
    // Wait for client details page
    await expect(page.locator('[data-testid="client-details"]')).toBeVisible();
    
    // Click edit button
    await page.click('[data-testid="edit-client-btn"]');
    
    // Modify client information
    await page.fill('[data-testid="client-phone"]', '0798765432');
    await page.fill('[data-testid="client-address"]', '456 Updated Address, Nairobi');
    
    // Save changes
    await page.click('[data-testid="save-client"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify changes are saved
    await expect(page.locator('[data-testid="client-phone"]')).toHaveValue('0798765432');
  });

  test('should view client details and loan history', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Click on first client
    const clientRow = page.locator('[data-testid="client-row"]:first-child');
    await clientRow.click();
    
    // Wait for client details page
    await expect(page.locator('[data-testid="client-details"]')).toBeVisible();
    
    // Verify client information is displayed
    await expect(page.locator('[data-testid="client-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-contact"]')).toBeVisible();
    
    // Check loan history section
    await expect(page.locator('[data-testid="loan-history"]')).toBeVisible();
    
    // If client has loans, verify loan details
    const loanRows = page.locator('[data-testid="client-loan-row"]');
    if (await loanRows.count() > 0) {
      await expect(loanRows.first()).toBeVisible();
      await expect(page.locator('th:has-text("Loan ID")')).toBeVisible();
      await expect(page.locator('th:has-text("Amount")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
    }
  });

  test('should upload KYC documents', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Click on first client
    const clientRow = page.locator('[data-testid="client-row"]:first-child');
    await clientRow.click();
    
    // Wait for client details page
    await expect(page.locator('[data-testid="client-details"]')).toBeVisible();
    
    // Click on documents tab
    await page.click('[data-testid="documents-tab"]');
    
    // Click upload document button
    await page.click('[data-testid="upload-document-btn"]');
    
    // Wait for upload modal
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // Select document type
    await page.selectOption('[data-testid="document-type"]', 'id-card');
    
    // Upload file (mock file upload)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-files/sample-id-card.jpg');
    
    // Add description
    await page.fill('[data-testid="document-description"]', 'Client ID card - front side');
    
    // Upload document
    await page.click('[data-testid="confirm-upload"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify document appears in list
    await expect(page.locator('[data-testid="document-row"]')).toBeVisible();
  });

  test('should search and filter clients', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'John');
    await page.waitForTimeout(500); // Wait for search results
    
    // Verify search results
    const searchResults = page.locator('[data-testid="client-row"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first()).toBeVisible();
    }
    
    // Test branch filter
    await page.click('[data-testid="branch-filter"]');
    await page.click('[data-testid="branch-option"]:first-child');
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filter"]')).toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
  });

  test('should handle client validation', async ({ page }) => {
    // Navigate to clients page
    await page.click('[data-testid="nav-clients"]');
    await page.waitForURL('/clients');
    
    // Click new client button
    await page.click('[data-testid="new-client-btn"]');
    
    // Try to submit without required fields
    await page.click('[data-testid="submit-client"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="error-first-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-last-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-phone"]')).toBeVisible();
    
    // Test duplicate email validation
    await page.fill('[data-testid="client-first-name"]', 'Test');
    await page.fill('[data-testid="client-last-name"]', 'User');
    await page.fill('[data-testid="client-email"]', 'admin@inphora.com'); // Existing email
    await page.fill('[data-testid="client-phone"]', '0712345678');
    
    await page.click('[data-testid="submit-client"]');
    
    // Should show duplicate email error
    await expect(page.locator('[data-testid="error-duplicate-email"]')).toBeVisible();
  });
});
