'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, Award, Loader2 } from 'lucide-react';

interface CoverageGap {
  jurisdiction: string;
  case_type: string;
  injury_category: string;
  current_n: number;
  target_n: number;
  gap: number;
}

interface FoundingMemberHighlight {
  member_id: string;
  contributions_count: number;
  jurisdictions_covered: number;
  most_recent_contribution: string;
}

export default function TrendsPage() {
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);
  const [highlights, setHighlights] = useState<FoundingMemberHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [gapsRes, highlightsRes] = await Promise.all([
          fetch('/api/settle/trends?endpoint=coverage-gaps'),
          fetch('/api/settle/trends?endpoint=founding-member-highlights'),
        ]);
        const gapsData = await gapsRes.json().catch(() => ({}));
        const highlightsData = await highlightsRes.json().catch(() => ({}));
        setCoverageGaps(gapsData.coverage_gaps || gapsData.gaps || []);
        setHighlights(highlightsData.highlights || highlightsData.members || []);
      } catch {
        setError('Failed to load trend data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/dashboard/settle" className="hover:text-gray-600 dark:hover:text-gray-300">Settlement Intelligence</Link>
          <span className="mx-1.5">/</span>
          <span>Trends & Coverage</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">Market Trends & Coverage Gaps</h1>
        <p className="text-sm text-gray-500 mt-0.5">Descriptive statistics from anonymized settlement contributions.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trend data...
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Coverage Gaps</span>
              <span className="text-xs text-gray-400 ml-auto">{coverageGaps.length} gaps identified</span>
            </div>
            <div className="px-5 py-4">
              {coverageGaps.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No coverage gaps found. Contribute settlement data to improve coverage.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-2">Jurisdiction</th>
                      <th className="pb-2">Case Type</th>
                      <th className="pb-2">Injury</th>
                      <th className="pb-2 text-right">Current</th>
                      <th className="pb-2 text-right">Target</th>
                      <th className="pb-2 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {coverageGaps.slice(0, 20).map((gap, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-900 dark:text-gray-100">{gap.jurisdiction}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{gap.case_type}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{gap.injury_category}</td>
                        <td className="py-2 text-right font-mono text-gray-900 dark:text-gray-100">{gap.current_n}</td>
                        <td className="py-2 text-right font-mono text-gray-400">{gap.target_n}</td>
                        <td className="py-2 text-right font-mono text-amber-600">{gap.gap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Founding Member Highlights</span>
            </div>
            <div className="px-5 py-4">
              {highlights.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No founding member data available yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highlights.map((member, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                      <p className="text-xs text-gray-400 font-mono">{member.member_id?.slice(0, 8)}...</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Contributions</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{member.contributions_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Jurisdictions</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{member.jurisdictions_covered}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Historical trend data from anonymized settlement contributions. Descriptive statistics only, not predictive.
          </p>
        </>
      )}
    </div>
  );
}
