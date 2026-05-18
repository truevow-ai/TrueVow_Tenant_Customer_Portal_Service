/**
 * Service Access Hook
 * 
 * Resolves service access state from unified Billing Service API endpoint.
 * NO HARDCODED DEFAULTS - all data comes from API.
 * 
 * GET /api/v1/billing/tenants/{tenant_id}/feature-access
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getFeatureAccess, 
  FeatureAccessResponse, 
  FeatureAccess,
  FoundingIntelligenceInfo,
  SettleStatus
} from '@/lib/billing/client';

// =============================================================================
// TYPES
// =============================================================================

export type Service = 'intake' | 'settle' | 'leverage' | 'draft';

export interface ServiceAccess {
  enabled: boolean;
  badge: string;
  source: 'tier' | 'addon' | 'founding_benefit' | null;
  upgradeAvailable: boolean;
  upgradePath?: string;
  price?: string;
  quota?: number;
}

export interface UseServiceAccessReturn {
  loading: boolean;
  error: string | null;
  featureAccess: FeatureAccessResponse | null;
  services: Record<Service, ServiceAccess> | null;
  foundingIntelligence: FoundingIntelligenceInfo | null;
  settleStatus: SettleStatus | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useServiceAccess(
  tenantId: string | null, 
  userId?: string
): UseServiceAccessReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccessResponse | null>(null);

  const fetchFeatureAccess = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      setFeatureAccess(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getFeatureAccess(tenantId, userId);
      setFeatureAccess(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFeatureAccess(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  useEffect(() => {
    fetchFeatureAccess();
  }, [fetchFeatureAccess]);

  // Resolve service access from API response
  const services = featureAccess ? resolveServiceAccess(featureAccess) : null;

  return {
    loading,
    error,
    featureAccess,
    services,
    foundingIntelligence: featureAccess?.founding_intelligence ?? null,
    settleStatus: featureAccess?.settle_status ?? null,
    refresh: fetchFeatureAccess,
  };
}

// =============================================================================
// SERVICE ACCESS RESOLUTION
// =============================================================================

function resolveServiceAccess(
  featureAccess: FeatureAccessResponse
): Record<Service, ServiceAccess> {
  const { features, founding_intelligence, settle_status } = featureAccess;

  // INTAKE
  const intakeAccess: ServiceAccess = resolveFeatureAccess(
    features.intake,
    founding_intelligence
  );

  // DRAFT
  const draftAccess: ServiceAccess = resolveFeatureAccess(
    features.draft,
    founding_intelligence
  );

  // SETTLE - with launch gate
  const settleAccess: ServiceAccess = resolveSettleAccess(
    features.settle,
    founding_intelligence,
    settle_status
  );

  // LEVERAGE
  const leverageAccess: ServiceAccess = resolveFeatureAccess(
    features.leverage,
    founding_intelligence
  );

  return {
    intake: intakeAccess,
    draft: draftAccess,
    settle: settleAccess,
    leverage: leverageAccess,
  };
}

function resolveFeatureAccess(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null
): ServiceAccess {
  if (!feature.enabled) {
    return {
      enabled: false,
      badge: feature.source === 'addon' ? 'Add-on' : 'Upgrade Required',
      source: null,
      upgradeAvailable: true,
      upgradePath: '/dashboard/billing/upgrade',
    };
  }

  // Check for founding benefit pricing
  const isFoundingBenefit = feature.source === 'founding_benefit' || 
    (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled);

  const price = isFoundingBenefit && foundingIntelligence?.locked_unlock_price_cents
    ? `$${foundingIntelligence.locked_unlock_price_cents / 100} (locked)`
    : feature.per_use_price_cents > 0
      ? `$${feature.per_use_price_cents / 100}`
      : undefined;

  return {
    enabled: true,
    badge: getBadgeFromSource(feature.source, feature.monthly_quota),
    source: feature.source,
    upgradeAvailable: false,
    price,
    quota: feature.monthly_quota > 0 ? feature.monthly_quota : undefined,
  };
}

function resolveSettleAccess(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null,
  settleStatus: SettleStatus
): ServiceAccess {
  // Not launched yet
  if (!settleStatus.launched) {
    return {
      enabled: false,
      badge: foundingIntelligence?.is_member 
        ? 'Coming Soon (Founding)' 
        : 'Coming Soon',
      source: null,
      upgradeAvailable: !foundingIntelligence?.is_member,
      upgradePath: '/dashboard/billing/upgrade',
    };
  }

  // Founding member gets contribution access
  if (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled) {
    return {
      enabled: true,
      badge: 'Founding Benefit',
      source: 'founding_benefit',
      upgradeAvailable: false,
      price: 'Contribution access',
    };
  }

  // Regular feature access
  return resolveFeatureAccess(feature, foundingIntelligence);
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

export default useServiceAccess;
