/**
 * Billing API Client
 * 
 * Integrates with Tenant Application API for unified feature access.
 * GET /api/v1/billing/tenants/{tenant_id}/feature-access
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const BILLING_API = process.env.NEXT_PUBLIC_BILLING_API_URL?.replace('/api/v1', '') ||
                    process.env.TENANT_BILLING_SERVICE_URL || 
                    'http://localhost:3016';

const API_KEY = process.env.TENANT_BILLING_SERVICE_API_KEY || 
                process.env.TENANT_BILLING_API_KEY || '';

// =============================================================================
// TYPES (Matching Billing Service API)
// =============================================================================

export type Tier = 'solo' | 'growth' | null;

export interface FeatureAccess {
  enabled: boolean;
  source: 'tier' | 'addon' | 'founding_benefit' | null;
  per_use_price_cents: number;
  monthly_quota: number;
}

export interface AddOnInfo {
  addon_id: string;
  name: string;
  display_name: string;
  status: 'active' | 'cancelled' | 'expired';
}

export interface FoundingIntelligenceInfo {
  is_member: boolean;
  user_id: string | null;
  benefits_enabled: boolean;
  dashboard_access_tier: number;  // 0-4 based on contributions
  pricing_locked_until: string | null;
  locked_unlock_price_cents: number | null;  // $99 locked
  verified_submissions: number;
  recognition_display_name: string | null;
}

export interface SettleStatus {
  launched: boolean;
  entries_count: number;
  months_since_start: number;
  launch_date: string | null;
}

export interface FeatureAccessResponse {
  tenant_id: string;
  tier: Tier;
  subscription_status: string;
  
  features: {
    intake: FeatureAccess;
    settle: FeatureAccess;
    draft: FeatureAccess;
  };
  
  addons: AddOnInfo[];
  
  founding_intelligence: FoundingIntelligenceInfo | null;
  
  settle_status: SettleStatus;
}

// =============================================================================
// API CLIENT
// =============================================================================

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BILLING_API}/api/v1/billing${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// UNIFIED FEATURE ACCESS ENDPOINT
// =============================================================================

/**
 * Get unified feature access for a tenant
 * 
 * @param tenantId - Tenant UUID
 * @param userId - Optional attorney user ID for founding intelligence benefits
 */
export async function getFeatureAccess(
  tenantId: string, 
  userId?: string
): Promise<FeatureAccessResponse> {
  let path = `/tenants/${tenantId}/feature-access`;
  if (userId) {
    path += `?user_id=${userId}`;
  }
  return fetchAPI<FeatureAccessResponse>(path);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format cents to dollar string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: FeatureAccess): boolean {
  return feature.enabled;
}

/**
 * Get feature source label
 */
export function getFeatureSourceLabel(source: FeatureAccess['source']): string {
  switch (source) {
    case 'tier': return 'Included in Plan';
    case 'addon': return 'Add-on';
    case 'founding_benefit': return 'Founding Benefit';
    default: return 'Not Available';
  }
}

/**
 * Get founding intelligence access tier label
 */
export function getDashboardAccessTierLabel(tier: number): string {
  switch (tier) {
    case 0: return 'Seed';
    case 1: return 'Contributor';
    case 2: return 'Established';
    case 3: return 'Premium';
    case 4: return 'Apex';
    default: return 'Unknown';
  }
}

/**
 * Calculate contribution progress to next tier
 */
export function getNextTierProgress(verifiedSubmissions: number): { 
  currentTier: number; 
  nextTier: number | null;
  submissionsNeeded: number | null;
} {
  const tiers = [0, 10, 25, 50, 100]; // Thresholds for each tier
  
  let currentTier = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (verifiedSubmissions >= tiers[i]) {
      currentTier = i;
      break;
    }
  }
  
  if (currentTier === 4) {
    return { currentTier: 4, nextTier: null, submissionsNeeded: null };
  }
  
  const nextTier = currentTier + 1;
  const submissionsNeeded = tiers[nextTier] - verifiedSubmissions;
  
  return { currentTier, nextTier, submissionsNeeded };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  getFeatureAccess,
  formatCents,
  isFeatureEnabled,
  getFeatureSourceLabel,
  getDashboardAccessTierLabel,
  getNextTierProgress,
};
