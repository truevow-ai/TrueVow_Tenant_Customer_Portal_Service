/**
 * Team Invite API Endpoint
 * 
 * POST /api/team/invite
 * 
 * Allows tenant admin users to invite new team members (attorneys, paralegals, staff).
 * The invited user will:
 * 1. Be created in Supabase Auth
 * 2. Have user_metadata.tenantId set to the admin's tenant
 * 3. Have user_metadata.role set based on request
 * 4. Receive an invitation email from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySupabaseJwt } from '@truevow/auth';

const SAAS_ADMIN_URL = process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const SAAS_API_KEY  = process.env.PLATFORM_SERVICE_API_KEY || '';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function syncUpsertToSaasAdmin(
  tenantId: string,
  supabaseUserId: string,
  payload: Record<string, unknown>
) {
  fetch(`${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'X-API-Key': SAAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ supabaseUserId, ...payload }),
    signal: AbortSignal.timeout(5_000),
  }).catch(err =>
    console.warn('[Team Invite] SaaS Admin upsert failed (non-fatal):', err.message)
  );
}

function syncDeleteToSaasAdmin(tenantId: string, supabaseUserId: string) {
  fetch(
    `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users/${supabaseUserId}`,
    {
      method: 'DELETE',
      headers: { 'X-API-Key': SAAS_API_KEY },
      signal: AbortSignal.timeout(5_000),
    }
  ).catch(err =>
    console.warn('[Team Remove] SaaS Admin delete failed (non-fatal):', err.message)
  );
}

// =============================================================================
// TYPES
// =============================================================================

interface InviteRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'attorney' | 'paralegal' | 'staff';
  services?: string[];
  practiceAreas?: string[];
}

interface InviteResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

// =============================================================================
// JWT VERIFICATION
// =============================================================================

async function verifyRequestAuth(req: NextRequest): Promise<{ userId: string; tenantId: string; role: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const ctx = await verifySupabaseJwt(token);
  if (!ctx) return null;

  const metadata = (ctx as any).user_metadata ?? {};
  const tenantId = metadata.tenantId as string | undefined;
  if (!tenantId) return null;

  return {
    userId: ctx.sub,
    tenantId,
    role: (metadata.role as string) || 'staff',
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

const VALID_ROLES = ['admin', 'attorney', 'paralegal', 'staff'] as const;
const VALID_SERVICES = ['intake', 'draft', 'settle', 'verify'] as const;

function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!body.role || !VALID_ROLES.includes(body.role)) {
    return { valid: false, error: `Role must be one of: ${VALID_ROLES.join(', ')}` };
  }

  if (body.services && Array.isArray(body.services)) {
    for (const service of body.services) {
      if (!VALID_SERVICES.includes(service as any)) {
        return { valid: false, error: `Invalid service: ${service}. Valid services: ${VALID_SERVICES.join(', ')}` };
      }
    }
  }

  return { valid: true };
}

// =============================================================================
// API HANDLER — POST (Invite)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<InviteResponse>> {
  try {
    const auth = await verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { userId, tenantId } = auth;

    const body: InviteRequest = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    const newUser = await adminClient.auth.admin.createUser({
      email: body.email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: [body.firstName, body.lastName].filter(Boolean).join(' ') || undefined,
        tenantId,
        role: body.role,
        services: body.services || [],
        invitedBy: userId,
        invitedAt: new Date().toISOString(),
      },
    });

    if (newUser.error) {
      console.error('[Team Invite] User creation error:', newUser.error);

      if (newUser.error.message?.includes('already')) {
        return NextResponse.json(
          { success: false, error: 'User already exists with another organization' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: newUser.error.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    console.log(`[Team Invite] Created user ${newUser.data.user?.id} for tenant ${tenantId} with role ${body.role}`);

    syncUpsertToSaasAdmin(tenantId, newUser.data.user!.id, {
      servicesAssigned:      body.services || [],
      practiceAreasAssigned: body.practiceAreas || [],
    });

    return NextResponse.json({
      success: true,
      userId: newUser.data.user!.id,
    });

  } catch (error: any) {
    console.error('[Team Invite] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE HANDLER — Remove team member
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { userId, tenantId, role: adminRole } = auth;

    if (adminRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can remove team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId: userIdToRemove } = body;

    if (!userIdToRemove) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (userIdToRemove === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    const { data: userToRemove, error: getUserError } = await adminClient.auth.admin.getUserById(userIdToRemove);

    if (getUserError || !userToRemove?.user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (userToRemove.user.user_metadata?.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'User not found in your team' },
        { status: 404 }
      );
    }

    await adminClient.auth.admin.deleteUser(userIdToRemove);

    syncDeleteToSaasAdmin(tenantId, userIdToRemove);

    console.log(`[Team Remove] Deleted user ${userIdToRemove} from tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });

  } catch (error: any) {
    console.error('[Team Remove] Error:', error);

    if (error.status === 404) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET HANDLER — List team members
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyRequestAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { tenantId } = auth;

    const adminClient = getSupabaseAdmin();

    const { data, error } = await adminClient.auth.admin.listUsers({
      perPage: 100,
    });

    if (error) {
      console.error('[Team List] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    const tenantUsers = (data?.users || []).filter(
      user => user.user_metadata?.tenantId === tenantId
    );

    const teamMembers = tenantUsers.map(user => ({
      id: user.id,
      email: user.email || '',
      firstName: user.user_metadata?.first_name || null,
      lastName: user.user_metadata?.last_name || null,
      fullName: user.user_metadata?.full_name || user.email || '',
      role: user.user_metadata?.role || 'staff',
      services: user.user_metadata?.services || [],
      invitedBy: user.user_metadata?.invitedBy,
      invitedAt: user.user_metadata?.invitedAt,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      imageUrl: user.user_metadata?.avatar_url || null,
    }));

    return NextResponse.json({
      success: true,
      members: teamMembers,
      total: teamMembers.length,
    });

  } catch (error: any) {
    console.error('[Team List] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
