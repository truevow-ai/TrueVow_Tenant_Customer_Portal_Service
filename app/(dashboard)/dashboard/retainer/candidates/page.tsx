'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  retainerClient,
  type CandidateSummary,
  type EngagementState,
  buildCandidateListItem,
  type CandidateListItem,
} from '@/lib/api/retainer/client';
import { resolveIntakeBatch } from '@/lib/api/intake/adapter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATE_FILTERS = [
  { value: '', label: 'All States' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'ATTORNEY_APPROVAL_RECORDED', label: 'Attorney Approved' },
  { value: 'CONFLICT_REVIEW_PENDING', label: 'Conflict Review Pending' },
  { value: 'CONFLICT_HOLD', label: 'Conflict Hold' },
  { value: 'PACKAGE_PREPARATION', label: 'Package Preparation' },
  { value: 'DELIVERY_AUTHORIZED', label: 'Delivery Authorized' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CLIENT_REVIEW', label: 'Client Review' },
  { value: 'SIGNATURE_PENDING', label: 'Signature Pending' },
  { value: 'FULLY_EXECUTED', label: 'Fully Executed' },
  { value: 'ACTIVATION_PENDING', label: 'Activation Pending' },
  { value: 'ACTIVATED', label: 'Activated' },
  { value: 'DECLINED_OR_EXPIRED', label: 'Declined / Expired' },
];

const STATE_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  ATTORNEY_APPROVAL_RECORDED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  CONFLICT_REVIEW_PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CONFLICT_HOLD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  PACKAGE_PREPARATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERY_AUTHORIZED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  CLIENT_REVIEW: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  SIGNATURE_PENDING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  FULLY_EXECUTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ACTIVATION_PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ACTIVATED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  DECLINED_OR_EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};

function StateBadge({ state }: { state: EngagementState }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATE_COLORS[state] || ''}`}>
      {state.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [listItems, setListItems] = useState<CandidateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [tenantId, setTenantId] = useState('');

  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Load candidates
  const fetchCandidates = async (p?: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await retainerClient.listCandidates();
      let filtered = res.candidates;

      // Client-side filtering (RETAINER backend may not support all filters yet)
      if (stateFilter) {
        filtered = filtered.filter((c) => c.state === stateFilter);
      }
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        filtered = filtered.filter((c) =>
          c.candidate_id.toLowerCase().includes(q) ||
          c.responsible_attorney?.toLowerCase().includes(q),
        );
      }

      const currentPage = p || page;
      const start = (currentPage - 1) * PAGE_SIZE;
      const paged = filtered.slice(start, start + PAGE_SIZE);
      setCandidates(paged);
      setTotal(filtered.length);

      // Get tenant ID for INTAKE batch
      if (filtered.length > 0 && !tenantId) {
        try {
          const detail = await retainerClient.getCandidate(filtered[0].candidate_id);
          setTenantId(detail.tenant_id);
        } catch { /* ok */ }
      }

    } catch (err: any) {
      console.error('Failed to load candidates:', err);
      setError(err?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  // Batch INTAKE enrichment
  useEffect(() => {
    if (candidates.length === 0 || !tenantId) return;
    async function enrich() {
      setIntakeLoading(true);
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
        setIntakeLoading(false);
      }
    }
    enrich();
  }, [candidates, tenantId]);

  useEffect(() => {
    fetchCandidates(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => {
    setPage(1);
    fetchCandidates(1);
  };

  const handleClearFilters = () => {
    setStateFilter('');
    setSearchFilter('');
    setPage(1);
    setTimeout(() => fetchCandidates(1), 0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => fetchCandidates(newPage), 0);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
        <Link href="/dashboard/retainer" className="hover:text-gray-600 dark:hover:text-gray-300">RETAINER</Link>
        <span className="mx-1.5">/</span>
        <span>Candidates</span>
      </p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Candidate Review Queue</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Review and evaluate representation candidates from INTAKE
      </p>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Workflow State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              {STATE_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Candidate ID or attorney..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Clear
          </button>
          {intakeLoading && (
            <span className="text-xs text-gray-400 flex items-center gap-1 self-center">
              <RefreshCw size={12} className="animate-spin" /> Resolving intake data
            </span>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load candidates</p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          {candidates.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No candidates match your filters.</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Prospect</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">State</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Attorney</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Age</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Next Action</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">v</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {candidates.map((c, i) => {
                      const item = listItems[i];
                      return (
                        <tr key={c.candidate_id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div>
                              {item?.person_name ? (
                                <Link
                                  href={`/dashboard/retainer/candidates/${c.candidate_id}`}
                                  className="text-[#0A2463] dark:text-blue-400 hover:underline font-medium"
                                >
                                  {item.person_name}
                                </Link>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                  {item?.name_fallback || 'Intake details unavailable'}
                                </span>
                              )}
                              {item?.stale_warning && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400" />
                                  <span className="text-xs text-amber-600 dark:text-amber-400">{item.stale_warning}</span>
                                </div>
                              )}
                              {item?.missing_info && !item?.stale_warning && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.missing_info}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                            {item?.practice_area || '\u2014'}
                          </td>
                          <td className="px-4 py-3"><StateBadge state={c.state} /></td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                            {c.responsible_attorney || 'unassigned'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {item ? `${item.age_days}d` : '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {item?.next_action || '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400 font-mono">{c.candidate_version}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 px-2">{page} / {totalPages}</span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
