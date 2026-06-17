import { NextRequest, NextResponse } from 'next/server';
import { withPermission, Permission } from '@/lib/auth/guard';

const SETTLE_URL = process.env.SETTLE_SERVICE_URL || 'http://localhost:3041';
const SETTLE_KEY = process.env.SETTLE_SERVICE_API_KEY || '';

async function handler(req: NextRequest, ctx: { userId: string }) {
  try {
    const body = await req.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': SETTLE_KEY,
    };
    if (ctx.userId) {
      headers['X-Settle-User-Id'] = ctx.userId;
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

export const POST = withPermission(Permission.LEAD_READ, handler);
