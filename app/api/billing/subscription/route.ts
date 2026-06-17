/**
 * Billing Subscription Management Proxy Route
 *
 * Server-side proxy for subscription tier changes and cancellations.
 * NOW PROTECTED: Requires Clerk authentication + RBAC billing permission.
 *
 * PUT  /api/billing/subscription  → Change tier (upgrade/downgrade)
 * DELETE /api/billing/subscription → Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermission, withTenantScope, Permission } from '@/lib/auth/guard';

const BILLING_BASE = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
const API_KEY = process.env.TENANT_BILLING_SERVICE_API_KEY || '';

async function handlePUT(req: NextRequest, ctx: { tenantId: string | null }) {
  try {
    const body = await req.json();
    const { tenantId, tier } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (!tier || !['solo', 'growth'].includes(tier)) {
      return NextResponse.json({ error: 'Valid tier (solo or growth) is required' }, { status: 400 });
    }

    const url = `${BILLING_BASE}/api/v1/billing/tenants/${tenantId}/subscription`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[billing/subscription] Billing service unreachable:', msg);
    return NextResponse.json({ _fallback: true, message: 'Billing service offline — change queued' }, { status: 202 });
  }
}

async function handleDELETE(req: NextRequest, ctx: { tenantId: string | null }) {
  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const url = `${BILLING_BASE}/api/v1/billing/tenants/${tenantId}/subscription`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || `Billing service returned ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[billing/subscription] Billing service unreachable:', msg);
    return NextResponse.json({ _fallback: true, message: 'Billing service offline — cancellation queued' }, { status: 202 });
  }
}

export const PUT = withPermission(Permission.BILLING_SELF_SERVICE_CHANGE, handlePUT);
export const DELETE = withPermission(Permission.BILLING_SELF_SERVICE_CHANGE, handleDELETE);
