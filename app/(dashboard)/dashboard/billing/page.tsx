'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  CreditCard, AlertCircle, Users, ShieldCheck, Building2, Activity,
  ArrowRight, TrendingUp, BarChart3, Star, Zap, DollarSign, Percent, Check,
  ArrowUpRight, ArrowDownRight, XCircle, Loader2,
} from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useTenantDev } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';
import {
  formatCents,
  getDashboardAccessTierLabel,
  getNextTierProgress,
} from '@/lib/billing/client';
import type { FoundingIntelligenceInfo, AddOnInfo } from '@/lib/billing/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminDashboard {
  stats: {
    // /dashboard/stats aggregate — nested objects
    revenue_metrics?: Record<string, unknown>;
    subscription_stats?: Record<string, unknown>;
    settle_launch_progress?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  revenue: {
    // /dashboard/revenue-metrics direct fields
    mrr_cents?: number;
    arr_cents?: number;
    revenue_growth_rate?: number;
    period_days?: number;
    [key: string]: unknown;
  } | null;
  subscriptions: {
    // /dashboard/subscription-stats direct fields
    total_active_tenants?: number;
    total_subscriptions?: number;
    trial_subscriptions?: number;
    tier_distribution?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
}

interface UsageData {
  callsReceived: number;
  qualifiedCalls: number;
  totalBookings: number;
  consultationsBooked: number;
  engagementLetters: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// ─── Mock usage data — replace once analytics endpoint is confirmed ──────────
// Note: the billing service tenant analytics endpoint is not yet confirmed.
// Real intake activity is stored in Tenant App; connect to it when ready.
const MOCK_USAGE: UsageData = {
  callsReceived: 10,
  qualifiedCalls: 8,
  totalBookings: 3,
  consultationsBooked: 2,
  engagementLetters: 1,
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useUser();
  const { tenantId } = useTenantDev();
  // Feature access already loaded by the FeatureProvider wrapping the dashboard layout
  const { features, isLoading: featuresLoading, hasFeature } = useFeatureAccess();

  // Role — set in Clerk publicMetadata by the platform ops team
  const isAdmin = !!(
    user?.publicMetadata?.role === 'admin' ||
    user?.publicMetadata?.isAdmin === true
  );

  const [activeTab, setActiveTab] = useState<'subscription' | 'admin'>('subscription');

  // Admin dashboard data (fetched via server-side proxy)
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Lazy-load admin stats only when admin tab is opened
  useEffect(() => {
    if (isAdmin && activeTab === 'admin' && !adminData && !adminLoading) {
      setAdminLoading(true);
      fetch('/api/billing/dashboard')
        .then(r => r.json())
        .then(data => { setAdminData(data); setAdminError(null); })
        .catch(() => setAdminError(
          'Could not load admin stats. Ensure the billing service (port 8001) is running.'
        ))
        .finally(() => setAdminLoading(false));
    }
  }, [isAdmin, activeTab, adminData, adminLoading]);

  // ─── Fetch usage data for SETTLE + INTAKE ────────────────────────────────
  const [usageData, setUsageData] = useState<{
    settle_reports_used?: number;
    settle_reports_remaining?: number;
    unlocks_used?: number;
    unlocks_remaining?: number;
    _fallback?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/billing/usage?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setUsageData(data))
      .catch(() => setUsageData(null));
  }, [tenantId]);

  // ─── Derive subscription data from feature-access ─────────────────────────
  const tier               = features?.tier;
  const subscriptionStatus = features?.subscription_status ?? 'active';
  const intakeFeature      = features?.features?.intake;
  const foundingIntel      = features?.founding_intelligence ?? null;
  const addons             = features?.addons ?? [];

  const planName        = tier === 'growth' ? 'Growth' : tier === 'solo' ? 'Solo' : 'Foundation';
  const freeUnlocks     = intakeFeature?.monthly_quota ?? 11;
  const pricePerUnlock  = intakeFeature?.per_use_price_cents
    ? formatCents(intakeFeature.per_use_price_cents)
    : '$99.00';
  const intakeEnabled   = intakeFeature?.enabled ?? true;
  const fiProgress      = foundingIntel
    ? getNextTierProgress(foundingIntel.verified_submissions)
    : null;

  // ─── Loading state ────────────────────────────────────────────────────────
  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing & Usage</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your subscription and view usage analytics
        </p>
      </div>

      {/* ── Tab Switcher (admin users only) ──────────────────────────────── */}
      {isAdmin && (
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          <TabButton
            active={activeTab === 'subscription'}
            onClick={() => setActiveTab('subscription')}
          >
            My Subscription
          </TabButton>
          <TabButton
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
          >
            Admin Dashboard
          </TabButton>
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════════╗
          ║  ADMIN DASHBOARD TAB                                             ║
          ╚═══════════════════════════════════════════════════════════════════╝ */}
      {isAdmin && activeTab === 'admin' && (
        <div>
          {adminLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {adminError && (
            <div className="mb-6 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">{adminError}</p>
            </div>
          )}

          {!adminLoading && adminData && (
            <>
              {/* MRR / ARR / Tenants / Growth
                  Field mapping from confirmed billing service response shapes:
                  revenue-metrics → { mrr_cents, arr_cents, revenue_growth_rate }
                  subscription-stats → { total_active_tenants, total_subscriptions }  */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <AdminStatCard
                  label="Monthly Recurring Revenue"
                  value={
                    adminData.revenue?.mrr_cents != null
                      ? `$${(Number(adminData.revenue.mrr_cents) / 100).toLocaleString()}`
                      : '—'
                  }
                  icon={<DollarSign size={20} />}
                  color="green"
                />
                <AdminStatCard
                  label="Annual Recurring Revenue"
                  value={
                    adminData.revenue?.arr_cents != null
                      ? `$${(Number(adminData.revenue.arr_cents) / 100).toLocaleString()}`
                      : '—'
                  }
                  icon={<TrendingUp size={20} />}
                  color="blue"
                />
                <AdminStatCard
                  label="Active Tenants"
                  value={adminData.subscriptions?.total_active_tenants?.toString() ?? '—'}
                  icon={<Building2 size={20} />}
                  color="purple"
                />
                <AdminStatCard
                  label="Revenue Growth Rate"
                  value={
                    adminData.revenue?.revenue_growth_rate != null
                      ? `${adminData.revenue.revenue_growth_rate}%`
                      : '—'
                  }
                  icon={<Percent size={20} />}
                  color="amber"
                />
              </div>

              {/* Revenue Metrics + Tier Breakdown */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Revenue Metrics */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-500" />
                    Revenue Metrics
                  </h3>
                  {adminData.revenue ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">MRR</span>
                        <span className="font-medium text-card-foreground">
                          {adminData.revenue.mrr_cents != null
                            ? `$${(adminData.revenue.mrr_cents / 100).toLocaleString()}/mo`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">ARR</span>
                        <span className="font-medium text-card-foreground">
                          {adminData.revenue.arr_cents != null
                            ? `$${(adminData.revenue.arr_cents / 100).toLocaleString()}/yr`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Growth Rate</span>
                        <span className={`font-medium ${
                          (adminData.revenue.revenue_growth_rate ?? 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500'
                        }`}>
                          {adminData.revenue.revenue_growth_rate != null
                            ? `${adminData.revenue.revenue_growth_rate}%`
                            : '—'}
                        </span>
                      </div>
                      {adminData.revenue.period_days != null && (
                        <p className="text-xs text-muted-foreground pt-1">
                          Period: last {adminData.revenue.period_days} days
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No revenue data available</p>
                  )}
                </div>

                {/* Subscription / Tier Breakdown */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <Users size={18} className="text-purple-500" />
                    Subscription Breakdown
                  </h3>
                  {adminData.subscriptions ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Tenants</span>
                        <span className="font-semibold text-card-foreground">
                          {adminData.subscriptions.total_active_tenants ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Subscriptions</span>
                        <span className="font-semibold text-card-foreground">
                          {adminData.subscriptions.total_subscriptions ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Trial Subscriptions</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {adminData.subscriptions.trial_subscriptions ?? '—'}
                        </span>
                      </div>
                      {adminData.subscriptions.tier_distribution && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Tier Distribution</p>
                          {Object.entries(adminData.subscriptions.tier_distribution).map(([tier, count]) => (
                            <div key={tier} className="flex justify-between items-center">
                              <span className="text-muted-foreground capitalize pl-2">{tier}</span>
                              <span className="font-medium text-card-foreground">{String(count)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No subscription data available</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════════╗
          ║  SUBSCRIPTION / TENANT VIEW                                      ║
          ╚═══════════════════════════════════════════════════════════════════╝ */}
      {(!isAdmin || activeTab === 'subscription') && (
        <>
          {/* ── Subscription Plan Card ────────────────────────────────────── */}
          <div className="mb-8 bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-card-foreground">
                  {user?.fullName ? `${user.fullName}'s Subscription` : 'Your Subscription'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {planName} Plan
                  </span>
                  <StatusBadge status={subscriptionStatus} />
                  {foundingIntel?.is_member && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Star size={10} /> Founding Member
                    </span>
                  )}
                </div>
              </div>
          </div>
        </div>

          {/* ── Manage Subscription ───────────────────────────────────────── */}
          <ManageSubscriptionCard
            currentTier={tier ?? null}
            subscriptionStatus={subscriptionStatus}
          />

          {/* ── Founding Intelligence Section ────────────────────────────── */}
          {foundingIntel?.is_member && (
            <div className="mb-8 bg-card border-2 border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-card-foreground">
                  Founding Intelligence Status
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {getDashboardAccessTierLabel(foundingIntel.dashboard_access_tier)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Verified Submissions</p>
                  <p className="text-lg font-bold text-card-foreground">
                    {foundingIntel.verified_submissions}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Locked Unlock Price</p>
                  <p className="text-lg font-bold text-green-600">
                    {foundingIntel.locked_unlock_price_cents
                      ? formatCents(foundingIntel.locked_unlock_price_cents)
                      : '$99.00'}
                    <span className="text-xs font-normal text-muted-foreground ml-1">locked</span>
                  </p>
                </div>
                {fiProgress && fiProgress.nextTier !== null && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Progress to Next Tier</p>
                    <p className="text-sm font-semibold text-card-foreground">
                      {getDashboardAccessTierLabel(fiProgress.nextTier)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fiProgress.submissionsNeeded} submissions needed
                    </p>
                  </div>
                )}
              </div>
              {foundingIntel.pricing_locked_until && (
                <p className="text-xs text-muted-foreground mt-3">
                  Pricing locked until:{' '}
                  {new Date(foundingIntel.pricing_locked_until).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {/* ── Active Add-ons ────────────────────────────────────────────── */}
          {addons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Active Add-ons
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {addons.map(addon => (
                  <div
                    key={addon.addon_id}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-card-foreground">
                        {addon.display_name || addon.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          addon.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {addon.status.charAt(0).toUpperCase() + addon.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{addon.addon_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Billing Dashboard Cards ───────────────────────────────────── */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Billing Dashboard
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                title="Usage Analytics"
                description="Calls, intakes, and unlocks this month"
                status="Active"
                type="analytics"
                data={MOCK_USAGE}
                loading={false}
                actionHref="/dashboard/billing/usage"
                actionLabel="View Details"
              />
              <FeatureCard
                title="Invoices"
                description="View and download past invoices"
                status="Active"
                type="invoices"
                data={[]}
                loading={false}
                actionHref="/dashboard/billing/invoices"
                actionLabel="View Invoices"
              />
              <FeatureCard
                title="Payment Methods"
                description="Manage your payment methods and billing details"
                status="Active"
                type="payment"
                data={[]}
                loading={false}
                actionHref="https://billing.stripe.com/p/login/test"
                actionLabel="Manage Payment"
              />
            </div>
          </div>

          {/* ── Lead Revenue Protection ───────────────────────────────────── */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-6 w-6 text-yellow-600" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Lead Revenue Protection
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Protect the revenue you already earned from your marketing investment.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">Price per Unlock</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-card-foreground">{pricePerUnlock}</p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">Free Prospects</p>
                      <p className="text-lg font-bold text-green-600">{freeUnlocks} FREE</p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">Unlocked This Period</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-card-foreground">
                        {usageData?.unlocks_used ?? '--'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">Intake Service</p>
                      <p className={`text-lg font-bold ${intakeEnabled ? 'text-blue-600' : 'text-red-500'}`}>
                        {intakeEnabled ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {/* SETTLE Usage Row */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">SETTLE Reports Used</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-card-foreground">
                        {usageData?.settle_reports_used ?? '--'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">SETTLE Reports Remaining</p>
                      <p className="text-lg font-bold text-green-600">
                        {usageData?.settle_reports_remaining ?? '--'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">SETTLE Pricing</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-card-foreground">
                        {features?.features?.settle?.per_use_price_cents
                          ? `$${(features.features.settle.per_use_price_cents / 100).toFixed(0)}/report`
                          : '--'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-card rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">SETTLE Service</p>
                      <p className={`text-lg font-bold ${features?.features?.settle?.enabled ? 'text-green-600' : 'text-red-500'}`}>
                        {features?.features?.settle?.enabled ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/50 dark:bg-black/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>No monthly fees.</strong> No contracts. No setup costs. Pay only when
                  you unlock a qualified prospect&rsquo;s contact information.
                </p>
              </div>
            </div>
          </div>

          {/* ── Available Service Upgrades (Solo tier only) ───────────────── */}
          {tier === 'solo' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Available Service Upgrades
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Add premium services to your Solo 24/7 plan on a pay-per-use basis — no monthly commitment required.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {/* SETTLE upgrade card */}
                <div className="bg-card border-2 border-border rounded-lg p-5 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-card-foreground">SETTLE</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          Per Report
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI-powered settlement range estimates based on comparable verdicts and case data.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground mb-4 flex-1">
                    {['Settlement range analysis (low / mid / high)', 'Comparable case database lookup', 'Confidence scoring & data quality metrics', 'Exportable PDF report per query'].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/billing/subscribe/settle"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mt-auto"
                  >
                    Activate SETTLE — Pay Per Report
                    <ArrowRight size={15} />
                  </Link>
                </div>

                {/* LEVERAGE upgrade card */}
                <div className="bg-card border-2 border-border rounded-lg p-5 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-card-foreground">LEVERAGE</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          Per Case
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Case economics engine — damages calculator, disbursement planner, compliance checks, and deadline tracking.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground mb-4 flex-1">
                    {['Real-time damages calculation (medical, lost income, pain & suffering)', 'Disbursement planner with attorney fee breakdown', 'Automated compliance checks & deadline tracking', 'Integrated with SETTLE for comparable settlement data'].map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/billing/subscribe/leverage"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors mt-auto"
                  >
                    Activate LEVERAGE — Pay Per Case
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  trial:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expired:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status.toLowerCase()] ?? STATUS_STYLES.inactive;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface AdminCardStyle { bg: string; border: string; icon: string; }
const ADMIN_CARD_STYLES: Record<string, AdminCardStyle> = {
  green:  { bg: 'bg-green-50 dark:bg-green-950/20',   border: 'border-green-200 dark:border-green-800',   icon: 'text-green-600' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/20',     border: 'border-blue-200 dark:border-blue-800',     icon: 'text-blue-600' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-600' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/20',   border: 'border-amber-200 dark:border-amber-800',   icon: 'text-amber-600' },
};

function AdminStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: keyof typeof ADMIN_CARD_STYLES;
}) {
  const s = ADMIN_CARD_STYLES[color] ?? ADMIN_CARD_STYLES.blue;
  return (
    <div className={`rounded-lg border p-4 ${s.bg} ${s.border}`}>
      <div className={`mb-2 ${s.icon}`}>{icon}</div>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
  data,
  loading,
  type,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  status: string;
  data?: UsageData | Invoice[] | PaymentMethod[];
  loading?: boolean;
  type?: 'analytics' | 'invoices' | 'payment';
  actionHref?: string;
  actionLabel?: string;
}) {
  const isActive = status === 'Active';
  const usageData = type === 'analytics' ? (data as UsageData) : null;
  const invoices  = type === 'invoices'  ? (data as Invoice[])  : null;
  const methods   = type === 'payment'   ? (data as PaymentMethod[]) : null;

  return (
    <div
      className={`rounded-lg border-2 p-6 flex flex-col bg-card ${
        isActive ? 'border-green-200 dark:border-green-800' : 'border-border opacity-60'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <CreditCard className={isActive ? 'text-green-600' : 'text-muted-foreground'} size={32} />
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {status}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {loading && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      )}

      {/* Analytics data */}
      {type === 'analytics' && !loading && usageData && (
        <div className="space-y-2 text-sm flex-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Calls Received:</span>
            <span className="font-medium text-card-foreground">{usageData.callsReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Qualified:</span>
            <span className="font-medium text-green-700 dark:text-green-400">{usageData.qualifiedCalls}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unlocks Used:</span>
            <span className="font-medium text-blue-700 dark:text-blue-400">{usageData.totalBookings}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground pl-4">Consultations:</span>
            <span className="text-green-600 dark:text-green-400">{usageData.consultationsBooked}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground pl-4">Eng. Letters:</span>
            <span className="text-yellow-600 dark:text-yellow-400">{usageData.engagementLetters} pending</span>
          </div>
        </div>
      )}

      {/* Invoices data */}
      {type === 'invoices' && !loading && invoices && (
        invoices.length === 0 ? (
          <div className="text-center py-4 flex-1">
            <div className="text-muted-foreground text-sm">No invoices yet</div>
            <div className="text-muted-foreground/60 text-xs mt-1">First 3 months are free</div>
          </div>
        ) : (
          <div className="space-y-2 text-sm flex-1">
            {invoices.slice(0, 2).map(inv => (
              <div key={inv.id} className="flex justify-between items-center py-1">
                <div>
                  <div className="font-medium text-card-foreground">${inv.amount}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    inv.status === 'paid'    ? 'bg-green-100 text-green-800' :
                    inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Payment Methods data */}
      {type === 'payment' && !loading && methods && (
        methods.length === 0 ? (
          <div className="text-center py-4 flex-1">
            <div className="text-muted-foreground text-sm">No payment method added</div>
            <div className="text-muted-foreground/60 text-xs mt-1">
              Click below to add via Stripe
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm flex-1">
            {methods.map(method => (
              <div key={method.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="capitalize text-card-foreground">{method.type}</span>
                  {method.last4 && (
                    <span className="text-muted-foreground">••••{method.last4}</span>
                  )}
                  {method.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                {method.expiryMonth && method.expiryYear && (
                  <span className="text-muted-foreground text-xs">
                    {String(method.expiryMonth).padStart(2, '0')}/
                    {String(method.expiryYear).slice(-2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Action Button */}
      {actionHref && actionLabel && (
        <div className="mt-auto pt-4">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {actionLabel}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Manage Subscription Card ────────────────────────────────────────────────

const TIER_ORDER = ['foundation', 'solo', 'growth'] as const;
type TierKey = typeof TIER_ORDER[number];

const TIER_INFO: Record<string, { name: string; price: string; description: string }> = {
  foundation: { name: 'Foundation', price: 'Free', description: 'Essential tools to get started' },
  solo: { name: 'Solo', price: '$299/mo', description: 'Pay-per-use with premium service access' },
  growth: { name: 'Growth', price: '$1,479/mo', description: 'Unlimited access + dedicated support' },
};

function ManageSubscriptionCard({
  currentTier,
  subscriptionStatus,
}: {
  currentTier: string | null;
  subscriptionStatus: string;
}) {
  const { tenantId } = useTenantDev();
  const toast = useCompanyToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const currentTierKey = (currentTier?.toLowerCase() || 'foundation') as TierKey;
  const currentIndex = TIER_ORDER.indexOf(currentTierKey);

  const canUpgrade = currentIndex < TIER_ORDER.length - 1;
  const canDowngrade = currentIndex > 0;

  const nextTier = canUpgrade ? TIER_ORDER[currentIndex + 1] : null;
  const prevTier = canDowngrade ? TIER_ORDER[currentIndex - 1] : null;

  const handleTierChange = async (targetTier: TierKey) => {
    if (!tenantId) {
      toast.error('Error', 'Tenant not loaded');
      return;
    }
    setActionLoading(targetTier);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, tier: targetTier }),
      });
      const data = await res.json();
      if (res.ok || data._fallback) {
        toast.success(
          'Plan Updated',
          `Your plan has been changed to ${TIER_INFO[targetTier].name}. Changes take effect immediately.`
        );
        // Reload to reflect new tier
        window.location.reload();
      } else {
        toast.error('Failed', data.error || 'Unable to change plan. Please try again.');
      }
    } catch {
      toast.error('Failed', 'Could not reach billing service. Please try again later.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!tenantId) {
      toast.error('Error', 'Tenant not loaded');
      return;
    }
    setActionLoading('cancel');
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (res.ok || data._fallback) {
        toast.success('Subscription Cancelled', 'Your subscription has been cancelled. Access continues until the end of your billing period.');
        window.location.reload();
      } else {
        toast.error('Failed', data.error || 'Unable to cancel subscription.');
      }
    } catch {
      toast.error('Failed', 'Could not reach billing service. Please try again later.');
    } finally {
      setActionLoading(null);
      setShowCancelModal(false);
    }
  };

  return (
    <div className="mb-8 bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Manage Subscription
      </h2>

      {/* Tier comparison row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {TIER_ORDER.map((t, i) => {
          const info = TIER_INFO[t];
          const isCurrent = t === currentTierKey;
          const isAvailable = i <= currentIndex + 1;
          return (
            <div
              key={t}
              className={`rounded-lg p-4 border-2 transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : i < currentIndex
                  ? 'border-border bg-muted/30 opacity-60'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isCurrent && <Check className="h-4 w-4 text-primary" />}
                <h3 className="text-sm font-semibold text-card-foreground">{info.name}</h3>
              </div>
              <p className="text-lg font-bold text-card-foreground">{info.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {canUpgrade && nextTier && (
          <button
            onClick={() => handleTierChange(nextTier)}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {actionLoading === nextTier ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Upgrading…</>
            ) : (
              <>Upgrade to {TIER_INFO[nextTier].name} <ArrowUpRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        {canDowngrade && prevTier && (
          <button
            onClick={() => handleTierChange(prevTier)}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {actionLoading === prevTier ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Downgrading…</>
            ) : (
              <>Downgrade to {TIER_INFO[prevTier].name} <ArrowDownRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        {subscriptionStatus !== 'cancelled' && (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" /> Cancel Subscription
          </button>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Cancel Subscription?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You will lose access to premium features at the end of your current billing period.
              Your data will be preserved for 30 days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'cancel' ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading !== null}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
