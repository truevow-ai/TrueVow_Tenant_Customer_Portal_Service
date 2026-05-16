/**
 * Service Subscription Access Control
 * 
 * Server-side access checks from unified Billing Service API endpoint.
 * NO HARDCODED DEFAULTS - all data comes from API.
 * 
 * GET /api/v1/billing/tenants/{tenant_id}/feature-access
 */

import { 
  getFeatureAccess, 
  FeatureAccessResponse,
  FeatureAccess,
  FoundingIntelligenceInfo,
  SettleStatus
} from '@/lib/billing/client';

export type ServiceName = 'intake' | 'draft' | 'settle';

export interface ServiceAccessResult {
  hasAccess: boolean;
  source: 'tier' | 'addon' | 'founding_benefit' | 'upgrade_required' | 'not_launched' | 'error';
  upgradeUrl?: string;
  badge: string;
  price?: string;
  quota?: number;
}

/**
 * Error thrown when feature access data cannot be fetched
 */
export class FeatureAccessFetchError extends Error {
  constructor(message: string, public readonly tenantId: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FeatureAccessFetchError';
  }
}

/**
 * Check if tenant has access to a specific service
 */
export async function hasServiceAccess(
  tenantId: string,
  serviceName: ServiceName,
  userId?: string
): Promise<boolean> {
  try {
    const featureAccess = await getFeatureAccess(tenantId, userId);
    const access = resolveServiceAccess(featureAccess, serviceName);
    return access.hasAccess;
  } catch (error) {
    console.error(`Error checking service access for ${serviceName}:`, error);
    return false;
  }
}

/**
 * Get detailed service access information
 */
export async function getServiceAccess(
  tenantId: string,
  serviceName: ServiceName,
  userId?: string
): Promise<ServiceAccessResult> {
  const featureAccess = await getFeatureAccess(tenantId, userId);
  return resolveServiceAccess(featureAccess, serviceName);
}

/**
 * Get full feature access response from API
 */
export async function getTenantFeatureAccess(
  tenantId: string,
  userId?: string
): Promise<FeatureAccessResponse> {
  return getFeatureAccess(tenantId, userId);
}

/**
 * Resolve service access from API response
 */
function resolveServiceAccess(
  featureAccess: FeatureAccessResponse,
  serviceName: ServiceName
): ServiceAccessResult {
  const { features, founding_intelligence, settle_status } = featureAccess;

  // INTAKE
  if (serviceName === 'intake') {
    return resolveFeature(features.intake, founding_intelligence);
  }

  // DRAFT
  if (serviceName === 'draft') {
    return resolveFeature(features.draft, founding_intelligence);
  }

  // SETTLE - with launch gate
  if (serviceName === 'settle') {
    return resolveSettle(features.settle, founding_intelligence, settle_status);
  }

  return {
    hasAccess: false,
    source: 'upgrade_required',
    badge: 'Upgrade Required',
    upgradeUrl: '/dashboard/billing/upgrade',
  };
}

function resolveFeature(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null
): ServiceAccessResult {
  if (!feature.enabled) {
    return {
      hasAccess: false,
      source: 'upgrade_required',
      badge: feature.source === 'addon' ? 'Add-on' : 'Upgrade Required',
      upgradeUrl: '/dashboard/billing/upgrade',
    };
  }

  const isFoundingBenefit = feature.source === 'founding_benefit' || 
    (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled);

  const price = isFoundingBenefit && foundingIntelligence?.locked_unlock_price_cents
    ? `$${foundingIntelligence.locked_unlock_price_cents / 100} (locked)`
    : feature.per_use_price_cents > 0
      ? `$${feature.per_use_price_cents / 100}`
      : undefined;

  return {
    hasAccess: true,
    source: feature.source ?? 'tier',
    badge: getBadgeFromSource(feature.source, feature.monthly_quota),
    price,
    quota: feature.monthly_quota > 0 ? feature.monthly_quota : undefined,
  };
}

function resolveSettle(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null,
  settleStatus: SettleStatus
): ServiceAccessResult {
  // Not launched yet
  if (!settleStatus.launched) {
    return {
      hasAccess: false,
      source: 'not_launched',
      badge: foundingIntelligence?.is_member 
        ? 'Coming Soon (Founding)' 
        : 'Coming Soon',
      upgradeUrl: foundingIntelligence?.is_member ? undefined : '/dashboard/billing/upgrade',
    };
  }

  // Founding member gets contribution access
  if (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled) {
    return {
      hasAccess: true,
      source: 'founding_benefit',
      badge: 'Founding Benefit',
      price: 'Contribution access',
    };
  }

  return resolveFeature(feature, foundingIntelligence);
}

function getBadgeFromSource(
  source: FeatureAccess['source'], 
  quota: number
): string {
  switch (source) {
    case 'tier':
      return quota > 0 ? `${quota} free/mo` : 'Included';
    case 'addon':
      return 'Active (Add-on)';
    case 'founding_benefit':
      return 'Founding Benefit';
    default:
      return 'Enabled';
  }
}

/**
 * Get service display name
 */
export function getServiceDisplayName(serviceName: ServiceName): string {
  const names: Record<ServiceName, string> = {
    intake: 'INTAKE',
    draft: 'DRAFT',
    settle: 'SETTLE',
  };
  return names[serviceName];
}

/**
 * Get service description
 */
export function getServiceDescription(serviceName: ServiceName): string {
  const descriptions: Record<ServiceName, string> = {
    intake: 'Lead capture and intake management',
    draft: 'Legal document validation',
    settle: 'Settlement intelligence and contribution',
  };
  return descriptions[serviceName];
}

/**
 * Get upgrade URL for a service
 */
export function getUpgradeUrl(serviceName: ServiceName): string {
  return `/dashboard/billing/subscribe/${serviceName}`;
}
