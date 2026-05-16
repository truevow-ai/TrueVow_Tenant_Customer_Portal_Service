import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const incident_type = req.nextUrl.searchParams.get('incident_type') ?? undefined;
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  const limit = req.nextUrl.searchParams.get('limit') ?? '20';
  const offset = req.nextUrl.searchParams.get('offset') ?? '0';

  const query = new URLSearchParams({ tenant_id: tenantId, limit, offset });
  if (status) query.set('status', status);
  if (incident_type) query.set('incident_type', incident_type);
  if (state) query.set('state', state);

  try {
    const res = await fetch(
      `${DRAFT_SERVICE_URL}/api/v1/leverage/cases?${query.toString()}`,
      {
        headers: {
          'X-API-Key': DRAFT_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.warn(`leverage/cases: DRAFT Service returned ${res.status}`);
      return NextResponse.json({ cases: [], total: 0 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.warn('leverage/cases proxy error:', err);
    return NextResponse.json({ cases: [], total: 0 });
  }
}
