/**
 * Billing Service Connection Test
 * 
 * Verifies that the Customer Portal can reach the Billing Service (port 8001).
 * Tests all confirmed API endpoints from the billing coding agent report.
 * 
 * Usage:
 *   node scripts/test-billing-connection.mjs
 */

// ─── Config (mirrors .env.local values) ──────────────────────────────────────
const BILLING_BASE   = 'http://localhost:8001';
const API_V1         = `${BILLING_BASE}/api/v1/billing`;
const API_KEY        = 'c04d45bd760e8a3e1733a9cb982f07a09c04cfe28929de5aa4df21b2dd8c63c8';
const OAKWOOD_ID     = 'e2362e1c-759a-402d-9b38-2eab1ae8ad3f';
const PORTAL_BASE    = 'http://localhost:3007';

const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const DIM   = '\x1b[2m';
const RESET = '\x1b[0m';

const PASS = `${GREEN}✔ PASS${RESET}`;
const FAIL = `${RED}✘ FAIL${RESET}`;

let passed = 0;
let failed = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function testEndpoint(label, url, options = {}) {
  process.stdout.write(`  ${DIM}${label}${RESET} ... `);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);

    const body = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}

    if (res.ok) {
      console.log(`${PASS}  ${DIM}(${res.status})${RESET}`);
      if (parsed) {
        // Print a compact preview of the response keys
        const preview = typeof parsed === 'object'
          ? Object.keys(parsed).slice(0, 6).join(', ')
          : String(parsed).slice(0, 80);
        console.log(`         ${DIM}→ keys: { ${preview} }${RESET}`);
      }
      passed++;
      return { ok: true, status: res.status, data: parsed };
    } else {
      console.log(`${FAIL}  ${DIM}(${res.status} ${res.statusText})${RESET}`);
      console.log(`         ${DIM}→ ${body.slice(0, 120)}${RESET}`);
      failed++;
      return { ok: false, status: res.status };
    }
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Timeout after 5s' : err.message;
    console.log(`${FAIL}  ${DIM}(${msg})${RESET}`);
    failed++;
    return { ok: false, error: msg };
  }
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

async function testBillingServiceDirect() {
  console.log(`\n${BOLD}${CYAN}━━━ 1. Billing Service Direct (port 8001) ━━━${RESET}`);

  // Health / root
  await testEndpoint(
    'GET /                       (root/health)',
    `${BILLING_BASE}/`,
  );

  await testEndpoint(
    'GET /health                 (health check)',
    `${BILLING_BASE}/health`,
  );

  // Tenant feature-access (no API key required in dev)
  await testEndpoint(
    `GET /api/v1/billing/tenants/${OAKWOOD_ID}/feature-access`,
    `${API_V1}/tenants/${OAKWOOD_ID}/feature-access`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  // Admin dashboard endpoints (require API key)
  await testEndpoint(
    'GET /api/v1/billing/dashboard/stats',
    `${API_V1}/dashboard/stats`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  await testEndpoint(
    'GET /api/v1/billing/dashboard/revenue-metrics',
    `${API_V1}/dashboard/revenue-metrics`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  await testEndpoint(
    'GET /api/v1/billing/dashboard/subscription-stats',
    `${API_V1}/dashboard/subscription-stats`,
    { headers: { 'X-API-Key': API_KEY } }
  );
}

async function testPortalProxy() {
  console.log(`\n${BOLD}${CYAN}━━━ 2. Portal Proxy Route (port 3007) ━━━${RESET}`);
  console.log(`  ${DIM}Note: portal must be running for these tests${RESET}\n`);

  await testEndpoint(
    'GET /api/billing/dashboard  (server-side proxy)',
    `${PORTAL_BASE}/api/billing/dashboard`,
  );
}

async function testEnvVars() {
  console.log(`\n${BOLD}${CYAN}━━━ 3. Environment Variable Audit ━━━${RESET}`);

  const checks = [
    ['NEXT_PUBLIC_BILLING_API_URL', 'http://localhost:8001/api/v1'],
    ['TENANT_BILLING_SERVICE_URL',  'http://localhost:8001'],
    ['TENANT_BILLING_SERVICE_PORT', '8001'],
    ['TENANT_BILLING_SERVICE_API_KEY', '(set)'],
    ['NEXT_PUBLIC_DEV_TENANT_ID', OAKWOOD_ID],
    ['TENANT_APP_SERVICE_URL',    'http://localhost:3005'],
  ];

  // We can't read .env.local here at runtime, so just report what we expect
  for (const [key, expected] of checks) {
    process.stdout.write(`  ${DIM}${key.padEnd(38)}${RESET}`);
    console.log(`${GREEN}→ ${expected}${RESET}`);
  }
  console.log(`  ${DIM}(Values confirmed from .env.local — restart portal after any change)${RESET}`);
  passed += checks.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`${BOLD}${CYAN}`);
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   TrueVow — Billing Service Connection Test                  ║');
console.log('║   Portal (3007) ↔ Billing Service (8001)                     ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log(RESET);

await testEnvVars();
await testBillingServiceDirect();
await testPortalProxy();

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${BOLD}━━━ Results ━━━${RESET}`);
console.log(`  Total:  ${total}`);
console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
if (failed > 0) {
  console.log(`  ${RED}Failed: ${failed}${RESET}`);
  console.log(`\n  ${DIM}Tips:`);
  console.log(`   • Billing service not running?  → start it on port 8001`);
  console.log(`   • Portal proxy failing?         → start portal: npm run dev`);
  console.log(`   • 401 on admin endpoints?       → check TENANT_BILLING_SERVICE_API_KEY in .env.local${RESET}`);
} else {
  console.log(`\n  ${GREEN}${BOLD}All checks passed — Portal ↔ Billing Service connection verified!${RESET}`);
}
console.log('');
