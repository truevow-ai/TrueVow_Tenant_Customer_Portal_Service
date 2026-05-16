/**
 * API Route: GET  /api/intake/leads/[id]/sms?tenant_id=<uuid>
 *            POST /api/intake/leads/[id]/sms
 *
 * GET  — reads the SMS thread from the sms_threads table.
 *         This table is owned by the Tenant App:
 *           - outbound rows are written when Tenant App sends via Twilio
 *           - inbound rows are written by the Tenant App Twilio webhook
 *         The portal reads only; it never writes to sms_threads directly.
 *
 * POST — forwards the send request to Tenant App → Twilio A2P.
 *         Endpoint: POST /api/v1/communication/sms/send
 *         Body:     { lead_id, tenant_id, message_body }
 *         Tenant App looks up the lead's phone number internally.
 *
 * No SMS content is stored in analytics. Only smsSent intent is logged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantDb } from '@/lib/db/tenant-db';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const API_KEY = process.env.PLATFORM_SERVICE_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const tenantId = request.nextUrl.searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Read from Tenant App’s sms_threads table (written by Tenant App, read by portal)
    const thread = await tenantDb.getSmsThreadFromTable(leadId, tenantId);
    return NextResponse.json({ thread });
  } catch (error) {
    console.error('Error fetching SMS thread:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS thread' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { tenant_id, message_text } = body;

    if (!tenant_id)            return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    if (!message_text?.trim()) return NextResponse.json({ error: 'message_text is required' }, { status: 400 });

    // Forward to Tenant App — it looks up lead phone + firm Twilio number from DB
    const upstream = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/communication/sms/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          lead_id:      leadId,
          tenant_id,
          message_body: message_text.trim(),   // Tenant App field name per spec
        }),
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => upstream.statusText);
      console.warn(`[sms] Tenant App returned ${upstream.status}:`, err);
      return NextResponse.json(
        { error: 'Message could not be sent. Please try again.' },
        { status: 502 }
      );
    }

    const data = await upstream.json().catch(() => ({}));

    // Re-fetch the thread so the UI gets the freshly-written sms_threads row
    const thread = await tenantDb.getSmsThreadFromTable(leadId, tenant_id);

    return NextResponse.json({
      success:    true,
      message_sid: data.sid,
      thread,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}
