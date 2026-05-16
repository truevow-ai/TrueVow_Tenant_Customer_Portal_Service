/**
 * Proxy: PATCH /api/cs-support/tickets/[id]
 * Customer self-closes (resolves) their own ticket.
 * Customers may only transition status → 'resolved'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const FLS_BASE = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_URL || 'http://localhost:3066';
const FLS_API_KEY = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_API_KEY || '';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerEmail = user.emailAddresses[0]?.emailAddress;
    if (!customerEmail) return NextResponse.json({ error: 'No email on account' }, { status: 400 });

    const body = await request.json();
    const { tenant_id, status } = body;

    if (!tenant_id || !status) {
      return NextResponse.json(
        { error: 'tenant_id and status are required' },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `${FLS_BASE}/api/v1/customer-portal/tickets/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': FLS_API_KEY },
        body: JSON.stringify({ tenant_id, customer_email: customerEmail, status }),
      }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    console.error('[cs-support/tickets/[id] PATCH]', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
