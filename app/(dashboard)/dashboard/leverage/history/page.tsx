'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, History, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { draftClient, ValidationHistoryItem } from '@/lib/api/draft-client';
import { useTenant } from '@/hooks/useTenant';

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return dateStr; }
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function LeverageHistoryPage() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [items, setItems] = useState<ValidationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    (async () => {
      try {
        const res = await draftClient.getHistory(tenantId, { limit: 50 });
        setItems(res.items);
      } catch {
        setError('Could not load validation history. Please verify the LEVERAGE service is running.');
      } finally { setLoading(false); }
    })();
  }, [tenantId, tenantLoading]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE Service</Link>
          <span className="mx-1.5">›</span>
          <span>Validation History</span>
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Validation History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Past document validation results</p>
          </div>
          <Link href="/dashboard/leverage/validate" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">
            New Validation
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 flex items-center justify-center">
          <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 dark:border-gray-400" />
        </div>
      ) : items.length === 0 && !error ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <History className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No validations yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Validate a document to see results here.</p>
          <Link href="/dashboard/leverage/validate" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline underline-offset-2">
            Validate a Document
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Document Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">State</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Practice Area</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Result</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Errors</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map(item => (
                <tr key={item.validation_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(item.created_at)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatLabel(item.document_type)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{item.jurisdiction}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatLabel(item.practice_area)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_valid ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {item.is_valid ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">{item.error_count}</td>
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/leverage/history/${item.validation_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      View<ExternalLink className="h-3 w-3" />
                    </Link>
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
