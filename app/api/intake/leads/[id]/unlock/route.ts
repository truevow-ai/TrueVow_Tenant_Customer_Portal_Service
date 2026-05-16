/**
 * API Route: POST /api/intake/leads/[id]/unlock
 *            GET  /api/intake/leads/[id]/unlock
 *
 * Unlocks a lead's contact information.
 * Source + destination: SaaS Admin DB (tenant_intake_leads_session) — NEVER Tenant App.
 *
 * SECURITY: This is the ONLY route that returns real PII.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSaasAdminClient() {
  const url = process.env.SAAS_ADMIN_PROJECT_URL || '';
  const key = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const UNLOCK_PRICE = 99;

function buildUnlockedPayload(row: any) {
  const responses: any[] = Array.isArray(row.responses) ? row.responses : [];
  return {
    lead_id:            row.session_id,
    first_name:         row.contact_first_name  ?? null,
    last_name:          row.contact_last_name   ?? null,
    email:              row.contact_email       ?? null,
    phone:              row.contact_phone       ?? null,
    status:             row.final_state         ?? 'new',
    practice_area_code: row.practice_area_code  ?? null,
    lead_score:         row.lead_score          ?? null,
    lead_grade:         null,
    is_qualified:       row.final_state === 'completed' || row.final_state === 'retained',
    created_at:         row.start_time          ?? row.created_at ?? null,
    session_id:         row.session_id,
    twilio_call_sid:    row.twilio_call_sid     ?? null,
    duration_seconds:   row.duration_seconds    ?? null,
    recording_url:      null,
    recording_duration: null,
    transcription:      null,
    transcription_url:  null,
    unlocked_at:        row.unlocked_at         ?? null,
    unlocked_by:        row.unlocked_by         ?? null,
    answers: responses.map((r: any) => ({
      question_key:   r.key         ?? r.question_key   ?? '',
      response_value: r.value       ?? r.response_value ?? '',
      response_type:  r.type        ?? r.response_type  ?? 'text',
      captured_at:    r.captured_at ?? row.start_time   ?? null,
    })),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { tenant_id, user_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = getSaasAdminClient();

    const { data: row, error: fetchErr } = await supabase
      .from('tenant_intake_leads_session')
      .select('*')
      .eq('session_id', leadId)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Already unlocked — return without charging again
    if (row.unlocked_at) {
      return NextResponse.json({
        success:          true,
        already_unlocked: true,
        lead:             buildUnlockedPayload(row),
        message:          'Lead was already unlocked',
      });
    }

    const unlockedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('tenant_intake_leads_session')
      .update({ unlocked_at: unlockedAt, unlocked_by: user_id || 'system', updated_at: unlockedAt })
      .eq('session_id', leadId)
      .eq('tenant_id', tenant_id);

    if (updateErr) {
      console.error('Error unlocking lead:', updateErr);
      return NextResponse.json({ error: 'Failed to unlock lead' }, { status: 500 });
    }

    console.log(
      `[UNLOCK] lead=${leadId} tenant=${tenant_id} user=${user_id || 'system'} ` +
      `at=${unlockedAt} price=$${UNLOCK_PRICE} ip=${request.headers.get('x-forwarded-for') ?? 'unknown'}`
    );

    return NextResponse.json({
      success:       true,
      unlocked:      true,
      price_charged: UNLOCK_PRICE,
      unlocked_at:   unlockedAt,
      lead:          buildUnlockedPayload({ ...row, unlocked_at: unlockedAt, unlocked_by: user_id || 'system' }),
      message:       'Lead unlocked successfully',
    });
  } catch (error) {
    console.error('Error unlocking lead:', error);
    return NextResponse.json({ error: 'Failed to unlock lead', details: String(error) }, { status: 500 });
  }
}

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

    const supabase = getSaasAdminClient();
    const { data: row, error } = await supabase
      .from('tenant_intake_leads_session')
      .select('session_id, unlocked_at, unlocked_by')
      .eq('session_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      lead_id:      leadId,
      is_unlocked:  !!row.unlocked_at,
      unlocked_at:  row.unlocked_at,
      unlocked_by:  row.unlocked_by,
      unlock_price: UNLOCK_PRICE,
    });
  } catch (error) {
    console.error('Error checking unlock status:', error);
    return NextResponse.json({ error: 'Failed to check unlock status', details: String(error) }, { status: 500 });
  }
}
