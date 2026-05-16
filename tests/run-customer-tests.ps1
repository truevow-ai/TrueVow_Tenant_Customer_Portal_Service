# Customer Portal - Automated E2E Test Runner
# Runs comprehensive customer use case and edge case tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Customer Portal - E2E Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Playwright is installed
Write-Host "Checking Playwright installation..." -ForegroundColor Yellow
$playwrightInstalled = Get-Command npx -ErrorAction SilentlyContinue

if (-not $playwrightInstalled) {
    Write-Host "Error: npx not found. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

# Install Playwright if not already installed
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install --with-deps chromium

# Create reports directory
Write-Host "Creating reports directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tests\reports" | Out-Null
New-Item -ItemType Directory -Force -Path "tests\screenshots" | Out-Null

# Set environment variables
$env:TEST_BASE_URL = "http://localhost:3001"
$env:CI = "false"

# Run tests
Write-Host ""
Write-Host "Running E2E tests..." -ForegroundColor Green
Write-Host ""

npx playwright test tests/e2e/customer-use-cases.spec.ts --reporter=list,html,json

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "All tests passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "View HTML report: tests/reports/html/index.html" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Some tests failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "View HTML report: tests/reports/html/index.html" -ForegroundColor Yellow
    exit 1
}


