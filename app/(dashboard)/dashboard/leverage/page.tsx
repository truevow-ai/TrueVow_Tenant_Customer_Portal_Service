'use client';

import { useState, useEffect } from 'react';
import {
  FileCheck, AlertCircle, CheckCircle, Calendar, History, Upload, ArrowRight,
  Briefcase, Coins, DollarSign, BarChart3, FolderOpen, Calculator, Wallet, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { draftClient, DraftStats } from '@/lib/api/draft-client';
import { leverageClient, RewardSummary, LeverageAnalytics } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';

type AlertLevel = 'neutral' | 'good' | 'warning' | 'urgent';

export default function LeverageLandingPage() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [stats, setStats] = useState<DraftStats | null>(null);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [analytics, setAnalytics] = useState<LeverageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      try {
        const [s, rw, an] = await Promise.all([
          draftClient.getStats(tenantId).catch(() => ({ validated_this_month: 0, issues_found: 0, validations_remaining: null, deadlines_due_soon: 0 })),
          leverageClient.getRewardsSummary(tenantId).catch(() => null),
          leverageClient.getAnalytics(tenantId).catch(() => null),
        ]);
        setStats(s);
        setRewardSummary(rw);
        setAnalytics(an);
      } catch {
        setStats({ validated_this_month: 0, issues_found: 0, validations_remaining: null, deadlines_due_soon: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tenantLoading]);

  const validationsLeftLevel: AlertLevel =
    stats?.validations_remaining === null ? 'good' :
    stats?.validations_remaining === 0 ? 'urgent' :
    (stats?.validations_remaining ?? 99) <= 3 ? 'warning' : 'good';

  return (
    <div className="space-y-6">

      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <span>LEVERAGE Service</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">LEVERAGE Service</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Case Economics, Compliance &amp; Lifecycle Management</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Overview</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Documents Validated" value={loading ? '—' : String(stats?.validated_this_month ?? 0)} sub="This month" icon={<FileCheck className="h-5 w-5" />} level="neutral" />
          <StatCard title="Active Cases" value={loading ? '—' : String(analytics?.active_cases ?? 0)} sub="In LEVERAGE" icon={<Briefcase className="h-5 w-5" />} level="neutral" href="/dashboard/leverage/cases" />
          <StatCard title="Reward Credits" value={loading ? '—' : String(rewardSummary?.active_credits ?? 0)} sub="Available" icon={<Coins className="h-5 w-5" />} level={!loading && (rewardSummary?.active_credits ?? 0) > 0 ? 'good' : 'neutral'} href="/dashboard/leverage/rewards" />
          <StatCard title="Damages Calculated" value={loading ? '—' : `$${(analytics?.total_damages_calculated ?? 0).toLocaleString()}`} sub="Across all cases" icon={<DollarSign className="h-5 w-5" />} level="neutral" />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Tools</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <ActionCard icon={<Upload className="h-8 w-8" />} title="Validate Document" body="Check your PI or employment law document against jurisdiction-specific compliance rules." buttonLabel="Start Validation" href="/dashboard/leverage/validate" />
          <ActionCard icon={<Calendar className="h-8 w-8" />} title="Deadline Calculator" body="Calculate your SOL filing deadline, EEOC charge deadline, and Right-to-Sue court filing deadline." buttonLabel="Open Calculator" href="/dashboard/leverage/deadlines" />
          <ActionCard icon={<History className="h-8 w-8" />} title="Validation History" body="Review past validations and compliance reports." buttonLabel="View History" href="/dashboard/leverage/history" />
          <ActionCard icon={<Calculator className="h-8 w-8" />} title="Damages Calculator" body="Calculate PI damages with medical expenses, lost income, and pain &amp; suffering multipliers." buttonLabel="Calculate Damages" href="/dashboard/leverage/damages" />
          <ActionCard icon={<Wallet className="h-8 w-8" />} title="Disbursement Calculator" body="Compute case costs, attorney fees, and net-to-client disbursement breakdowns." buttonLabel="Calculate Costs" href="/dashboard/leverage/disbursement" />
          <ActionCard icon={<FolderOpen className="h-8 w-8" />} title="My Cases" body="Browse open cases, view timelines, track compliance, and record settlements." buttonLabel="View Cases" href="/dashboard/leverage/cases" />
          <ActionCard icon={<Coins className="h-8 w-8" />} title="Reward Ledger" body="View your LEVERAGE credit balance, transaction history, and reward earnings." buttonLabel="View Ledger" href="/dashboard/leverage/rewards" />
          <ActionCard icon={<TrendingUp className="h-8 w-8" />} title="Analytics" body="Tenant-level insights: case volumes, compliance health, and average case values." buttonLabel="View Analytics" href="/dashboard/leverage/analytics" />
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, sub, icon, level, href }: { title: string; value: string; sub: string; icon: React.ReactNode; level: AlertLevel; href?: string; }) {
  const bg: Record<AlertLevel, string> = { neutral: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700', good: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700', warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', urgent: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' };
  const valColor: Record<AlertLevel, string> = { neutral: 'text-gray-900 dark:text-gray-100', good: 'text-green-700 dark:text-green-400', warning: 'text-amber-700 dark:text-amber-400', urgent: 'text-red-700 dark:text-red-400' };
  const icoColor: Record<AlertLevel, string> = { neutral: 'text-gray-400 dark:text-gray-500', good: 'text-green-500 dark:text-green-400', warning: 'text-amber-500 dark:text-amber-400', urgent: 'text-red-500 dark:text-red-400' };
  const card = (
    <div className={`rounded-lg border p-5 transition-all hover:shadow-sm ${bg[level]}`}>
      <div className={`mb-3 ${icoColor[level]}`}>{icon}</div>
      <p className={`text-3xl font-bold tabular-nums ${valColor[level]}`}>{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  );
  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

function ActionCard({ icon, title, body, buttonLabel, href }: { icon: React.ReactNode; title: string; body: string; buttonLabel: string; href: string; }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col">
      <div className="text-gray-400 dark:text-gray-500 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 mb-6">{body}</p>
      <Link href={href} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors self-start">
        {buttonLabel}<ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
