'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Info, Plus, Lock, Loader2, CreditCard, CheckCircle, BarChart3, AlertTriangle, TrendingUp, Scale, Gavel } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';
import { settleClient, type EstimateResponse } from '@/lib/api/settle-client';
import { leverageClient, type CaseDetail } from '@/lib/api/leverage-client';
import { PilotModeBanner } from '@/components/settle/PilotModeBanner';

//  Mock case data  will come from INTAKE API 
const MOCK_CASES: Record<string, {
  id: string; client_name: string; incident: string; county: string;
  injury_severity: string; medical_specials: number;
  liability_strength: string; policy_limit_band: string;
  insurer: string; litigation_stage: string;
}> = {
  'case-001': { id: 'case-001', client_name: 'Zoey Baker',   incident: 'Slip and Fall',      county: 'Duval County, FL',        injury_severity: 'fracture',    medical_specials: 8200,  liability_strength: 'Property owner awareness established', policy_limit_band: 'Unknown', insurer: 'Unknown',       litigation_stage: 'Pre-suit'  },
  'case-002': { id: 'case-002', client_name: 'Marcus Webb',  incident: 'Motor Vehicle Accident',       county: 'Hillsborough County, FL', injury_severity: 'spinal_injury', medical_specials: 32000, liability_strength: 'Clear liability, rear-end',            policy_limit_band: '$100k',  insurer: 'State Farm',   litigation_stage: 'Pre-suit'  },
  'case-003': { id: 'case-003', client_name: 'Diana Reyes',  incident: 'Motor Vehicle Accident',            county: 'Miami-Dade County, FL',   injury_severity: 'traumatic_brain_injury',    medical_specials: 4100,  liability_strength: 'Strict liability state',               policy_limit_band: '$25k',   insurer: 'Allstate',     litigation_stage: 'Pre-suit'  },
  'case-004': { id: 'case-004', client_name: 'Ronald Hatch', incident: 'Premises Liability',  county: 'Orange County, FL',       injury_severity: 'fracture', medical_specials: 14700, liability_strength: 'Contested — no prior notice documented', policy_limit_band: '$50k',   insurer: 'Progressive',  litigation_stage: 'Suit filed' },
};

// ─── SETTLE Query Button Component ──────────────────────────────────────────

interface SettleQueryButtonProps {
  tenantId: string | null;
  caseId: string;
  settleEnabled: boolean;
  pricingLabel: string;
  queryState: 'idle' | 'loading' | 'payment_required' | 'ready';
  setQueryState: (s: 'idle' | 'loading' | 'payment_required' | 'ready') => void;
  quotePrice: number | null;
  setQuotePrice: (p: number | null) => void;
  reportData: any;
  setReportData: (d: any) => void;
  toast: any;
}

function SettleQueryButton({
  tenantId,
  caseId,
  settleEnabled,
  pricingLabel,
  queryState,
  setQueryState,
  quotePrice,
  setQuotePrice,
  reportData,
  setReportData,
  toast,
}: SettleQueryButtonProps) {
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  async function handleQuote() {
    if (!tenantId) {
      toast.error('Tenant not loaded yet');
      return;
    }
    setQueryState('loading');
    try {
      const res = await fetch(`/api/settle/quote?tenantId=${encodeURIComponent(tenantId)}&caseId=${encodeURIComponent(caseId)}`);
      const data = await res.json();

      if (data._fallback) {
        // Billing service offline — use feature-access pricing
        toast.info('Billing service offline. Using default pricing.');
        setQuotePrice(data.price_cents ?? 2900);
        setQueryState('payment_required');
        return;
      }

      if (data.already_activated) {
        // Already paid for this case — consume directly
        await handleConsume();
        return;
      }

      if (data.source === 'credit') {
        // Credit available — activate then consume
        await handleActivate();
        return;
      }

      // Invoice / pay-per-use — show payment confirmation
      setQuotePrice(data.price_cents ?? 2900);
      setQueryState('payment_required');
    } catch (err) {
      toast.error('Failed to get pricing quote');
      setQueryState('idle');
    }
  }

  async function handleActivate() {
    if (!tenantId) return;
    try {
      const res = await fetch('/api/settle/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, caseId }),
      });
      const data = await res.json();
      if (data.activated || data._fallback) {
        await handleConsume();
      } else {
        toast.error(data.error || 'Activation failed');
        setQueryState('idle');
      }
    } catch {
      toast.error('Activation request failed');
      setQueryState('idle');
    }
  }

  async function handleConsume() {
    if (!tenantId) return;
    try {
      const res = await fetch('/api/settle/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, caseId }),
      });
      const data = await res.json();
      if (data.authorized || data._fallback) {
        setReportData(data);
        setQueryState('ready');
        toast.success('SETTLE report generated!');
      } else {
        toast.error(data.message || 'Report generation failed');
        setQueryState('idle');
      }
    } catch {
      toast.error('Consume request failed');
      setQueryState('idle');
    }
  }

  if (queryState === 'loading') {
    return (
      <div className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing...
      </div>
    );
  }

  if (queryState === 'payment_required' && quotePrice !== null) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <div className="flex items-start gap-3">
            <CreditCard className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Payment Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                This report costs <strong>{fmt(quotePrice)}</strong>. It will be added to your next invoice.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleActivate}
            className="flex-1 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            Confirm & Generate Report
          </button>
          <button
            onClick={() => setQueryState('idle')}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (queryState === 'ready') {
    return (
      <div className="space-y-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 flex items-start gap-3">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Report Generated</p>
            <p className="text-xs text-green-700 dark:text-green-400">
              {reportData?.reportsRemaining !== undefined
                ? `${reportData.reportsRemaining} reports remaining this period`
                : 'Your SETTLE intelligence report is ready.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setQueryState('idle');
            setReportData(null);
          }}
          className="w-full py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Run Another Query
        </button>
      </div>
    );
  }

  // idle
  return (
    <div className="space-y-3">
      <button
        onClick={handleQuote}
        disabled={!settleEnabled}
        className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors ${
          settleEnabled
            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
        }`}
      >
        Run SETTLE Intelligence Query
      </button>
      <p className="text-xs text-gray-400 text-center">
        {pricingLabel}. Each query generates a professional 4-page PDF report with anonymized comparables.
      </p>
    </div>
  );
}

function CaseAnalysisInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get('case_id') || '';
  const source = searchParams.get('source') || '';
  const isLeverageImport = source === 'leverage_damages';
  const isLeverageCase = source === 'leverage_case';
  const { features, hasFeature } = useFeatureAccess();
  const { tenantId } = useTenant();
  const toast = useCompanyToast();

  const settleAccess = features?.features?.settle;
  const settleEnabled = hasFeature('settle');
  const settleSource = settleAccess?.source;
  const perUsePrice = settleAccess?.per_use_price_cents ?? 4900; // default $49
  const monthlyQuota = settleAccess?.monthly_quota ?? 0;

  const pricingLabel = () => {
    if (!settleEnabled) return 'Upgrade required';
    if (settleSource === 'founding_benefit') return 'Free — Founding Member';
    if (settleSource === 'tier' && monthlyQuota > 0) return `Included — ${monthlyQuota} queries/mo`;
    if (settleSource === 'addon') return 'Included via Add-on';
    return `$${(perUsePrice / 100).toFixed(0)} per report`;
  };

  // SETTLE query flow state
  const [queryState, setQueryState] = useState<'idle' | 'loading' | 'payment_required' | 'ready'>('idle');
  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // LEVERAGE case details (fetched when source=leverage_case)
  const [leverageCaseDetail, setLeverageCaseDetail] = useState<CaseDetail | null>(null);
  const [leverageCaseLoading, setLeverageCaseLoading] = useState(isLeverageCase);

  useEffect(() => {
    if (!isLeverageCase || !caseId) return;
    let cancelled = false;
    setLeverageCaseLoading(true);
    leverageClient.getCaseDetail(caseId)
      .then((detail) => { if (!cancelled) setLeverageCaseDetail(detail); })
      .catch(() => { if (!cancelled) setLeverageCaseDetail(null); })
      .finally(() => { if (!cancelled) setLeverageCaseLoading(false); });
    return () => { cancelled = true; };
  }, [isLeverageCase, caseId]);

  // Direct import from LEVERAGE Damages Calculator
  const leverageData = isLeverageImport ? {
    medical_bills: Number(searchParams.get('medical_bills') || 0),
    lost_wages: Number(searchParams.get('lost_wages') || 0),
    property_damage: Number(searchParams.get('property_damage') || 0),
    pain_suffering: Number(searchParams.get('pain_suffering') || 0),
    gross_damages: Number(searchParams.get('gross_damages') || 0),
    liability_pct: Number(searchParams.get('liability_pct') || 100),
  } : null;

  const caseData = (!isLeverageImport && !isLeverageCase) ? (MOCK_CASES[caseId] || null) : null;

  // Live settlement intelligence from backend (fetched after billing flow succeeds)
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // When the billing consume flow succeeds, fetch the real estimate from backend
  useEffect(() => {
    if (queryState !== 'ready') return;
    if (estimate) return; // already fetched
    let cancelled = false;

    async function fetchEstimate() {
      setEstimateLoading(true);
      setEstimateError(null);
      try {
        // Build request from available case data
        const request = caseData
          ? {
              jurisdiction: caseData.county,
              case_type: caseData.incident,
              injury_category: [caseData.injury_severity],
              medical_bills: caseData.medical_specials,
              severity: caseData.injury_severity,
              liability_strength: caseData.liability_strength,
            }
          : leverageCaseDetail
          ? {
              jurisdiction: leverageCaseDetail.state || '',
              case_type: leverageCaseDetail.incident_type || 'Personal Injury',
              injury_category: ['General'],
              medical_bills: 0,
              ...(leverageCaseDetail.litigation_stage && { liability_strength: leverageCaseDetail.litigation_stage }),
              ...(leverageCaseDetail.saved_damages && {
                additional_factors: {
                  gross_damages: leverageCaseDetail.saved_damages.result_json?.gross_damages || 0,
                  liability_pct: 100,
                },
              }),
            }
          : leverageData
          ? {
              jurisdiction: searchParams.get('jurisdiction') || '',
              case_type: searchParams.get('case_type') || 'Personal Injury',
              injury_category: [searchParams.get('injury_category') || 'General'],
              medical_bills: leverageData.medical_bills,
              additional_factors: {
                lost_wages: leverageData.lost_wages,
                gross_damages: leverageData.gross_damages,
                liability_pct: leverageData.liability_pct,
              },
            }
          : null;

        if (!request) {
          setEstimateError('Missing case data for analysis');
          return;
        }

        const result = await settleClient.getEstimate(request);
        if (!cancelled) {
          setEstimate(result);
        }
      } catch (err) {
        if (!cancelled) {
          setEstimateError(err instanceof Error ? err.message : 'Failed to fetch estimate');
        }
      } finally {
        if (!cancelled) setEstimateLoading(false);
      }
    }

    fetchEstimate();
    return () => { cancelled = true; };
  }, [queryState]); // eslint-disable-line react-hooks/exhaustive-deps

  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [offers, setOffers] = useState<{ label: string; amount: string }[]>([
    { label: 'Initial demand', amount: '' },
    { label: 'Insurance offer', amount: '' },
  ]);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (leverageCaseLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading case from LEVERAGE…
      </div>
    );
  }

  if (!isLeverageImport && !isLeverageCase && !caseData) {
    return <div className="text-sm text-gray-500 p-8">Case not found.</div>;
  }

  if (isLeverageCase && !leverageCaseDetail) {
    return <div className="text-sm text-gray-500 p-8">LEVERAGE case not found. <Link href="/dashboard/leverage/cases" className="text-blue-600 underline">View your cases</Link>.</div>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <p className="text-xs text-gray-400">
        <Link href="/dashboard/settle" className="hover:text-gray-600 dark:hover:text-gray-300">Settlement Intelligence</Link>
        <span className="mx-1.5"></span>
        <span>Case Analysis</span>
      </p>

      {/* Case title */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Settlement Intelligence</p>
          {isLeverageCase && leverageCaseDetail ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">{leverageCaseDetail.case_id.slice(0, 12)}…</h1>
              <p className="text-sm text-gray-500 mt-0.5">{leverageCaseDetail.incident_type ?? 'Unknown incident'}  {leverageCaseDetail.state ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Status: {leverageCaseDetail.litigation_stage ?? 'lead'}  Opened {new Date(leverageCaseDetail.created_at).toLocaleDateString()}</p>
            </>
          ) : isLeverageImport && leverageData ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Direct Case Analysis</h1>
              <p className="text-sm text-gray-500 mt-0.5">Imported from LEVERAGE Damages Calculator · {fmt(leverageData.gross_damages)} gross damages</p>
            </>
          ) : caseData ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Case: {caseData.client_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{caseData.incident}  {caseData.county}</p>
            </>
          ) : null}
        </div>
        <Link href="/dashboard/settle" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1">
           All cases
        </Link>
      </div>

      {/*  Section 1: Case Inputs  */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setInputsExpanded(!inputsExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">1. Case Inputs</span>
          {inputsExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>
        {inputsExpanded && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
            {isLeverageCase && leverageCaseDetail ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Case details pulled from LEVERAGE. Run SETTLE analysis to see comparable settlement data.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    ['Case ID',             leverageCaseDetail.case_id.slice(0, 12) + '…'],
                    ['Incident Type',       leverageCaseDetail.incident_type ?? '—'],
                    ['State',               leverageCaseDetail.state ?? '—'],
                    ['Litigation Stage',    leverageCaseDetail.litigation_stage ?? '—'],
                    ['Status',              leverageCaseDetail.status ?? '—'],
                    ['Created',             new Date(leverageCaseDetail.created_at).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
                {leverageCaseDetail.saved_damages && (
                  <>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400 mb-2">Saved Damages Worksheet</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {[
                          ['Gross Damages', fmt(leverageCaseDetail.saved_damages.result_json?.gross_damages ?? 0)],
                          ['Settlement Range', `${fmt(leverageCaseDetail.saved_damages.result_json?.settlement_range_low ?? 0)} – ${fmt(leverageCaseDetail.saved_damages.result_json?.settlement_range_high ?? 0)}`],
                        ].map(([label, value]) => (
                          <div key={label} className="flex flex-col">
                            <span className="text-xs text-gray-400">{label}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : isLeverageImport && leverageData ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Values imported from LEVERAGE Damages Calculator. Edit below or confirm to run SETTLE analysis.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    ['Medical Bills', fmt(leverageData.medical_bills)],
                    ['Lost Wages', fmt(leverageData.lost_wages)],
                    ['Property Damage', fmt(leverageData.property_damage)],
                    ['Pain & Suffering', fmt(leverageData.pain_suffering)],
                    ['Gross Damages', fmt(leverageData.gross_damages)],
                    ['Liability %', `${leverageData.liability_pct}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : caseData ? (
              <>
                <p className="text-xs text-gray-400 mb-4">Auto-populated from intake. Confirm or edit before running analysis.</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    ['Incident Type',       caseData.incident],
                    ['County',              caseData.county],
                    ['Injury Severity',     caseData.injury_severity],
                    ['Medical Specials',    fmt(caseData.medical_specials)],
                    ['Liability Strength',  caseData.liability_strength],
                    ['Policy Limit Band',   caseData.policy_limit_band],
                    ['Insurer',             caseData.insurer],
                    ['Litigation Stage',    caseData.litigation_stage],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/*  Section 2: Settlement Intelligence  */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">2. Settlement Intelligence</span>
        </div>

        {/* Gate: feature not enabled */}
        {!settleEnabled ? (
          <div className="px-5 py-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
              <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">SETTLE is not included in your current plan</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Upgrade to Growth tier or add the SETTLE Intelligence add-on to run settlement queries and generate professional reports.
                </p>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-800 dark:text-amber-300 underline"
                >
                  View Plans & Pricing
                </Link>
              </div>
            </div>
          </div>

        ) : estimate ? (
          /* ─── Live intelligence from backend ─────────────────────── */
          <div className="px-5 py-5 space-y-5">
            {/* Pilot-mode disclosure banner */}
            {estimate.is_pilot_response && (
              <PilotModeBanner
                nCases={estimate.n_cases}
                stateLabel={caseData?.county.split(',')[1]?.trim()}
              />
            )}

            {/* own_case_only guardrail */}
            {estimate.own_case_only && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Limited data available</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Insufficient comparable cases to produce aggregate statistics.
                    Showing your own case data only.
                  </p>
                </div>
              </div>
            )}

            {/* Settlement distribution */}
            {!estimate.own_case_only && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                  Estimated settlement distribution
                  {estimate.aggregation_level === 'state' && ' (statewide)'}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">25th percentile</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(estimate.percentile_25)}</p>
                  </div>
                  <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                    <p className="text-xs text-gray-400 mb-1">Median outcome</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(estimate.median)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">75th percentile</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(estimate.percentile_75)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-3">
                  <span>{estimate.n_cases} comparable settlement{estimate.n_cases === 1 ? '' : 's'}</span>
                  <span>
                    {estimate.aggregation_level === 'county'
                      ? `${estimate.n_county} county-level`
                      : estimate.aggregation_level === 'state'
                      ? `${estimate.n_state} statewide`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
              <Info size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Confidence: {estimate.confidence}
                </p>
                {estimate.range_justification && (
                  <p className="text-xs text-gray-400 mt-0.5">{estimate.range_justification}</p>
                )}
              </div>
            </div>

            {/* Phase 2.1: Confidence Score Display */}
            {estimate.confidence_score && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Data Confidence Score</p>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Overall score header */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Data Confidence Score: {estimate.confidence_score.overall}/100
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      estimate.confidence_score.overall >= 70
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : estimate.confidence_score.overall >= 40
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {estimate.confidence_score.label}
                    </span>
                  </div>

                  {/* Factor breakdown */}
                  <div className="px-5 py-4 space-y-3">
                    {Object.entries(estimate.confidence_score.factors).map(([key, factor]) => {
                      const pct = (factor.score / factor.max) * 100;
                      const barColor = factor.score >= 7
                        ? 'bg-green-500'
                        : factor.score >= 4
                        ? 'bg-amber-500'
                        : 'bg-red-500';
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={key} className="flex items-start gap-3">
                          <div className="w-44 flex-shrink-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                            <p className="text-xs text-gray-400">{factor.score}/{factor.max}</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor} rounded-full transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-48 flex-shrink-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{factor.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Warnings */}
                  {estimate.confidence_score.warnings.length > 0 && (
                    <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                      {estimate.confidence_score.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comparable cases summary */}
            {estimate.comparable_cases.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Comparable cases</p>
                  <div className="text-sm text-gray-500">
                    {estimate.n_cases} comparable cases
                    {estimate.comparable_cases.some(c => c.insurance_carrier) && (
                      <span> · {new Set(estimate.comparable_cases.map(c => c.insurance_carrier).filter(Boolean)).size} carriers represented</span>
                    )}
                  </div>
                </div>

                {/* Verdict-derived data disclosure */}
                {estimate.comparable_cases.some(c => c.is_verdict === true) && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Estimate includes verdict-derived data (not all settlements)</span>
                  </div>
                )}

                <div className="space-y-2">
                  {estimate.comparable_cases.slice(0, 5).map((c, i) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {/* Insurance carrier badge */}
                        {c.insurance_carrier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {c.insurance_carrier}
                          </span>
                        )}

                        {/* Injury severity badge */}
                        {c.injury_severity && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            c.injury_severity === 'fatal' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            c.injury_severity === 'catastrophic' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                            c.injury_severity === 'surgical' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            c.injury_severity === 'fracture' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {c.injury_severity.replace('_', ' ')}
                          </span>
                        )}

                        {/* Verdict vs Settlement indicator */}
                        {c.is_verdict !== null && c.is_verdict !== undefined && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            c.is_verdict ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}>
                            {c.is_verdict ? 'Verdict' : 'Settlement'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <span className="text-gray-500">{c.jurisdiction}</span>
                        <span className="text-gray-700 dark:text-gray-300">{c.case_type}</span>
                        <span className="text-right">
                          {/* Exact amount if available, otherwise bucketed range */}
                          {c.exact_outcome_amount ? (
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              ${c.exact_outcome_amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{c.outcome_range}</span>
                          )}
                        </span>
                      </div>

                      {/* Secondary info row */}
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {c.comparative_negligence_pct !== null && c.comparative_negligence_pct !== undefined && (
                          <span>Negligence: {c.comparative_negligence_pct}%</span>
                        )}
                        {c.court_level && (
                          <span>{c.court_level}</span>
                        )}
                        {c.date_of_verdict && (
                          <span>{new Date(c.date_of_verdict).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {estimate.comparable_cases.length > 5 && (
                    <button
                      onClick={() => toast.info('Full report with all ' + estimate.comparable_cases.length + ' comparable cases will be available in the PDF download.')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      +{estimate.comparable_cases.length - 5} more comparable cases in full report
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Phase 3.1: Multiplier Model Layer — Dual-Method Comparison */}
            {estimate.multiplier_method && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Settlement Estimate Comparison</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Percentile Method (Primary) */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Percentile Method</h3>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">Primary</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">P25</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(estimate.percentile_25)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Median</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(estimate.median)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">P75</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(estimate.percentile_75)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Based on {estimate.n_cases} cases</p>
                  </div>

                  {/* Multiplier Method (Secondary) */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Multiplier Method</h3>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">Secondary</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Low</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(estimate.multiplier_method.low)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Median</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(estimate.multiplier_method.median)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">High</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(estimate.multiplier_method.high)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{estimate.multiplier_method.model_label}</p>
                    <p className="text-xs text-gray-400">Base multiplier: {estimate.multiplier_method.base_multiplier}x</p>
                    {estimate.multiplier_method.adjustments_applied.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Adjustments:</p>
                        <ul className="text-xs text-gray-400 space-y-0.5">
                          {estimate.multiplier_method.adjustments_applied.map((adj, i) => (
                            <li key={i}>• {adj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 3.2: Overdemand Cliff Warning */}
            {estimate.overdemand_cliff && estimate.overdemand_cliff.has_cliff && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Historical Settlement Pattern Alert</p>
                    {estimate.overdemand_cliff.warning && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{estimate.overdemand_cliff.warning}</p>
                    )}
                    {estimate.overdemand_cliff.settlement_rate_below !== null && estimate.overdemand_cliff.settlement_rate_above !== null && (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Settlement rate drops from {(estimate.overdemand_cliff.settlement_rate_below * 100).toFixed(0)}% to {(estimate.overdemand_cliff.settlement_rate_above * 100).toFixed(0)}% above threshold
                      </p>
                    )}
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{estimate.overdemand_cliff.methodology}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 4: Outcome Distribution */}
            {estimate.outcome_distribution && estimate.outcome_distribution.sample_size > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Historical Outcome Distribution</p>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500">Based on {estimate.outcome_distribution.sample_size} similar cases. Descriptive statistics only.</p>
                  </div>

                  {/* Outcome table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Outcome</th>
                          <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Avg Amount</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {Object.entries(estimate.outcome_distribution.outcome_distribution).map(([key, data]) => {
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          const color = key === 'settlement' ? 'text-green-600' : key === 'plaintiff_verdict' ? 'text-blue-600' : key === 'defense_verdict' ? 'text-red-600' : 'text-gray-500';
                          return (
                            <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                              <td className={`px-4 py-2 font-medium ${color}`}>{label}</td>
                              <td className="px-4 py-2 text-center">{(data.rate * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2 text-right">
                                {data.avg_amount ? fmt(data.avg_amount) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-500">{data.count} cases</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Trial Risk Indicators */}
                  {estimate.outcome_distribution.trial_risk_indicators && (
                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Trial Risk Indicators</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Gavel className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-500">Trial propensity:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {(estimate.outcome_distribution.trial_risk_indicators.trial_propensity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scale className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-500">Plaintiff win rate:</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {(estimate.outcome_distribution.trial_risk_indicators.plaintiff_verdict_rate * 100).toFixed(0)}%
                          </span>
                        </div>
                        {estimate.outcome_distribution.trial_risk_indicators.verdict_premium !== null && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-500">Verdict premium:</span>
                            <span className="font-semibold text-green-600">
                              +{estimate.outcome_distribution.trial_risk_indicators.verdict_premium.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Methodology disclaimer */}
                  <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">{estimate.outcome_distribution.methodology}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        ) : estimateLoading ? (
          /* ─── Fetching estimate after billing ────────────────────── */
          <div className="px-5 py-8 flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Analyzing comparable settlements...</p>
          </div>

        ) : estimateError ? (
          /* ─── Estimate fetch error ───────────────────────────────── */
          <div className="px-5 py-6 flex gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Analysis failed</p>
              <p className="text-xs text-gray-500 mt-0.5">{estimateError}</p>
              <button
                onClick={() => { setEstimate(null); setQueryState('idle'); }}
                className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 underline"
              >
                Try again
              </button>
            </div>
          </div>

        ) : (
          /* ─── Billing flow (idle → loading → payment_required → ready) ─ */
          <div className="px-5 py-6 space-y-4">
            {queryState === 'idle' && (
              <div className="flex items-start gap-3">
                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">SETTLE analysis ready</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isLeverageImport
                      ? 'Your damages data has been pre-populated. Run the analysis to see comparable settlement ranges from the SETTLE database.'
                      : 'Run the analysis to see comparable settlement ranges based on this case.'}
                  </p>
                </div>
              </div>
            )}
            <SettleQueryButton
              tenantId={tenantId}
              caseId={caseId || `leverage-${Date.now()}`}
              settleEnabled={settleEnabled}
              pricingLabel={pricingLabel()}
              queryState={queryState}
              setQueryState={setQueryState}
              quotePrice={quotePrice}
              setQuotePrice={setQuotePrice}
              reportData={reportData}
              setReportData={setReportData}
              toast={toast}
            />
          </div>
        )}
      </div>

      {/*  Section 3: Negotiation Timeline  */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">3. Negotiation Timeline</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {offers.map((offer, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-36 flex-shrink-0">{offer.label}</span>
              {offer.amount ? (
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(offer.amount))}
                </span>
              ) : (
                <span className="text-xs text-gray-300 dark:text-gray-600 italic">Not recorded</span>
              )}
            </div>
          ))}

          {/* Add offer row */}
          <div className="pt-2 flex items-center gap-2">
            <input
              placeholder="Label (e.g. Attorney counter)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1 text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <input
              placeholder="Amount"
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              className="w-28 text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              onClick={() => {
                if (newLabel) {
                  setOffers(prev => [...prev, { label: newLabel, amount: newAmount }]);
                  setNewLabel(''); setNewAmount('');
                }
              }}
              className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Plus size={13} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <p className="text-xs text-gray-400">Each update can trigger a new intelligence run.</p>
        </div>
      </div>
    </div>
  );
}

export default function CaseAnalysisPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400 p-8">Loading case</div>}>
      <CaseAnalysisInner />
    </Suspense>
  );
}
