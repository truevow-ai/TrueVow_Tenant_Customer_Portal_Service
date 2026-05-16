'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Info, Plus, Lock, Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';

//  Mock case data  will come from INTAKE API 
const MOCK_CASES: Record<string, {
  id: string; client_name: string; incident: string; county: string;
  injury_severity: string; medical_specials: number;
  liability_strength: string; policy_limit_band: string;
  insurer: string; litigation_stage: string;
}> = {
  'case-001': { id: 'case-001', client_name: 'Zoey Baker',   incident: 'Slip and Fall',      county: 'Duval County, FL',        injury_severity: 'Minor',    medical_specials: 8200,  liability_strength: 'Property owner awareness established', policy_limit_band: 'Unknown', insurer: 'Unknown',       litigation_stage: 'Pre-suit'  },
  'case-002': { id: 'case-002', client_name: 'Marcus Webb',  incident: 'Auto Accident',       county: 'Hillsborough County, FL', injury_severity: 'Moderate', medical_specials: 32000, liability_strength: 'Clear liability, rear-end',            policy_limit_band: '$100k',  insurer: 'State Farm',   litigation_stage: 'Pre-suit'  },
  'case-003': { id: 'case-003', client_name: 'Diana Reyes',  incident: 'Dog Bite',            county: 'Miami-Dade County, FL',   injury_severity: 'Minor',    medical_specials: 4100,  liability_strength: 'Strict liability state',               policy_limit_band: '$25k',   insurer: 'Allstate',     litigation_stage: 'Pre-suit'  },
  'case-004': { id: 'case-004', client_name: 'Ronald Hatch', incident: 'Premises Liability',  county: 'Orange County, FL',       injury_severity: 'Moderate', medical_specials: 14700, liability_strength: 'Contested — no prior notice documented', policy_limit_band: '$50k',   insurer: 'Progressive',  litigation_stage: 'Suit filed' },
};

// ─── Mock settlement intelligence output ─────────────────────────────────
const MOCK_INTEL: Record<string, {
  percentile_25: number; median: number; percentile_75: number;
  sample_size: number; jurisdiction_weight: number; confidence_score: number;
  confidence_label: string; confidence_reason: string;
  factors: { text: string; positive: boolean }[];
  risk_adjustments: { condition: string; impact: string }[];
  insurer_behavior: { label: string; value: string } | null;
  insufficient_data: boolean;
}> = {
  'case-001': { percentile_25: 9000, median: 14500, percentile_75: 21000, sample_size: 146, jurisdiction_weight: 68, confidence_score: 7, confidence_label: 'Moderate', confidence_reason: 'Limited policy limit data reduces precision', factors: [{ text: 'Property owner awareness established', positive: true }, { text: 'Incident occurred recently', positive: true }, { text: 'Medical treatment not yet extensive', positive: false }], risk_adjustments: [{ condition: 'If surgery occurs', impact: 'Typical range increases to $35k+' }, { condition: 'If liability contested', impact: 'Median range drops to $9k$12k' }], insurer_behavior: { label: 'Unknown insurer', value: 'Insufficient data for this insurer.' }, insufficient_data: false },
  'case-002': { percentile_25: 45000, median: 68000, percentile_75: 95000, sample_size: 312, jurisdiction_weight: 82, confidence_score: 8, confidence_label: 'High', confidence_reason: 'Strong sample size and clear liability', factors: [{ text: 'Clear rear-end liability', positive: true }, { text: 'Policy limits known ($100k)', positive: true }, { text: 'Moderate injuries  soft tissue + fracture', positive: false }], risk_adjustments: [{ condition: 'If MRI shows disc herniation', impact: 'Median increases to $85k$110k' }, { condition: 'If surgery required', impact: 'Upper range extends to $150k+' }], insurer_behavior: { label: 'State Farm', value: 'Typical initial offer: 3045% of median. Average 3 negotiation rounds. Final settlement typically 8895% of median.' }, insufficient_data: false },
  'case-003': { percentile_25: 5500, median: 9200, percentile_75: 14000, sample_size: 18, jurisdiction_weight: 55, confidence_score: 4, confidence_label: 'Low', confidence_reason: 'Sample size below threshold  expanding to state level', factors: [{ text: 'Florida strict liability jurisdiction', positive: true }, { text: 'Minor injury reduces upside', positive: false }], risk_adjustments: [{ condition: 'If disfigurement documented', impact: 'Typical range increases to $15k$25k' }], insurer_behavior: null, insufficient_data: false },
  'case-004': { percentile_25: 0, median: 0, percentile_75: 0, sample_size: 9, jurisdiction_weight: 40, confidence_score: 2, confidence_label: 'Insufficient', confidence_reason: 'Fewer than 20 comparable cases — analysis expanded to state level', factors: [], risk_adjustments: [], insurer_behavior: null, insufficient_data: true },
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

  // Direct import from LEVERAGE Damages Calculator
  const leverageData = isLeverageImport ? {
    medical_bills: Number(searchParams.get('medical_bills') || 0),
    lost_wages: Number(searchParams.get('lost_wages') || 0),
    property_damage: Number(searchParams.get('property_damage') || 0),
    pain_suffering: Number(searchParams.get('pain_suffering') || 0),
    gross_damages: Number(searchParams.get('gross_damages') || 0),
    liability_pct: Number(searchParams.get('liability_pct') || 100),
  } : null;

  const caseData = !isLeverageImport ? (MOCK_CASES[caseId] || null) : null;
  const intel = !isLeverageImport ? (MOCK_INTEL[caseId] || null) : null;

  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [offers, setOffers] = useState<{ label: string; amount: string }[]>([
    { label: 'Initial demand', amount: '' },
    { label: 'Insurance offer', amount: '' },
  ]);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (!isLeverageImport && !caseData) {
    return <div className="text-sm text-gray-500 p-8">Case not found.</div>;
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
          {isLeverageImport && leverageData ? (
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
            {isLeverageImport && leverageData ? (
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

        {isLeverageImport ? (
          <div className="px-5 py-6 space-y-4">
            {!settleEnabled ? (
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
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">SETTLE analysis ready</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Your damages data has been pre-populated. Run the analysis to see comparable settlement ranges from the SETTLE database.
                    </p>
                  </div>
                </div>
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
              </>
            )}
          </div>
        ) : intel && intel.insufficient_data ? (
          <div className="px-5 py-6 flex gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Data insufficient</p>
              <p className="text-sm text-gray-500 mt-0.5">Expanding analysis to state level {(caseData && caseData.county.split(',')[1]?.trim()) || 'FL'}. Results will be available within 24 hours.</p>
              <p className="text-xs text-gray-400 mt-2">Sample size: {intel.sample_size} comparable cases (minimum 20 required for county-level analysis)</p>
            </div>
          </div>
        ) : intel ? (
          <div className="px-5 py-5 space-y-5">
            {/* Range */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Estimated settlement distribution</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">25th percentile</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(intel.percentile_25)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-lg py-2">
                  <p className="text-xs text-gray-400 mb-1">Median outcome</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(intel.median)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">75th percentile</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(intel.percentile_75)}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-3">
                <span>Sample size: {intel.sample_size} comparable settlements</span>
                <span>Jurisdiction weight: {intel.jurisdiction_weight}%</span>
              </div>
            </div>

            {/* Confidence */}
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
              <Info size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Confidence level: {intel.confidence_score}/10 — {intel.confidence_label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{intel.confidence_reason}</p>
              </div>
            </div>

            {/* Factors */}
            {intel.factors.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Key factors affecting outcome</p>
                <div className="space-y-1.5">
                  {intel.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={f.positive ? 'text-green-500' : 'text-gray-400'}>
                        {f.positive ? '+' : ''}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk adjustments */}
            {intel.risk_adjustments.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Risk adjustments</p>
                <div className="space-y-2">
                  {intel.risk_adjustments.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-gray-500">{r.condition}</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{r.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insurer behavior */}
            {intel.insurer_behavior && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Insurer negotiation pattern — {intel.insurer_behavior.label}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{intel.insurer_behavior.value}</p>
              </div>
            )}
          </div>
        ) : null}
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
