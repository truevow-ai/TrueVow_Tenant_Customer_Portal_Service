import { NextRequest, NextResponse } from 'next/server';

const SETTLE_URL = process.env.SETTLE_SERVICE_URL || 'http://localhost:3041';
const SETTLE_KEY = process.env.SETTLE_SERVICE_API_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint') || 'coverage-gaps';
    const period = searchParams.get('period') || '';

    let path = '/api/v1/trends/' + endpoint;
    if (endpoint === 'trends' && period) {
      path = '/api/v1/trends/trends/' + encodeURIComponent(period);
    }

    const res = await fetch(SETTLE_URL + path, {
      method: 'GET',
      headers: { 'X-API-Key': SETTLE_KEY },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'SETTLE service unavailable' }, { status: 503 });
  }
}
