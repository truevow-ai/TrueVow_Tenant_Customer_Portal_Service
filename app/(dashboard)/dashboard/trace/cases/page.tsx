'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Stethoscope } from 'lucide-react';
import { traceClient, TraceCase } from '@/lib/api/trace-client';

const STAGE_LABELS: Record<string, string> = {
  PENDING_SIGNATURE: 'Awaiting Signature',
  INITIALIZATION: 'Providers',
  RETRIEVAL: 'Records Requested',
  PROCESSING: 'Processing Records',
  CHRONOLOGY_READY: 'Chronology Ready',
  ATTORNEY_REVIEW: 'Attorney Review',
  DEMAND_READY: 'Demand Ready',
};

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
    INITIALIZATION: 'bg-blue-100 text-blue-800',
    RETRIEVAL: 'bg-purple-100 text-purple-800',
    PROCESSING: 'bg-indigo-100 text-indigo-800',
    CHRONOLOGY_READY: 'bg-teal-100 text-teal-800',
    ATTORNEY_REVIEW: 'bg-orange-100 text-orange-800',
    DEMAND_READY: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[stage] || 'bg-gray-100 text-gray-800'}`}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<TraceCase[]>([]);
  const [filtered, setFiltered] = useState<TraceCase[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await traceClient.listCases();
        const list = res.cases || [];
        setCases(list);
        setFiltered(list);
      } catch { setCases([]); setFiltered([]); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    let result = cases;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.case_id.toLowerCase().includes(q) || c.jurisdiction_state.toLowerCase().includes(q));
    }
    if (stageFilter) {
      result = result.filter(c => c.case_stage === stageFilter);
    }
    setFiltered(result);
  }, [search, stageFilter, cases]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TRACE Cases</h1>
          <p className="text-sm text-gray-500 mt-1">Medical records chronology pipeline</p>
        </div>
        <Link
          href="/dashboard/trace/cases/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-semibold hover:bg-[#0E3178] transition-colors"
        >
          <Stethoscope size={16} /> New Case
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by case ID or state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20"
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20"
        >
          <option value="">All Stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Stethoscope size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No cases yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first TRACE case to begin building chronologies</p>
          <Link href="/dashboard/trace/cases/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-semibold hover:bg-[#0E3178]">
            Create First Case
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Case ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">State</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Incident</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">SOL Deadline</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Urgency</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">HIPAA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.case_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/trace/cases/${c.case_id}`}>
                  <td className="px-4 py-3 font-mono text-xs text-[#0A2463]">{c.case_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-medium">{c.jurisdiction_state}</td>
                  <td className="px-4 py-3">{c.incident_date}</td>
                  <td className="px-4 py-3">{c.sol_deadline}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${c.sol_urgency === 'Critical' ? 'text-red-600' : c.sol_urgency === 'Urgent' ? 'text-orange-600' : c.sol_urgency === 'Monitor' ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {c.sol_urgency}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StageBadge stage={c.case_stage} /></td>
                  <td className="px-4 py-3">
                    {c.hipaa_auth_status === 'SIGNED' ? (
                      <span className="text-green-600 text-xs font-semibold">&check;</span>
                    ) : <span className="text-gray-400 text-xs">{c.hipaa_auth_status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
