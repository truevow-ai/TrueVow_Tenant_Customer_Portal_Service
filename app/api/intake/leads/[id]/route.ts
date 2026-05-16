/**
 * API Route: GET /api/intake/leads/[id]
 *
 * Primary:  SaaS Admin HTTP endpoint
 *           GET /api/v1/customer-portal/tenants/[tenant_id]/intake/leads/[lead_id]
 *
 * Fallback: Direct Supabase query to SaaS Admin DB (tenant_intake_leads_session)
 *           Used when SaaS Admin HTTP service is unreachable.
 *           This is a Supabase REST call — NOT a call to any backend service.
 *
 * The Customer Portal NEVER calls the Tenant App HTTP service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const SAAS_API_KEY =
  process.env.SAAS_ADMINISTRATION_SERVICE_API_KEY ||
  process.env.PLATFORM_SERVICE_API_KEY ||
  '';

const SAAS_ADMIN_SUPABASE_URL = process.env.SAAS_ADMIN_PROJECT_URL || '';
const SAAS_ADMIN_SUPABASE_KEY = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';

function getSaasAdminClient() {
  if (!SAAS_ADMIN_SUPABASE_URL || !SAAS_ADMIN_SUPABASE_KEY) {
    throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  }
  return createClient(SAAS_ADMIN_SUPABASE_URL, SAAS_ADMIN_SUPABASE_KEY);
}

function mapFinalStateToStatus(finalState: string | null, tags: string[]): string {
  if (tags.includes('did_not_proceed') || finalState === 'did_not_proceed') return 'did_not_proceed';
  if (tags.includes('retained')        || finalState === 'retained')        return 'retained';
  if (tags.includes('scheduled')       || finalState === 'scheduled')       return 'scheduled';
  if (tags.includes('qualified')       || finalState === 'completed')       return 'qualified';
  return 'new';
}

function normalizeSessionToLead(row: any) {
  const tags: string[]    = Array.isArray(row.tags)      ? row.tags      : [];
  const responses: any[]  = Array.isArray(row.responses) ? row.responses : [];
  const status = mapFinalStateToStatus(row.final_state, tags);

  return {
    lead_id:            row.session_id,
    first_name:         row.contact_first_name  ?? null,
    last_name:          row.contact_last_name   ?? null,
    email:              row.contact_email       ?? null,
    phone:              row.contact_phone       ?? null,
    status,
    practice_area_code: row.practice_area_code  ?? null,
    practice_area:      row.practice_area_code  ?? null,
    lead_score:         row.lead_score          ?? 0,
    lead_grade:         null,
    is_qualified:       status === 'qualified' || status === 'retained',
    created_at:         row.start_time          ?? row.created_at ?? null,
    session_id:         row.session_id,
    session_start_time: row.start_time          ?? null,
    session_end_time:   row.end_time            ?? null,
    twilio_call_sid:    row.twilio_call_sid     ?? null,
    duration_seconds:   row.duration_seconds    ?? null,
    recording_duration: null,
    recording_url:      null,
    transcription_url:  null,
    transcription:      null,
    unlocked_at:        row.start_time          ?? null,  // treat SaaS Admin data as unlocked
    unlocked_by:        null,
    booking_date:       row.booking_date        ?? null,
    recommendation:     null,
    answers: responses.map((r: any) => ({
      question_key:   r.key         ?? r.question_key   ?? '',
      response_value: r.value       ?? r.response_value ?? '',
      response_type:  r.type        ?? r.response_type  ?? 'text',
      captured_at:    r.captured_at ?? row.start_time   ?? null,
    })),
  };
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

    // ── 1. Try SaaS Admin HTTP endpoint ─────────────────────────────────────
    try {
      const url = `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/intake/leads/${leadId}`;
      const res = await fetch(url, {
        headers: { 'X-API-Key': SAAS_API_KEY },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
      if (res.status === 404) {
        // Don't short-circuit — might be in direct DB with session_id as lead_id
      }
    } catch {
      // SaaS Admin unreachable — fall through
    }

    // ── 2. Fallback: SaaS Admin Supabase DB direct ───────────────────────────
    const supabase = getSaasAdminClient();
    const { data, error } = await supabase
      .from('tenant_intake_leads_session')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('session_id', leadId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead: normalizeSessionToLead(data) });

  } catch (error) {
    console.error('[lead/id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead', details: String(error) },
      { status: 500 }
    );
  }
}
