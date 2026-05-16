/**
 * SETTLE Consume Report Proxy Route
 *
 * Server-side proxy for POST /api/v1/billing/consume-report.
 * Consumes a SETTLE report credit / generates an invoice line item.
 *
 * Body:
 *   tenantId (required)
 *   caseId   (required)
 */

import { NextRequest, NextResponse } from 'next/server';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY      = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tenantId = body.tenantId as string | undefined;
  const caseId   = body.caseId as string | undefined;

  if (!tenantId || !caseId) {
    return NextResponse.json(
      { error: 'tenantId and caseId are required in body' },
      { status: 400 }
    );
  }

  const url = `${BILLING_BASE}/api/v1/billing/consume-report?tenant_id=${encodeURIComponent(tenantId)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        case_id: caseId,
        idempotency_key: `settle-report-${caseId}-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[settle/consume] upstream ${res.status} for tenant ${tenantId} case ${caseId}`);
      return NextResponse.json(
        { error: `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[settle/consume] Billing service unreachable:', msg);
    return NextResponse.json(
      { error: 'Billing service unavailable', _fallback: true },
      { status: 503 }
    );
  }
}
