import { NextRequest, NextResponse } from 'next/server';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const API_KEY = process.env.PLATFORM_SERVICE_API_KEY || '';

/**
 * GET /api/notifications?tenant_id=&unread_only=true&limit=50
 *
 * Proxies to SaaS Admin:
 *   GET /api/v1/customer-portal/notifications?tenant_id=&unread_only=&limit=
 *
 * Returns portal_notifications rows for the tenant.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenantId   = searchParams.get('tenant_id');
  const unreadOnly = searchParams.get('unread_only');
  const limit      = searchParams.get('limit');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `${SAAS_ADMIN_URL}/api/v1/customer-portal/notifications`
  );
  upstreamUrl.searchParams.set('tenant_id', tenantId);
  if (unreadOnly) upstreamUrl.searchParams.set('unread_only', unreadOnly);
  if (limit)      upstreamUrl.searchParams.set('limit', limit);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      console.warn(`[notifications GET] Upstream returned ${upstream.status}`);
      return NextResponse.json({ notifications: [] });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[notifications GET]', err.message);
    return NextResponse.json({ notifications: [] });
  }
}

/**
 * PATCH /api/notifications
 *
 * Body: { tenantId, notificationId?: string, markAll?: boolean }
 *
 * Proxies to SaaS Admin:
 *   PATCH /api/v1/customer-portal/notifications
 *
 * Marks a single notification or all notifications as read.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, notificationId, markAll } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/customer-portal/notifications`,
      {
        method: 'PATCH',
        headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, notificationId, markAll }),
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream mark-read failed: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notifications PATCH]', err.message);
    return NextResponse.json(
      { error: 'Failed to mark notification read', detail: err.message },
      { status: 500 }
    );
  }
}
