/**
 * API Route: GET/PUT /api/calendar/auto-unlock
 *
 * GET  — check if auto_unlock addon is active for the tenant
 * PUT  — toggle auto_unlock on/off (adds/removes from tenant_accounts.active_addons)
 *
 * Uses service-role DB access to SaaS Admin (same pattern as unlock endpoint).
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
    const { data, error } = await db
      .from('tenant_accounts')
      .select('active_addons')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw error
    const addons: string[] = Array.isArray(data?.active_addons) ? data.active_addons : []
    return NextResponse.json({ enabled: addons.includes('auto_unlock'), active_addons: addons })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check auto-unlock status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, enabled } = body
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const db = getClient()

    // Get current addons
    const { data: current } = await db
      .from('tenant_accounts')
      .select('active_addons')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const addons: string[] = Array.isArray(current?.active_addons) ? [...current.active_addons] : []

    if (enabled) {
      if (!addons.includes('auto_unlock')) addons.push('auto_unlock')
    } else {
      const idx = addons.indexOf('auto_unlock')
      if (idx >= 0) addons.splice(idx, 1)
    }

    const { error } = await db
      .from('tenant_accounts')
      .update({ active_addons: addons })
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({ enabled: addons.includes('auto_unlock'), active_addons: addons })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle auto-unlock'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
