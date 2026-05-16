'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, ArrowRight, AlertCircle, Info, TrendingDown } from 'lucide-react';

interface DisbursementResult {
  breakdown: {
    filing_fees: number;
    medical_records: number;
    expert_witness_fees: number;
    deposition_costs: number;
    investigation_costs: number;
    process_server_fees: number;
    travel_expenses: number;
    postage_copies: number;
    custom_items_total: number;
    total_disbursements: number;
  };
  total_disbursements: number;
  contingency_fee_pct: number;
  gross_settlement: number | null;
  attorney_fee: number | null;
  net_to_client: number | null;
  minimum_settlement_to_break_even: number;
  disclaimer: string;
}

export default function DisbursementPage() {
  const [inputs, setInputs] = useState({
    filing_fees: '',
    medical_records: '',
    expert_witness_fees: '',
    deposition_costs: '',
    investigation_costs: '',
    process_server_fees: '',
    travel_expenses: '',
    postage_copies: '',
    contingency_fee_pct: '33.33',
    gross_settlement: '',
  });
  const [result, setResult] = useState<DisbursementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string) => setInputs(prev => ({ ...prev, [key]: val }));

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        tenant_id: 'portal-user',
        filing_fees: parseFloat(inputs.filing_fees) || 0,
        medical_records: parseFloat(inputs.medical_records) || 0,
        expert_witness_fees: parseFloat(inputs.expert_witness_fees) || 0,
        deposition_costs: parseFloat(inputs.deposition_costs) || 0,
        investigation_costs: parseFloat(inputs.investigation_costs) || 0,
        process_server_fees: parseFloat(inputs.process_server_fees) || 0,
        travel_expenses: parseFloat(inputs.travel_expenses) || 0,
        postage_copies: parseFloat(inputs.postage_copies) || 0,
        contingency_fee_pct: parseFloat(inputs.contingency_fee_pct) || 33.33,
      };
      if (inputs.gross_settlement) {
        body.gross_settlement = parseFloat(inputs.gross_settlement);
      }
      const res = await fetch('/api/leverage/disbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Calculation failed');
      setResult(await res.json());
    } catch {
      setError('Unable to calculate. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300">Home</Link>
          <span className="mx-1.5"></span>
          <Link href="/dashboard/draft" className="hover:text-gray-600 dark:hover:text-gray-300">LEVERAGE</Link>
          <span className="mx-1.5"></span>
          <span>Disbursement Calculator</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Disbursement Calculator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Track case costs and calculate net-to-client. Know your settlement floor before negotiating.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex gap-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          No data is saved. Results do not constitute legal or financial advice.
        </p>
      </div>

      {/* Cost Inputs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Case Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['Filing Fees', 'filing_fees'],
            ['Medical Records', 'medical_records'],
            ['Expert Witness Fees', 'expert_witness_fees'],
            ['Deposition Costs', 'deposition_costs'],
            ['Investigation Costs', 'investigation_costs'],
            ['Process Server Fees', 'process_server_fees'],
            ['Travel Expenses', 'travel_expenses'],
            ['Postage & Copies', 'postage_copies'],
          ] as [string, string][]).map(([label, key]) => (
            <InputField key={key} label={label} value={(inputs as Record<string, string>)[key]} onChange={v => set(key, v)} />
          ))}
        </div>
      </div>

      {/* Fee & Settlement */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Fee & Settlement</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Contingency Fee %</label>
            <div className="relative">
              <input
                type="number" min="0" max="50" step="0.5"
                value={inputs.contingency_fee_pct}
                onChange={e => set('contingency_fee_pct', e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <InputField
            label="Gross Settlement (optional)"
            value={inputs.gross_settlement}
            onChange={v => set('gross_settlement', v)}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Enter a gross settlement amount to see net-to-client after fees and costs.
        </p>
      </div>

      <button
        onClick={calculate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
      >
        {loading ? 'Calculating' : 'Calculate Costs'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      {error && (
        <div className="flex gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Results</h2>

          {/* Cost breakdown */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {[
              ['Filing Fees', result.breakdown.filing_fees],
              ['Medical Records', result.breakdown.medical_records],
              ['Expert Witnesses', result.breakdown.expert_witness_fees],
              ['Depositions', result.breakdown.deposition_costs],
              ['Investigation', result.breakdown.investigation_costs],
              ['Process Server', result.breakdown.process_server_fees],
              ['Travel', result.breakdown.travel_expenses],
              ['Postage & Copies', result.breakdown.postage_copies],
            ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
              <div key={label as string} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(val as number)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-700">
              <span>Total Disbursements</span>
              <span>{fmt(result.total_disbursements)}</span>
            </div>
          </div>

          {/* Settlement floor */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Minimum settlement to break even: {fmt(result.minimum_settlement_to_break_even)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Any settlement below this amount costs the firm money after fees and costs.
              </p>
            </div>
          </div>

          {/* Net to client */}
          {result.gross_settlement != null && result.net_to_client != null && (
            <div className="bg-gray-900 dark:bg-gray-100 rounded-lg p-6 text-white dark:text-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Net to Client</p>
              <p className="text-4xl font-bold tabular-nums">{fmt(result.net_to_client)}</p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="opacity-60 text-xs">Gross</p>
                  <p className="font-semibold">{fmt(result.gross_settlement)}</p>
                </div>
                <div>
                  <p className="opacity-60 text-xs">Attorney Fee ({result.contingency_fee_pct}%)</p>
                  <p className="font-semibold"> {fmt(result.attorney_fee!)}</p>
                </div>
                <div>
                  <p className="opacity-60 text-xs">Costs</p>
                  <p className="font-semibold"> {fmt(result.total_disbursements)}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input
          type="number" min="0" step="100"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          placeholder="0"
        />
      </div>
    </div>
  );
}
