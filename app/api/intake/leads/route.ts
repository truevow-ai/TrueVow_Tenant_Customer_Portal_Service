/**
 * API Route: GET /api/intake/leads
 *
 * Primary:  SaaS Admin HTTP endpoint
 *           GET /api/v1/customer-portal/tenants/[tenant_id]/intake/leads
 *
 * Fallback: Direct Supabase query to SaaS Admin DB (tenant_intake_leads_session)
 *           Used when SaaS Admin HTTP service is unreachable (e.g. not started).
 *           This is a Supabase REST call — NOT a call to any backend service.
 *
 * Both paths return the same normalized field shape for the frontend.
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

const SAAS_ADMIN_SUPABASE_URL  = process.env.SAAS_ADMIN_PROJECT_URL || '';
const SAAS_ADMIN_SUPABASE_KEY  = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';

function getSaasAdminClient() {
  if (!SAAS_ADMIN_SUPABASE_URL || !SAAS_ADMIN_SUPABASE_KEY) {
    throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  }
  return createClient(SAAS_ADMIN_SUPABASE_URL, SAAS_ADMIN_SUPABASE_KEY);
}

/**
 * Map final_state from tenant_intake_leads_session → portal status value.
 */
function mapFinalStateToStatus(finalState: string | null, tags: string[]): string {
  if (tags.includes('did_not_proceed') || finalState === 'did_not_proceed') return 'did_not_proceed';
  if (tags.includes('retained')        || finalState === 'retained')        return 'retained';
  if (tags.includes('scheduled')       || finalState === 'scheduled')       return 'scheduled';
  if (tags.includes('qualified')       || finalState === 'completed')       return 'qualified';
  return 'new';
}

/**
 * Normalize a row from tenant_intake_leads_session to the shape the frontend expects.
 */
function normalizeSession(row: any) {
  const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
  const responses: any[] = Array.isArray(row.responses) ? row.responses : [];
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
    twilio_call_sid:    row.twilio_call_sid     ?? null,
    duration_seconds:   row.duration_seconds    ?? null,
    recording_duration: null,
    recording_url:      null,
    transcription_url:  null,
    transcription:      null,
    unlocked_at:        row.start_time          ?? null,   // SaaS Admin data — treat as already unlocked
    unlocked_by:        null,
    booking_date:       row.booking_date        ?? null,
    recommendation:     null,
    answers: responses.map((r: any) => ({
      question_key:   r.key          ?? r.question_key   ?? '',
      response_value: r.value        ?? r.response_value ?? '',
      response_type:  r.type         ?? r.response_type  ?? 'text',
      captured_at:    r.captured_at  ?? row.start_time   ?? null,
    })),
  };
}

/**
 * Normalize a SaaS Admin HTTP response lead (contact_name etc.) to frontend shape.
 */
function normalizeSaasAdminLead(lead: any) {
  const nameParts = (lead.contact_name || '').trim().split(/\s+/);
  return {
    ...lead,
    first_name:         lead.first_name         ?? nameParts[0]              ?? null,
    last_name:          lead.last_name          ?? (nameParts.slice(1).join(' ') || null),
    email:              lead.email              ?? lead.contact_email         ?? null,
    phone:              lead.phone              ?? lead.contact_phone         ?? null,
    practice_area_code: lead.practice_area_code ?? lead.practice_area        ?? null,
    practice_area:      lead.practice_area      ?? lead.practice_area_code   ?? null,
  };
}

/** Try the SaaS Admin HTTP endpoint. Returns null on any failure. */
async function tryAdminHttp(
  tenantId: string,
  searchParams: URLSearchParams
): Promise<Response | null> {
  try {
    const qs = new URLSearchParams();
    for (const key of ['status', 'practice_area', 'limit', 'offset', 'search']) {
      const val = searchParams.get(key);
      if (val) qs.set(key, val);
    }
    const url = `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/intake/leads?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': SAAS_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

/** Query SaaS Admin Supabase DB directly (tenant_intake_leads_session). */
async function queryAdminDb(
  tenantId: string,
  searchParams: URLSearchParams
): Promise<{ leads: any[]; total: number } | null> {
  try {
    const supabase = getSaasAdminClient();
    const limit  = parseInt(searchParams.get('limit')  || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('tenant_intake_leads_session')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    // Status filter — map portal status back to final_state
    const statusFilter = searchParams.get('status');
    if (statusFilter) {
      const finalStateMap: Record<string, string> = {
        qualified:       'completed',
        new:             'partial',
        scheduled:       'scheduled',
        retained:        'retained',
        did_not_proceed: 'did_not_proceed',
      };
      const fs = finalStateMap[statusFilter];
      if (fs) query = query.eq('final_state', fs);
    }

    const practiceArea = searchParams.get('practice_area');
    if (practiceArea) query = query.eq('practice_area_code', practiceArea);

    const { data, error, count } = await query;
    if (error) {
      console.error('[leads] SaaS Admin direct DB error:', error.message);
      return null;
    }

    const leads = (data || []).map(normalizeSession);
    return { leads, total: count ?? leads.length };
  } catch (err) {
    console.error('[leads] SaaS Admin direct DB exception:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // ── 1. Try SaaS Admin HTTP endpoint ─────────────────────────────────────
    const adminRes = await tryAdminHttp(tenantId, searchParams);
    if (adminRes) {
      const data = await adminRes.json();
      if ((data.leads || []).length > 0) {
        const normalized = (data.leads as any[]).map(normalizeSaasAdminLead);
        return NextResponse.json({ ...data, leads: normalized });
      }
    }

    // ── 2. Fallback: SaaS Admin Supabase DB direct ───────────────────────────
    const dbResult = await queryAdminDb(tenantId, searchParams);
    if (dbResult && dbResult.leads.length > 0) {
      return NextResponse.json({
        leads:  dbResult.leads,
        total:  dbResult.total,
        limit:  parseInt(searchParams.get('limit')  || '100'),
        offset: parseInt(searchParams.get('offset') || '0'),
      });
    }

    // ── 3. Nothing found anywhere ─────────────────────────────────────────────
    return NextResponse.json({
      leads:  [],
      total:  0,
      limit:  parseInt(searchParams.get('limit')  || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

  } catch (error) {
    console.error('[leads] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: String(error) },
      { status: 500 }
    );
  }
}
