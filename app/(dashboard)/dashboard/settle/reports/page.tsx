'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Download, ChevronRight, Info, AlertCircle } from 'lucide-react';

interface SettlementReport {
  id: string; case_id: string; case_name: string; county: string; incident: string;
  generated: string; confidence_score: number; confidence_label: string;
  confidence_reason: string; sample_size: number;
  low: number; typical_low: number; typical_high: number; upper: number;
  factors: { text: string; positive: boolean }[];
  risk_adjustments: { condition: string; impact: string }[];
  insurer_behavior: { insurer: string; typical_offer_pct: string; avg_rounds: number; final_pct: string } | null;
}

const MOCK_REPORTS: SettlementReport[] = [
  {
    id: 'rpt-001', case_id: 'case-001', case_name: 'Zoey Baker',
    county: 'Duval County, FL', incident: 'Slip and Fall', generated: '2026-03-04',
    confidence_score: 7, confidence_label: 'Moderate',
    confidence_reason: 'Limited policy limit data reduces precision',
    sample_size: 146, low: 8500, typical_low: 12000, typical_high: 18000, upper: 22000,
    factors: [
      { text: 'Property owner awareness established', positive: true },
      { text: 'Incident occurred within past week', positive: true },
      { text: 'Medical treatment not yet extensive', positive: false },
    ],
    risk_adjustments: [
      { condition: 'If surgery occurs', impact: 'Typical range increases to $35k+' },
      { condition: 'If liability contested', impact: 'Median range drops to $9k-$12k' },
    ],
    insurer_behavior: null,
  },
  {
    id: 'rpt-002', case_id: 'case-002', case_name: 'Marcus Webb',
    county: 'Hillsborough County, FL', incident: 'Auto Accident', generated: '2026-02-28',
    confidence_score: 8, confidence_label: 'High',
    confidence_reason: 'Strong sample size and clear liability',
    sample_size: 312, low: 38000, typical_low: 52000, typical_high: 78000, upper: 95000,
    factors: [
      { text: 'Clear rear-end liability', positive: true },
      { text: 'Policy limits known ($100k)', positive: true },
      { text: 'Soft tissue + fracture - moderate severity', positive: false },
    ],
    risk_adjustments: [
      { condition: 'If MRI shows disc herniation', impact: 'Median increases to $85k-$110k' },
      { condition: 'If surgery required', impact: 'Upper range extends to $150k+' },
    ],
    insurer_behavior: { insurer: 'State Farm', typical_offer_pct: '30-50%', avg_rounds: 3, final_pct: '88-95%' },
  },
  {
    id: 'rpt-003', case_id: 'case-003', case_name: 'Diana Reyes',
    county: 'Miami-Dade County, FL', incident: 'Dog Bite', generated: '2026-02-20',
    confidence_score: 4, confidence_label: 'Low',
    confidence_reason: 'Sample size below county threshold - analysis expanded to state level',
    sample_size: 18, low: 5000, typical_low: 8000, typical_high: 13000, upper: 18000,
    factors: [
      { text: 'Florida strict liability jurisdiction', positive: true },
      { text: 'Minor injury reduces upside', positive: false },
    ],
    risk_adjustments: [
      { condition: 'If disfigurement documented', impact: 'Typical range increases to $15k-$25k' },
    ],
    insurer_behavior: null,
  },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function handleDownload(report: SettlementReport) {
  alert('PDF download for ' + report.case_name + ' will be available once the SETTLE service is connected.');
}

function ConfidenceBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={'text-xs font-semibold px-2.5 py-1 rounded-full ' + color}>
      {score}/10 {label}
    </span>
  );
}
function ReportCard({ report }: { report: SettlementReport }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-4">
          <FileText size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{report.case_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{report.incident} &middot; {report.county} &middot; Generated {report.generated}</p>
            <p className="text-xs text-gray-500 mt-1">Typical: {fmt(report.typical_low)} &ndash; {fmt(report.typical_high)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <ConfidenceBadge score={report.confidence_score} label={report.confidence_label} />
          <button onClick={e => { e.stopPropagation(); handleDownload(report); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors"><Download size={12} />PDF</button>
          <ChevronRight size={15} className={'text-gray-300 transition-transform ' + (expanded ? 'rotate-90' : '')} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5 space-y-5">
          <div className={'flex items-start gap-2 rounded-lg px-4 py-3 ' + (report.confidence_score >= 7 ? 'bg-gray-50 dark:bg-gray-700' : report.confidence_score >= 5 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100' : 'bg-red-50 dark:bg-red-900/20 border border-red-100')}>
            {report.confidence_score < 6 ? <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" /> : <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
            <p className="text-xs text-gray-600 dark:text-gray-300"><span className="font-semibold">Confidence {report.confidence_score}/10 &mdash; {report.confidence_label}.</span> {report.confidence_reason}.</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Estimated Settlement Distribution</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center border border-gray-100 dark:border-gray-700 rounded-lg py-3"><p className="text-xs text-gray-400 mb-1">Low range</p><p className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(report.low)}</p></div>
              <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg py-3"><p className="text-xs text-gray-400 mb-1">Typical range</p><p className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(report.typical_low)} &ndash; {fmt(report.typical_high)}</p></div>
              <div className="text-center border border-gray-100 dark:border-gray-700 rounded-lg py-3"><p className="text-xs text-gray-400 mb-1">Upper range</p><p className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(report.upper)}</p></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Based on {report.sample_size} comparable settlements &mdash; no recommended number is shown</p>
          </div>
          {report.factors.length > 0 && (<div><p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Key Factors</p><div className="space-y-1.5">{report.factors.map((f, i) => (<div key={i} className="flex items-start gap-2 text-sm"><span className={f.positive ? 'text-green-500 font-bold' : 'text-gray-300'}>{f.positive ? '+' : '-'}</span><span className="text-gray-700 dark:text-gray-300">{f.text}</span></div>))}</div></div>)}
          {report.risk_adjustments.length > 0 && (<div><p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Risk Adjustments</p><div className="space-y-2">{report.risk_adjustments.map((r, i) => (<div key={i} className="grid grid-cols-2 gap-2 text-xs"><span className="text-gray-500">{r.condition}</span><span className="text-gray-700 dark:text-gray-300 font-medium">&rarr; {r.impact}</span></div>))}</div></div>)}
          {report.insurer_behavior && (<div className="border-t border-gray-100 dark:border-gray-700 pt-4"><p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Insurer Negotiation Pattern &mdash; {report.insurer_behavior.insurer}</p><div className="grid grid-cols-3 gap-3 text-center"><div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-3 px-2"><p className="text-xs text-gray-400 mb-1">Typical first offer</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{report.insurer_behavior.typical_offer_pct} of median</p></div><div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-3 px-2"><p className="text-xs text-gray-400 mb-1">Avg rounds</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{report.insurer_behavior.avg_rounds}</p></div><div className="bg-gray-50 dark:bg-gray-700 rounded-lg py-3 px-2"><p className="text-xs text-gray-400 mb-1">Typical final</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{report.insurer_behavior.final_pct} of median</p></div></div></div>)}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700"><Link href={'/dashboard/settle/analysis?case_id=' + report.case_id} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1">Open case analysis<ChevronRight size={12} /></Link><button onClick={() => handleDownload(report)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"><Download size={13} />Download PDF</button></div>
        </div>
      )}
    </div>
  );
}

export default function SettlementReportsPage() {
  const reports = MOCK_REPORTS;
  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-xs text-gray-400"><Link href="/dashboard/settle" className="hover:text-gray-600 dark:hover:text-gray-300">Settlement Intelligence</Link><span className="mx-1.5">&rsaquo;</span><span>Settlement Reports</span></p>
      <div><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settlement Reports</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Per-case intelligence reports. Click any report to expand the full analysis.</p></div>
      {reports.length === 0 ? (<div className="text-center py-20 text-gray-400"><FileText size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No reports yet.</p><Link href="/dashboard/settle" className="inline-flex items-center gap-1.5 mt-4 text-sm border border-gray-200 rounded-lg px-4 py-2">Select a case<ChevronRight size={14} /></Link></div>) : (<div className="space-y-3">{reports.map(r => (<ReportCard key={r.id} report={r} />))}</div>)}
      <p className="text-xs text-gray-400 pt-2">Reports are generated per case. Confidence score is always shown. No recommended settlement number is ever displayed.</p>
    </div>
  );
}
