'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Briefcase, CheckCircle, AlertTriangle, FileCheck, TrendingUp, Info } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface DraftAnalytics {
  overview: { total_validations: number; success_rate: number };
  by_document_type: Array<{ document_type: string; count: number; errors: number }>;
  by_practice_area: Array<{ practice_area: string; count: number }>;
  timeline: Array<{ date: string; validations: number }>;
  _source?: string;
}

export default function AnalyticsPage() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [analytics, setAnalytics] = useState<DraftAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      try {
        const res = await fetch(`/api/leverage/analytics?tenantId=${tenantId}`);
        const data = await res.json();
        setAnalytics(data);
      } catch {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tenantLoading]);

  const a = analytics;
  const totalValidations = a?.overview?.total_validations ?? 0;
  const successRate = Math.round((a?.overview?.success_rate ?? 0) * 100) / 100;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <span>Analytics</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">LEVERAGE Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Performance insights across validation, cases, and rewards</p>
      </div>

      {/* Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Analytics Status</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">
            Document validation analytics (from DRAFT) are shown below. LEVERAGE-specific case economics and rewards analytics will be available once the backend endpoint is implemented.
          </p>
        </div>
      </div>

      {/* Validation Overview */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Document Validation</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<FileCheck className="h-5 w-5 text-blue-500" />} label="Total Validations" value={loading ? '—' : String(totalValidations)} />
          <MetricCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Success Rate" value={loading ? '—' : `${successRate}%`} />
          <MetricCard icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} label="Document Types" value={loading ? '—' : String(a?.by_document_type?.length ?? 0)} />
          <MetricCard icon={<Briefcase className="h-5 w-5 text-purple-500" />} label="Practice Areas" value={loading ? '—' : String(a?.by_practice_area?.length ?? 0)} />
        </div>
      </div>

      {/* By Document Type */}
      {a && a.by_document_type && a.by_document_type.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Validations by Document Type</h2>
          <div className="space-y-3">
            {a.by_document_type.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{row.document_type ?? 'Unknown'}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{row.count} validations</span>
                  <span className="text-xs text-red-500">{row.errors} errors</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Practice Area */}
      {a && a.by_practice_area && a.by_practice_area.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Validations by Practice Area</h2>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
            {a.by_practice_area.map((row, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">{row.practice_area ?? 'Unknown'}</span>
                <span className="text-xs font-medium text-gray-500">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {a && a.timeline && a.timeline.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Validation Timeline (Last 30 Days)</h2>
          <div className="flex items-end gap-1 h-32">
            {a.timeline.map((row, i) => {
              const maxVal = Math.max(...a.timeline.map((t) => t.validations), 1);
              const height = (row.validations / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%`, minHeight: 4 }}
                    title={`${row.date}: ${row.validations} validations`}
                  />
                  <span className="text-[10px] text-gray-400">{row.date?.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVERAGE Analytics Placeholder */}
      <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">LEVERAGE Case Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Case economics, damages totals, and rewards analytics will appear here once the LEVERAGE backend analytics endpoint is available.
        </p>
        <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4 opacity-50">
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-gray-400" />} label="Total Damages" value="—" />
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-gray-400" />} label="Avg Case Value" value="—" />
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-gray-400" />} label="Active Cases" value="—" />
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-gray-400" />} label="Compliance Score" value="—" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
    </div>
  );
}
