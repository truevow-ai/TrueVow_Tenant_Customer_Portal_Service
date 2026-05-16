/**
 * Tenant Context Hook
 * 
 * Resolves tenant_id from Clerk authentication session.
 * 
 * Architecture:
 * - Production: tenant_id comes from Clerk user's publicMetadata
 * - Development/Testing: Can use DEV_TENANT_ID env var when auth is bypassed
 * 
 * Clerk Setup:
 * When a tenant is created, set their tenant_id in Clerk:
 *   await clerkClient.users.updateUserMetadata(userId, {
 *     publicMetadata: { tenantId: 'uuid-here' }
 *   });
 */

import { useAuth, useUser } from '@clerk/nextjs';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantContext {
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to get the current tenant context from Clerk authentication
 * 
 * Usage:
 *   const { tenantId, isLoading, error } = useTenant();
 *   
 *   if (isLoading) return <Loading />;
 *   if (!tenantId) return <NoTenantState />;
 *   
 *   // Use tenantId for API calls
 *   const data = await fetchData(tenantId);
 */
export function useTenant(): TenantContext {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const isLoading = !authLoaded || !userLoaded;

  // Not authenticated
  if (!isLoading && !isSignedIn) {
    return {
      tenantId: null,
      userId: null,
      userEmail: null,
      userName: null,
      isLoading: false,
      isAuthenticated: false,
      error: 'Not authenticated. Please sign in.',
    };
  }

  // Still loading
  if (isLoading) {
    return {
      tenantId: null,
      userId: userId || null,
      userEmail: null,
      userName: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    };
  }

  // Authenticated - get tenant_id from publicMetadata
  const tenantId = (user?.publicMetadata?.tenantId as string) || null;
  const userEmail = user?.primaryEmailAddress?.emailAddress || null;
  const userName = user?.fullName || null;

  if (!tenantId) {
    return {
      tenantId: null,
      userId: userId || null,
      userEmail,
      userName,
      isLoading: false,
      isAuthenticated: true,
      error: 'No tenant associated with this account. Contact support.',
    };
  }

  return {
    tenantId,
    userId: userId || null,
    userEmail,
    userName,
    isLoading: false,
    isAuthenticated: true,
    error: null,
  };
}

// =============================================================================
// DEVELOPMENT FALLBACK HOOK
// =============================================================================

/**
 * Development hook that falls back to DEV_TENANT_ID when Clerk auth is bypassed
 * 
 * IMPORTANT: This is for development/testing ONLY.
 * In production, tenant_id MUST come from Clerk publicMetadata.
 * 
 * Usage:
 *   const { tenantId, isLoading, error } = useTenantDev();
 */
export function useTenantDev(): TenantContext {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const isLoading = !authLoaded || !userLoaded;

  // Development fallback - check if auth is bypassed (no user but page loads)
  const devTenantId = process.env.NEXT_PUBLIC_DEV_TENANT_ID || null;

  // Still loading
  if (isLoading) {
    return {
      tenantId: null,
      userId: null,
      userEmail: null,
      userName: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
    };
  }

  // Authenticated - get tenant_id from publicMetadata
  if (isSignedIn && user) {
    const tenantId = (user.publicMetadata?.tenantId as string) || null;
    const userEmail = user.primaryEmailAddress?.emailAddress || null;
    const userName = user.fullName || null;

    if (!tenantId) {
      return {
        tenantId: null,
        userId: userId || null,
        userEmail,
        userName,
        isLoading: false,
        isAuthenticated: true,
        error: 'No tenant associated with this account. Contact support.',
      };
    }

    return {
      tenantId,
      userId: userId || null,
      userEmail,
      userName,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    };
  }

  // Not authenticated - use development fallback if available
  if (devTenantId) {
    console.warn('[useTenantDev] Using DEV_TENANT_ID fallback - NOT FOR PRODUCTION');
    return {
      tenantId: devTenantId,
      userId: 'dev-user',
      userEmail: 'dev@example.com',
      userName: 'Development User',
      isLoading: false,
      isAuthenticated: false, // Not actually authenticated
      error: null,
    };
  }

  // No auth, no fallback
  return {
    tenantId: null,
    userId: null,
    userEmail: null,
    userName: null,
    isLoading: false,
    isAuthenticated: false,
    error: 'Not authenticated. Please sign in.',
  };
}

export default useTenant;
