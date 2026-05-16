/**
 * Proxy: GET /api/cs-support/tickets/[id]/messages
 * Fetches non-internal messages for a ticket thread.
 * customer_email resolved from Clerk session — never from client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const FLS_BASE = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_URL || 'http://localhost:3066';
const FLS_API_KEY = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerEmail = user.emailAddresses[0]?.emailAddress;
    if (!customerEmail) return NextResponse.json({ error: 'No email on account' }, { status: 400 });

    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });

    const params2 = new URLSearchParams({ tenant_id: tenantId, customer_email: customerEmail });

    const upstream = await fetch(
      `${FLS_BASE}/api/v1/customer-portal/tickets/${id}/messages?${params2.toString()}`,
      { headers: { 'x-api-key': FLS_API_KEY }, cache: 'no-store' }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    console.error('[cs-support/tickets/[id]/messages GET]', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
