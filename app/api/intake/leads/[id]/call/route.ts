/**
 * API Route: POST /api/intake/leads/[id]/call
 *
 * Initiates a call bridge via Tenant App → Twilio Programmable Voice.
 *
 * Flow:
 *   1. Attorney clicks "Call Prospect" in portal
 *   2. Portal calls this endpoint
 *   3. Tenant App receives, looks up lead + attorney phone from DB/profile
 *   4. Tenant App calls Twilio.calls.create() → dials attorney's cell
 *   5. Attorney answers → Twilio bridges them to the prospect
 *   6. When call ends, Tenant App status webhook fires call_completed event
 *
 * Design decisions:
 *   - Tenant App resolves both lead phone (from leads table) and attorney
 *     phone (from tenant firm profile) internally — portal does not pass them
 *   - No recording, no transcript (attorney-client privilege)
 *   - callStarted event fires immediately; callCompleted fires via Tenant App webhook
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
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Tenant App resolves lead phone + attorney phone from its own DB
    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/communication/call/initiate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          lead_id:   leadId,
          tenant_id,
          // attorney_phone: not passed — Tenant App pulls from tenant firm profile
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => upstream.statusText);
      console.error(`[call] Tenant App returned ${upstream.status}:`, err);
      return NextResponse.json(
        { error: 'Call could not be initiated. Please try again.' },
        { status: 502 }
      );
    }

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json({
      success:  true,
      call_sid: data.call_sid,
      message:  'Your phone will ring shortly. Answer to connect with the prospect.',
    });
  } catch (error) {
    console.error('Error initiating call bridge:', error);
    return NextResponse.json(
      { error: 'Could not reach calling service. Please try again.' },
      { status: 500 }
    );
  }
}
