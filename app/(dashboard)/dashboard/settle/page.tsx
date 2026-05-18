'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scale, FileText, Users, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { leverageClient, CaseListItem } from '@/lib/api/leverage-client';
import { settleClient, type Report } from '@/lib/api/settle-client';
import { useTenant } from '@/hooks/useTenant';

type Tab = 'analysis' | 'reports' | 'council';

export default function SettlementIntelligencePage() {
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const isCouncilMember = false;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settlement Intelligence</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Case-linked settlement analysis. Know what comparable cases have settled for before you negotiate.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-0">
        <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Scale size={15} />}>
          Case Analysis
        </TabButton>
        <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={15} />}>
          Settlement Reports
        </TabButton>
        {isCouncilMember && (
          <TabButton active={activeTab === 'council'} onClick={() => setActiveTab('council')} icon={<Users size={15} />}>
            Council Contributions
          </TabButton>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' && <CaseAnalysisTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'council' && isCouncilMember && <CouncilTab />}
    </div>
  );
}

//  Case Analysis Tab — pulls cases from LEVERAGE

function CaseAnalysisTab() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState('');

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await leverageClient.listCases(tenantId, { limit: 50 });
        setCases(res.cases);
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tenantLoading]);

  const selectedCase = cases.find(c => c.case_id === selectedCaseId);

  return (
    <div className="space-y-4">
      {/* Case picker */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Select a case
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading cases from LEVERAGE…
          </div>
        ) : (
          <select
            value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">Choose a LEVERAGE case…</option>
            {cases.map(c => (
              <option key={c.case_id} value={c.case_id}>
                {c.case_id.slice(0, 8)}…  {c.incident_type ?? 'Unknown'} ({c.state ?? '—'})
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Cases are pulled from your LEVERAGE workspace. <Link href="/dashboard/leverage/cases/new" className="text-blue-600 dark:text-blue-400 hover:underline">Open a new case</Link> to get started.
        </p>
      </div>

      {/* No case selected */}
      {!selectedCase && !loading && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Scale size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a case above to run settlement intelligence.</p>
        </div>
      )}

      {/* Case selected  show CTA */}
      {selectedCase && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Selected case</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">{selectedCase.case_id.slice(0, 12)}…</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedCase.incident_type ?? 'Unknown incident'}  {selectedCase.state ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Status: {selectedCase.litigation_stage ?? 'lead'}  Opened {new Date(selectedCase.created_at).toLocaleDateString()}</p>
            </div>
            <Link
              href={`/dashboard/settle/analysis?source=leverage_case&case_id=${selectedCase.case_id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              Run Settlement Intelligence
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* Recent cases */}
      {cases.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your LEVERAGE cases</h3>
          <div className="space-y-2">
            {cases.slice(0, 5).map(c => (
              <Link
                key={c.case_id}
                href={`/dashboard/settle/analysis?source=leverage_case&case_id=${c.case_id}`}
                className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">{c.case_id.slice(0, 8)}…</p>
                  <p className="text-xs text-gray-400">{c.incident_type ?? '—'}  {c.state ?? '—'}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

//  Settlement Reports Tab 

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settleClient.getReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-16 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No reports yet. Run settlement intelligence on a case to generate one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map(r => (
        <div key={r.report_id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.title || r.report_id}</p>
            <p className="text-xs text-gray-400 mt-0.5">Case {r.case_id} · {r.report_type} · {new Date(r.generated_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-4">
            {r.confidence_score !== undefined && (
              <ConfidenceBadge score={r.confidence_score} />
            )}
            {r.file_url ? (
              <a
                href={r.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors"
              >
                Download PDF
              </a>
            ) : (
              <span className="text-xs text-gray-400">PDF pending</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

//  Council Contributions Tab 

function CouncilTab() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    county: '', incident: '', injury: '', insurer: '', band: '',
    litigation_stage: '',
  });

  const counties = ['Duval County, FL', 'Hillsborough County, FL', 'Miami-Dade County, FL', 'Orange County, FL', 'Palm Beach County, FL'];
  const incidents = ['Slip and Fall', 'Auto Accident', 'Dog Bite', 'Premises Liability', 'Wrongful Death', 'Other'];
  const injuries = ['Minor Soft Tissue', 'Moderate Soft Tissue', 'Fracture', 'Spinal', 'TBI', 'Catastrophic'];
  const insurers = ['State Farm', 'GEICO', 'Allstate', 'Progressive', 'USAA', 'Liberty Mutual', 'Unknown'];
  const bands = ['$010k', '$1025k', '$2550k', '$50100k', '$100250k', '$250k+'];
  const stages = ['Pre-suit', 'Suit filed', 'Mediation', 'Trial'];

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const ready = Object.values(form).every(Boolean);

  const handleSubmit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      await settleClient.submitContribution({
        county: form.county,
        incident: form.incident,
        injury: form.injury,
        insurer: form.insurer,
        band: form.band,
        litigation_stage: form.litigation_stage,
      });
      setSubmitted(true);
    } catch {
      // Error handled by toast in settleClient
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <Plus size={20} className="text-green-600 rotate-45" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">Settlement recorded</p>
        <p className="text-sm text-gray-400 mt-1">Pending council review. Usually approved within 24 hours.</p>
        <button onClick={() => { setSubmitted(false); setForm({ county: '', incident: '', injury: '', insurer: '', band: '', litigation_stage: '' }); }}
          className="mt-4 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 underline">
          Record another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Takes under 60 seconds. All fields are drop-downs  no text entry, no PHI. Your identity is never stored with the submission.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Record Settlement</h3>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['County', 'county', counties],
            ['Incident Type', 'incident', incidents],
            ['Injury Category', 'injury', injuries],
            ['Insurer', 'insurer', insurers],
            ['Settlement Band', 'band', bands],
            ['Litigation Stage', 'litigation_stage', stages],
          ] as [string, string, string[]][]).map(([label, key, options]) => (
            <div key={key}>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
              <select
                value={(form as Record<string, string>)[key]}
                onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Select</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <button
          disabled={!ready || submitting}
          onClick={handleSubmit}
          className="mt-5 w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

//  Shared UI atoms 

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      {score}/10
    </span>
  );
}
