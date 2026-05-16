/**
 * Usage Stats Hook
 * 
 * Fetches usage and quota data from Tenant Billing Service
 * Shows unlocks used, remaining, and charges
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface UsagePeriod {
  period_start: string;
  period_end: string;
  tier_at_time: string;
  unlocks_used: number;
  unlocks_included: number;
  unlocks_remaining: number;
  overage_charge_cents: number;
  settle_reports_used: number;
  draft_documents_used: number;
  total_charged_cents: number;
}

export interface UsageRecord {
  record_id: string;
  service: 'intake' | 'settle' | 'draft';
  metric_name: string;
  quantity: number;
  unit_price_cents: number;
  billed_at: string;
}

export interface UsageStats {
  currentPeriod: UsagePeriod | null;
  recentUsage: UsageRecord[];
  totalUnlocks: number;
  totalSettleReports: number;
  totalDraftDocuments: number;
  estimatedMonthlyCharge: number;
}

export interface UseUsageStatsReturn {
  loading: boolean;
  error: string | null;
  stats: UsageStats | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useUsageStats(tenantId: string | null): UseUsageStatsReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);

  const fetchUsageStats = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch current period from Billing Service
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BILLING_SERVICE_URL}/api/v1/usage/${tenantId}/current-period`
      );

      if (!response.ok) {
        // Return default stats if not found
        setStats(getDefaultStats());
        return;
      }

      const data = await response.json();

      setStats({
        currentPeriod: {
          period_start: data.period_start,
          period_end: data.period_end,
          tier_at_time: data.tier_at_time,
          unlocks_used: data.unlocks_used ?? 0,
          unlocks_included: data.unlocks_included ?? 0,
          unlocks_remaining: Math.max(0, (data.unlocks_included ?? 0) - (data.unlocks_used ?? 0)),
          overage_charge_cents: data.overage_charge_cents ?? 0,
          settle_reports_used: data.settle_reports_used ?? 0,
          draft_documents_used: data.draft_documents_used ?? 0,
          total_charged_cents: data.total_charged_cents ?? 0,
        },
        recentUsage: data.recent_usage ?? [],
        totalUnlocks: data.unlocks_used ?? 0,
        totalSettleReports: data.settle_reports_used ?? 0,
        totalDraftDocuments: data.draft_documents_used ?? 0,
        estimatedMonthlyCharge: (data.total_charged_cents ?? 0) / 100,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  return {
    loading,
    error,
    stats,
    refresh: fetchUsageStats,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultStats(): UsageStats {
  return {
    currentPeriod: null,
    recentUsage: [],
    totalUnlocks: 0,
    totalSettleReports: 0,
    totalDraftDocuments: 0,
    estimatedMonthlyCharge: 0,
  };
}

/**
 * Format cents to dollars
 */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercent(used: number, included: number): number {
  if (included === 0) return 0;
  return Math.min(100, Math.round((used / included) * 100));
}

/**
 * Get usage status color
 */
export function getUsageStatusColor(used: number, included: number): 'green' | 'yellow' | 'red' {
  if (included === 0) return 'green';
  const percent = (used / included) * 100;
  if (percent < 75) return 'green';
  if (percent < 100) return 'yellow';
  return 'red';
}

export default useUsageStats;
