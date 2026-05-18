/**
 * Service-Specific E2E Tests
 * Tests for SETTLE, CONNECT, VERIFY, INTAKE, and DRAFT services
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3031';
const AUTH_BYPASS = '?preview=bypass';

// Mock subscription data
const mockSubscriptions = {
  allServices: {
    intake: true,
    draft: true,
    settle: true,
    connect: true,
    verify: true,
  },
  noServices: {
    intake: false,
    draft: false,
    settle: false,
    connect: false,
    verify: false,
  },
};

async function mockSubscription(page: Page, subscription: typeof mockSubscriptions.allServices) {
  await page.route('**/api/v1/tenants/*/subscription', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tenantId: 'test-tenant-uuid',
        services: subscription,
        plan: 'professional',
        expiresAt: null,
      }),
    });
  });
}

// ============================================================================
// SETTLE Service Tests
// ============================================================================

test.describe('SETTLE Service', () => {
  test('User can query settlement range', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, settle: true });
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`);
    
    // Should see query form
    await expect(page.locator('text=Settlement Range Query')).toBeVisible();
    
    // Fill form
    await page.fill('input[name="injuryType"]', 'Motor Vehicle Accident');
    await page.fill('input[name="medicalBills"]', '50000');
    await page.fill('input[name="jurisdiction"]', 'California');
    
    // Submit query
    await page.click('text=Get Estimate');
    
    // Should see results or loading state
    // This depends on implementation
  });

  test('User can contribute case data', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, settle: true });
    await page.goto(`${BASE_URL}/dashboard/settle/contribute${AUTH_BYPASS}`);
    
    // Should see contribution form
    await expect(page.locator('text=Contribute Case Data')).toBeVisible();
    
    // Fill form
    await page.fill('input[name="injuryType"]', 'Slip and Fall');
    await page.fill('input[name="medicalBills"]', '30000');
    await page.fill('input[name="settlementRange"]', '50000-75000');
    
    // Check consent
    await page.check('input[type="checkbox"]');
    
    // Submit
    await page.click('text=Submit Contribution');
    
    // Should see success message or redirect
  });

  test('User can view and download reports', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, settle: true });
    await page.goto(`${BASE_URL}/dashboard/settle/reports${AUTH_BYPASS}`);
    
    // Should see reports page
    await expect(page.locator('text=SETTLE Reports')).toBeVisible();
    
    // Should see report list or empty state
    await expect(
      page.locator('text=No reports yet') || 
      page.locator('text=Generated Reports')
    ).toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to SETTLE', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/settle${AUTH_BYPASS}`);
    
    await expect(page.locator('text=Upgrade to SETTLE')).toBeVisible();
    await expect(page.locator('text=Subscribe to unlock')).toBeVisible();
  });
});

// ============================================================================
// CONNECT Service Tests
// ============================================================================

test.describe('CONNECT Service', () => {
  test('User can view referrals list', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, connect: true });
    await page.goto(`${BASE_URL}/dashboard/connect/referrals${AUTH_BYPASS}`);
    
    // Should see referrals page
    await expect(page.locator('text=Referrals')).toBeVisible();
    await expect(page.locator('text=Create Referral')).toBeVisible();
  });

  test('User can create new referral', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, connect: true });
    await page.goto(`${BASE_URL}/dashboard/connect/referrals/new${AUTH_BYPASS}`);
    
    // Should see create referral form
    await expect(page.locator('text=Create Referral')).toBeVisible();
    
    // Fill form
    await page.fill('input[name="referringAttorneyName"]', 'John Doe');
    await page.fill('input[name="referringAttorneyEmail"]', 'john@lawfirm.com');
    await page.fill('input[name="caseType"]', 'Personal Injury');
    await page.fill('input[name="estimatedValue"]', '100000');
    
    // Submit
    await page.click('text=Submit Referral');
    
    // Should redirect to referrals list or show success
  });

  test('User can view payouts', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, connect: true });
    await page.goto(`${BASE_URL}/dashboard/connect/payouts${AUTH_BYPASS}`);
    
    // Should see payouts page
    await expect(page.locator('text=Payouts')).toBeVisible();
    await expect(
      page.locator('text=No payouts yet') || 
      page.locator('text=Total Payouts')
    ).toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to CONNECT', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/connect${AUTH_BYPASS}`);
    
    await expect(page.locator('text=Upgrade to CONNECT')).toBeVisible();
  });
});

// ============================================================================
// VERIFY Service Tests
// ============================================================================

test.describe('VERIFY Service', () => {
  test('User can access VERIFY dashboard', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, verify: true });
    await page.goto(`${BASE_URL}/dashboard/verify${AUTH_BYPASS}`);
    
    // Should see VERIFY dashboard
    await expect(page.locator('text=VERIFY')).toBeVisible();
    // Should NOT see upgrade prompt
    await expect(page.locator('text=Upgrade to VERIFY')).not.toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to VERIFY', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/verify${AUTH_BYPASS}`);
    
    await expect(page.locator('text=Upgrade to VERIFY')).toBeVisible();
    await expect(page.locator('text=Subscribe to unlock')).toBeVisible();
  });
});

// ============================================================================
// INTAKE Service Tests
// ============================================================================

test.describe('INTAKE Service', () => {
  test('User can access INTAKE dashboard', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, intake: true });
    await page.goto(`${BASE_URL}/dashboard/intake${AUTH_BYPASS}`);
    
    // Should see INTAKE dashboard
    await expect(page.locator('text=Intake') || page.locator('text=Leads')).toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to INTAKE', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/intake${AUTH_BYPASS}`);
    
    await expect(page.locator('text=Upgrade to INTAKE')).toBeVisible();
  });
});

// ============================================================================
// DRAFT Service Tests
// ============================================================================

test.describe('DRAFT Service', () => {
  test('User can access DRAFT dashboard', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, draft: true });
    await page.goto(`${BASE_URL}/dashboard/draft${AUTH_BYPASS}`);
    
    // Should see DRAFT dashboard
    await expect(page.locator('text=DRAFT') || page.locator('text=Validation')).toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to DRAFT', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/draft${AUTH_BYPASS}`);
    
    await expect(page.locator('text=Upgrade to DRAFT')).toBeVisible();
  });
});

// ============================================================================
// Cross-Service Tests
// ============================================================================

test.describe('Cross-Service Integration', () => {
  test('User can navigate between all subscribed services', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard${AUTH_BYPASS}`);
    
    // Navigate to each service
    const services = [
      { name: 'Intake & Leads', url: '/dashboard/intake' },
      { name: 'DRAFT Validation', url: '/dashboard/draft' },
      { name: 'SETTLE Data Bank', url: '/dashboard/settle' },
      { name: 'CONNECT Referrals', url: '/dashboard/connect' },
      { name: 'VERIFY Service', url: '/dashboard/verify' },
    ];
    
    for (const service of services) {
      await page.click(`text=${service.name}`);
      await expect(page).toHaveURL(new RegExp(service.url));
      await page.waitForLoadState('networkidle');
    }
  });

  test('User subscription changes reflect immediately in UI', async ({ page }) => {
    // Start with no subscriptions
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard${AUTH_BYPASS}`);
    
    // SETTLE should not be visible
    await expect(page.locator('text=SETTLE Data Bank')).not.toBeVisible();
    
    // Update subscription
    await mockSubscription(page, { ...mockSubscriptions.noServices, settle: true });
    await page.reload();
    
    // SETTLE should now be visible
    await expect(page.locator('text=SETTLE Data Bank')).toBeVisible();
  });
});

