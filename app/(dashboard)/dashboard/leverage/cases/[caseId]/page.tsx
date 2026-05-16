'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Briefcase, Calendar, CheckCircle, AlertCircle, Clock, DollarSign, Activity } from 'lucide-react';
import { leverageClient, CaseDetail, CaseEvent, SavedWorksheet } from '@/lib/api/leverage-client';
import { useCompanyToast } from '@/hooks/useCompanyToast';

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const toast = useCompanyToast();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    (async () => {
      setLoading(true);
      try {
        const [d, e] = await Promise.all([
          leverageClient.getCaseDetail(caseId).catch(() => null),
          leverageClient.getCaseEvents(caseId).catch(() => []),
        ]);
        setDetail(d);
        setEvents(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading case details...</div>;
  }

  if (!detail) {
    return <div className="p-8 text-center text-gray-500">Case not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage/cases" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">My Cases</Link>
          <span className="mx-1.5">›</span>
          <span className="font-mono text-xs">{caseId.slice(0, 12)}...</span>
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Case Detail</h1>
          <StatusBadge status={detail.status} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{detail.incident_type ?? 'Unknown incident'} • {detail.state ?? 'Unknown state'}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Activity className="h-5 w-5 text-blue-500" />} label="Status" value={detail.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} />
        <SummaryCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Leverage Unlocked" value={detail.leverage_unlocked ? 'Yes' : 'No'} />
        <SummaryCard icon={<AlertCircle className="h-5 w-5 text-amber-500" />} label="Compliance" value={detail.latest_compliance?.status ?? 'Pending'} />
        <SummaryCard icon={<Calendar className="h-5 w-5 text-gray-500" />} label="Events" value={String(detail.event_count)} />
      </div>

      {/* Saved Economics */}
      {(detail.saved_damages || detail.saved_disbursement) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Saved Economics</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {detail.saved_damages && (
              <WorksheetCard title="Damages Worksheet" worksheet={detail.saved_damages} />
            )}
            {detail.saved_disbursement && (
              <WorksheetCard title="Disbursement Worksheet" worksheet={detail.saved_disbursement} />
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Activity Timeline</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(event.created_at).toLocaleString()}</p>
                  {Object.keys(event.event_data).length > 0 && (
                    <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-2 overflow-auto">{JSON.stringify(event.event_data, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    lead: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    consult_scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    retained: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    negotiation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    settled: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? colors.lead}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
    </div>
  );
}

function WorksheetCard({ title, worksheet }: { title: string; worksheet: SavedWorksheet }) {
  const result = worksheet.result_json;
  return (
    <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Version {worksheet.version} • {new Date(worksheet.created_at).toLocaleDateString()}</p>
      {result?.gross_damages !== undefined && (
        <p className="text-sm text-gray-900 dark:text-gray-100">Gross Damages: <span className="font-bold">${result.gross_damages.toLocaleString()}</span></p>
      )}
      {result?.net_to_client !== undefined && (
        <p className="text-sm text-gray-900 dark:text-gray-100">Net to Client: <span className="font-bold">${result.net_to_client.toLocaleString()}</span></p>
      )}
      {result?.total_disbursement !== undefined && (
        <p className="text-sm text-gray-900 dark:text-gray-100">Total Costs: <span className="font-bold">${result.total_disbursement.toLocaleString()}</span></p>
      )}
    </div>
  );
}
