'use client';

/**
 * A4.7 Activation Workspace
 *
 * Displays the 9 required activation evidence items:
 *   1. Representation decision
 *   2. Conflict-clearance authority
 *   3. Engagement workflow
 *   4. Executed package
 *   5. Signature evidence
 *   6. Completed-copy delivery
 *   7. Responsible-attorney assignment
 *   8. Jurisdiction-profile version
 *   9. Activation-policy version
 *
 * Statuses: Passed, Blocked, Pending, Stale, Unavailable
 * Each blocked item shows a precise, safe explanation.
 * Never infer activation success from a timeout.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Clock, XCircle, AlertTriangle, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { retainerClient, type WorkflowDetail, type CandidateDetailResponse } from '@/lib/api/retainer/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceStatus = 'passed' | 'blocked' | 'pending' | 'stale' | 'unavailable';

interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  status: EvidenceStatus;
  blockedReason: string | null;
  referenceId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: EvidenceStatus }) {
  const map: Record<string, string> = {
    passed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    blocked: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
    stale: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    unavailable: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  };
  const labels: Record<string, string> = {
    passed: 'Passed', blocked: 'Blocked', pending: 'Pending', stale: 'Stale', unavailable: 'Unavailable',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, string> = {
    activation_submitted: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    activated: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
    activation_failed: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
    reconciliation_required: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[result] || 'bg-gray-100 text-gray-700'}`}>
      {result.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Build evidence checklist from workflow detail
// ---------------------------------------------------------------------------

function buildEvidenceItems(
  workflow: WorkflowDetail,
  candidate: CandidateDetailResponse | null,
): EvidenceItem[] {
  const items: EvidenceItem[] = [
    {
      id: 'representation_decision',
      label: 'Representation Decision',
      description: 'Attorney must approve or decline representation with defined scope.',
      status: workflow.representation_decision_id ? 'passed' : 'blocked',
      blockedReason: workflow.representation_decision_id ? null : 'No representation decision has been recorded.',
      referenceId: workflow.representation_decision_id,
    },
    {
      id: 'conflict_clearance',
      label: 'Conflict Clearance',
      description: 'Conflict search completed and cleared or held by attorney.',
      status: workflow.conflict_review_id ? 'passed' : 'blocked',
      blockedReason: workflow.conflict_review_id ? null : 'Conflict review has not been completed.',
      referenceId: workflow.conflict_review_id,
    },
    {
      id: 'engagement_workflow',
      label: 'Engagement Workflow',
      description: 'Workflow must have progressed through package delivery and execution.',
      status: ['FULLY_EXECUTED', 'ACTIVATION_PENDING', 'ACTIVATED'].includes(workflow.state)
        ? 'passed'
        : 'blocked',
      blockedReason: ['FULLY_EXECUTED', 'ACTIVATION_PENDING', 'ACTIVATED'].includes(workflow.state)
        ? null
        : `Workflow is in ${workflow.state} state. Full execution required.`,
      referenceId: workflow.workflow_id,
    },
    {
      id: 'executed_package',
      label: 'Executed Package',
      description: 'Engagement package must be generated with all required documents.',
      status: workflow.engagement_package_id ? 'passed' : 'blocked',
      blockedReason: workflow.engagement_package_id ? null : 'No engagement package has been generated.',
      referenceId: workflow.engagement_package_id,
    },
    {
      id: 'signature_evidence',
      label: 'Signature Evidence',
      description: 'All required signers must have completed the locked package version.',
      status: workflow.state === 'FULLY_EXECUTED' || workflow.state === 'ACTIVATION_PENDING' || workflow.state === 'ACTIVATED'
        ? 'passed'
        : 'blocked',
      blockedReason: workflow.state === 'FULLY_EXECUTED' || workflow.state === 'ACTIVATION_PENDING' || workflow.state === 'ACTIVATED'
        ? null
        : 'Package has not been fully executed. Not all required signatures are present.',
      referenceId: null,
    },
    {
      id: 'completed_copy_delivery',
      label: 'Completed Copy Delivery',
      description: 'Fully executed copy must be delivered to the client.',
      status: workflow.state === 'FULLY_EXECUTED' || workflow.state === 'ACTIVATION_PENDING' || workflow.state === 'ACTIVATED'
        ? 'passed'
        : 'pending',
      blockedReason: null,
      referenceId: null,
    },
    {
      id: 'attorney_assignment',
      label: 'Responsible Attorney',
      description: 'A licensed attorney must be assigned to this matter.',
      status: candidate?.responsible_attorney_actor_id ? 'passed' : 'blocked',
      blockedReason: candidate?.responsible_attorney_actor_id ? null : 'No responsible attorney has been assigned.',
      referenceId: candidate?.responsible_attorney_actor_id || null,
    },
    {
      id: 'jurisdiction_profile',
      label: 'Jurisdiction Profile',
      description: 'Activation must reference a valid jurisdiction profile version.',
      status: 'pending',
      blockedReason: null,
      referenceId: null,
    },
    {
      id: 'activation_policy',
      label: 'Activation Policy',
      description: 'Activation must reference an approved policy version.',
      status: 'pending',
      blockedReason: null,
      referenceId: null,
    },
  ];

  // If activated, all items and mark
  if (workflow.state === 'ACTIVATED') {
    items.forEach((i) => { i.status = 'passed'; i.blockedReason = null; });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ActivationPage() {
  const { candidateId } = useParams<{ candidateId: string }>();

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [candidate, setCandidate] = useState<CandidateDetailResponse | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const detail = await retainerClient.getCandidate(candidateId);
        setCandidate(detail);
        const wf = await retainerClient.getWorkflow(detail.workflow_id);
        setWorkflow(wf);
        setItems(buildEvidenceItems(wf, detail));

        if (wf.state === 'ACTIVATED') setResult('activated');
        else if (wf.state === 'ACTIVATION_PENDING') setResult('activation_pending');
      } catch (err: any) {
        setError(err?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [candidateId]);

  const allPassed = items.length > 0 && items.every((i) => i.status === 'passed');

  const handleActivate = async () => {
    if (!workflow) return;
    if (!confirm('Activating the matter will trigger the RETAINER → TRACE handoff. This cannot be undone. Continue?')) return;
    setActivating(true);
    setActionError('');
    try {
      await retainerClient.confirmActivation(workflow.workflow_id, {
        activated_matter_id: workflow.activated_matter_id || '',
      });
      const wf = await retainerClient.getWorkflow(workflow.workflow_id);
      setWorkflow(wf);
      setResult(wf.state === 'ACTIVATED' ? 'activated' : 'activation_submitted');
    } catch (err: any) {
      setActionError(err?.response?.data?.error || err?.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 dark:text-red-300 font-semibold">Unable to load activation</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <Link href="/dashboard/retainer" className="inline-block mt-4 text-sm text-[#0A2463] dark:text-blue-400 hover:underline">Back to RETAINER</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        <Link href="/dashboard/retainer" className="hover:text-gray-600 dark:hover:text-gray-300">RETAINER</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/dashboard/retainer/candidates/${candidateId}`} className="hover:text-gray-600 dark:hover:text-gray-300">Candidate</Link>
        <span className="mx-1.5">/</span>
        <span>Activation</span>
      </p>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activation Workspace</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All evidence requirements must pass before matter activation
          </p>
        </div>
        <div>
          {result && <ResultBadge result={result} />}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{actionError}</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Evidence Requirements</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {items.filter((i) => i.status === 'passed').length} of {items.length} passed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
          <div
            className={`h-2.5 rounded-full transition-all ${allPassed ? 'bg-green-600' : 'bg-blue-600'}`}
            style={{ width: `${items.length > 0 ? (items.filter((i) => i.status === 'passed').length / items.length) * 100 : 0}%` }}
          />
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${
                item.status === 'passed'
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : item.status === 'blocked'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : item.status === 'stale'
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                      : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {item.status === 'passed' ? (
                    <CheckCircle size={18} className="text-green-600 dark:text-green-400 mt-0.5" />
                  ) : item.status === 'blocked' ? (
                    <XCircle size={18} className="text-red-600 dark:text-red-400 mt-0.5" />
                  ) : item.status === 'stale' ? (
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                  ) : (
                    <Clock size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                    {item.blockedReason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{item.blockedReason}</p>
                    )}
                    {item.referenceId && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {item.referenceId.slice(0, 12)}...</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activation Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Activation Actions</h2>

        {allPassed && result !== 'activated' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">All evidence requirements passed. Ready for activation.</p>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-6 py-3 bg-green-600 text-white text-base font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
            >
              <ShieldCheck size={18} className="inline mr-2" />
              {activating ? 'Submitting...' : 'Submit Activation'}
            </button>
          </div>
        )}

        {!allPassed && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {items.filter((i) => i.status !== 'passed').length} evidence requirement{items.filter((i) => i.status !== 'passed').length !== 1 ? 's' : ''} still {items.filter((i) => i.status !== 'passed').length !== 1 ? 'need' : 'needs'} attention before activation can proceed.
            </p>
          </div>
        )}

        {result === 'activated' && workflow?.activated_matter_id && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-2">Matter has been activated.</p>
            <Link
              href={`/dashboard/trace/cases/${workflow.activated_matter_id}`}
              className="text-sm text-[#0A2463] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink size={14} /> Open TRACE Matter
            </Link>
          </div>
        )}

        {result === 'activation_submitted' && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">Activation has been submitted. Refresh to check status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
