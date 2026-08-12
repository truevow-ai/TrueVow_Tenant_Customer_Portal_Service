/**
 * Tenant Context Hook
 * 
 * Resolves tenant_id from Supabase Auth session user_metadata.
 * 
 * Architecture:
 * - Production: tenant_id comes from Supabase user's user_metadata
 * - Development: DEV_TENANT_ID env var may be used ONLY when NODE_ENV !== production
 * 
 * Supabase Setup:
 * When a tenant is created, set their tenant_id via auth.admin.updateUserById:
 *   await supabaseAdmin.auth.admin.updateUserById(userId, {
 *     user_metadata: { tenantId: 'uuid-here', role: 'admin' }
 *   });
 */

import { useAuth, useUser } from '@truevow/auth';

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
 * Hook to get the current tenant context from Supabase Auth session
 */
export function useTenant(): TenantContext {
  const { user, loading } = useUser();

  if (loading) {
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

  if (!user) {
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

  const devTenantId =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_TENANT_ID
      ? process.env.NEXT_PUBLIC_DEV_TENANT_ID
      : null;

  const tenantId =
    (user.user_metadata?.tenantId as string) ||
    devTenantId ||
    null;
  const userEmail = user.email || null;
  const userName = user.user_metadata?.full_name || user.email || null;

  if (!tenantId) {
    return {
      tenantId: null,
      userId: user.id || null,
      userEmail,
      userName,
      isLoading: false,
      isAuthenticated: true,
      error: 'No tenant associated with this account. Contact support.',
    };
  }

  return {
    tenantId,
    userId: user.id || null,
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

export function useTenantDev(): TenantContext {
  const { user, loading } = useUser();

  if (loading) {
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

  const devTenantId =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_TENANT_ID
      ? process.env.NEXT_PUBLIC_DEV_TENANT_ID
      : null;

  if (user) {
    const tenantId =
      (user.user_metadata?.tenantId as string) || devTenantId || null;
    const userEmail = user.email || null;
    const userName = user.user_metadata?.full_name || user.email || null;

    if (!tenantId) {
      return {
        tenantId: null,
        userId: user.id,
        userEmail,
        userName,
        isLoading: false,
        isAuthenticated: true,
        error: 'No tenant associated with this account. Contact support.',
      };
    }

    return {
      tenantId,
      userId: user.id,
      userEmail,
      userName,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    };
  }

  if (devTenantId) {
    console.warn('[useTenantDev] Using DEV_TENANT_ID fallback - NOT FOR PRODUCTION');
    return {
      tenantId: devTenantId,
      userId: 'dev-user',
      userEmail: 'dev@example.com',
      userName: 'Development User',
      isLoading: false,
      isAuthenticated: false,
      error: null,
    };
  }

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
