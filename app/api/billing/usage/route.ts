/**
 * Billing Usage Proxy Route
 *
 * Server-side proxy for GET /api/v1/billing/usage/{tenant_id}/current-period.
 * Returns: unlocks_used, settle_reports_used, total_charged_cents, etc.
 *
 * Query params:
 *   tenantId (required)
 */

import { NextRequest, NextResponse } from 'next/server';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY      = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId query param is required' }, { status: 400 });
  }

  const url = `${BILLING_BASE}/api/v1/billing/usage/${tenantId}/current-period`;

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
      console.warn(`[billing/usage] upstream ${res.status} for tenant ${tenantId}`);
      return NextResponse.json(
        { error: `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[billing/usage] Billing service unreachable:', msg);
    // Return empty usage shape so UI can show "--" gracefully
    return NextResponse.json({
      unlocks_used: 0,
      unlocks_remaining: 0,
      unlocks_included: 0,
      settle_reports_used: 0,
      total_charged_cents: 0,
      period_start: null,
      period_end: null,
      _fallback: true,
    });
  }
}
