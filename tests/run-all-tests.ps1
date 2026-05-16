# Comprehensive Test Runner - All Tests
# Runs E2E, Database CRUD, API Integration, and all functionality tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Comprehensive Test Suite - All Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Playwright is installed
Write-Host "Checking Playwright installation..." -ForegroundColor Yellow
$playwrightInstalled = Get-Command npx -ErrorAction SilentlyContinue

if (-not $playwrightInstalled) {
    Write-Host "Error: npx not found. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

# Create reports directory
Write-Host "Creating reports directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tests\reports" | Out-Null
New-Item -ItemType Directory -Force -Path "tests\screenshots" | Out-Null
New-Item -ItemType Directory -Force -Path "tests\backend" | Out-Null

# Set environment variables
$env:TEST_BASE_URL = "http://localhost:3001"
$env:API_BASE_URL = "http://localhost:8002"
$env:SETTLE_API_URL = "http://localhost:8002"
$env:CONNECT_API_URL = "http://localhost:8003"
$env:CI = "false"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Running E2E Tests (Customer Portal UI)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
npx playwright test tests/e2e/
$e2eExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Running Database CRUD Tests" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
npx playwright test tests/backend/database-crud-tests.spec.ts
$crudExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Running API Integration Tests" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
npx playwright test tests/backend/api-integration-tests.spec.ts
$apiExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Execution Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($e2eExitCode -eq 0) {
    Write-Host "E2E Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "E2E Tests: SOME FAILURES" -ForegroundColor Yellow
}

if ($crudExitCode -eq 0) {
    Write-Host "Database CRUD Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "Database CRUD Tests: SOME FAILURES" -ForegroundColor Yellow
}

if ($apiExitCode -eq 0) {
    Write-Host "API Integration Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "API Integration Tests: SOME FAILURES" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "View HTML report: tests/reports/html/index.html" -ForegroundColor Cyan
Write-Host ""

# Overall exit code
if (($e2eExitCode -eq 0) -and ($crudExitCode -eq 0) -and ($apiExitCode -eq 0)) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "All tests completed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Some tests had failures. Check reports." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    exit 1
}

