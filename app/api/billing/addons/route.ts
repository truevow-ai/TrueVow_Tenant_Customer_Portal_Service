/**
 * API Route: GET/PUT /api/billing/addons
 *
 * Manages SaaS Admin add-ons (auto_unlock, outbound_agent).
 * GET  — list available addons + active status for tenant
 * PUT  — toggle an addon on/off
 *
 * Proxies to SaaS Admin onboarding/addons via direct DB access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AVAILABLE_ADDONS = [
  {
    key: 'outbound_agent',
    label: 'Outbound Agent',
    description: 'Automated appointment reminders, follow-ups, and re-engagement workflows.',
  },
  {
    key: 'auto_unlock',
    label: 'Auto-Unlock A+ Leads',
    description: 'Automatically unlock qualified leads and push appointments to attorney calendars.',
  },
]

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
    const { data, error } = await db
      .from('tenant_accounts')
      .select('active_addons')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw error
    const active: string[] = Array.isArray(data?.active_addons) ? data.active_addons : []

    const addons = AVAILABLE_ADDONS.map((a) => ({
      ...a,
      enabled: active.includes(a.key),
    }))

    return NextResponse.json({ addons, active })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load addons'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, addonKey, enabled } = body
    if (!tenantId || !addonKey) {
      return NextResponse.json({ error: 'tenantId and addonKey required' }, { status: 400 })
    }

    if (!AVAILABLE_ADDONS.some((a) => a.key === addonKey)) {
      return NextResponse.json({ error: `Unknown addon: ${addonKey}` }, { status: 400 })
    }

    const db = getClient()

    const { data: current } = await db
      .from('tenant_accounts')
      .select('active_addons')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const addons: string[] = Array.isArray(current?.active_addons) ? [...current.active_addons] : []

    if (enabled) {
      if (!addons.includes(addonKey)) addons.push(addonKey)
    } else {
      const idx = addons.indexOf(addonKey)
      if (idx >= 0) addons.splice(idx, 1)
    }

    const { error } = await db
      .from('tenant_accounts')
      .update({ active_addons: addons })
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({ active: addons })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle addon'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
