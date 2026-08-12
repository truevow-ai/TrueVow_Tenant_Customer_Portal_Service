/**
 * Feature Access Hook
 * 
 * Fetches and caches feature access for the current tenant.
 * Used for UI feature gating (sidebar, pages, etc.)
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useTenantDev } from './useTenant';
import type { FeatureAccessResponse, Tier } from '@/lib/billing/client';

// =============================================================================
// TYPES
// =============================================================================

interface FeatureContextValue {
  features: FeatureAccessResponse | null;
  isLoading: boolean;
  error: string | null;
  tier: Tier;
  
  // Convenience methods
  hasFeature: (feature: 'intake' | 'leverage' | 'settle' | 'draft' | 'trace' | 'retainer') => boolean;
  isPhaseOne: boolean; // Phase I = INTAKE only
}

// =============================================================================
// CONTEXT
// =============================================================================

const FeatureContext = createContext<FeatureContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function FeatureProvider({ children }: { children: ReactNode }) {
  const { tenantId, isLoading: tenantLoading } = useTenantDev();
  const [features, setFeatures] = useState<FeatureAccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      if (tenantLoading) return;
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const qs = new URLSearchParams({ tenantId });
        const res = await fetch(`/api/billing/feature-access?${qs}`, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || data._service_unavailable) {
          console.warn('[useFeatureAccess] Billing service unavailable — commercial state unknown');
          setFeatures(null);
          setError(data.error || 'Billing service unavailable');
          return;
        }

        setFeatures(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch feature access:', err);
        setError('Billing service unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatures();
  }, [tenantId, tenantLoading]);

  const hasFeature = (feature: 'intake' | 'leverage' | 'settle' | 'draft' | 'trace' | 'retainer'): boolean => {
    if (!features) return false;
    return features.features[feature]?.enabled ?? false;
  };

  // Phase I = Only INTAKE is available (LEVERAGE, SETTLE, CONNECT hidden)
  // This can be overridden by environment variable for testing
  const isPhaseOne = process.env.NEXT_PUBLIC_PHASE_ONE === 'true' ||
                     (!features?.features.leverage?.enabled && !features?.features.settle?.enabled);

  const value: FeatureContextValue = {
    features,
    isLoading,
    error,
    tier: features?.tier ?? null,
    hasFeature,
    isPhaseOne,
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useFeatureAccess(): FeatureContextValue {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatureAccess must be used within a FeatureProvider');
  }
  return context;
}

export default useFeatureAccess;
