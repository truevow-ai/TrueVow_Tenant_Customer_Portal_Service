'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, FileText, Users, Download, Calendar, Stethoscope } from 'lucide-react';
import { traceClient, TraceCase, TraceReadiness } from '@/lib/api/trace-client';

const STAGE_ORDER = ['PENDING_SIGNATURE', 'INITIALIZATION', 'RETRIEVAL', 'PROCESSING', 'CHRONOLOGY_READY', 'ATTORNEY_REVIEW', 'DEMAND_READY'];

const STAGE_INFO: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  PENDING_SIGNATURE: { label: 'Awaiting Signature', icon: Clock, description: 'Send the retainer and HIPAA authorization for e-signature.' },
  INITIALIZATION: { label: 'Setup Providers', icon: Users, description: 'Add and confirm medical providers for record retrieval.' },
  RETRIEVAL: { label: 'Records Requested', icon: FileText, description: 'Fax requests sent. Waiting for medical records.' },
  PROCESSING: { label: 'Processing Records', icon: Stethoscope, description: 'OCR and NLP processing uploaded documents.' },
  CHRONOLOGY_READY: { label: 'Chronology Ready', icon: CheckCircle, description: 'Review the timeline and annotate any flagged items.' },
  ATTORNEY_REVIEW: { label: 'Attorney Review', icon: AlertTriangle, description: 'Final review before marking demand-ready.' },
  DEMAND_READY: { label: 'Demand Ready', icon: Download, description: 'Export the demand package as PDF or JSON.' },
};

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [case_, setCase] = useState<TraceCase | null>(null);
  const [readiness, setReadiness] = useState<TraceReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, r] = await Promise.all([
          traceClient.getCase(caseId as string),
          traceClient.getReadiness(caseId as string).catch(() => null),
        ]);
        setCase(c);
        setReadiness(r);
      } catch (err) {
        console.error('Failed to load case', err);
      } finally {
        setLoading(false);
      }
    }
    if (caseId) load();
  }, [caseId]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  if (!case_) {
    return (
      <div className="text-center py-16">
        <AlertTriangle size={48} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Case Not Found</h2>
        <Link href="/dashboard/trace/cases" className="mt-4 inline-flex items-center gap-2 text-[#0A2463] hover:underline">
          <ArrowLeft size={16} /> Back to Cases
        </Link>
      </div>
    );
  }

  const currentStageIdx = STAGE_ORDER.indexOf(case_.case_stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/trace/cases" className="text-sm text-gray-500 hover:text-[#0A2463] flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Cases
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Case {case_.case_id.slice(0, 8)}...</h1>
          <p className="text-sm text-gray-500 mt-1">
            {case_.jurisdiction_state} &middot; Incident {case_.incident_date} &middot; SOL {case_.sol_deadline}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {case_.case_stage === 'DEMAND_READY' && (
            <Link href={`/dashboard/trace/cases/${caseId}/export`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-semibold hover:bg-green-600">
              <Download size={16} /> Export
            </Link>
          )}
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Case Progress</h3>
        <div className="flex items-center justify-between">
          {STAGE_ORDER.map((stage, idx) => {
            const info = STAGE_INFO[stage];
            const isDone = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const Icon = info.icon;
            return (
              <div key={stage} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {idx > 0 && <div className={`flex-1 h-0.5 ${idx <= currentStageIdx ? 'bg-[#0A2463]' : 'bg-gray-200'}`} />}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDone ? 'bg-[#10B981]' : isCurrent ? 'bg-[#0A2463]' : 'bg-gray-100'} text-white`}>
                    {isDone ? <CheckCircle size={16} /> : <Icon size={14} />}
                  </div>
                  {idx < STAGE_ORDER.length - 1 && <div className={`flex-1 h-0.5 ${idx < currentStageIdx ? 'bg-[#0A2463]' : 'bg-gray-200'}`} />}
                </div>
                <span className={`text-[10px] mt-1 text-center font-medium ${isCurrent ? 'text-[#0A2463]' : 'text-gray-400'}`}>
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>
        {currentStageIdx >= 0 && (
          <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-[#0A2463]">Current: {STAGE_INFO[STAGE_ORDER[currentStageIdx]].label}</span>
            &mdash; {STAGE_INFO[STAGE_ORDER[currentStageIdx]].description}
          </p>
        )}
      </div>

      {/* Case Info + Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Case Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-1">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">SOL Deadline</dt><dd className={`font-semibold ${case_.sol_urgency === 'Critical' ? 'text-red-600' : 'text-gray-900'}`}>{case_.sol_deadline}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Urgency</dt><dd className={`font-semibold ${case_.sol_urgency === 'Critical' ? 'text-red-600' : 'text-gray-900'}`}>{case_.sol_urgency}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">HIPAA</dt><dd className={`font-semibold ${case_.hipaa_auth_status === 'SIGNED' ? 'text-green-600' : 'text-yellow-600'}`}>{case_.hipaa_auth_status}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Providers</dt><dd className="font-semibold text-gray-900">{case_.provider_list_status}</dd></div>
            {readiness && (
              <>
                <div className="flex justify-between"><dt className="text-gray-500">Provider Count</dt><dd className="font-semibold text-gray-900">{readiness.provider_count}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Lien Count</dt><dd className="font-semibold text-gray-900">{readiness.lien_count}</dd></div>
              </>
            )}
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <CaseAction href={`/dashboard/trace/cases/${caseId}/providers`} icon={<Users size={18} />} label="Manage Providers" />
            <CaseAction href={`/dashboard/trace/cases/${caseId}/chronology`} icon={<Clock size={18} />} label="View Chronology" />
            {case_.case_stage !== 'PENDING_SIGNATURE' && (
              <button onClick={async () => {
                setAdvancing(true);
                try { await traceClient.confirmProviderList(caseId as string).catch(() => {}); router.refresh(); }
                finally { setAdvancing(false); }
              }} disabled={advancing} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 text-sm hover:border-[#0A2463] transition-colors text-left disabled:opacity-50">
                <CheckCircle size={18} className="text-gray-400" /> <span>Confirm Providers</span>
              </button>
            )}
            <CaseAction href={`/dashboard/trace/cases/${caseId}/chronology`} icon={<Download size={18} />} label="Export Case" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 text-sm hover:border-[#0A2463] transition-colors">
      <span className="text-gray-400">{icon}</span>
      <span className="font-medium text-gray-700">{label}</span>
    </Link>
  );
}
