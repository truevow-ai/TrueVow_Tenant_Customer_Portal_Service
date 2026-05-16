/**
 * Proxy: Customer Support Tickets
 * GET  /api/cs-support/tickets  — list tickets for the authenticated customer
 * POST /api/cs-support/tickets  — create a new support ticket
 *
 * Security model: customer_email is sourced from the Clerk server-side session
 * (never trusted from client input) and forwarded to the First Line Support service
 * along with the service API key, which never leaves the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const FLS_BASE = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_URL || 'http://localhost:3066';
const FLS_API_KEY = process.env.CUSTOMER_FIRST_LINE_SUPPORT_SERVICE_API_KEY || '';

function flsHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': FLS_API_KEY,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerEmail = user.emailAddresses[0]?.emailAddress;
    if (!customerEmail) return NextResponse.json({ error: 'No email on account' }, { status: 400 });

    const sp = request.nextUrl.searchParams;
    const tenantId = sp.get('tenant_id');
    if (!tenantId) return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });

    const params = new URLSearchParams({
      tenant_id: tenantId,
      customer_email: customerEmail,
      ...(sp.get('status') ? { status: sp.get('status')! } : {}),
      limit: sp.get('limit') || '20',
      offset: sp.get('offset') || '0',
    });

    const upstream = await fetch(
      `${FLS_BASE}/api/v1/customer-portal/tickets?${params.toString()}`,
      { headers: flsHeaders(), cache: 'no-store' }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    console.error('[cs-support/tickets GET]', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerEmail = user.emailAddresses[0]?.emailAddress;
    const customerName = user.fullName || user.firstName || undefined;
    if (!customerEmail) return NextResponse.json({ error: 'No email on account' }, { status: 400 });

    const body = await request.json();
    const { tenant_id, subject, message, channel = 'form', priority = 'medium' } = body;

    if (!tenant_id || !subject || !message) {
      return NextResponse.json(
        { error: 'tenant_id, subject, and message are required' },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${FLS_BASE}/api/v1/customer-portal/tickets`, {
      method: 'POST',
      headers: flsHeaders(),
      body: JSON.stringify({
        tenant_id,
        customer_email: customerEmail,
        customer_name: customerName,
        subject,
        message,
        channel,
        priority,
      }),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error: any) {
    console.error('[cs-support/tickets POST]', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
