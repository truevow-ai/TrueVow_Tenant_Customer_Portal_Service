# Customer Portal - E2E Testing Guide

**Version:** 1.0.0  
**Last Updated:** January 4, 2026  
**Framework:** Playwright  
**Coverage:** All customer use cases and edge cases

---

## 📋 Overview

This comprehensive E2E test suite simulates real customer interactions with the Customer Portal, testing:

- ✅ Navigation and access control
- ✅ Team management
- ✅ Notifications & messages
- ✅ Settings & profile management
- ✅ Billing & subscriptions
- ✅ Service-specific features (SETTLE, CONNECT, VERIFY, INTAKE, DRAFT)
- ✅ Edge cases (errors, empty states, network issues)
- ✅ Responsive design
- ✅ Accessibility

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\Truevow-Customer-Portal
npm install
npx playwright install --with-deps chromium
```

### 2. Start Services

**Terminal 1: Customer Portal**
```powershell
npm run dev
```

**Terminal 2: SETTLE Service (if testing SETTLE features)**
```powershell
cd ..\2025-TrueVow-Settle-Service
python -m uvicorn app.main:app --reload --port 8002
```

### 3. Run Tests

**Run all tests:**
```powershell
npm run test:e2e
```

**Run with UI (interactive):**
```powershell
npm run test:e2e:ui
```

**Run in headed mode (see browser):**
```powershell
npm run test:e2e:headed
```

**Run using PowerShell script:**
```powershell
.\tests\run-customer-tests.ps1
```

**View test report:**
```powershell
npm run test:e2e:report
```

---

## 📊 Test Coverage

### Test Suites

1. **Navigation & Access Control** (3 tests)
   - Subscription-based navigation visibility
   - Upgrade prompts for unsubscribed services
   - Page navigation flow

2. **Team Management** (4 tests)
   - View team members
   - Invite new team member
   - Form validation
   - Edit team member access

3. **Notifications & Messages** (4 tests)
   - View notifications
   - Mark as read
   - Click action links
   - Messages inbox

4. **Settings & Profile Management** (7 tests)
   - View settings
   - Update profile
   - Change password
   - Forgot password flow
   - Notification preferences
   - Firm information
   - API key management

5. **Billing & Subscriptions** (3 tests)
   - View billing page
   - Service subscription status
   - Subscribe to services

6. **SETTLE Service** (2 tests)
   - Access with subscription
   - Upgrade prompt without subscription

7. **Edge Cases** (8 tests)
   - Network errors
   - Slow API responses
   - Invalid subscriptions
   - Empty states
   - Form validation
   - Navigation back
   - Error handling

8. **Responsive Design** (2 tests)
   - Mobile view
   - Tablet view

9. **Accessibility** (2 tests)
   - Keyboard navigation
   - Image alt text

**Total: 35+ test scenarios**

---

## 🎯 Test Scenarios

### Use Case 1: New User Onboarding

```
1. User signs up → Redirected to dashboard
2. User sees only subscribed services (none initially)
3. User navigates to billing → Sees upgrade options
4. User subscribes to SETTLE → Service becomes visible
5. User accesses SETTLE → Can use features
```

### Use Case 2: Team Collaboration

```
1. User navigates to Team page
2. User clicks "Invite Member"
3. User fills form (email, name, role, services)
4. User submits → Invitation sent
5. User views team list → New member appears
```

### Use Case 3: Profile Management

```
1. User navigates to Settings
2. User updates profile information
3. User changes password
4. User updates notification preferences
5. User saves → Changes applied
```

### Use Case 4: Service Access Control

```
1. User without SETTLE subscription tries to access /dashboard/settle
2. User sees upgrade prompt
3. User clicks "Upgrade" → Redirected to billing
4. User subscribes → Can now access SETTLE
```

### Use Case 5: Notifications

```
1. User receives notification
2. User navigates to Notifications page
3. User sees unread notification
4. User clicks notification → Navigates to relevant page
5. User marks all as read → Notifications updated
```

---

## 🔍 Edge Cases Tested

### Error Handling

- ✅ Network failures (API calls fail)
- ✅ Slow API responses (timeout handling)
- ✅ Invalid subscription data
- ✅ Server errors (500 responses)
- ✅ Missing data (empty responses)

### Form Validation

- ✅ Required fields
- ✅ Email format validation
- ✅ Password strength
- ✅ Service selection requirements
- ✅ Empty form submission

### Empty States

- ✅ No team members
- ✅ No notifications
- ✅ No subscriptions
- ✅ No service data

### Navigation

- ✅ Back button from forms
- ✅ Cancel actions
- ✅ Deep linking
- ✅ Direct URL access

---

## 📁 Test Files Structure

```
tests/
├── e2e/
│   ├── customer-use-cases.spec.ts    # Main test suite
│   ├── settle-service.spec.ts         # SETTLE-specific tests
│   ├── connect-service.spec.ts        # CONNECT-specific tests
│   ├── verify-service.spec.ts         # VERIFY-specific tests
│   └── playwright.config.ts          # Playwright configuration
├── run-customer-tests.ps1             # PowerShell test runner
├── test-report-generator.ts           # Report generator
├── reports/                            # Test reports (generated)
│   ├── html/                           # HTML reports
│   ├── json/                           # JSON results
│   └── junit.xml                       # JUnit XML
└── screenshots/                        # Failure screenshots
```

---

## 🛠️ Configuration

### Environment Variables

Create `.env.test`:

```bash
TEST_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SETTLE_API_URL=http://localhost:8002
NEXT_PUBLIC_CONNECT_API_URL=http://localhost:8003
NEXT_PUBLIC_VERIFY_API_URL=http://localhost:8004
```

### Playwright Config

See `tests/e2e/playwright.config.ts` for:
- Browser configurations (Chrome, Firefox, Safari)
- Mobile device emulation
- Screenshot/video capture
- Retry logic
- Reporter settings

---

## 📈 Test Reports

### HTML Report

After running tests, view the HTML report:

```powershell
npm run test:e2e:report
```

Or open: `tests/reports/html/index.html`

### Report Contents

- ✅ Test summary (passed/failed/skipped)
- ✅ Test duration
- ✅ Error messages
- ✅ Screenshots (on failure)
- ✅ Video recordings (on failure)
- ✅ Test traces (for debugging)

---

## 🐛 Debugging Failed Tests

### 1. Run in Headed Mode

```powershell
npm run test:e2e:headed
```

### 2. Use Playwright Inspector

```powershell
npx playwright test --debug
```

### 3. Check Screenshots

Failed tests automatically capture screenshots:
- Location: `tests/screenshots/`
- Format: `{test-name}.png`

### 4. View Test Traces

```powershell
npx playwright show-trace trace.zip
```

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/reports/html
```

---

## 📝 Adding New Tests

### Test Template

```typescript
test.describe('Feature Name', () => {
  test('User can perform action', async ({ page }) => {
    // Setup
    await mockSubscription(page, mockSubscriptions.allServices);
    await page.goto(`${BASE_URL}/dashboard/feature`);
    
    // Action
    await page.click('text=Button');
    
    // Assertion
    await expect(page.locator('text=Expected Result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names** - "User can [action] when [condition]"
2. **Mock external dependencies** - Don't rely on real APIs
3. **Test user flows** - Not just individual components
4. **Include edge cases** - Error states, empty data, etc.
5. **Keep tests independent** - Each test should run standalone
6. **Use page objects** - For complex pages (optional)

---

## ✅ Test Checklist

Before marking tests complete:

- [ ] All navigation flows tested
- [ ] All form submissions tested
- [ ] All error states tested
- [ ] All empty states tested
- [ ] Subscription access control tested
- [ ] Mobile responsive tested
- [ ] Accessibility basics tested
- [ ] Test reports generated
- [ ] All tests passing

---

## 🎉 Success Criteria

Tests are considered successful when:

1. ✅ **All tests pass** (100% pass rate)
2. ✅ **No console errors** in browser
3. ✅ **No network errors** (except intentional mocks)
4. ✅ **All user flows complete** end-to-end
5. ✅ **Edge cases handled** gracefully
6. ✅ **Reports generated** successfully

---

## 📞 Support

For issues or questions:
- Check test output for error messages
- Review screenshots in `tests/screenshots/`
- Check Playwright documentation: https://playwright.dev
- Review test code in `tests/e2e/`

---

**Last Updated:** January 4, 2026  
**Test Coverage:** 35+ scenarios  
**Framework:** Playwright 1.40.0

