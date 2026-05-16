'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Scale, FileText, Users, ChevronRight, Plus } from 'lucide-react';

//  Mock retained cases (will be replaced by real INTAKE API call) 
const MOCK_RETAINED_CASES = [
  { id: 'case-001', client_name: 'Zoey Baker',     incident: 'Slip and Fall',    county: 'Duval County, FL',      opened: '2026-02-10' },
  { id: 'case-002', client_name: 'Marcus Webb',    incident: 'Auto Accident',    county: 'Hillsborough County, FL', opened: '2026-01-28' },
  { id: 'case-003', client_name: 'Diana Reyes',    incident: 'Dog Bite',         county: 'Miami-Dade County, FL',  opened: '2026-01-15' },
  { id: 'case-004', client_name: 'Ronald Hatch',   incident: 'Premises Liability', county: 'Orange County, FL',   opened: '2026-01-05' },
];

type Tab = 'analysis' | 'reports' | 'council';

export default function SettlementIntelligencePage() {
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  // Council access: in production this comes from tenant feature flags
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
      {activeTab === 'analysis' && <CaseAnalysisTab cases={MOCK_RETAINED_CASES} />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'council' && isCouncilMember && <CouncilTab />}
    </div>
  );
}

//  Case Analysis Tab 

function CaseAnalysisTab({ cases }: { cases: typeof MOCK_RETAINED_CASES }) {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <div className="space-y-4">
      {/* Case picker */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Select a case
        </label>
        <select
          value={selectedCaseId}
          onChange={e => setSelectedCaseId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="">Choose a retained case…</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>
              {c.client_name}  {c.incident} ({c.county})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-2">
          Only retained cases appear here. Open cases are added automatically from Intake.
        </p>
      </div>

      {/* No case selected */}
      {!selectedCase && (
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedCase.client_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedCase.incident}  {selectedCase.county}</p>
              <p className="text-xs text-gray-400 mt-1">Opened {selectedCase.opened}</p>
            </div>
            <Link
              href={`/dashboard/settle/analysis?case_id=${selectedCase.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              Run Settlement Intelligence
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* Recent analyses */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent analyses</h3>
        <div className="space-y-2">
          {cases.slice(0, 3).map(c => (
            <Link
              key={c.id}
              href={`/dashboard/settle/analysis?case_id=${c.id}`}
              className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.client_name}</p>
                <p className="text-xs text-gray-400">{c.incident}  {c.county}</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

//  Settlement Reports Tab 

function ReportsTab() {
  // Mock reports  will be replaced with real API call
  const reports = [
    { id: 'rpt-001', case_name: 'Zoey Baker',   generated: '2026-03-04', confidence: 7, range: '$12,000  $18,000', status: 'ready' },
    { id: 'rpt-002', case_name: 'Marcus Webb',  generated: '2026-02-28', confidence: 8, range: '$45,000  $72,000', status: 'ready' },
    { id: 'rpt-003', case_name: 'Diana Reyes',  generated: '2026-02-20', confidence: 5, range: '$8,000  $14,000',  status: 'ready' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Reports are generated per case. Each report includes settlement distribution, insurer behavior, and risk adjustments.
        </p>
      </div>

      {reports.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports yet. Run settlement intelligence on a case to generate one.</p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.case_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Generated {r.generated}  Typical range {r.range}</p>
            </div>
            <div className="flex items-center gap-4">
              <ConfidenceBadge score={r.confidence} />
              <button className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors">
                Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

//  Council Contributions Tab 

function CouncilTab() {
  const [submitted, setSubmitted] = useState(false);
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
          disabled={!ready}
          onClick={() => setSubmitted(true)}
          className="mt-5 w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          Submit
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
