/**
 * Test Report Generator
 * Generates comprehensive test report from Playwright results
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export function generateTestReport(resultsPath: string, outputPath: string) {
  try {
    const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    
    const suites: TestSuite[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    // Process test results
    for (const suite of results.suites || []) {
      const suiteTests: TestResult[] = [];
      let suitePassed = 0;
      let suiteFailed = 0;
      let suiteSkipped = 0;
      let suiteDuration = 0;

      for (const test of suite.specs?.[0]?.tests || []) {
        const testResult: TestResult = {
          title: test.title,
          status: test.results[0]?.status || 'skipped',
          duration: test.results[0]?.duration || 0,
          error: test.results[0]?.error?.message,
        };

        suiteTests.push(testResult);
        suiteDuration += testResult.duration;

        if (testResult.status === 'passed') suitePassed++;
        else if (testResult.status === 'failed') suiteFailed++;
        else suiteSkipped++;
      }

      suites.push({
        name: suite.title,
        tests: suiteTests,
        passed: suitePassed,
        failed: suiteFailed,
        skipped: suiteSkipped,
        duration: suiteDuration,
      });

      totalPassed += suitePassed;
      totalFailed += suiteFailed;
      totalSkipped += suiteSkipped;
      totalDuration += suiteDuration;
    }

    // Generate HTML report
    const html = generateHTMLReport(suites, {
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
    });

    writeFileSync(outputPath, html, 'utf-8');
    console.log(`Test report generated: ${outputPath}`);
  } catch (error) {
    console.error('Error generating test report:', error);
  }
}

function generateHTMLReport(suites: TestSuite[], totals: any): string {
  const passRate = ((totals.totalPassed / (totals.totalPassed + totals.totalFailed)) * 100).toFixed(1);
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>Customer Portal - E2E Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h3 { margin: 0 0 10px 0; color: #666; }
    .card .value { font-size: 32px; font-weight: bold; }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .skipped { color: #f59e0b; }
    .suite { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .test { padding: 10px; margin: 5px 0; border-left: 4px solid #e5e7eb; background: #f9fafb; }
    .test.passed { border-left-color: #10b981; }
    .test.failed { border-left-color: #ef4444; }
    .test.skipped { border-left-color: #f59e0b; }
    .error { color: #ef4444; font-size: 12px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Customer Portal - E2E Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="card">
      <h3>Total Tests</h3>
      <div class="value">${totals.totalPassed + totals.totalFailed + totals.totalSkipped}</div>
    </div>
    <div class="card">
      <h3>Passed</h3>
      <div class="value passed">${totals.totalPassed}</div>
    </div>
    <div class="card">
      <h3>Failed</h3>
      <div class="value failed">${totals.totalFailed}</div>
    </div>
    <div class="card">
      <h3>Pass Rate</h3>
      <div class="value">${passRate}%</div>
    </div>
  </div>

  ${suites.map(suite => `
    <div class="suite">
      <div class="suite-header">
        <h2>${suite.name}</h2>
        <div>
          <span class="passed">✓ ${suite.passed}</span>
          <span class="failed">✗ ${suite.failed}</span>
          <span class="skipped">⊘ ${suite.skipped}</span>
          <span style="margin-left: 20px;">${(suite.duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
      ${suite.tests.map(test => `
        <div class="test ${test.status}">
          <strong>${test.title}</strong>
          <span style="float: right; color: #666;">${(test.duration / 1000).toFixed(2)}s</span>
          ${test.error ? `<div class="error">Error: ${test.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`;
}


