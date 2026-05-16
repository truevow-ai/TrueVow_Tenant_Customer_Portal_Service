/**
 * API Route: GET /api/intake/leads/[id]/notes?tenant_id=<uuid>
 *            POST /api/intake/leads/[id]/notes
 *
 * Attorney notes stored in SaaS Admin DB (tenant_intake_leads_session.notes).
 * NEVER reads from or writes to Tenant App.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSaasAdminClient() {
  const url = process.env.SAAS_ADMIN_PROJECT_URL || '';
  const key = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || '';
  if (!url || !key) throw new Error('SAAS_ADMIN_PROJECT_URL / SAAS_ADMIN_DATABASE_SERVICE_KEY not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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
    const { data, error } = await supabase
      .from('tenant_intake_leads_session')
      .select('notes')
      .eq('session_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ notes: [] });
    }

    let notes: any[] = [];
    try { notes = data.notes ? JSON.parse(data.notes) : []; } catch { notes = []; }
    if (!Array.isArray(notes)) notes = [];

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching lead notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { tenant_id, note } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }
    if (!note?.text?.trim()) {
      return NextResponse.json({ error: 'note.text is required' }, { status: 400 });
    }

    const supabase = getSaasAdminClient();

    // Fetch existing notes first
    const { data } = await supabase
      .from('tenant_intake_leads_session')
      .select('notes')
      .eq('session_id', leadId)
      .eq('tenant_id', tenant_id)
      .is('deleted_at', null)
      .single();

    let existing: any[] = [];
    try { existing = data?.notes ? JSON.parse(data.notes) : []; } catch { existing = []; }
    if (!Array.isArray(existing)) existing = [];

    const newNote = {
      id:        crypto.randomUUID(),
      text:      note.text.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newNote, ...existing];

    const { error } = await supabase
      .from('tenant_intake_leads_session')
      .update({ notes: JSON.stringify(updated), updated_at: new Date().toISOString() })
      .eq('session_id', leadId)
      .eq('tenant_id', tenant_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: newNote, notes: updated });
  } catch (error) {
    console.error('Error saving lead note:', error);
    return NextResponse.json({ error: 'Failed to save note', details: String(error) }, { status: 500 });
  }
}
