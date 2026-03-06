import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Inphora Lending System - Functional Verification Journey', () => {
    let errors = [];

    // Capture console errors
    test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(`Console Error: ${msg.text()}`);
                console.log(`[Browser Error] ${msg.text()}`);
            }
        });
        page.on('pageerror', exception => {
            errors.push(`Uncaught Exception: ${exception.message}`);
            console.log(`[Uncaught Exception] ${exception.message}`);
        });
        page.on('response', async response => {
            if (response.status() >= 400) {
                const url = response.url();
                const status = response.status();
                let body = '';
                try {
                    body = await response.text();
                } catch (e) {
                    body = 'Could not read body';
                }
                console.log(`[Network Error] ${status} ${url} - Body: ${body}`);
            }
        });
    });

    test('Full User Journey - Nav, Clients, Loans', async ({ page }) => {
        test.setTimeout(60000); // Increase to 60s for full journey
        console.log('Starting full user journey...');

        // 1. Login
        await page.goto('/');
        await page.fill('input[type="email"]', 'admin@inphora.net'); // Using default dev creds or wait for manual intervention if needed
        await page.fill('input[type="password"]', 'admin123'); // Adjust if default creds are different

        console.log('Clicking login button...');
        await page.click('[data-testid="login-button"]');

        // Wait for possible network requests
        await page.waitForTimeout(2000);

        try {
            await expect(page.locator('h1').filter({ hasText: /Dashboard|Overview/i }).or(page.locator('text=Good'))).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.error('Login assertion failed. Current page text:', await page.locator('body').innerText());
            throw e;
        }
        console.log('Logged in successfully.');

        // 2. Nav Link Verification
        const navLinks = [
            { name: 'Dashboard', url: '/' },
            { name: 'Clients', url: '/clients' },
            { name: 'Loans', url: '/loans' },
            { name: 'Expenses', url: '/expenses' },
            { name: 'Branches', url: '/branches' },
            { name: 'Customer Groups', url: '/customer-groups' },
            { name: 'Reports', url: '/reports' }
        ];

        for (const link of navLinks) {
            console.log(`Verifying Navigation: ${link.name}`);
            await page.click(`text=${link.name}`);
            await page.waitForURL(`**${link.url}`, { timeout: 10000 });
            // Add a small delay to let page mount and catch any immediate React errors
            await page.waitForTimeout(1000);

            // Basic sanity check - ensure no "Something went wrong" boundary is hit
            const errorBoundary = await page.locator('text=Something went wrong').count();
            if (errorBoundary > 0) {
                console.error(`Crash detected on route ${link.url}`);
                errors.push(`Crash detected on route ${link.url}`);
            }
        }

        // 3. Create 5 Mock Clients
        console.log('Navigating to Clients to create mock data...');
        await page.click('text=Clients');
        await page.waitForURL('**/clients');

        const timestamp = Date.now().toString().slice(-4);
        const mockClients = [
            { name: `Alpha ${timestamp} 1`, phone: `071100${timestamp}1`, idNum: `ID${timestamp}1`, address: '123 Alpha St' },
            { name: `Alpha ${timestamp} 2`, phone: `071100${timestamp}2`, idNum: `ID${timestamp}2`, address: '456 Beta Rd' },
            { name: `Alpha ${timestamp} 3`, phone: `071100${timestamp}3`, idNum: `ID${timestamp}3`, address: '789 Gamma Av' },
            { name: `Alpha ${timestamp} 4`, phone: `071100${timestamp}4`, idNum: `ID${timestamp}4`, address: '321 Delta Dr' },
            { name: `Alpha ${timestamp} 5`, phone: `071100${timestamp}5`, idNum: `ID${timestamp}5`, address: '654 Epsilon Pl' }
        ];

        for (const [index, client] of mockClients.entries()) {
            console.log(`Creating Client ${index + 1}/5: ${client.name}`);
            await page.click('button:has-text("Add Client"), button:has-text("New Client"), .lucide-plus'); // Adjust selector as needed based on UI
            await page.waitForTimeout(500);

            try {
                // Focus the form to ensure elements are ready
                await page.waitForSelector('form#client-form', { state: 'visible', timeout: 5000 });

                // Fill required fields based on ClientModal.jsx selectors
                await page.fill('input[name="first_name"]', `Test`);
                await page.fill('input[name="last_name"]', client.name);
                await page.fill('input[name="id_number"]', client.idNum);
                await page.fill('input[name="phone"]', client.phone);

                // Switch to Location tab for address (which is required on frontend)
                console.log('Switching to Location tab...');
                await page.click('button:has-text("Location")');
                await page.waitForTimeout(500);
                await page.fill('input[name="address"]', client.address);

                // The submit button is outside the form but linked via 'form' attribute
                console.log('Submitting client form...');
                await page.click('button[form="client-form"][type="submit"], button:has-text("Save Client")');

                // Wait for the modal to close or success toast
                await page.waitForTimeout(2000);

                // If modal is still open, click close
                const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
                if (await closeBtn.isVisible()) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }

            } catch (e) {
                // If the error is 'already exists', it's fine for our seed script purpose
                if (e.message.includes('already exists') || (e.response && e.response.status === 400)) {
                    console.log(`Client ${client.name} already exists. Skipping.`);
                } else {
                    console.error(`Failed automated client creation UI interaction. Error: ${e.message}`);
                    errors.push(`Failed to create client ${client.name} via UI. Error: ${e.message}`);
                }
            }
        }

        // Final Verify: Click Refresh (Recalibrate) to ensure data is synced
        console.log('Refreshing client list...');
        await page.click('button[title="Recalibrate Data"], .lucide-refresh-cw');
        await page.waitForTimeout(2000);

        // Verify that we see at least one of our new clients
        const tableText = await page.locator('table').innerText();
        if (tableText.includes('Alpha')) {
            console.log('Verified: New clients are visible in the directory.');
        } else {
            errors.push('New clients not found in table after creation.');
        }

        // Write final report
        const report = {
            status: errors.length === 0 ? 'success' : 'failed',
            timestamp: new Date().toISOString(),
            errors: errors
        };
        fs.writeFileSync('e2e-report.json', JSON.stringify(report, null, 2));

        if (errors.length > 0) {
            console.error('Test completed with errors.');
            throw new Error(`E2E Journey failed with ${errors.length} errors.`);
        } else {
            console.log('Full User Journey Completed Successfully!');
        }
    });
});
