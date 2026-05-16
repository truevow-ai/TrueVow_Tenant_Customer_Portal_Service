/**
 * Billing Dashboard Proxy Route
 *
 * Server-side proxy to the billing service admin endpoints.
 * Keeps TENANT_BILLING_SERVICE_API_KEY server-only (never exposed to the browser).
 *
 * Called by: /dashboard/billing/page.tsx  (admin tab only)
 * Proxies:
 *   GET /api/v1/billing/dashboard/stats
 *   GET /api/v1/billing/dashboard/revenue-metrics
 *   GET /api/v1/billing/dashboard/subscription-stats
 */

import { NextResponse } from 'next/server';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

async function fetchBillingEndpoint(path: string): Promise<unknown> {
  const url = `${BILLING_BASE}/api/v1/billing${path}`;
  const res = await fetch(url, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Billing service ${path} → ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function GET() {
  const [statsResult, revenueResult, subscriptionsResult] = await Promise.allSettled([
    fetchBillingEndpoint('/dashboard/stats'),
    fetchBillingEndpoint('/dashboard/revenue-metrics'),
    fetchBillingEndpoint('/dashboard/subscription-stats'),
  ]);

  const stats         = statsResult.status === 'fulfilled'         ? statsResult.value         : null;
  const revenue       = revenueResult.status === 'fulfilled'       ? revenueResult.value       : null;
  const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : null;

  // Log any failures (server-side only)
  if (statsResult.status === 'rejected')
    console.warn('[billing/dashboard] stats failed:', statsResult.reason?.message);
  if (revenueResult.status === 'rejected')
    console.warn('[billing/dashboard] revenue-metrics failed:', revenueResult.reason?.message);
  if (subscriptionsResult.status === 'rejected')
    console.warn('[billing/dashboard] subscription-stats failed:', subscriptionsResult.reason?.message);

  return NextResponse.json(
    { stats, revenue, subscriptions },
    {
      headers: {
        // Short cache — refresh admin stats every 60 s without extra requests
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
