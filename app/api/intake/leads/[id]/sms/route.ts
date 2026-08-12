/**
 * API Route: GET  /api/intake/leads/[id]/sms?tenant_id=<uuid>
 *            POST /api/intake/leads/[id]/sms
 *
 * All INTAKE data flows through the Tenant App REST API.
 * No direct Supabase queries — cross-service DB access is prohibited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSmsThread, sendSms } from '@/lib/api/intake-client';

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

    const thread = await getSmsThread(leadId, tenantId);
    return NextResponse.json({ thread });
  } catch (error) {
    console.error('Error fetching SMS thread:', error);
    return NextResponse.json(
      { error: 'SMS service unavailable — INTAKE projection API unreachable' },
      { status: 503 }
    );
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

    const result = await sendSms(leadId, tenant_id, message_text.trim());

    if (!result) {
      return NextResponse.json(
        { error: 'SMS could not be sent — INTAKE service unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message_sid: result.message_sid,
      thread: [],
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { error: 'SMS service unavailable' },
      { status: 503 }
    );
  }
}
