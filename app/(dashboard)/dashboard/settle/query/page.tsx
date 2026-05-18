'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

      const apiKey = localStorage.getItem('settle_api_key') || process.env.NEXT_PUBLIC_SETTLE_API_KEY || '';
      if (!apiKey) {
        setError('SETTLE API key not found. Please contact support.');
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

            {/* Cohort W — rich filters */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-3">Advanced Filters</p>

              <div className="space-y-4">
                {/* Insurance Carrier filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Carrier (optional)</label>
                  <input
                    type="text"
                    value={insuranceCarrier}
                    onChange={(e) => setInsuranceCarrier(e.target.value)}
                    placeholder="e.g., State Farm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Injury Severity filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Injury Severity (optional)</label>
                  <select
                    value={injurySeverity}
                    onChange={(e) => setInjurySeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any</option>
                    <option value="soft_tissue">Soft Tissue</option>
                    <option value="fracture">Fracture</option>
                    <option value="surgical">Surgical</option>
                    <option value="catastrophic">Catastrophic</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>

                {/* Court Level filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court Level (optional)</label>
                  <input
                    type="text"
                    value={courtLevel}
                    onChange={(e) => setCourtLevel(e.target.value)}
                    placeholder="e.g., circuit, federal_district"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Verdict vs Settlement filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outcome Type (optional)</label>
                  <select
                    value={isVerdict === undefined ? '' : isVerdict ? 'verdict' : 'settlement'}
                    onChange={(e) => setIsVerdict(e.target.value === '' ? undefined : e.target.value === 'verdict')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any</option>
                    <option value="verdict">Verdict Only</option>
                    <option value="settlement">Settlement Only</option>
                  </select>
                </div>
              </div>
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

