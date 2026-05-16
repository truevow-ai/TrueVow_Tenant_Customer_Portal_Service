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
      `${DRAFT_SERVICE_URL}/api/v1/leverage/rewards/ledger?tenant_id=${encodeURIComponent(tenantId)}`,
      {
        headers: {
          'X-API-Key': DRAFT_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.warn(`leverage/rewards/ledger: DRAFT Service returned ${res.status}`);
      return NextResponse.json({ ledger: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.warn('leverage/rewards/ledger proxy error:', err);
    return NextResponse.json({ ledger: [] });
  }
}
