/**
 * Feature Access Hook
 * 
 * Fetches and caches feature access for the current tenant.
 * Used for UI feature gating (sidebar, pages, etc.)
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useTenant } from './useTenant';
import type { FeatureAccessResponse, Tier } from '@/lib/billing/client';

// Fetch feature-access through the Next.js server-side proxy (avoids browser CORS)
async function fetchFeatureAccessProxy(tenantId: string, userId?: string): Promise<FeatureAccessResponse> {
  const params = new URLSearchParams({ tenantId });
  if (userId) params.set('userId', userId);
  const res = await fetch(`/api/billing/feature-access?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`feature-access proxy returned ${res.status}`);
  return res.json();
}

// =============================================================================
// TYPES
// =============================================================================

interface FeatureContextValue {
  features: FeatureAccessResponse | null;
  isLoading: boolean;
  error: string | null;
  tier: Tier;
  
  // Convenience methods
  hasFeature: (feature: 'intake' | 'leverage' | 'settle' | 'draft') => boolean;
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
  const { tenantId, isLoading: tenantLoading } = useTenant();
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
        const data = await fetchFeatureAccessProxy(tenantId);
        setFeatures(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch feature access:', err);
        // Don't set error - allow UI to render with defaults
        // setError('Failed to load feature access');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatures();
  }, [tenantId, tenantLoading]);

  const hasFeature = (feature: 'intake' | 'leverage' | 'settle' | 'draft'): boolean => {
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
