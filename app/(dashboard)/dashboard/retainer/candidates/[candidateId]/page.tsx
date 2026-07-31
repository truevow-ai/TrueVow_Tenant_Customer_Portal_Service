'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, ShieldCheck, FileText, MessageSquare, PenTool,
  CheckCircle, AlertTriangle, Send, Clock, XCircle, RefreshCw,
  ChevronDown, ChevronRight, ExternalLink, History,
} from 'lucide-react';
import {
  retainerClient,
  type CandidateDetailResponse,
  type ConflictSearchDetailResponse,
  type PackageDetailResponse,
  type CeremonyDetailResponse,
  type CreateChecklistResponse,
  type WorkflowDetail,
  buildCandidateWorkspace,
  type CandidateWorkspaceView,
  buildIntakeLink,
  buildTraceLink,
} from '@/lib/api/retainer/client';
import { resolveIntakeDetail } from '@/lib/api/intake/adapter';
import type { IntakeCandidateDetail } from '@/lib/api/intake/adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[color] || map.gray}`}>
      {label}
    </span>
  );
}

function SectionCard({
  title, icon, expanded, onToggle, rightContent, children,
}: {
  title: string; icon: React.ReactNode; expanded: boolean;
  onToggle: () => void; rightContent?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#0A2463] dark:text-blue-400">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {rightContent}
        </div>
        {expanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>
      {expanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();

  const [view, setView] = useState<CandidateWorkspaceView | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [conflict, setConflict] = useState<ConflictSearchDetailResponse | null>(null);
  const [pkg, setPkg] = useState<PackageDetailResponse | null>(null);
  const [ceremony, setCeremony] = useState<CeremonyDetailResponse | null>(null);
  const [checklist, setChecklist] = useState<CreateChecklistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [audit, setAudit] = useState<{ event_type: string; occurred_at: string; action: string; result: string }[]>([]);

  const [sections, setSections] = useState<Record<string, boolean>>({
    intake: true,
    review: true,
    history: false,
    conflict: false,
    package: false,
    client_activity: false,
    signatures: false,
    activation: false,
    audit: false,
  });

  const toggle = (k: string) => setSections((p) => ({ ...p, [k]: !p[k] }));

  // Load
  useEffect(() => {
    async function load() {
      try {
        const detail = await retainerClient.getCandidate(candidateId);
        const intake = await resolveIntakeDetail(detail.candidate_id, detail.tenant_id);
        const workspace = buildCandidateWorkspace(detail, intake);
        setView(workspace);

        // Load workflow
        try {
          const wf = await retainerClient.getWorkflow(detail.workflow_id);
          setWorkflow(wf);
          workspace.links.traceMatterUrl = buildTraceLink(wf);

          // Auto-expand relevant sections
          const autoExpand: Record<string, boolean> = {};
          if (wf.conflict_review_id) {
            try {
              const c = await retainerClient.getConflictSearch(wf.conflict_review_id);
              setConflict(c);
              autoExpand.conflict = true;
            } catch { /* search may not exist yet */ }
          }
          if (wf.engagement_package_id) {
            try {
              const p = await retainerClient.getPackage(wf.engagement_package_id);
              setPkg(p);
              autoExpand.package = true;
              // Try loading ceremony
              try {
                const cer = await retainerClient.getCeremony(p.package_id);
                setCeremony(cer);
                autoExpand.signatures = cer.state !== 'not_started';
              } catch { /* no ceremony yet */ }
            } catch { /* no package yet */ }
          }
          if (wf.activation_checklist_id) {
            try {
              // checklist items come from create response or direct query
              setChecklist(null); // will be loaded from activation page
              autoExpand.activation = true;
            } catch { /* not ready */ }
          }
          setSections((p) => ({ ...p, ...autoExpand }));
        } catch { /* workflow load optional */ }

        // Load audit trail
        try {
          const auditData = await retainerClient.getCandidateAudit(candidateId);
          setAudit(auditData.audit_entries || []);
          if (auditData.audit_entries?.length > 0) {
            setSections((p) => ({ ...p, audit: true }));
          }
        } catch { /* audit may not be supported yet */ }

      } catch (err: any) {
        console.error('Candidate detail load error:', err);
        setError(err?.message || 'Failed to load candidate');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [candidateId]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleDecision = async (outcome: 'APPROVED' | 'DECLINED' | 'DEFERRED') => {
    if (!view) return;
    try {
      await retainerClient.recordDecision(candidateId, {
        outcome,
        scope_json: {},
        authority_record_id: 'pending', // Backend validates
        policy_snapshot_id: null,
      });
      const detail = await retainerClient.getCandidate(candidateId);
      const intake = await resolveIntakeDetail(detail.candidate_id, detail.tenant_id);
      setView(buildCandidateWorkspace(detail, intake));
      setAuthError('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Unknown error';
      setAuthError(msg);
    }
  };

  // -----------------------------------------------------------------------
  // Loading / Error
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 dark:text-red-300 font-semibold mb-2">Unable to load candidate</p>
          <p className="text-red-500 dark:text-red-400 text-sm">{error || 'Candidate not found'}</p>
          <Link href="/dashboard/retainer/candidates" className="inline-block mt-4 text-sm text-[#0A2463] dark:text-blue-400 hover:underline">
            Back to Candidates
          </Link>
        </div>
      </div>
    );
  }

  const d = view.retainer;
  const intake = view.intake;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        <Link href="/dashboard/retainer" className="hover:text-gray-600 dark:hover:text-gray-300">RETAINER</Link>
        <span className="mx-1.5">/</span>
        <Link href="/dashboard/retainer/candidates" className="hover:text-gray-600 dark:hover:text-gray-300">Candidates</Link>
        <span className="mx-1.5">/</span>
        <span className="font-mono">{d.candidate_id.slice(0, 8)}...</span>
      </p>

      {/* Stale Warning */}
      {view.is_stale && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Intake Record Changed</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{view.block_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Authority Error */}
      {authError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{authError}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {intake.status === 'available' || intake.status === 'stale'
                ? intake.data.person_name
                : 'Intake details unavailable'}
            </h1>
            <p className="text-xs font-mono text-gray-400 mt-1">Candidate: {d.candidate_id.slice(0, 8)}...</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge label={d.state.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} color={
                d.state.includes('HOLD') || d.state.includes('DECLINED') ? 'red' :
                  d.state === 'ACTIVATED' || d.state === 'FULLY_EXECUTED' ? 'green' :
                    d.state.includes('PENDING') ? 'yellow' : 'blue'
              } />
              <span className="text-xs text-gray-400">v{d.candidate_version}</span>
              <span className="text-xs text-gray-400">Workflow: {d.workflow_id.slice(0, 8)}...</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/retainer/activation/${d.candidate_id}`}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Activation
            </Link>
          </div>
        </div>

        {/* Cross-product links */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            href={view.links.intakeRecordUrl}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#0A2463] dark:hover:text-blue-400 flex items-center gap-1"
          >
            <ExternalLink size={12} /> Open full INTAKE record
          </Link>
          {view.links.traceMatterUrl && (
            <Link
              href={view.links.traceMatterUrl}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#0A2463] dark:hover:text-blue-400 flex items-center gap-1"
            >
              <ExternalLink size={12} /> View TRACE Matter
            </Link>
          )}
        </div>
      </div>

      {/* Section: Intake Details */}
      <SectionCard
        title="Intake Details"
        icon={<User size={20} />}
        expanded={sections.intake}
        onToggle={() => toggle('intake')}
      >
        {intake.status === 'unavailable' ? (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
            <p>{intake.message}</p>
            <Link href={view.links.intakeRecordUrl} className="text-xs text-[#0A2463] dark:text-blue-400 hover:underline mt-2 inline-block">
              Open INTAKE record directly
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="text-gray-900 dark:text-gray-100 font-medium">{intake.data.person_name}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="text-gray-900 dark:text-gray-100">{intake.data.phone}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="text-gray-900 dark:text-gray-100">{intake.data.email || '\u2014'}</span></div>
              <div><span className="text-gray-500">Practice Area:</span> <span className="text-gray-900 dark:text-gray-100">{intake.data.practice_area || '\u2014'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="text-gray-900 dark:text-gray-100">{intake.data.status}</span></div>
              <div><span className="text-gray-500">Source:</span> <span className="text-gray-900 dark:text-gray-100">{intake.data.source || '\u2014'}</span></div>
            </div>
            {'answers' in intake.data && intake.data.answers.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Intake Answers</p>
                <div className="space-y-1">
                  {(intake.data as IntakeCandidateDetail).answers.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500">{a.question_key}</span>
                      <span className="text-gray-700 dark:text-gray-300">{a.response_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Link
              href={view.links.intakeRecordUrl}
              className="text-xs text-[#0A2463] dark:text-blue-400 hover:underline mt-4 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> Open full INTAKE record
            </Link>
          </div>
        )}
      </SectionCard>

      {/* Section: Representation Review */}
      <SectionCard
        title="Representation Review"
        icon={<ShieldCheck size={20} />}
        expanded={sections.review}
        onToggle={() => toggle('review')}
        rightContent={d.decision_outcome ? (
          <Badge label={d.decision_outcome} color={
            d.decision_outcome === 'APPROVED' ? 'green' :
              d.decision_outcome === 'DECLINED' ? 'red' : 'yellow'
          } />
        ) : null}
      >
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div><span className="text-gray-500">Review State:</span> <span className="text-gray-900 dark:text-gray-100">{d.review_state || 'Not started'}</span></div>
          <div><span className="text-gray-500">Attorney:</span> <span className="text-gray-900 dark:text-gray-100">{d.responsible_attorney_actor_id || 'Unassigned'}</span></div>
          <div><span className="text-gray-500">Decision:</span> <span className="text-gray-900 dark:text-gray-100">{d.decision_outcome || 'Pending'}</span></div>
          <div><span className="text-gray-500">Version:</span> <span className="text-gray-900 dark:text-gray-100">v{d.candidate_version}</span></div>
        </div>

        {!d.decision_outcome && !view.is_stale && (
          <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handleDecision('APPROVED')}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <CheckCircle size={14} className="inline mr-1" /> Approve
            </button>
            <button
              onClick={() => handleDecision('DECLINED')}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
            >
              <XCircle size={14} className="inline mr-1" /> Decline
            </button>
            <button
              onClick={() => handleDecision('DEFERRED')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Clock size={14} className="inline mr-1" /> Defer
            </button>
          </div>
        )}

        {view.is_stale && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle size={14} /> Decision actions are blocked because the intake record changed after this review began.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Section: Decision History */}
      <SectionCard
        title="Decision History"
        icon={<History size={20} />}
        expanded={sections.history}
        onToggle={() => toggle('history')}
      >
        {audit.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No audit events recorded yet. Events will appear as the workflow progresses.
          </p>
        ) : (
          <div className="space-y-2">
            {audit.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0">
                <span className="text-gray-400 w-24 flex-shrink-0">{new Date(entry.occurred_at).toLocaleDateString()}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                  <span className="text-gray-500 ml-2">{entry.action} — {entry.result}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Section: Conflict Review */}
      <SectionCard
        title="Conflict Review"
        icon={<AlertTriangle size={20} />}
        expanded={sections.conflict}
        onToggle={() => toggle('conflict')}
        rightContent={conflict ? (
          <Badge label={conflict.status} color={
            conflict.status === 'completed' || conflict.status === 'cleared' ? 'green' :
              conflict.review_outcome === 'CLEARED' ? 'green' : 'yellow'
          } />
        ) : null}
      >
        {!conflict ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">No conflict search has been run for this candidate.</p>
            {!view.is_stale && (
              <button
                onClick={async () => {
                  try {
                    const result = await retainerClient.startConflictSearch(candidateId, {
                      parties: [],
                      candidate_version: d.candidate_version,
                      scope_json: {},
                    });
                    setConflict(result as unknown as ConflictSearchDetailResponse);
                  } catch (err: any) { alert(err?.message || 'Failed'); }
                }}
                className="mt-3 px-4 py-2 bg-[#0A2463] text-white text-sm rounded-md hover:bg-[#0A2463]/80"
              >
                Start Conflict Search
              </button>
            )}
            {view.is_stale && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Conflict search blocked — intake version mismatch.</p>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-gray-500">Status:</span> <span className="text-gray-900 dark:text-gray-100">{conflict.status}</span></div>
              <div><span className="text-gray-500">Parties:</span> <span className="text-gray-900 dark:text-gray-100">{conflict.parties?.length || 0}</span></div>
              <div><span className="text-gray-500">Matches:</span> <span className="text-gray-900 dark:text-gray-100">{conflict.candidates?.length || 0}</span></div>
              <div><span className="text-gray-500">Algorithm:</span> <span className="text-gray-900 dark:text-gray-100">{conflict.algorithm_version}</span></div>
            </div>
            {conflict.candidates && conflict.candidates.length > 0 ? (
              <div className="space-y-2">
                {conflict.candidates.map((mc, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{mc.matched_party_ref}</span>
                      <Badge label={mc.disposition} color={mc.disposition === 'CLEARED' ? 'green' : 'yellow'} />
                    </div>
                    <p className="text-gray-500 mt-1">
                      Basis: {typeof mc.match_basis_json === 'object' ? JSON.stringify(mc.match_basis_json).slice(0, 80) : String(mc.match_basis_json)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No potential match found in the configured sources.</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section: Package */}
      <SectionCard
        title="Engagement Package"
        icon={<FileText size={20} />}
        expanded={sections.package}
        onToggle={() => toggle('package')}
        rightContent={pkg ? (
          <Badge label={pkg.status} color={
            pkg.status === 'locked' || pkg.status === 'delivered' ? 'green' :
              pkg.status === 'generated' ? 'blue' : 'yellow'
          } />
        ) : null}
      >
        {!pkg ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">No package generated yet.</p>
            {!view.is_stale && (
              <button
                onClick={async () => {
                  if (!workflow) return;
                  try {
                    const result = await retainerClient.generatePackage(workflow.workflow_id, {
                      template_resolution_id: '', document_roles: [], preflight_controls: [],
                    });
                    setPkg(result as unknown as PackageDetailResponse);
                  } catch (err: any) { alert(err?.message || 'Failed'); }
                }}
                className="mt-3 px-4 py-2 bg-[#0A2463] text-white text-sm rounded-md hover:bg-[#0A2463]/80"
              >
                Generate Package
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
              <div><span className="text-gray-500">Hash:</span> <span className="font-mono text-xs">{pkg.package_hash?.slice(0, 16)}...</span></div>
              <div><span className="text-gray-500">Documents:</span> <span className="text-gray-900 dark:text-gray-100">{pkg.documents?.length || 0}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="text-gray-900 dark:text-gray-100">{pkg.status}</span></div>
            </div>
            {pkg.preflight_results && pkg.preflight_results.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 mb-1">Preflight Results</p>
                {pkg.preflight_results.map((pf, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {pf.passed ? (
                      <CheckCircle size={12} className="text-green-500" />
                    ) : (
                      <XCircle size={12} className="text-red-500" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">{pf.control_name}</span>
                    {pf.detail && <span className="text-gray-400">— {pf.detail}</span>}
                  </div>
                ))}
              </div>
            )}
            {pkg.status === 'generated' && !view.is_stale && (
              <button
                onClick={async () => {
                  try {
                    await retainerClient.authorizeDelivery(pkg.package_id, {
                      authority_record_id: 'pending', channel: 'portal', recipient_verified: false,
                    });
                    const updated = await retainerClient.getPackage(pkg.package_id);
                    setPkg(updated);
                  } catch (err: any) { alert(err?.message || 'Failed'); }
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Send size={14} className="inline mr-1" /> Authorize Delivery
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section: Client Activity */}
      <SectionCard
        title="Client Activity"
        icon={<MessageSquare size={20} />}
        expanded={sections.client_activity}
        onToggle={() => toggle('client_activity')}
        rightContent={
          ['DELIVERED', 'CLIENT_REVIEW', 'SIGNATURE_PENDING'].includes(d.state) ? (
            <Badge label="Active" color="blue" />
          ) : null
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Delivery:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {d.state === 'DELIVERED' || d.state === 'CLIENT_REVIEW' || d.state === 'SIGNATURE_PENDING' || d.state === 'FULLY_EXECUTED' || d.state === 'ACTIVATED'
                  ? 'Delivered' : 'Not delivered'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Portal:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {['DELIVERED', 'CLIENT_REVIEW', 'SIGNATURE_PENDING', 'FULLY_EXECUTED', 'ACTIVATED'].includes(d.state)
                  ? 'Access pending' : 'Not requested'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Consent:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">Pending</span>
            </div>
            <div>
              <span className="text-gray-500">Questions:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">0 pending</span>
            </div>
          </div>
          {!['DELIVERED', 'CLIENT_REVIEW', 'SIGNATURE_PENDING', 'FULLY_EXECUTED', 'ACTIVATED'].includes(d.state) && (
            <p className="text-xs text-gray-400">Client activity will appear after package delivery.</p>
          )}
        </div>
      </SectionCard>

      {/* Section: Signatures */}
      <SectionCard
        title="Signature Status"
        icon={<PenTool size={20} />}
        expanded={sections.signatures}
        onToggle={() => toggle('signatures')}
        rightContent={ceremony ? (
          <Badge label={ceremony.state} color={
            ceremony.state === 'executed' || ceremony.state === 'completed' ? 'green' :
              ceremony.state === 'expired' ? 'gray' : 'blue'
          } />
        ) : null}
      >
        {!ceremony ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No signature ceremony created yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Provider:</span> <span className="text-gray-900 dark:text-gray-100">{ceremony.provider_type}</span></div>
              <div><span className="text-gray-500">State:</span> <span className="text-gray-900 dark:text-gray-100">{ceremony.state}</span></div>
            </div>
            {ceremony.signers && ceremony.signers.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-xs font-medium text-gray-500">Signers</p>
                {ceremony.signers.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <span className="text-gray-900 dark:text-gray-100">{s.signer_role}</span>
                    <Badge label={s.required ? 'Required' : 'Optional'} color={s.required ? 'blue' : 'gray'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section: Activation */}
      <SectionCard
        title="Activation"
        icon={<CheckCircle size={20} />}
        expanded={sections.activation}
        onToggle={() => toggle('activation')}
        rightContent={workflow?.activation_checklist_id ? (
          <Badge label="Checklist Created" color="blue" />
        ) : null}
      >
        {!workflow?.activation_checklist_id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Activation not yet available. Complete the engagement workflow first.</p>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">Activation checklist created.</p>
            <Link
              href={`/dashboard/retainer/activation/${d.candidate_id}`}
              className="inline-block mt-3 px-4 py-2 bg-[#0A2463] text-white text-sm rounded-md hover:bg-[#0A2463]/80"
            >
              Open Activation Workspace
            </Link>
          </div>
        )}
      </SectionCard>

      {/* Section: Audit */}
      <SectionCard
        title="Audit Trail"
        icon={<History size={20} />}
        expanded={sections.audit}
        onToggle={() => toggle('audit')}
      >
        {audit.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No events recorded. The audit trail will populate as workflow actions are completed: candidate import, review, attorney decision, conflict search, clearance, template resolution, package generation, delivery, signatures, activation.
          </p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {audit.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <span className="text-gray-400 w-28 flex-shrink-0 font-mono">
                  {new Date(entry.occurred_at).toLocaleString()}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0 truncate">
                  {entry.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <span className="text-gray-500 flex-1">{entry.action} — {entry.result}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
