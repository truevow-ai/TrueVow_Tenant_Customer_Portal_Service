import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  try {
    // The analytics endpoint lives under /draft/analytics (tenant_draft.py)
    // not /leverage/analytics. It returns document validation analytics.
    const res = await fetch(
      `${DRAFT_SERVICE_URL}/api/v1/draft/analytics?tenant_id=${encodeURIComponent(tenantId)}`,
      {
        headers: {
          'X-API-Key': DRAFT_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.warn(`leverage/analytics: DRAFT Service returned ${res.status}`);
      return NextResponse.json({
        overview: { total_validations: 0, success_rate: 0 },
        by_document_type: [],
        by_practice_area: [],
        timeline: [],
        _source: 'fallback',
      });
    }

    const data = await res.json();
    return NextResponse.json({ ...data, _source: 'draft_analytics' });
  } catch (err) {
    console.warn('leverage/analytics proxy error:', err);
    return NextResponse.json({
      overview: { total_validations: 0, success_rate: 0 },
      by_document_type: [],
      by_practice_area: [],
      timeline: [],
      _source: 'error',
    });
  }
}
