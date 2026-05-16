import { NextRequest, NextResponse } from 'next/server';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const API_KEY = process.env.PLATFORM_SERVICE_API_KEY || '';

/**
 * GET /api/settings/profile?tenant_id=<uuid>
 *
 * Proxies to SaaS Admin:
 *   GET /api/v1/customer-portal/tenants/{tenant_id}/settings
 *
 * Returns portal_profile fields from SaaS Admin (X-API-Key auth).
 * Response shape: { firmName, website, firmSize, county, barState,
 *                   monthlyCallVolume, subSpecialization[], whatsapp }
 */
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/settings`,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!upstream.ok) {
      // Return empty-but-valid shape so the portal renders the form
      // (user may not have saved yet, or upstream is unreachable)
      return NextResponse.json({}, { status: 200 });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[settings/profile GET]', err.message);
    // Return empty-but-valid shape instead of 500 so the portal
    // can render the form and let the user enter / re-enter data
    return NextResponse.json({}, { status: 200 });
  }
}

/**
 * PATCH /api/settings/profile
 *
 * Body: { tenantId, website?, firmSize?, county?, barState?,
 *         monthlyCallVolume?, subSpecialization?, whatsapp? }
 *
 * Proxies to SaaS Admin:
 *   PATCH /api/v1/customer-portal/tenants/{tenant_id}/settings
 *
 * Merges supplied fields into tenant_settings.portal_profile JSONB.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, ...fields } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/settings`,
      {
        method: 'PATCH',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream settings update failed: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[settings/profile PATCH]', err.message);
    return NextResponse.json(
      { error: 'Failed to save settings', detail: err.message },
      { status: 500 }
    );
  }
}
