/**
 * Billing Invoices Proxy Route
 *
 * Server-side proxy for GET /api/v1/invoices?tenant_id={tenantId}.
 * Returns list of invoices for the tenant.
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

  const url = `${BILLING_BASE}/api/v1/invoices?tenant_id=${encodeURIComponent(tenantId)}`;

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
      console.warn(`[billing/invoices] upstream ${res.status} for tenant ${tenantId}`);
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
    console.warn('[billing/invoices] Billing service unreachable:', msg);
    return NextResponse.json({ invoices: [], _fallback: true });
  }
}
