'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Gift, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { leverageClient, RewardSummary, RewardLedgerEntry } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';

export default function RewardsPage() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      try {
        const [sm, ld] = await Promise.all([
          leverageClient.getRewardsSummary(tenantId).catch(() => null),
          leverageClient.getRewardsLedger(tenantId).catch(() => []),
        ]);
        setSummary(sm);
        setLedger(ld);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tenantLoading]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <span>Reward Ledger</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">LEVERAGE Rewards</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Credit balance, history &amp; earnings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Coins className="h-5 w-5 text-green-500" />} label="Active Credits" value={loading ? '—' : String(summary?.active_credits ?? 0)} />
        <SummaryCard icon={<Gift className="h-5 w-5 text-blue-500" />} label="Total Granted" value={loading ? '—' : String(summary?.total_granted ?? 0)} />
        <SummaryCard icon={<CheckCircle className="h-5 w-5 text-gray-500" />} label="Total Used" value={loading ? '—' : String(summary?.total_used ?? 0)} />
        <SummaryCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Next Expiration" value={loading ? '—' : (summary?.next_expiration_date ? new Date(summary.next_expiration_date).toLocaleDateString() : 'None')} />
      </div>

      {/* Welcome Bonus */}
      {summary && (
        <div className={`rounded-lg border p-4 ${summary.welcome_bonus_granted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
          <div className="flex items-center gap-2">
            {summary.welcome_bonus_granted ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Gift className="h-5 w-5 text-blue-600" />}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {summary.welcome_bonus_granted ? 'Welcome Bonus Granted' : 'Welcome Bonus Available'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {summary.welcome_bonus_granted
              ? `Your 11 welcome credits were granted on ${summary.welcome_bonus_date ? new Date(summary.welcome_bonus_date).toLocaleDateString() : '—'}.`
              : 'Retain your first client to unlock 11 welcome bonus credits.'}
          </p>
        </div>
      )}

      {/* Ledger Table */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Transaction History</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {ledger.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No reward transactions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Source</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Credits</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{new Date(entry.granted_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{entry.source.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{entry.credits}</td>
                      <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{entry.expires_at ? new Date(entry.expires_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="mb-3">{icon}</div>
      <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    used: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? styles.used}`}>
      {status === 'active' && <CheckCircle className="h-3 w-3" />}
      {status === 'expired' && <XCircle className="h-3 w-3" />}
      {status === 'used' && <AlertCircle className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
