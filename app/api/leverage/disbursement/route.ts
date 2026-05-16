import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${DRAFT_SERVICE_URL}/api/v1/leverage/disbursement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DRAFT_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Disbursement calculation unavailable' }, { status: 503 });
  }
}
