'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
import { traceClient, TraceChronology, ChronologyEntry } from '@/lib/api/trace-client';

export default function ChronologyPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [chronology, setChronology] = useState<TraceChronology | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await traceClient.getChronology(caseId as string);
        setChronology(data);
      } catch { }
      finally { setLoading(false); }
    }
    load();
  }, [caseId]);

  async function handleExport(format: 'json' | 'pdf') {
    try {
      const data = await traceClient.exportCase(caseId as string, format);
      if (format === 'pdf') {
        const url = URL.createObjectURL(data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-${caseId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-${caseId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { alert('Export not available. Case must be demand-ready.'); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/trace/cases/${caseId}`} className="text-sm text-gray-500 hover:text-[#0A2463] flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Case
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Medical Chronology</h1>
          <p className="text-sm text-gray-500">{chronology?.total_entries || 0} entries &middot; {chronology?.total_flags || 0} flags</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('json')} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#0A2463]">
            <Download size={16} /> JSON
          </button>
          <button onClick={() => handleExport('pdf')} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-semibold hover:bg-[#0E3178]">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {chronology && (
        <div className="grid grid-cols-4 gap-3">
          <StatItem label="Entries" value={chronology.total_entries} icon={<FileText size={16} />} />
          <StatItem label="Flags" value={chronology.total_flags} icon={<AlertTriangle size={16} />} color={chronology.unannotated_priority_flags > 0 ? 'red' : ''} />
          <StatItem label="Annotated" value={chronology.annotated_flags} icon={<CheckCircle size={16} />} />
          <StatItem label="Blocked?" value={chronology.demand_ready_blocked ? 'Yes' : 'No'} icon={<AlertTriangle size={16} />} color={chronology.demand_ready_blocked ? 'red' : 'green'} />
        </div>
      )}

      {/* Timeline */}
      {(!chronology || chronology.entries.length === 0) ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Clock size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No chronology entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload medical records to generate the timeline</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm font-semibold text-gray-600">Case: {chronology.case_id.slice(0, 8)}... &middot; SOL: {chronology.sol_deadline} &middot; {chronology.sol_urgency} urgency</p>
          </div>
          <div className="divide-y divide-gray-100">
            {chronology.entries.map((entry, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className="text-xs font-bold text-[#0A2463]">
                      {new Date(entry.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(entry.event_date).getFullYear()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {entry.event_type}
                      </span>
                      {entry.facility_name && (
                        <span className="text-xs text-gray-500">{entry.facility_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{entry.clinical_description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  const textColor = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className={`text-lg font-bold ${textColor}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
