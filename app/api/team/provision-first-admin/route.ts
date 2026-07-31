/**
 * POST /api/team/provision-first-admin
 *
 * Internal service-to-service endpoint called by SaaS Admin during
 * onboarding to create the first law firm admin user in Clerk (App 3).
 *
 * Auth: X-API-Key header matching PLATFORM_SERVICE_API_KEY
 *
 * This is the ONLY place where the first admin Clerk user is created
 * programmatically. All subsequent team members are created by the
 * existing POST /api/team/invite endpoint (requires Clerk session).
 *
 * Request body:
 *   { tenant_id: string, email: string, first_name: string, last_name: string }
 *
 * Response:
 *   { success: true, userId: "user_xxx" } or { success: false, error: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

const PLATFORM_API_KEY = process.env.PLATFORM_SERVICE_API_KEY || ''
const SAAS_ADMIN_URL = process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001'
const SAAS_API_KEY = process.env.PLATFORM_SERVICE_API_KEY || ''

interface ProvisionFirstAdminRequest {
  tenant_id: string
  email: string
  first_name: string
  last_name: string
  role?: string
}

function syncUpsertToSaasAdmin(
  tenantId: string,
  clerkUserId: string,
  payload: Record<string, unknown>,
) {
  fetch(`${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'X-API-Key': SAAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkUserId, ...payload }),
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

    const client = await clerkClient()

    const existingUsers = await client.users.getUserList({
      emailAddress: [body.email],
    })

    if (existingUsers.data.length > 0) {
      const existingUser = existingUsers.data[0]
      const existingTenantId = existingUser.publicMetadata?.tenantId as string | undefined

      if (existingTenantId === body.tenant_id) {
        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          alreadyExisted: true,
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: 'User already exists with a different organization',
        },
        { status: 409 },
      )
    }

    const newUser = await client.users.createUser({
      emailAddress: [body.email],
      firstName: body.first_name,
      lastName: body.last_name,
      publicMetadata: {
        tenantId: body.tenant_id,
        role: body.role || 'admin',
        services: ['intake', 'settle', 'leverage', 'verify', 'customer_portal'],
        provisionedBy: 'saas_admin_onboarding_orchestrator',
        provisionedAt: new Date().toISOString(),
      },
      skipPasswordRequirement: true,
      skipPasswordChecks: true,
    })

    console.log(
      `[Provision First Admin] Created Clerk user ${newUser.id} for tenant ${body.tenant_id}`,
    )

    syncUpsertToSaasAdmin(body.tenant_id, newUser.id, {
      servicesAssigned: ['intake', 'settle', 'leverage', 'verify', 'customer_portal'],
      practiceAreasAssigned: [],
    })

    return NextResponse.json({
      success: true,
      userId: newUser.id,
      alreadyExisted: false,
    })
  } catch (error: any) {
    console.error('[Provision First Admin] Error:', error)

    if (error.errors) {
      const clerkError = error.errors[0]
      return NextResponse.json(
        { success: false, error: clerkError?.message || 'Clerk API error' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to provision first admin user' },
      { status: 500 },
    )
  }
}
