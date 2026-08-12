'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Stethoscope, FileText, Clock, CheckCircle, ArrowRight, Upload, Users, FileCheck, AlertCircle } from 'lucide-react';
import { useUser } from '@truevow/auth';
import { traceClient, TraceCase, TraceStats } from '@/lib/api/trace-client';

const STAGE_ORDER = [
  'PENDING_SIGNATURE',
  'INITIALIZATION',
  'RETRIEVAL',
  'PROCESSING',
  'CHRONOLOGY_READY',
  'ATTORNEY_REVIEW',
  'DEMAND_READY',
];

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
    PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    INITIALIZATION: 'bg-blue-100 text-blue-800 border-blue-200',
    RETRIEVAL: 'bg-purple-100 text-purple-800 border-purple-200',
    PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    CHRONOLOGY_READY: 'bg-teal-100 text-teal-800 border-teal-200',
    ATTORNEY_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
    DEMAND_READY: 'bg-green-100 text-green-800 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[stage] || 'bg-gray-100 text-gray-800'}`}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

export default function TracePage() {
  const { user } = useUser();
  const [stats, setStats] = useState<TraceStats>({ total_cases: 0, active_cases: 0, demand_ready: 0, providers_confirmed: 0 });
  const [cases, setCases] = useState<TraceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await traceClient.listCases();
        const list = (res as any)?.cases || [];
        setCases(list.slice(0, 5));
        setStats({
          total_cases: list.length,
          active_cases: list.filter((c: TraceCase) => !['DEMAND_READY'].includes(c.case_stage)).length,
          demand_ready: list.filter((c: TraceCase) => c.case_stage === 'DEMAND_READY').length,
          providers_confirmed: list.filter((c: TraceCase) => c.provider_list_status === 'CONFIRMED').length,
        });
      } catch (err: any) {
        console.error('TRACE landing load error:', err);
        setError(err?.message || 'Failed to load cases');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-red-700 font-semibold mb-2">Unable to load cases</p>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-3">Check that the TRACE backend is running on port 3036</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TRACE</h1>
        <p className="mt-1 text-sm text-gray-500">Client Engagement and Case Readiness</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FileText size={20} />} value={stats.total_cases} label="Total Cases" color="navy" />
        <StatCard icon={<Clock size={20} />} value={stats.active_cases} label="Active" color="blue" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.demand_ready} label="Demand Ready" color="green" />
        <StatCard icon={<Users size={20} />} value={stats.providers_confirmed} label="Providers Confirmed" color="purple" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/dashboard/trace/cases/new"
            icon={<Upload size={24} />}
            title="New Case from Intake"
            description="Select a prospect from INTAKE, upload a retainer, and create a TRACE case."
            color="navy"
          />
          <ActionCard
            href="/dashboard/trace/cases"
            icon={<FileText size={24} />}
            title="View All Cases"
            description="See your case pipeline with stage indicators and deadlines."
            color="green"
          />
          <ActionCard
            href="/dashboard/trace/cases/new?skipIntake=true"
            icon={<Stethoscope size={24} />}
            title="Start Without Intake"
            description="Create a case manually if the client came from outside INTAKE."
            color="purple"
          />
        </div>
      </div>

      {/* Recent Cases */}
      {cases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Cases</h2>
            <Link href="/dashboard/trace/cases" className="text-sm text-[#0A2463] hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Case ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Incident</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">SOL Deadline</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">HIPAA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/dashboard/trace/cases/${c.case_id}`} className="text-[#0A2463] hover:underline">
                        {c.case_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.jurisdiction_state} &middot; {c.incident_date}</td>
                    <td className="px-4 py-3">
                      <span className={c.sol_urgency === 'Critical' ? 'text-red-600 font-semibold' : ''}>
                        {c.sol_deadline}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StageBadge stage={c.case_stage} /></td>
                    <td className="px-4 py-3">
                      {c.hipaa_auth_status === 'SIGNED' ? (
                        <span className="text-green-600 text-xs font-semibold">&check; Signed</span>
                      ) : (
                        <span className="text-yellow-600 text-xs">{c.hipaa_auth_status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    navy: 'bg-[#0A2463]',
    blue: 'bg-blue-500',
    green: 'bg-[#10B981]',
    purple: 'bg-purple-500',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`${colors[color]} rounded-lg p-2 text-white`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description, color }: { href: string; icon: React.ReactNode; title: string; description: string; color: string }) {
  const borders: Record<string, string> = {
    navy: 'border-l-[#0A2463]',
    green: 'border-l-[#10B981]',
    purple: 'border-l-purple-500',
  };
  return (
    <Link href={href} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borders[color]} p-5 hover:shadow-md transition-shadow group`}>
      <div className="flex items-start gap-3">
        <div className="text-[#0A2463] group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
