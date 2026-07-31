'use client';

/**
 * A4.4 Conflict Workspace
 * Uses ConflictSearchDetailResponse from generated contract.
 *
 * Terminology: "No potential match found in the configured sources"
 *              NOT "Conflict cleared" (clearance requires attorney decision)
 */
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { retainerClient, type ConflictSearchDetailResponse } from '@/lib/api/retainer/client';

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[color] || map.gray}`}>
      {label}
    </span>
  );
}

export default function ConflictWorkspacePage() {
  const { searchId } = useParams<{ searchId: string }>();

  const [search, setSearch] = useState<ConflictSearchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await retainerClient.getConflictSearch(searchId);
        setSearch(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load conflict search');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchId]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  if (error || !search) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 dark:text-red-300 font-semibold">Unable to load conflict search</p>
          <p className="text-red-500 text-sm mt-1">{error || 'Not found'}</p>
          <Link href="/dashboard/retainer" className="inline-block mt-4 text-sm text-[#0A2463] dark:text-blue-400 hover:underline">Back to RETAINER</Link>
        </div>
      </div>
    );
  }

  const handleClear = async () => {
    try {
      const result = await retainerClient.clearConflict(searchId, {
        authority_record_id: 'pending',
        rationale: null,
        policy_snapshot_id: null,
      });
      setActionError('');
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Clearance denied');
    }
  };

  const handleHold = async () => {
    try {
      await retainerClient.applyConflictHold(search.workflow_id, {
        reason: 'Pending attorney review',
        authority_record_id: 'pending',
        affected_candidate_id: null,
        supporting_evidence: {},
        required_followup: null,
        policy_snapshot_id: null,
      });
      setActionError('');
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Hold denied');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        <Link href="/dashboard/retainer" className="hover:text-gray-600 dark:hover:text-gray-300">RETAINER</Link>
        <span className="mx-1.5">/</span>
        <span>Conflict Search</span>
      </p>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conflict Review</h1>

      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{actionError}</p>
        </div>
      )}

      {/* Search Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Status:</span> <span className="font-semibold text-gray-900 dark:text-gray-100">{search.status}</span></div>
          <div><span className="text-gray-500">Party Set:</span> <span className="text-gray-900 dark:text-gray-100">v{search.party_set_version}</span></div>
          <div><span className="text-gray-500">Algorithm:</span> <span className="text-gray-900 dark:text-gray-100">{search.algorithm_version}</span></div>
          <div><span className="text-gray-500">Started:</span> <span className="text-gray-900 dark:text-gray-100">{new Date(search.started_at).toLocaleString()}</span></div>
          {search.completed_at && (
            <div><span className="text-gray-500">Completed:</span> <span className="text-gray-900 dark:text-gray-100">{new Date(search.completed_at).toLocaleString()}</span></div>
          )}
          {search.review_outcome && (
            <div><span className="text-gray-500">Outcome:</span> <Badge label={search.review_outcome} color={search.review_outcome === 'CLEARED' ? 'green' : 'yellow'} /></div>
          )}
        </div>
      </div>

      {/* Parties Searched */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Parties Searched</h2>
        {search.parties.length === 0 ? (
          <p className="text-sm text-gray-500">No parties were submitted for this search.</p>
        ) : (
          <div className="space-y-2">
            {search.parties.map((p) => (
              <div key={p.id} className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{p.legal_name}</span>
                  <Badge label={p.party_type} color="blue" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {p.normalized_name && <>Normalized: {p.normalized_name} &middot; </>}
                  {p.relationship_to_candidate && <>Role: {p.relationship_to_candidate}</>}
                </p>
                {p.prior_names && p.prior_names.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Prior names: {p.prior_names.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Potential Matches */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Potential Matches</h2>
        {!search.candidates || search.candidates.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No potential match found in the configured sources.
          </p>
        ) : (
          <div className="space-y-3">
            {search.candidates.map((mc, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{mc.matched_party_ref}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Disposition: <Badge label={mc.disposition} color={mc.disposition === 'CLEARED' ? 'green' : mc.disposition === 'HOLD' ? 'red' : 'yellow'} />
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Basis: {typeof mc.match_basis_json === 'object'
                        ? JSON.stringify(mc.match_basis_json).slice(0, 120)
                        : String(mc.match_basis_json)}
                    </p>
                    {mc.rule_or_score && (
                      <p className="text-xs text-gray-400 mt-0.5">Rule: {mc.rule_or_score}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!search.review_outcome && (
          <>
            <button onClick={handleClear} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
              <CheckCircle size={14} className="inline mr-1" /> Clear by Attorney
            </button>
            <button onClick={handleHold} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
              <AlertTriangle size={14} className="inline mr-1" /> Apply Conflict Hold
            </button>
          </>
        )}
        {search.current_hold && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 self-center">
            <AlertTriangle size={14} /> Conflict hold is active
          </p>
        )}
      </div>
    </div>
  );
}
