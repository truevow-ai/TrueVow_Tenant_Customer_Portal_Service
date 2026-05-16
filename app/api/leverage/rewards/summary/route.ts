import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DRAFT_SERVICE_URL}/api/v1/leverage/rewards/summary?tenant_id=${encodeURIComponent(tenantId)}`,
      {
        headers: {
          'X-API-Key': DRAFT_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.warn(`leverage/rewards/summary: DRAFT Service returned ${res.status}`);
      return NextResponse.json({
        active_credits: 0,
        total_granted: 0,
        total_used: 0,
        total_expired: 0,
        welcome_bonus_granted: false,
        settlement_credits_count: 0,
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.warn('leverage/rewards/summary proxy error:', err);
    return NextResponse.json({
      active_credits: 0,
      total_granted: 0,
      total_used: 0,
      total_expired: 0,
      welcome_bonus_granted: false,
      settlement_credits_count: 0,
    });
  }
}
