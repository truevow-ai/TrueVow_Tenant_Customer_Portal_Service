/**
 * API Route: GET /api/intake/stats
 *
 * Source: SaaS Admin DB (tenant_intake_leads_session) — NEVER Tenant App.
 * Architecture decision: Lead data resides in SaaS Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSaasAdminClient() {
  const url = process.env.SAAS_ADMIN_PROJECT_URL || '';
  const key = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = getSaasAdminClient();

    const [total, qualified, retained, scheduled, scoreRows] = await Promise.all([
      supabase.from('tenant_intake_leads_session')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null),
      supabase.from('tenant_intake_leads_session')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('final_state', 'completed').is('deleted_at', null),
      supabase.from('tenant_intake_leads_session')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('final_state', 'retained').is('deleted_at', null),
      supabase.from('tenant_intake_leads_session')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).eq('final_state', 'scheduled').is('deleted_at', null),
      supabase.from('tenant_intake_leads_session')
        .select('lead_score')
        .eq('tenant_id', tenantId).is('deleted_at', null).not('lead_score', 'is', null),
    ]);

    const totalLeads     = total.count     ?? 0;
    const qualifiedLeads = qualified.count ?? 0;
    const convertedLeads = retained.count  ?? 0;
    const scheduledLeads = scheduled.count ?? 0;
    const scores = (scoreRows.data || []).map((r: any) => r.lead_score as number);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0;
    const newLeads = Math.max(0, totalLeads - qualifiedLeads - convertedLeads - scheduledLeads);

    return NextResponse.json({
      tenant_id:       tenantId,
      total_leads:     totalLeads,
      new_leads:       newLeads,
      qualified_leads: qualifiedLeads,
      converted_leads: convertedLeads,
      scheduled_leads: scheduledLeads,
      avg_lead_score:  avgScore,
      conversion_rate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: String(error) }, { status: 500 });
  }
}
