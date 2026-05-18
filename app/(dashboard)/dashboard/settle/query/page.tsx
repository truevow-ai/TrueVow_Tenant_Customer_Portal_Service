'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, BarChart3, AlertTriangle } from 'lucide-react';
import { settleClient, type EstimateRequest, type EstimateResponse } from '@/lib/api/settle-client';

const JURISDICTIONS = [
  'California', 'New York', 'Texas', 'Florida', 'Illinois',
  'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan'
];

const CASE_TYPES = [
  'Personal Injury',
  'Medical Malpractice',
  'Product Liability',
  'Employment',
  'Workers Compensation',
  'Wrongful Death',
  'Insurance Claim',
  'Other'
];

const INJURY_CATEGORIES = [
  'Brain Injury',
  'Spinal Cord Injury',
  'Broken Bones',
  'Burns',
  'Soft Tissue',
  'Amputation',
  'Scarring',
  'Psychological',
  'Multiple Injuries',
  'Other'
];

const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe', 'Catastrophic'];
const LIABILITY_LEVELS = ['Weak', 'Moderate', 'Strong', 'Clear'];
const DEFENDANT_TYPES = ['Individual', 'Small Business', 'Corporation', 'Government', 'Insurance Company'];
const OUTCOME_TYPES = ['Settlement', 'Jury Verdict', 'Arbitration Award', 'Mediation', "Judge's Decision"];
const COURT_LEVELS = ['circuit', 'federal_district', 'municipal', 'appellate', 'supreme'];

export default function SettleQueryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);

  const [jurisdiction, setJurisdiction] = useState('');
  const [caseType, setCaseType] = useState('');
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  const [medicalBills, setMedicalBills] = useState('');
  const [severity, setSeverity] = useState('');
  const [liabilityStrength, setLiabilityStrength] = useState('');
  const [defendantType, setDefendantType] = useState('');
  // Cohort W — new filters
  const [insuranceCarrier, setInsuranceCarrier] = useState('');
  const [injurySeverity, setInjurySeverity] = useState('');
  const [courtLevel, setCourtLevel] = useState('');
  const [isVerdict, setIsVerdict] = useState<boolean | undefined>(undefined);
  // Phase 2.2 — advanced filters
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [outcomeType, setOutcomeType] = useState('');
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');
  const [medicalBillsMin, setMedicalBillsMin] = useState('');
  const [medicalBillsMax, setMedicalBillsMax] = useState('');
  const [excludeOutliers, setExcludeOutliers] = useState(true);
  const [minReputationScore, setMinReputationScore] = useState(0);
  const [comparativeNegligenceMin, setComparativeNegligenceMin] = useState('');
  const [comparativeNegligenceMax, setComparativeNegligenceMax] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      if (!jurisdiction || !caseType || selectedInjuries.length === 0) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const request: EstimateRequest = {
        jurisdiction,
        case_type: caseType,
        injury_category: selectedInjuries,
        medical_bills: Number(medicalBills) || 0,
        ...(severity && { severity }),
        ...(liabilityStrength && { liability_strength: liabilityStrength }),
        ...(defendantType && { defendant_type: defendantType }),
        // Cohort W filters
        ...(insuranceCarrier && { insurance_carrier: insuranceCarrier }),
        ...(injurySeverity && { injury_severity: injurySeverity }),
        ...(courtLevel && { court_level: courtLevel }),
        ...(isVerdict !== undefined && { is_verdict: isVerdict }),
        // Phase 2.2 advanced filters
        ...(outcomeType && { outcome_type: outcomeType }),
        ...(dateRangeFrom && { date_range_from: dateRangeFrom }),
        ...(dateRangeTo && { date_range_to: dateRangeTo }),
        ...(medicalBillsMin && { medical_bills_min: Number(medicalBillsMin) }),
        ...(medicalBillsMax && { medical_bills_max: Number(medicalBillsMax) }),
        ...(excludeOutliers !== undefined && { exclude_outliers: excludeOutliers }),
        ...(minReputationScore > 0 && { min_reputation_score: minReputationScore }),
        ...(comparativeNegligenceMin && { comparative_negligence_min: Number(comparativeNegligenceMin) }),
        ...(comparativeNegligenceMax && { comparative_negligence_max: Number(comparativeNegligenceMax) }),
      };

      const result = await settleClient.getEstimate(request);
      setEstimate(result);
    } catch (err: any) {
      console.error('Query failed:', err);
      setError(err.message || 'Failed to get settlement estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleInjuryToggle = (injury: string) => {
    if (selectedInjuries.includes(injury)) {
      setSelectedInjuries(selectedInjuries.filter(i => i !== injury));
    } else {
      setSelectedInjuries([...selectedInjuries, injury]);
    }
  };

  const clearAdvancedFilters = () => {
    setOutcomeType('');
    setDateRangeFrom('');
    setDateRangeTo('');
    setMedicalBillsMin('');
    setMedicalBillsMax('');
    setExcludeOutliers(true);
    setMinReputationScore(0);
    setComparativeNegligenceMin('');
    setComparativeNegligenceMax('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getConfidenceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Query Settlement Range</h1>
        <p className="mt-2 text-gray-600">
          Get AI-powered settlement estimates based on comparable cases
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdiction <span className="text-red-500">*</span>
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select jurisdiction...</option>
                {JURISDICTIONS.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Type <span className="text-red-500">*</span>
              </label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select case type...</option>
                {CASE_TYPES.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Injury Categories <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INJURY_CATEGORIES.map(injury => (
                  <label key={injury} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedInjuries.includes(injury)}
                      onChange={() => handleInjuryToggle(injury)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{injury}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity (Optional)
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select severity...</option>
                {SEVERITY_LEVELS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liability Strength (Optional)
              </label>
              <select
                value={liabilityStrength}
                onChange={(e) => setLiabilityStrength(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select strength...</option>
                {LIABILITY_LEVELS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Defendant Type (Optional)
              </label>
              <select
                value={defendantType}
                onChange={(e) => setDefendantType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select type...</option>
                {DEFENDANT_TYPES.map(dt => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medical Bills ($) (Optional)
              </label>
              <input
                type="number"
                value={medicalBills}
                onChange={(e) => setMedicalBills(e.target.value)}
                placeholder="e.g., 15000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Phase 2.2 — Advanced Filters (collapsible) */}
            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                className="w-full flex items-center justify-between py-2 text-left"
              >
                <span className="text-xs font-medium text-gray-500">Advanced Filters</span>
                {advancedExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>

              {advancedExpanded && (
                <div className="space-y-4 pb-2">
                  {/* Outcome Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outcome Type</label>
                    <select
                      value={outcomeType}
                      onChange={(e) => setOutcomeType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any</option>
                      {OUTCOME_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                      <input
                        type="date"
                        value={dateRangeFrom}
                        onChange={(e) => setDateRangeFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                      <input
                        type="date"
                        value={dateRangeTo}
                        onChange={(e) => setDateRangeTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Medical Bills Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical Bills Min ($)</label>
                      <input
                        type="number"
                        value={medicalBillsMin}
                        onChange={(e) => setMedicalBillsMin(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical Bills Max ($)</label>
                      <input
                        type="number"
                        value={medicalBillsMax}
                        onChange={(e) => setMedicalBillsMax(e.target.value)}
                        placeholder="100000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Comparative Negligence */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comp. Negligence Min (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={comparativeNegligenceMin}
                        onChange={(e) => setComparativeNegligenceMin(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comp. Negligence Max (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={comparativeNegligenceMax}
                        onChange={(e) => setComparativeNegligenceMax(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Min Reputation Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Reputation Score: {minReputationScore.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={minReputationScore}
                      onChange={(e) => setMinReputationScore(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0.0</span>
                      <span>1.0</span>
                    </div>
                  </div>

                  {/* Exclude Outliers */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="excludeOutliers"
                      checked={excludeOutliers}
                      onChange={(e) => setExcludeOutliers(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="excludeOutliers" className="text-sm text-gray-700">Exclude Outliers</label>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={clearAdvancedFilters}
                      className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Analyzing...' : 'Get Estimate'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Settlement Estimate</h2>
          
          {!estimate && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">🔍</div>
              <p>Fill in the form and click "Get Estimate" to see results</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin text-5xl mb-4">⏳</div>
              <p className="text-gray-600">Analyzing comparable cases...</p>
            </div>
          )}

          {estimate && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimated Range</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">25th pctl</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(estimate.percentile_25)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Median</div>
                    <div className="text-2xl font-bold text-primary-600">
                      {formatCurrency(estimate.median)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">75th pctl</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(estimate.percentile_75)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Confidence Level</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(estimate.confidence)}`}>
                    {estimate.confidence}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Comparable Cases</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {estimate.n_cases} cases
                  </div>
                </div>
              </div>

              {/* Phase 2.1: Confidence Score Display */}
              {estimate.confidence_score && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        Data Confidence: {estimate.confidence_score.overall}/100
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      estimate.confidence_score.overall >= 70
                        ? 'bg-green-100 text-green-800'
                        : estimate.confidence_score.overall >= 40
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {estimate.confidence_score.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {Object.entries(estimate.confidence_score.factors).map(([key, factor]) => {
                      const pct = (factor.score / factor.max) * 100;
                      const barColor = factor.score >= 7 ? 'bg-green-500' : factor.score >= 4 ? 'bg-amber-500' : 'bg-red-500';
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="w-32 flex-shrink-0">
                            <p className="text-xs font-medium text-gray-700">{label}</p>
                            <p className="text-xs text-gray-400">{factor.score}/{factor.max}</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="w-36 flex-shrink-0">
                            <p className="text-xs text-gray-500 truncate">{factor.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {estimate.confidence_score.warnings.length > 0 && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                      {estimate.confidence_score.warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Verdict-derived data disclosure */}
              {estimate.comparable_cases.some(c => c.is_verdict === true) && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Estimate includes verdict-derived data (not all settlements)</span>
                </div>
              )}

              {/* Carrier representation */}
              {estimate.comparable_cases.some(c => c.insurance_carrier) && (
                <div className="text-sm text-gray-500">
                  {new Set(estimate.comparable_cases.map(c => c.insurance_carrier).filter(Boolean)).size} insurance carriers represented
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/dashboard/settle/reports?estimate_id=${estimate.query_id ?? ''}`)}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 font-medium"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => {
                    setEstimate(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
                >
                  New Query
                </button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Estimate ID: {estimate.query_id ?? 'N/A'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

