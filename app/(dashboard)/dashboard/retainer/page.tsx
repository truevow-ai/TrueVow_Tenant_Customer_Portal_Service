'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck, Users, Clock, AlertTriangle, CheckCircle,
  ArrowRight, ShieldCheck, FileText, RefreshCw,
} from 'lucide-react';
import {
  retainerClient,
  type CandidateSummary,
  type EngagementState,
  buildActionQueues,
  buildLifecycleSummaries,
  buildCandidateListItem,
  type CandidateListItem,
} from '@/lib/api/retainer/client';
import { resolveIntakeBatch } from '@/lib/api/intake/adapter';

// ---------------------------------------------------------------------------
// State badge
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
  ATTORNEY_APPROVAL_RECORDED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  CONFLICT_REVIEW_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  CONFLICT_HOLD: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  PACKAGE_PREPARATION: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERY_AUTHORIZED: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
  DELIVERED: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  CLIENT_REVIEW: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
  SIGNATURE_PENDING: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  FULLY_EXECUTED: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  ACTIVATION_PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  ACTIVATED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  DECLINED_OR_EXPIRED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300',
};

function StateBadge({ state }: { state: EngagementState }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATE_COLORS[state] || ''}`}>
      {state.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
    </span>
  );
}

function NameCell({ item }: { item: CandidateListItem }) {
  return (
    <div>
      {item.person_name ? (
        <Link
          href={`/dashboard/retainer/candidates/${item.candidate_id}`}
          className="text-[#0A2463] dark:text-blue-400 hover:underline font-medium"
        >
          {item.person_name}
        </Link>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 italic">
          {item.name_fallback || 'Intake details unavailable'}
        </span>
      )}
      {item.stale_warning && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{item.stale_warning}</p>
      )}
      {item.missing_info && !item.stale_warning && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.missing_info}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RetainerPage() {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [listItems, setListItems] = useState<CandidateListItem[]>([]);
  const [intakeResolving, setIntakeResolving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await retainerClient.listCandidates();
        setCandidates(res.candidates);
        if (res.candidates.length > 0) {
          try {
            const detail = await retainerClient.getCandidate(res.candidates[0].candidate_id);
            setTenantId(detail.tenant_id);
          } catch { /* fallback */ }
        }
      } catch (err: any) {
        console.error('RETAINER landing load error:', err);
        setError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (candidates.length === 0 || !tenantId) return;
    async function enrich() {
      setIntakeResolving(true);
      try {
        const leadIds = candidates.map((c) => c.candidate_id);
        const intakeMap = await resolveIntakeBatch(leadIds, tenantId);
        const items = candidates.map((c) =>
          buildCandidateListItem(c, intakeMap.get(c.candidate_id) || {
            status: 'unavailable',
            reason: 'intake_down',
            message: 'Intake cross-reference pending.',
          }),
        );
        setListItems(items);
      } finally {
        setIntakeResolving(false);
      }
    }
    enrich();
  }, [candidates, tenantId]);

  const actionQueues = buildActionQueues(candidates);
  const lifecycleSummaries = buildLifecycleSummaries(candidates);
  const total = candidates.length;
  const pendingReview = actionQueues.find((q) => q.label === 'Awaiting Review')?.count || 0;
  const conflicted = actionQueues.find((q) => q.label === 'Conflict Hold')?.count || 0;
  const activeEngagements = candidates.filter((c) =>
    ['DELIVERED', 'CLIENT_REVIEW', 'SIGNATURE_PENDING', 'FULLY_EXECUTED', 'ACTIVATION_PENDING'].includes(c.state),
  ).length;
  const activated = lifecycleSummaries.find((s) => s.label === 'Activated')?.count || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 dark:text-red-300 font-semibold mb-2">Unable to load RETAINER data</p>
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-3">Check that the RETAINER backend is running on port 3038</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">RETAINER</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Engagement management, conflict review, and client activation</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={<Users size={20} />} value={total} label="Candidates" color="navy" />
        <StatCard icon={<Clock size={20} />} value={pendingReview} label="Awaiting Review" color="yellow" />
        <StatCard icon={<AlertTriangle size={20} />} value={conflicted} label="Conflict Holds" color="red" />
        <StatCard icon={<FileCheck size={20} />} value={activeEngagements} label="Active Engagements" color="blue" />
        <StatCard icon={<CheckCircle size={20} />} value={activated} label="Activated" color="green" />
      </div>

      {/* Action Queues */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Action Queues</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {actionQueues.map((q) => (
            <Link
              key={q.label}
              href={q.filterUrl}
              className={`bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                q.priority_hint === 'critical'
                  ? 'border-red-300 dark:border-red-700'
                  : q.priority_hint === 'attention'
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{q.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{q.label}</p>
              {q.priority_hint === 'critical' && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Requires action</p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Lifecycle Summaries */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Lifecycle Summary</h2>
        <div className="flex gap-4">
          {lifecycleSummaries.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{s.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate List with INTAKE enrichment */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Candidates</h2>
            {intakeResolving && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" /> Resolving intake data
              </span>
            )}
          </div>
          <Link href="/dashboard/retainer/candidates" className="text-sm text-[#0A2463] dark:text-blue-400 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No candidates yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Candidates appear when intake leads are submitted for representation review.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Prospect</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Practice Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Workflow State</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Attorney</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {candidates.slice(0, 10).map((c, i) => {
                  const item = listItems[i];
                  return (
                    <tr key={c.candidate_id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3">
                        {item ? (
                          <NameCell item={item} />
                        ) : (
                          <Link href={`/dashboard/retainer/candidates/${c.candidate_id}`} className="text-[#0A2463] dark:text-blue-400 hover:underline font-mono text-xs">
                            {c.candidate_id.slice(0, 8)}...
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {item?.practice_area || '\u2014'}
                      </td>
                      <td className="px-4 py-3"><StateBadge state={c.state} /></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {c.responsible_attorney || 'unassigned'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {item?.next_action || '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    navy: 'bg-[#0A2463]',
    blue: 'bg-blue-500',
    green: 'bg-[#10B981]',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className={`${colors[color] || colors.navy} rounded-lg p-2 text-white`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
