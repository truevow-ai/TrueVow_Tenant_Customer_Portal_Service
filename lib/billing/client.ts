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

export type Tier = 'solo' | 'growth' | 'team' | null;

export type SubscriptionStatus =
  | 'PENDING'
  | 'TRIAL_ACTIVE'
  | 'ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAST_DUE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type TrialEndReason = 'INTAKE_LIMIT' | 'TIME_LIMIT' | null;

export type SuccessorPlanStatus = 'NONE' | 'SELECTED' | 'BILLING_READY';

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

export interface TrialInfo {
  offer_code: string;
  trial_started_at: string;
  trial_expires_at: string;
  trial_ended_at: string | null;
  trial_end_reason: TrialEndReason;
  intakes_used: number;
  intake_limit: number;
  duration_days: number;
}

export interface SuccessorPlan {
  plan_id: 'solo' | 'growth' | 'team';
  plan_display_name: string;
  plan_version_id: string;
  monthly_price_cents: number;
  currency: string;
  selected_at: string;
  status: SuccessorPlanStatus;
  billing_ready: boolean;
}

export interface FeatureAccessResponse {
  tenant_id: string;
  tier: Tier;
  subscription_status: string;

  trial?: TrialInfo | null;

  successor?: SuccessorPlan | null;

  paid_activated_at?: string | null;

  features: {
    intake: FeatureAccess;
    settle: FeatureAccess;
    leverage: FeatureAccess;
    draft: FeatureAccess;
    trace: FeatureAccess;
    retainer: FeatureAccess;
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
 * Check if the subscription status represents an active trial.
 */
export function isTrialActive(status: string): boolean {
  return status === 'TRIAL_ACTIVE';
}

/**
 * Check if the subscription status represents a trial that expired without a successor.
 */
export function isTrialExpired(status: string): boolean {
  return status === 'TRIAL_EXPIRED';
}

/**
 * Check if the subscription status represents a paid active plan.
 */
export function isPaidActive(status: string): boolean {
  return status === 'ACTIVE';
}

/**
 * Calculate days remaining in the trial. Returns null if trial is not active.
 */
export function calculateTrialDaysRemaining(trial: TrialInfo): number | null {
  if (!trial || trial.trial_ended_at) return null;
  const now = Date.now();
  const expiresAt = new Date(trial.trial_expires_at).getTime();
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  return remaining;
}

/**
 * Calculate trial intake progress as a percentage (0-100).
 */
export function calculateIntakeProgressPercent(trial: TrialInfo): number {
  if (!trial || trial.intake_limit === 0) return 0;
  return Math.min(100, Math.round((trial.intakes_used / trial.intake_limit) * 100));
}

/**
 * Format date string to human-readable format.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a successor plan ID to its display name.
 */
export function getPlanDisplayName(planId: string): string {
  const names: Record<string, string> = {
    solo: 'INTAKE',
    growth: 'PIPELINE',
    team: 'OPERATIONS',
  };
  return names[planId] || planId;
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
