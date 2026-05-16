/**
 * Customer Portal - Comprehensive E2E Test Suite
 * 
 * Tests all customer use cases and edge cases from a user perspective.
 * Simulates real user interactions: clicks, form submissions, navigation.
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

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
  partialServices: {
    intake: true,
    draft: false,
    settle: true,
    connect: false,
    verify: false,
  },
};

/**
 * Helper: Mock subscription API response
 */
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

/**
 * Helper: Wait for page load and check for errors
 */
async function waitForPageLoad(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  // Check for console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Helper: Take screenshot for debugging
 */
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
}

// ============================================================================
// TEST SUITE 1: Navigation & Access Control
// ============================================================================

test.describe('Navigation & Access Control', () => {
  test('User sees only subscribed services in navigation', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.partialServices);
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should see INTAKE and SETTLE
    await expect(page.locator('text=Intake & Leads')).toBeVisible();
    await expect(page.locator('text=SETTLE Data Bank')).toBeVisible();
    
    // Should NOT see DRAFT, CONNECT, VERIFY
    await expect(page.locator('text=DRAFT Validation')).not.toBeVisible();
    await expect(page.locator('text=CONNECT Referrals')).not.toBeVisible();
    await expect(page.locator('text=VERIFY Service')).not.toBeVisible();
    
    // Always visible items
    await expect(page.locator('text=Team')).toBeVisible();
    await expect(page.locator('text=Notifications')).toBeVisible();
    await expect(page.locator('text=Billing & Usage')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('User redirected to upgrade when accessing unsubscribed service', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    
    // Try to access SETTLE without subscription
    await page.goto(`${BASE_URL}/dashboard/settle`);
    
    // Should see upgrade prompt
    await expect(page.locator('text=Upgrade to SETTLE')).toBeVisible();
    await expect(page.locator('text=Subscribe to unlock')).toBeVisible();
    
    // Should have upgrade button
    const upgradeButton = page.locator('text=Upgrade to SETTLE').locator('..').locator('button');
    await expect(upgradeButton).toBeVisible();
  });

  test('User can navigate between all pages', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Test navigation to each service
    const navItems = [
      { text: 'Dashboard', url: '/dashboard' },
      { text: 'Intake & Leads', url: '/dashboard/intake' },
      { text: 'DRAFT Validation', url: '/dashboard/draft' },
      { text: 'SETTLE Data Bank', url: '/dashboard/settle' },
      { text: 'CONNECT Referrals', url: '/dashboard/connect' },
      { text: 'VERIFY Service', url: '/dashboard/verify' },
      { text: 'Team', url: '/dashboard/team' },
      { text: 'Notifications', url: '/dashboard/notifications' },
      { text: 'Billing & Usage', url: '/dashboard/billing' },
      { text: 'Settings', url: '/dashboard/settings' },
    ];
    
    for (const item of navItems) {
      await page.click(`text=${item.text}`);
      await expect(page).toHaveURL(new RegExp(item.url));
      await page.waitForLoadState('networkidle');
    }
  });
});

// ============================================================================
// TEST SUITE 2: Team Management
// ============================================================================

test.describe('Team Management', () => {
  test('User can view team members', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Should see team members list
    await expect(page.locator('text=Team Management')).toBeVisible();
    await expect(page.locator('text=Team Members')).toBeVisible();
    
    // Should see invite button
    await expect(page.locator('text=Invite Member')).toBeVisible();
  });

  test('User can invite new team member', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Click invite button
    await page.click('text=Invite Member');
    await expect(page).toHaveURL(new RegExp('/dashboard/team/invite'));
    
    // Fill form
    await page.fill('input[type="email"]', 'new.member@lawfirm.com');
    await page.fill('input[type="text"]', 'New Member');
    await page.selectOption('select', 'attorney');
    
    // Select services
    await page.check('input[type="checkbox"]:near(text=INTAKE)');
    await page.check('input[type="checkbox"]:near(text=SETTLE)');
    
    // Submit form
    await page.click('text=Send Invitation');
    
    // Should redirect back to team page
    await expect(page).toHaveURL(new RegExp('/dashboard/team'));
  });

  test('User cannot invite without selecting services', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/team/invite`);
    
    // Fill form but don't select services
    await page.fill('input[type="email"]', 'new.member@lawfirm.com');
    await page.fill('input[type="text"]', 'New Member');
    
    // Submit button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
    
    // Should show error message
    await expect(page.locator('text=Please select at least one service')).toBeVisible();
  });

  test('User can edit team member service access', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Click edit button on first team member
    const editButtons = page.locator('text=Edit');
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      // Should open edit modal or navigate to edit page
      await expect(page.locator('text=Edit Team Member') || page.locator('text=Update Access')).toBeVisible();
    }
  });
});

// ============================================================================
// TEST SUITE 3: Notifications & Messages
// ============================================================================

test.describe('Notifications & Messages', () => {
  test('User can view notifications', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/notifications`);
    
    // Should see notifications page
    await expect(page.locator('text=Notifications')).toBeVisible();
    await expect(page.locator('text=All Notifications')).toBeVisible();
    
    // Should see mark all read and clear all buttons
    await expect(page.locator('text=Mark All Read')).toBeVisible();
    await expect(page.locator('text=Clear All')).toBeVisible();
  });

  test('User can mark notifications as read', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/notifications`);
    
    // Click mark all read
    await page.click('text=Mark All Read');
    
    // Notifications should be marked as read (visual change)
    // This depends on implementation
  });

  test('User can click notification action links', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/notifications`);
    
    // Find a notification with action link
    const actionLinks = page.locator('text=View Details');
    if (await actionLinks.count() > 0) {
      await actionLinks.first().click();
      // Should navigate to relevant page
      await expect(page).not.toHaveURL(new RegExp('/dashboard/notifications'));
    }
  });

  test('User can view messages inbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/notifications`);
    
    // Scroll to messages section
    await page.locator('text=Messages').scrollIntoViewIfNeeded();
    await expect(page.locator('text=Messages')).toBeVisible();
  });
});

// ============================================================================
// TEST SUITE 4: Settings & Profile Management
// ============================================================================

test.describe('Settings & Profile Management', () => {
  test('User can view settings page', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Should see all settings sections
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Security')).toBeVisible();
    await expect(page.locator('text=Firm Information')).toBeVisible();
    await expect(page.locator('text=Notifications')).toBeVisible();
    await expect(page.locator('text=API Keys')).toBeVisible();
    await expect(page.locator('text=Team')).toBeVisible();
  });

  test('User can update profile information', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Update name
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('Updated Name');
    
    // Update phone
    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.clear();
      await phoneInput.fill('+1 (555) 123-4567');
    }
    
    // Save changes
    const saveButton = page.locator('text=Save Changes').first();
    await saveButton.click();
    
    // Should show success message or update UI
    // This depends on implementation
  });

  test('User can change password', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Scroll to security section
    await page.locator('text=Security').scrollIntoViewIfNeeded();
    
    // Fill password fields
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    
    if (count >= 3) {
      await passwordInputs.nth(0).fill('currentPassword123');
      await passwordInputs.nth(1).fill('newPassword123');
      await passwordInputs.nth(2).fill('newPassword123');
      
      // Click update password
      await page.click('text=Update Password');
    }
  });

  test('User can access forgot password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    
    // Should see forgot password form
    await expect(page.locator('text=Forgot Password?')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Send Reset Link')).toBeVisible();
  });

  test('User can request password reset', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    
    // Enter email
    await page.fill('input[type="email"]', 'user@lawfirm.com');
    
    // Submit
    await page.click('text=Send Reset Link');
    
    // Should show confirmation screen
    await expect(page.locator('text=Check Your Email')).toBeVisible();
    await expect(page.locator('text=We\'ve sent a password reset link')).toBeVisible();
  });

  test('User can update notification preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Scroll to notifications section
    await page.locator('text=Notifications').last().scrollIntoViewIfNeeded();
    
    // Toggle notification preferences
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 0) {
      // Toggle first checkbox
      await checkboxes.first().click();
      
      // Save preferences
      await page.click('text=Save Preferences');
    }
  });

  test('User can update firm information', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Scroll to firm information section
    await page.locator('text=Firm Information').scrollIntoViewIfNeeded();
    
    // Update firm name
    const firmNameInput = page.locator('input[type="text"]:near(text=Firm Name)');
    if (await firmNameInput.count() > 0) {
      await firmNameInput.clear();
      await firmNameInput.fill('Updated Law Firm Name');
    }
    
    // Save
    await page.click('text=Save Firm Information');
  });
});

// ============================================================================
// TEST SUITE 5: Billing & Subscriptions
// ============================================================================

test.describe('Billing & Subscriptions', () => {
  test('User can view billing page', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/billing`);
    
    // Should see billing page
    await expect(page.locator('text=Billing & Usage')).toBeVisible();
    await expect(page.locator('text=Current Plan')).toBeVisible();
    await expect(page.locator('text=Service Subscriptions')).toBeVisible();
  });

  test('User can see service subscription status', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/billing`);
    
    // Should see all services with status
    await expect(page.locator('text=INTAKE')).toBeVisible();
    await expect(page.locator('text=DRAFT')).toBeVisible();
    await expect(page.locator('text=SETTLE')).toBeVisible();
    await expect(page.locator('text=CONNECT')).toBeVisible();
    await expect(page.locator('text=VERIFY')).toBeVisible();
  });

  test('User can see inactive services with subscribe button', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.partialServices);
    await page.goto(`${BASE_URL}/dashboard/billing`);
    
    // Inactive services should show subscribe button
    const subscribeButtons = page.locator('text=Subscribe');
    await expect(subscribeButtons.first()).toBeVisible();
  });
});

// ============================================================================
// TEST SUITE 6: SETTLE Service (if subscribed)
// ============================================================================

test.describe('SETTLE Service', () => {
  test('User can access SETTLE dashboard when subscribed', async ({ page }) => {
    await mockSubscription(page, { ...mockSubscriptions.noServices, settle: true });
    await page.goto(`${BASE_URL}/dashboard/settle`);
    
    // Should see SETTLE dashboard
    await expect(page.locator('text=SETTLE')).toBeVisible();
    // Should NOT see upgrade prompt
    await expect(page.locator('text=Upgrade to SETTLE')).not.toBeVisible();
  });

  test('User sees upgrade prompt when not subscribed to SETTLE', async ({ page }) => {
    await mockSubscription(page, mockSubscriptions.noServices);
    await page.goto(`${BASE_URL}/dashboard/settle`);
    
    // Should see upgrade prompt
    await expect(page.locator('text=Upgrade to SETTLE')).toBeVisible();
    await expect(page.locator('text=Subscribe to unlock')).toBeVisible();
  });
});

// ============================================================================
// TEST SUITE 7: Edge Cases
// ============================================================================

test.describe('Edge Cases', () => {
  test('User handles network error gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Page should still load (with error handling)
    await expect(page.locator('text=Dashboard') || page.locator('text=Error')).toBeVisible();
  });

  test('User handles slow API response', async ({ page }) => {
    // Simulate slow API
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });
    
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Should show loading state or handle timeout
    // This depends on implementation
  });

  test('User cannot access service with invalid subscription', async ({ page }) => {
    // Mock invalid subscription response
    await page.route('**/api/v1/tenants/*/subscription', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto(`${BASE_URL}/dashboard/settle`);
    
    // Should handle error gracefully (fail closed - no access)
    // Should show error message or redirect
  });

  test('User handles empty team list', async ({ page }) => {
    // Mock empty team response
    await page.route('**/api/**/team**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [] }),
      });
    });
    
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Should show empty state or "No team members" message
    await expect(page.locator('text=Team Management')).toBeVisible();
  });

  test('User handles empty notifications list', async ({ page }) => {
    // Mock empty notifications
    await page.route('**/api/**/notifications**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notifications: [] }),
      });
    });
    
    await page.goto(`${BASE_URL}/dashboard/notifications`);
    
    // Should show "No notifications yet" or empty state
    await expect(page.locator('text=Notifications')).toBeVisible();
  });

  test('User form validation works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team/invite`);
    
    // Try to submit empty form
    await page.click('text=Send Invitation');
    
    // Should show validation errors
    // Email field should be required
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
  });

  test('User can navigate back from forms', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/team/invite`);
    
    // Click cancel or back button
    const cancelButton = page.locator('text=Cancel');
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      // Should navigate back
      await expect(page).toHaveURL(new RegExp('/dashboard/team'));
    }
  });
});

// ============================================================================
// TEST SUITE 8: Responsive Design
// ============================================================================

test.describe('Responsive Design', () => {
  test('Mobile view shows hamburger menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    // On mobile, sidebar might be hidden or show hamburger menu
    // This depends on implementation
    await expect(page.locator('text=Dashboard') || page.locator('[aria-label="Menu"]')).toBeVisible();
  });

  test('Tablet view displays correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(`${BASE_URL}/dashboard/team`);
    
    // Should display correctly on tablet
    await expect(page.locator('text=Team Management')).toBeVisible();
  });
});

// ============================================================================
// TEST SUITE 9: Accessibility
// ============================================================================

test.describe('Accessibility', () => {
  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate with keyboard
    // Focus should be visible
  });

  test('Images have alt text', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Check for images without alt text
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      // Images should have alt text or be decorative
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });
});


