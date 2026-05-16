import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const SETTLE_URL = process.env.SETTLE_SERVICE_URL || 'http://localhost:3041';
const SETTLE_KEY = process.env.SETTLE_SERVICE_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Cohort V-front (2026-05-07): forward Clerk userId via X-Settle-User-Id header.
    // Backend reads this header to gate pilot-mode features by user identity
    // (ADR S-2 v2 + Cohort U-back X-Settle-User-Id bridge). Conditional - only set
    // when userId is non-null (anonymous/preview-bypass requests omit the header,
    // and backend treats absence as no-pilot for safety).
    const { userId } = await auth();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': SETTLE_KEY,
    };
    if (userId) {
      headers['X-Settle-User-Id'] = userId;
    }

    const res = await fetch(SETTLE_URL + '/api/v1/query/estimate', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'SETTLE service unavailable' }, { status: 503 });
  }
}