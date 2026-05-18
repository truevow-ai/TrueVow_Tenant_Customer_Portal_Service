'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, Scale, Filter } from 'lucide-react';
import { settleClient, type CarrierPattern } from '@/lib/api/settle-client';

const JURISDICTIONS = [
  '', 'California', 'New York', 'Texas', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan'
];

const CASE_TYPES = [
  '', 'Personal Injury', 'Medical Malpractice', 'Product Liability',
  'Employment', 'Workers Compensation', 'Wrongful Death', 'Insurance Claim'
];

const INJURY_CATEGORIES = [
  '', 'Brain Injury', 'Spinal Cord Injury', 'Broken Bones', 'Burns',
  'Soft Tissue', 'Amputation', 'Scarring', 'Psychological', 'Multiple Injuries'
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export default function CarrierPatternsPage() {
  const [patterns, setPatterns] = useState<CarrierPattern[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [methodology, setMethodology] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  // Filters
  const [jurisdiction, setJurisdiction] = useState('');
  const [caseType, setCaseType] = useState('');
  const [injuryCategory, setInjuryCategory] = useState('');

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (jurisdiction) params.jurisdiction = jurisdiction;
      if (caseType) params.case_type = caseType;
      if (injuryCategory) params.injury_category = [injuryCategory];

      const result = await settleClient.getCarrierPatterns(params);
      setPatterns(result.patterns);
      setTotalCases(result.total_cases);
      setMethodology(result.methodology);
      setFallback(false);
    } catch (err) {
      console.error('Failed to fetch carrier patterns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load carrier patterns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => {
    fetchPatterns();
  };

  const handleClearFilters = () => {
    setJurisdiction('');
    setCaseType('');
    setInjuryCategory('');
    fetchPatterns();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 mb-1">
          <Link href="/dashboard/settle" className="hover:text-gray-600 dark:hover:text-gray-300">Settlement Intelligence</Link>
          <span className="mx-1.5">/</span>
          <span>Carrier Patterns</span>
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Defendant Category Settlement Patterns</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Historical data from anonymized settlement contributions. Not predictive.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Jurisdiction</label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {JURISDICTIONS.map(j => (
                <option key={j} value={j}>{j || 'All'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Case Type</label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {CASE_TYPES.map(c => (
                <option key={c} value={c}>{c || 'All'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Injury Category</label>
            <select
              value={injuryCategory}
              onChange={(e) => setInjuryCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {INJURY_CATEGORIES.map(i => (
                <option key={i} value={i}>{i || 'All'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">Loading settlement patterns...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load data</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {patterns.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No settlement patterns found for the selected filters.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or check back later as more data is contributed.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cases</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Median</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settle Rate</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Below Median</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trial Rate</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P25</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P75</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {patterns.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{p.defendant_category}</div>
                          {p.defendant_industry && (
                            <div className="text-xs text-gray-500">({p.defendant_industry})</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">{p.case_count}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                          {p.median_settlement ? fmt(p.median_settlement) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            p.settlement_rate >= 0.8
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : p.settlement_rate >= 0.6
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {pct(p.settlement_rate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium ${
                            p.lowball_indicator >= 0.3
                              ? 'text-red-600'
                              : p.lowball_indicator >= 0.15
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }`}>
                            {pct(p.lowball_indicator)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{pct(p.trial_rate)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {p.p25_settlement ? fmt(p.p25_settlement) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {p.p75_settlement ? fmt(p.p75_settlement) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    <strong>{totalCases.toLocaleString()}</strong> total cases analyzed
                  </p>
                  {methodology && (
                    <p className="text-xs text-gray-400 max-w-md text-right">{methodology}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
