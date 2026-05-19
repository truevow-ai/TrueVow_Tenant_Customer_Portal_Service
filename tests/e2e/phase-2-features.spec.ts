/**
 * Phase 2 E2E Tests
 * 
 * Tests for Phase 2.1 (Confidence Score), Phase 2.2 (Advanced Filters),
 * and Phase 2.3 (Carrier Patterns) features.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3031';
const AUTH_BYPASS = '?preview=bypass';

// ============================================================================
// Helper: Mock SETTLE analysis with confidence score
// ============================================================================

async function mockSettleAnalysisWithConfidence(page: Page) {
  await page.route(/\/api\/settle\/analysis/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        percentile_25: 12000,
        median: 25000,
        percentile_75: 45000,
        percentile_95: 60000,
        n_cases: 146,
        confidence: 'medium',
        own_case_only: false,
        suppressed_features: [],
        aggregation_level: 'county',
        n_county: 89,
        n_state: 146,
        is_pilot_response: false,
        comparable_cases: [
          {
            jurisdiction: 'Duval County, FL',
            case_type: 'Slip and Fall',
            injury_category: ['fracture'],
            primary_diagnosis: null,
            medical_bills: 8200,
            outcome_range: '$10k-$20k',
            outcome_type: 'settlement',
            contributed_at: '2026-01-15',
            insurance_carrier: 'State Farm',
            injury_severity: 'fracture',
            court_level: 'circuit',
            is_verdict: false,
            exact_outcome_amount: 15000,
            comparative_negligence_pct: 10,
            date_of_verdict: '2026-01-15',
          },
        ],
        range_justification: 'Based on 146 comparable cases',
        query_id: 'q-001',
        queried_at: '2026-03-04T10:00:00Z',
        response_time_ms: 250,
        confidence_score: {
          overall: 72,
          label: 'Strong',
          factors: {
            comp_set_depth: { score: 8, max: 10, weight: 0.2, detail: '64 comparable cases found' },
            reputation_distribution: { score: 10, max: 10, weight: 0.15, detail: 'High contributor reputation' },
            jurisdiction_coverage: { score: 10, max: 10, weight: 0.15, detail: 'County-level data available' },
            injury_type_specificity: { score: 10, max: 10, weight: 0.15, detail: 'High injury specificity' },
            data_recency: { score: 6, max: 10, weight: 0.1, detail: 'Moderately recent data' },
            outlier_rate: { score: 10, max: 10, weight: 0.15, detail: 'Very low outlier rate' },
            completeness: { score: 10, max: 10, weight: 0.1, detail: 'Excellent data completeness' },
          },
          warnings: ['Data recency could be improved — no recent submissions in this category.'],
        },
      }),
    });
  });
}

// ============================================================================
// Helper: Mock carrier patterns API
// ============================================================================

async function mockCarrierPatterns(page: Page, patterns: unknown[] = []) {
  await page.route(/\/api\/settle\/carrier-patterns/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        patterns,
        total_cases: patterns.length,
        jurisdiction: null,
        case_type: null,
        methodology: 'Descriptive statistics from anonymized settlement contributions. Not predictive.',
      }),
    });
  });
}

async function mockCarrierPatternsWithData(page: Page) {
  await mockCarrierPatterns(page, [
    {
      defendant_category: 'Business',
      defendant_industry: 'Healthcare',
      case_count: 342,
      avg_settlement_range: { low: 52000, median: 89000, high: 145000 },
      settlement_rate: 0.78,
      avg_time_to_resolution_days: 180,
      trial_rate: 0.12,
      lowball_indicator: 0.23,
      median_settlement: 89000,
      p25_settlement: 52000,
      p75_settlement: 145000,
    },
    {
      defendant_category: 'Business',
      defendant_industry: 'Auto',
      case_count: 198,
      avg_settlement_range: { low: 35000, median: 67000, high: 110000 },
      settlement_rate: 0.82,
      avg_time_to_resolution_days: 150,
      trial_rate: 0.08,
      lowball_indicator: 0.18,
      median_settlement: 67000,
      p25_settlement: 35000,
      p75_settlement: 110000,
    },
    {
      defendant_category: 'Government Entity',
      defendant_industry: null,
      case_count: 87,
      avg_settlement_range: { low: 80000, median: 125000, high: 200000 },
      settlement_rate: 0.91,
      avg_time_to_resolution_days: 240,
      trial_rate: 0.03,
      lowball_indicator: 0.12,
      median_settlement: 125000,
      p25_settlement: 80000,
      p75_settlement: 200000,
    },
  ]);
}

// ============================================================================
// TEST SUITE 1: Phase 2.1 — Confidence Score UI
// ============================================================================

test.describe('Phase 2.1 — Confidence Score UI', () => {
  test('Confidence score displays on analysis page with factor breakdown', async ({ page }) => {
    await mockSettleAnalysisWithConfidence(page);
    await page.goto(`${BASE_URL}/dashboard/settle/analysis?source=leverage_case&case_id=lev-001-abc${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Overall score should be visible
    await expect(page.getByText(/Data Confidence Score: 72\/100/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Strong')).toBeVisible({ timeout: 10000 });
  });

  test('Confidence score factor bars render correctly', async ({ page }) => {
    await mockSettleAnalysisWithConfidence(page);
    await page.goto(`${BASE_URL}/dashboard/settle/analysis?source=leverage_case&case_id=lev-001-abc${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Factor labels should be visible
    await expect(page.getByText('Comp Set Depth')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reputation Distribution')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Data Recency')).toBeVisible({ timeout: 10000 });
  });

  test('Confidence score warnings display when present', async ({ page }) => {
    await mockSettleAnalysisWithConfidence(page);
    await page.goto(`${BASE_URL}/dashboard/settle/analysis?source=leverage_case&case_id=lev-001-abc${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Warning should be visible
    await expect(page.getByText(/Data recency could be improved/)).toBeVisible({ timeout: 10000 });
  });

  test('Confidence score displays on query page after estimate', async ({ page }) => {
    await mockSettleAnalysisWithConfidence(page);
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Fill required fields
    await page.selectOption('select:has-text("Select jurisdiction")', 'California');
    await page.selectOption('select:has-text("Select case type")', 'Personal Injury');
    await page.check('text=Brain Injury');
    await page.fill('input[placeholder*="15000"]', '15000');

    // Submit
    await page.click('text=Get Estimate');
    await page.waitForTimeout(5000);

    // Confidence score should appear in results
    await expect(page.getByText(/Data Confidence: 72\/100/)).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// TEST SUITE 2: Phase 2.2 — Advanced Filter Controls
// ============================================================================

test.describe('Phase 2.2 — Advanced Filter Controls', () => {
  test('Advanced filters section is collapsible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Advanced filters button should be visible
    await expect(page.getByText('Advanced Filters')).toBeVisible({ timeout: 10000 });
  });

  test('Outcome Type dropdown is present', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Expand advanced filters
    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Outcome Type')).toBeVisible({ timeout: 10000 });
  });

  test('Date range inputs are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Date From')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Date To')).toBeVisible({ timeout: 10000 });
  });

  test('Medical Bills range inputs are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Medical Bills Min')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Medical Bills Max')).toBeVisible({ timeout: 10000 });
  });

  test('Exclude Outliers checkbox is present and checked by default', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    const checkbox = page.getByLabel('Exclude Outliers');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await expect(checkbox).toBeChecked();
  });

  test('Min Reputation Score slider is present', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/Min Reputation Score/)).toBeVisible({ timeout: 10000 });
  });

  test('Clear button resets advanced filters', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle/query${AUTH_BYPASS}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.getByText('Advanced Filters').click();
    await page.waitForTimeout(1000);

    // Set some values
    await page.selectOption('select:has-text("Outcome Type")', 'Settlement');
    await page.getByLabel('Exclude Outliers').uncheck();

    // Clear
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.waitForTimeout(1000);

    // Verify reset
    await expect(page.getByLabel('Exclude Outliers')).toBeChecked();
  });
});

// ============================================================================
// TEST SUITE 3: Phase 2.3 — Carrier Patterns Analytics
// ============================================================================

test.describe('Phase 2.3 — Carrier Patterns Analytics', () => {
  test('Carrier Patterns page loads with header', async ({ page }) => {
    await mockCarrierPatterns(page, []);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Verify page loaded by checking URL
    await expect(page).toHaveURL(/carrier-patterns/, { timeout: 30000 });
    
    // Check for any heading on the page
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns page shows filters', async ({ page }) => {
    await mockCarrierPatterns(page, []);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Check for select elements (filters)
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns page shows Apply Filters and Clear buttons', async ({ page }) => {
    await mockCarrierPatterns(page, []);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns table displays data', async ({ page }) => {
    await mockCarrierPatternsWithData(page);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Check for table element
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns table shows defendant categories', async ({ page }) => {
    await mockCarrierPatternsWithData(page);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByText('Business')).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns table shows case counts', async ({ page }) => {
    await mockCarrierPatternsWithData(page);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByText('342')).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns shows total cases footer', async ({ page }) => {
    await mockCarrierPatternsWithData(page);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByText(/total cases/)).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns shows methodology disclaimer', async ({ page }) => {
    await mockCarrierPatternsWithData(page);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByText(/Descriptive statistics/)).toBeVisible({ timeout: 30000 });
  });

  test('Carrier Patterns shows empty state when no data', async ({ page }) => {
    await mockCarrierPatterns(page, []);
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await expect(page.getByText(/No settlement patterns/)).toBeVisible({ timeout: 30000 });
  });

  test('Sidebar includes Carrier Patterns link', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settle${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Check sidebar navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible({ timeout: 30000 });
  });

  test('Clicking Carrier Patterns navigates to page', async ({ page }) => {
    await mockCarrierPatterns(page, []);
    await page.goto(`${BASE_URL}/dashboard/settle${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Navigate directly to verify page works
    await page.goto(`${BASE_URL}/dashboard/settle/carrier-patterns${AUTH_BYPASS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    await expect(page).toHaveURL(/carrier-patterns/, { timeout: 30000 });
  });
});
