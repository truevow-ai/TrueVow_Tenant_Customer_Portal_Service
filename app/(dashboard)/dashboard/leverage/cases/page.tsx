'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus, Filter, ChevronRight, Search, UserPlus, X, ArrowRight, Phone, Mail, Scale, AlertCircle } from 'lucide-react';
import { leverageClient, CaseListItem } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';

interface IntakeLead {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  status: string;
  practice_area_code: string | null;
  created_at: string;
}

export default function CasesPage() {
  const router = useRouter();
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const toast = useCompanyToast();

  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [leads, setLeads] = useState<IntakeLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await leverageClient.listCases(tenantId, {
          status: statusFilter || undefined,
          limit,
          offset,
        });
        setCases(res.cases);
        setTotal(res.total);
      } catch {
        setCases([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tenantLoading, statusFilter, offset]);

  const fetchLeads = async () => {
    if (!tenantId) return;
    setLeadsLoading(true);
    try {
      const res = await fetch(`/api/intake/leads?tenant_id=${tenantId}&status=qualified&limit=100`);
      const data = await res.json();
      const allLeads: IntakeLead[] = (data.leads || []).map((l: any) => ({
        lead_id: l.lead_id || l.session_id,
        first_name: l.first_name || '',
        last_name: l.last_name,
        email: l.email,
        phone: l.phone || '',
        status: l.status,
        practice_area_code: l.practice_area_code,
        created_at: l.created_at,
      }));
      // Also include retained leads
      const res2 = await fetch(`/api/intake/leads?tenant_id=${tenantId}&status=retained&limit=100`);
      const data2 = await res2.json();
      const retainedLeads: IntakeLead[] = (data2.leads || []).map((l: any) => ({
        lead_id: l.lead_id || l.session_id,
        first_name: l.first_name || '',
        last_name: l.last_name,
        email: l.email,
        phone: l.phone || '',
        status: l.status,
        practice_area_code: l.practice_area_code,
        created_at: l.created_at,
      }));
      setLeads([...allLeads, ...retainedLeads]);
    } catch {
      toast.error('Failed', 'Unable to load leads.');
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  };

  const openConvertModal = () => {
    setShowConvertModal(true);
    fetchLeads();
  };

  const convertLead = (leadId: string) => {
    setShowConvertModal(false);
    router.push(`/dashboard/leverage/cases/new?leadId=${leadId}`);
  };

  const statusOptions = ['', 'lead', 'consult_scheduled', 'retained', 'active', 'negotiation', 'settled', 'closed'];

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(q) ||
      (c.incident_type ?? '').toLowerCase().includes(q) ||
      (c.state ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
            <span className="mx-1.5">›</span>
            <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
            <span className="mx-1.5">›</span>
            <span>My Cases</span>
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Cases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total cases</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openConvertModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Convert from Lead
          </button>
          <Link
            href="/dashboard/leverage/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Open New Case
          </Link>
        </div>
      </div>

      {/* Settled Cases Contribution Reminder */}
      {filteredCases.some((c) => (c.litigation_stage === 'settled' || c.litigation_stage === 'closed')) && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3 flex items-start gap-3">
          <Scale className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
              Help the plaintiff attorney community
            </p>
            <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
              You have {filteredCases.filter((c) => (c.litigation_stage === 'settled' || c.litigation_stage === 'closed')).length} settled case(s). Contribute anonymized settlement data to SETTLE and help attorneys nationwide negotiate better outcomes.
            </p>
          </div>
          <Link
            href="/dashboard/settle/contribute"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0"
          >
            <Scale className="h-3 w-3" /> Contribute Data
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            {statusOptions.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {filteredCases.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            No cases found. <Link href="/dashboard/leverage/cases/new" className="text-blue-600 underline">Open your first case</Link> or <button onClick={openConvertModal} className="text-blue-600 underline">convert a lead</button>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Case ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Incident</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">State</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Compliance</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">{c.case_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{c.incident_type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.state ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.litigation_stage ?? 'lead'} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.latest_compliance_status === 'pass' ? 'text-green-600' : c.latest_compliance_status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                        {c.latest_compliance_status ?? 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/settle/analysis?source=leverage_case&case_id=${c.case_id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                          title="Run SETTLE settlement intelligence analysis"
                        >
                          <Scale className="h-3 w-3" /> SETTLE
                        </Link>
                        {(c.litigation_stage === 'settled' || c.litigation_stage === 'closed') && (
                          <Link
                            href={`/dashboard/settle/contribute?case_id=${c.case_id}&county=${encodeURIComponent(c.state ? c.state + ' County, ' + c.state : '')}&incident_type=${encodeURIComponent(c.incident_type || '')}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium rounded border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                            title="Contribute anonymized settlement data to SETTLE"
                          >
                            <Scale className="h-3 w-3" /> Contribute
                          </Link>
                        )}
                        <Link href={`/dashboard/leverage/cases/${c.case_id}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            disabled={offset === 0}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset((o) => o + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Convert Lead Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Convert Lead to Case</h2>
              <button onClick={() => setShowConvertModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select a qualified or retained INTAKE lead to convert into a LEVERAGE case. The intake information will pre-fill the case form.
              </p>
              {leadsLoading ? (
                <div className="text-center py-8 text-gray-400">Loading leads...</div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No qualified or retained leads found.
                  <br />
                  <Link href="/dashboard/intake" className="text-blue-600 underline text-sm">Go to Intake & Leads</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <button
                      key={lead.lead_id}
                      onClick={() => convertLead(lead.lead_id)}
                      className="w-full text-left flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lead.first_name} {lead.last_name ?? ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          {lead.practice_area_code?.replace(/_/g, ' ') ?? 'Unknown practice area'} — {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
                          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
