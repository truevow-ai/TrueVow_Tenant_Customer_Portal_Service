#!/usr/bin/env node
/**
 * Fetch pricing snapshot from Billing Service during CI/build.
 *
 * Usage:
 *   node scripts/fetch-pricing-snapshot.mjs
 *
 * Environment:
 *   BILLING_SERVICE_URL — required. e.g. http://localhost:3016
 *   BILLING_SERVICE_API_KEY — optional. Passed as X-API-Key header.
 *
 * This script writes lib/pricing/pricing-snapshot.json with:
 *   - snapshot_metadata (plan_version_id, snapshot_date, source, billing_service_reachable)
 *   - catalog (the pricing catalog from Billing Service)
 *
 * If the Billing Service is unreachable, the script exits with code 1
 * so the CI pipeline fails loudly rather than committing a stale snapshot.
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BILLING_URL = process.env.BILLING_SERVICE_URL || process.env.TENANT_BILLING_SERVICE_URL;
const API_KEY = process.env.BILLING_SERVICE_API_KEY || process.env.TENANT_BILLING_SERVICE_API_KEY;
const SNAPSHOT_PATH = join(__dirname, "..", "lib", "pricing", "pricing-snapshot.json");
const STALE_THRESHOLD_DAYS = parseInt(process.env.STALE_THRESHOLD_DAYS || "7", 10);

async function main() {
  if (!BILLING_URL) {
    console.error("ERROR: BILLING_SERVICE_URL environment variable is required.");
    console.error("Set it in .env.local or pass it explicitly.");
    process.exit(1);
  }

  const endpoint = `${BILLING_URL}/api/v1/public/pricing-catalog`;
  console.log(`Fetching pricing catalog from ${endpoint} ...`);

  const headers = {
    Accept: "application/json",
  };
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  let catalog;
  let reachable = false;
  let planVersionId = "unknown";

  try {
    const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    catalog = await res.json();
    reachable = true;
    planVersionId = catalog.version || catalog.plan_version_id || "unknown";
    console.log(`✓ Billing Service reachable. Catalog version: ${planVersionId}`);
  } catch (err) {
    console.error(`✗ Failed to fetch from Billing Service: ${err.message}`);
    console.error("");
    console.error("CI pipelines should fail here. Do not commit a stale snapshot.");
    console.error("If you are running locally and Billing is down, you can:");
    console.error("  1. Start the Billing Service, or");
    console.error("  2. Keep the existing pricing-snapshot.json (do not run this script)");
    process.exit(1);
  }

  const snapshot = {
    snapshot_metadata: {
      plan_version_id: planVersionId,
      snapshot_date: new Date().toISOString(),
      stale_threshold_days: STALE_THRESHOLD_DAYS,
      source: "ci-build",
      billing_service_reachable: reachable,
    },
    catalog,
  };

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`✓ Wrote snapshot to ${SNAPSHOT_PATH}`);
  console.log(`  plan_version_id: ${planVersionId}`);
  console.log(`  snapshot_date: ${snapshot.snapshot_metadata.snapshot_date}`);
  console.log(`  stale_threshold_days: ${STALE_THRESHOLD_DAYS}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
