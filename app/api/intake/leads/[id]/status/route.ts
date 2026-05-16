/**
 * API Route: PATCH /api/intake/leads/[id]/status
 *
 * Updates lead status (attorney manual action).
 * Writes to SaaS Admin DB (tenant_intake_leads_session) — NEVER Tenant App.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSaasAdminClient() {
  const url = process.env.SAAS_ADMIN_PROJECT_URL || '';
  const key = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Map portal status values → final_state values stored in tenant_intake_leads_session
const STATUS_TO_FINAL_STATE: Record<string, string> = {
  new:             'partial',
  qualified:       'completed',
  scheduled:       'scheduled',
  converted:       'retained',
  lost:            'did_not_proceed',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await request.json();
    const { tenant_id, status } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const validStatuses = ['new', 'scheduled', 'qualified', 'converted', 'lost'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSaasAdminClient();
    const finalState = STATUS_TO_FINAL_STATE[status] ?? status;

    const { error } = await supabase
      .from('tenant_intake_leads_session')
      .update({ final_state: finalState, updated_at: new Date().toISOString() })
      .eq('session_id', leadId)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error updating lead status:', error);
      return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 });
    }

    return NextResponse.json({
      success:    true,
      lead_id:    leadId,
      status,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 });
  }
}
