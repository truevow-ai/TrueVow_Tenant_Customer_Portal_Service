/**
 * API Route: POST /api/intake/leads/[id]/reminders
 *
 * Registers a consultation reminder cadence with the SaaS Admin scheduling
 * service. Schedules three SMS/email reminders for a booked consultation:
 *   - 24 hours before
 *   - 4 hours before
 *   - 30 minutes before
 *
 * This route is fire-and-forget from the portal side. If SaaS Admin is
 * unavailable the portal does not block — the status update has already
 * succeeded. SaaS Admin is responsible for queuing and firing each reminder.
 */

import { NextRequest, NextResponse } from 'next/server';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const API_KEY = process.env.PLATFORM_SERVICE_API_KEY || '';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { tenant_id, consultation_date, phone, email } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Forward to SaaS Admin scheduler
    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenant_id}/leads/${leadId}/reminders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          lead_id:           leadId,
          tenant_id,
          consultation_date, // ISO string; null if not yet set (reminders will be scheduled when date is confirmed)
          contact_phone:     phone,
          contact_email:     email,
          offsets_minutes:   [-1440, -240, -30], // 24h, 4h, 30min before
        }),
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!upstream.ok) {
      // Non-blocking — log and return accepted so the portal does not retry
      console.warn(
        `[reminders] SaaS Admin returned ${upstream.status} for lead ${leadId}. Reminders not scheduled.`
      );
      return NextResponse.json(
        { accepted: true, scheduled: false, reason: `upstream_${upstream.status}` },
        { status: 202 }
      );
    }

    return NextResponse.json({ accepted: true, scheduled: true });
  } catch (error) {
    // Network error or timeout — non-blocking
    console.warn('[reminders] Could not reach SaaS Admin scheduler:', String(error));
    return NextResponse.json(
      { accepted: true, scheduled: false, reason: 'network_error' },
      { status: 202 }
    );
  }
}
