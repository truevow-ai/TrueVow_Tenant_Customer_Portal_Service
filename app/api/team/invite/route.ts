/**
 * Team Invite API Endpoint
 * 
 * POST /api/team/invite
 * 
 * Allows tenant admin users to invite new team members (attorneys, paralegals, staff).
 * The invited user will:
 * 1. Be created in Clerk
 * 2. Have publicMetadata.tenantId set to the admin's tenant
 * 3. Have publicMetadata.role set based on request
 * 4. Receive an invitation email from Clerk
 * 
 * Architecture:
 * - First admin: Created manually by CSM in Clerk Dashboard
 * - Subsequent users: Created via this API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

const SAAS_ADMIN_URL = process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const SAAS_API_KEY  = process.env.PLATFORM_SERVICE_API_KEY || '';

/** Fire-and-forget SaaS Admin upsert — non-breaking if it fails */
function syncUpsertToSaasAdmin(
  tenantId: string,
  clerkUserId: string,
  payload: Record<string, unknown>
) {
  fetch(`${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'X-API-Key': SAAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkUserId, ...payload }),
    signal: AbortSignal.timeout(5_000),
  }).catch(err =>
    console.warn('[Team Invite] SaaS Admin upsert failed (non-fatal):', err.message)
  );
}

/** Fire-and-forget SaaS Admin soft-delete — non-breaking if it fails */
function syncDeleteToSaasAdmin(tenantId: string, clerkUserId: string) {
  fetch(
    `${SAAS_ADMIN_URL}/api/v1/customer-portal/tenants/${tenantId}/users/${clerkUserId}`,
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
  services?: string[];       // e.g., ['intake', 'draft', 'settle']
  practiceAreas?: string[];  // e.g., ['Personal Injury', 'Immigration']
}

interface InviteResponse {
  success: boolean;
  userId?: string;
  error?: string;
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!body.role || !VALID_ROLES.includes(body.role)) {
    return { valid: false, error: `Role must be one of: ${VALID_ROLES.join(', ')}` };
  }

  // Validate services if provided
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
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<InviteResponse>> {
  try {
    // 1. Authenticate the requesting user
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Get tenant ID from the admin's session
    const tenantId = sessionClaims?.tenantId as string | undefined;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant associated with your account' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body: InviteRequest = await request.json();
    const validation = validateRequest(body);
    
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 4. Check if user already exists
    const client = await clerkClient();
    const existingUsers = await client.users.getUserList({
      emailAddress: [body.email],
    });

    if (existingUsers.data.length > 0) {
      const existingUser = existingUsers.data[0];
      
      // Check if user is already in this tenant
      const existingTenantId = existingUser.publicMetadata?.tenantId as string | undefined;
      
      if (existingTenantId === tenantId) {
        return NextResponse.json(
          { success: false, error: 'User already exists in your team' },
          { status: 409 }
        );
      }
      
      // User exists but in different tenant
      return NextResponse.json(
        { success: false, error: 'User already exists with another organization' },
        { status: 409 }
      );
    }

    // 5. Create the user in Clerk
    const newUser = await client.users.createUser({
      emailAddress: [body.email],
      firstName: body.firstName,
      lastName: body.lastName,
      publicMetadata: {
        tenantId: tenantId,
        role: body.role,
        services: body.services || [],
        invitedBy: userId,
        invitedAt: new Date().toISOString(),
      },
      // Skip password requirement - Clerk will send email to set password
      skipPasswordRequirement: true,
      // Skip password checks for invitation flow
      skipPasswordChecks: true,
    });

    // 6. Send invitation email (Clerk handles this automatically)
    // The user will receive an email to set their password and join

    console.log(`[Team Invite] Created user ${newUser.id} for tenant ${tenantId} with role ${body.role}`);

    // Sync tenant-scoped service config to SaaS Admin (fire-and-forget)
    // Only sends configuration fields — PII (name, email, role) stays in Clerk.
    syncUpsertToSaasAdmin(tenantId, newUser.id, {
      servicesAssigned:      body.services || [],
      practiceAreasAssigned: body.practiceAreas || [],
    });

    return NextResponse.json({
      success: true,
      userId: newUser.id,
    });

  } catch (error: any) {
    console.error('[Team Invite] Error:', error);
    
    // Handle specific Clerk errors
    if (error.errors) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        { success: false, error: clerkError?.message || 'Clerk API error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE HANDLER - Remove team member
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate the requesting user
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Get tenant ID from the admin's session
    const tenantId = sessionClaims?.tenantId as string | undefined;
    const adminRole = sessionClaims?.role as string | undefined;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant associated with your account' },
        { status: 403 }
      );
    }

    // Only admins can remove team members
    if (adminRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can remove team members' },
        { status: 403 }
      );
    }

    // 3. Get user ID to remove from request body
    const body = await request.json();
    const { userId: userIdToRemove } = body;
    
    if (!userIdToRemove) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-removal
    if (userIdToRemove === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    // 4. Verify the user belongs to this tenant
    const client = await clerkClient();
    const userToRemove = await client.users.getUser(userIdToRemove);
    
    if (userToRemove.publicMetadata?.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'User not found in your team' },
        { status: 404 }
      );
    }

    // 5. Delete the user
    await client.users.deleteUser(userIdToRemove);

    // Sync soft-delete to SaaS Admin tenant_users (fire-and-forget)
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

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Authenticate the requesting user
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // 2. Get tenant ID from the admin's session
    const tenantId = sessionClaims?.tenantId as string | undefined;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with your account' },
        { status: 403 }
      );
    }

    // 3. Get all users in this tenant
    const client = await clerkClient();
    const users = await client.users.getUserList({
      // Note: Clerk doesn't support filtering by publicMetadata directly
      // We need to fetch and filter client-side
      limit: 100,
    });

    // Filter users by tenant
    const tenantUsers = users.data.filter(
      user => user.publicMetadata?.tenantId === tenantId
    );

    // Map to team member format
    const teamMembers = tenantUsers.map(user => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.lastName || '',
      role: user.publicMetadata?.role || 'staff',
      services: user.publicMetadata?.services || [],
      invitedBy: user.publicMetadata?.invitedBy,
      invitedAt: user.publicMetadata?.invitedAt,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      imageUrl: user.imageUrl,
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
