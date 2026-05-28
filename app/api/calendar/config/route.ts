/**
 * API Route: GET/PUT /api/calendar/config
 *
 * Proxies to SaaS Admin for attorney list + routing configuration.
 * Uses service-role DB access (same pattern as intake/unlock routes).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  const url = process.env.SAAS_ADMIN_PROJECT_URL || ''
  const key = process.env.SAAS_ADMIN_DATABASE_SERVICE_KEY || process.env.SAAS_ADMIN_DATABASE_API_SECRET_KEY || ''
  if (!url || !key) throw new Error('SAAS_ADMIN DB credentials not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const db = getClient()

    const [attorneysRes, routingRes] = await Promise.all([
      db.from('onboarding_attorneys').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('last_name'),
      db.from('onboarding_lead_routing_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
    ])

    return NextResponse.json({
      attorneys: attorneysRes.data || [],
      routingConfig: routingRes.data || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load calendar config'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, routingMode, practiceAreaAssignments, timeSlotPreferences, maxCasesPerDay } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const db = getClient()

    const { data, error } = await db
      .from('onboarding_lead_routing_config')
      .upsert({
        tenant_id: tenantId,
        routing_mode: routingMode || 'hybrid',
        max_cases_per_day: maxCasesPerDay || 8,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, routingConfig: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save calendar config'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
