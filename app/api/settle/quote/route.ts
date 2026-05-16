/**
 * SETTLE Quote Proxy Route
 *
 * Server-side proxy for GET /api/v1/billing/tenants/{tenant_id}/settle/quote.
 * Returns pricing quote for activating SETTLE on a specific case.
 *
 * Query params:
 *   tenantId (required)
 *   caseId   (required)
 */

import { NextRequest, NextResponse } from 'next/server';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY      = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get('tenantId');
  const caseId   = searchParams.get('caseId');

  if (!tenantId || !caseId) {
    return NextResponse.json(
      { error: 'tenantId and caseId query params are required' },
      { status: 400 }
    );
  }

  const url = `${BILLING_BASE}/api/v1/billing/tenants/${tenantId}/settle/quote?case_id=${encodeURIComponent(caseId)}`;

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
      console.warn(`[settle/quote] upstream ${res.status} for tenant ${tenantId} case ${caseId}`);
      return NextResponse.json(
        { error: `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[settle/quote] Billing service unreachable:', msg);
    // Fallback: assume pay-per-use with ecosystem pricing
    return NextResponse.json({
      already_activated: false,
      source: 'invoice',
      price_cents: 2900,
      message: 'Fallback pricing — billing service unavailable',
      _fallback: true,
    });
  }
}
