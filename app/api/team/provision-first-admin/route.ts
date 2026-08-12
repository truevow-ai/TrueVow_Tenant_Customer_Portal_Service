/**
 * POST /api/team/provision-first-admin
 *
 * Internal service-to-service endpoint called by SaaS Admin during
 * onboarding to create the first law firm admin user in Supabase Auth.
 *
 * Auth: X-API-Key header matching PLATFORM_SERVICE_API_KEY
 *
 * Request body:
 *   { tenant_id: string, email: string, first_name: string, last_name: string }
 *
 * Response:
 *   { success: true, userId: "uuid" } or { success: false, error: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLATFORM_API_KEY = process.env.PLATFORM_SERVICE_API_KEY || ''
const SAAS_ADMIN_URL = process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001'
const SAAS_API_KEY = process.env.PLATFORM_SERVICE_API_KEY || ''

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface ProvisionFirstAdminRequest {
  tenant_id: string
  email: string
  first_name: string
  last_name: string
  role?: string
}

function syncUpsertToSaasAdmin(
  tenantId: string,
  supabaseUserId: string,
  payload: Record<string, unknown>,
) {
  fetch(`${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'X-API-Key': SAAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ supabaseUserId, ...payload }),
    signal: AbortSignal.timeout(5_000),
  }).catch((err) =>
    console.warn('[Provision First Admin] SaaS Admin sync failed (non-fatal):', err.message),
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== PLATFORM_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — invalid or missing API key' },
        { status: 401 },
      )
    }

    const body: ProvisionFirstAdminRequest = await request.json()

    if (!body.tenant_id || !body.email || !body.first_name || !body.last_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: tenant_id, email, first_name, last_name',
        },
        { status: 400 },
      )
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      )
    }

    const adminClient = getSupabaseAdmin()

    const newUser = await adminClient.auth.admin.createUser({
      email: body.email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: `${body.first_name} ${body.last_name}`,
        tenantId: body.tenant_id,
        role: body.role || 'admin',
        services: ['intake', 'settle', 'leverage', 'verify', 'customer_portal'],
        provisionedBy: 'saas_admin_onboarding_orchestrator',
        provisionedAt: new Date().toISOString(),
      },
    })

    if (newUser.error) {
      console.error('[Provision First Admin] Supabase user creation error:', newUser.error)
      return NextResponse.json(
        { success: false, error: newUser.error.message || 'Failed to create user' },
        { status: 400 },
      )
    }

    console.log(
      `[Provision First Admin] Created Supabase user ${newUser.data.user?.id} for tenant ${body.tenant_id}`,
    )

    syncUpsertToSaasAdmin(body.tenant_id, newUser.data.user!.id, {
      servicesAssigned: ['intake', 'settle', 'leverage', 'verify', 'customer_portal'],
      practiceAreasAssigned: [],
    })

    return NextResponse.json({
      success: true,
      userId: newUser.data.user!.id,
      alreadyExisted: false,
    })
  } catch (error: any) {
    console.error('[Provision First Admin] Error:', error)

    if (error.status === 409 || error.message?.includes('already')) {
      return NextResponse.json(
        { success: false, error: 'User already exists with a different organization' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to provision first admin user' },
      { status: 500 },
    )
  }
}
