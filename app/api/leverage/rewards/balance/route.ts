import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/leverage/rewards/balance?tenantId=xxx
 *
 * Server-side proxy  calls DRAFT Service which calls Billing Service.
 * Avoids CORS from browser. Returns { active_credits: number }.
 */

const DRAFT_SERVICE_URL =
  process.env.DRAFT_SERVICE_URL ||
  process.env.NEXT_PUBLIC_TENANT_APP_API_URL ||
  'http://localhost:8001';

const DRAFT_SERVICE_KEY =
  process.env.DRAFT_SERVICE_API_KEY ||
  process.env.NEXT_PUBLIC_TENANT_APP_API_KEY ||
  '';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DRAFT_SERVICE_URL}/api/v1/leverage/rewards/balance?tenant_id=${encodeURIComponent(tenantId)}`,
      {
        headers: {
          'X-API-Key': DRAFT_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      // Fail gracefully  portal still works, just shows 0
      console.warn(`leverage/rewards/balance: DRAFT Service returned ${res.status}`);
      return NextResponse.json({ active_credits: 0 });
    }

    const data = await res.json();
    return NextResponse.json({ active_credits: data.active_credits ?? 0 });
  } catch (err) {
    console.warn('leverage/rewards/balance proxy error:', err);
    return NextResponse.json({ active_credits: 0 });
  }
}
