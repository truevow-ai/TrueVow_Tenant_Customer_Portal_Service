'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Download, ChevronRight, Info, AlertCircle, Loader2 } from 'lucide-react';
import { settleClient, type Report } from '@/lib/api/settle-client';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function ReportCard({ report }: { report: Report }) {
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
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{report.title || report.report_id}</p>
            <p className="text-xs text-gray-400 mt-0.5">Case {report.case_id} · {report.report_type} · Generated {new Date(report.generated_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {report.file_url && (
            <a
              href={report.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 hover:border-gray-400 transition-colors"
            >
              <Download size={12} />PDF
            </a>
          )}
          <ChevronRight size={15} className={'text-gray-300 transition-transform ' + (expanded ? 'rotate-90' : '')} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5 space-y-5">
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3">
            <Info size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 dark:text-gray-300">
              <span className="font-semibold">Report ID:</span> {report.report_id}
              {report.confidence_score !== undefined && (
                <span className="ml-2"><span className="font-semibold">Confidence:</span> {report.confidence_score}/10</span>
              )}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href={'/dashboard/settle/analysis?case_id=' + report.case_id} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1">
              Open case analysis <ChevronRight size={12} />
            </Link>
            {report.file_url ? (
              <a
                href={report.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download size={13} />Download PDF
              </a>
            ) : (
              <span className="text-xs text-gray-400">PDF not yet available</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettlementReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settleClient.getReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-xs text-gray-400">
        <Link href="/dashboard/settle" className="hover:text-gray-600 dark:hover:text-gray-300">Settlement Intelligence</Link>
        <span className="mx-1.5">&rsaquo;</span>
        <span>Settlement Reports</span>
      </p>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settlement Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Per-case intelligence reports. Click any report to expand.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-16 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports yet.</p>
          <Link href="/dashboard/settle" className="inline-flex items-center gap-1.5 mt-4 text-sm border border-gray-200 rounded-lg px-4 py-2">
            Select a case <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <ReportCard key={r.report_id} report={r} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 pt-2">Reports are generated per case. Confidence score is always shown. No recommended settlement number is ever displayed.</p>
    </div>
  );
}
