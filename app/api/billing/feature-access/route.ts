/**
 * Billing Feature-Access Proxy Route
 *
 * Server-side proxy for GET /api/v1/billing/tenants/{id}/feature-access.
 * Eliminates CORS failures — the billing service only receives server-to-server
 * requests; the API key never reaches the browser.
 *
 * Called by: hooks/useFeatureAccess.tsx
 * Query params:
 *   tenantId  (required)
 *   userId    (optional — unlocks founding-intelligence benefits)
 */

import { NextRequest, NextResponse } from 'next/server';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY      = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get('tenantId');
  const userId   = searchParams.get('userId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId query param is required' }, { status: 400 });
  }

  let url = `${BILLING_BASE}/api/v1/billing/tenants/${tenantId}/feature-access`;
  if (userId) url += `?user_id=${encodeURIComponent(userId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[billing/feature-access] upstream ${res.status} for tenant ${tenantId}`);
      // Return empty feature-access shape so the portal falls back gracefully
      return NextResponse.json(
        { error: `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[billing/feature-access] Billing service unreachable — falling back to all-features-enabled:', msg);
    // Fallback: when billing service is offline, enable all features so the portal
    // remains fully usable. The gate works correctly once billing comes back online.
    return NextResponse.json({
      tier: 'growth',
      features: {
        intake:  { enabled: true },
        draft:   { enabled: true },
        settle:  { enabled: true },
        connect: { enabled: false },
      },
      _fallback: true,
    });
  }
}
