/**
 * Proxy: GET /api/cs-support/kb
 * Searches the TrueVow knowledge base (published articles only).
 * No auth required beyond being a logged-in Clerk user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const FLS_BASE = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_URL || 'http://localhost:3066';
const FLS_API_KEY = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const query = sp.get('q');
    const tenantId = sp.get('tenant_id');

    if (!query) return NextResponse.json({ error: 'q (search query) is required' }, { status: 400 });

    const params = new URLSearchParams({
      q: query,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      limit: sp.get('limit') || '8',
    });

    const upstream = await fetch(
      `${FLS_BASE}/api/v1/customer-portal/kb/search?${params.toString()}`,
      { headers: { 'x-api-key': FLS_API_KEY }, cache: 'no-store' }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    console.error('[cs-support/kb GET]', error);
    return NextResponse.json({ error: 'Failed to search knowledge base' }, { status: 500 });
  }
}
