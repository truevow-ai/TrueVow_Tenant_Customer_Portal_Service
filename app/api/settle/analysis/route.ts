import { NextRequest, NextResponse } from 'next/server';

const SETTLE_URL = process.env.SETTLE_SERVICE_URL || 'http://localhost:3041';
const SETTLE_KEY = process.env.SETTLE_SERVICE_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(SETTLE_URL + '/api/v1/query/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': SETTLE_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'SETTLE service unavailable' }, { status: 503 });
  }
}
