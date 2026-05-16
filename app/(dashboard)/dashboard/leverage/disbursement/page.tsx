'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Calculator, Save, Printer, FileText, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { leverageClient, DisbursementRequest, CaseListItem } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';

interface CustomItem { description: string; amount: number }

function computeDisbursement(form: DisbursementRequest & { custom_items: CustomItem[]; gross_settlement: number }) {
  const customTotal = form.custom_items.reduce((sum, item) => sum + item.amount, 0);
  const totalDisb =
    form.filing_fees + form.medical_records_cost + form.expert_fees + form.deposition_costs +
    form.investigation_costs + form.travel_expenses + form.other_costs + customTotal;

  const feePct = form.attorney_fees_percentage / 100;
  const breakEven = feePct < 1 ? Math.round((totalDisb / (1 - feePct)) * 100) / 100 : 0;

  let attorneyFee: number | null = null;
  let netToClient: number | null = null;

  if (form.gross_settlement > 0) {
    attorneyFee = Math.round(form.gross_settlement * feePct * 100) / 100;
    netToClient = Math.round((form.gross_settlement - attorneyFee - totalDisb) * 100) / 100;
  }

  return {
    breakdown: {
      filing_fees: form.filing_fees,
      medical_records_cost: form.medical_records_cost,
      expert_fees: form.expert_fees,
      deposition_costs: form.deposition_costs,
      investigation_costs: form.investigation_costs,
      travel_expenses: form.travel_expenses,
      other_costs: form.other_costs,
      custom_items_total: customTotal,
      subtotal_costs: totalDisb,
      attorney_fees: attorneyFee ?? 0,
      total_deductions: totalDisb + (attorneyFee ?? 0),
    },
    total_disbursement: totalDisb,
    net_to_client: netToClient,
    break_even_settlement: breakEven,
    attorney_fees_percentage: form.attorney_fees_percentage,
  };
}

export default function DisbursementPage() {
  const { tenantId } = useTenant();
  const toast = useCompanyToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casePickerOpen, setCasePickerOpen] = useState(false);

  const [form, setForm] = useState<DisbursementRequest & { custom_items: CustomItem[]; gross_settlement: number }>({
    tenant_id: tenantId ?? '',
    filing_fees: 0,
    medical_records_cost: 0,
    expert_fees: 0,
    deposition_costs: 0,
    investigation_costs: 0,
    travel_expenses: 0,
    other_costs: 0,
    attorney_fees_percentage: 33,
    custom_items: [],
    gross_settlement: 0,
  });

  useEffect(() => {
    if (!tenantId) return;
    setCasesLoading(true);
    leverageClient.listCases(tenantId, { limit: 100 })
      .then((res) => setCases(res.cases))
      .catch(() => setCases([]))
      .finally(() => setCasesLoading(false));
  }, [tenantId]);

  const result = useMemo(() => computeDisbursement(form), [form]);

  const updateField = (field: keyof DisbursementRequest, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addCustomItem = () => {
    setForm((prev) => ({ ...prev, custom_items: [...prev.custom_items, { description: '', amount: 0 }] }));
  };

  const updateCustomItem = (index: number, field: keyof CustomItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.custom_items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, custom_items: items };
    });
  };

  const removeCustomItem = (index: number) => {
    setForm((prev) => ({ ...prev, custom_items: prev.custom_items.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!caseId || !tenantId) {
      toast.error('Missing Info', 'Select a case first.');
      return;
    }
    setSaving(true);
    try {
      await leverageClient.saveDisbursement(caseId, {
        input: { ...form, tenant_id: tenantId },
        result: {
          total_disbursement: result.total_disbursement,
          breakdown: result.breakdown,
          net_to_client: result.net_to_client ?? 0,
        },
      });
      toast.success('Disbursement Saved', `Worksheet saved to case ${caseId}.`);
    } catch {
      toast.error('Save Failed', 'Unable to save disbursement worksheet.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Disbursement Worksheet</title><style>
      body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
      h1{font-size:24px;margin-bottom:8px}
      .subtitle{color:#666;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
      .box{border:1px solid #ddd;padding:12px;border-radius:6px}
      .label{font-size:12px;color:#666}
      .value{font-size:16px;font-weight:bold}
      .highlight{background:#f0fdf4;border-color:#86efac}
      .range{background:#eff6ff;border:1px solid #93c5fd;padding:16px;border-radius:6px;margin-bottom:24px}
      .range-title{font-size:14px;color:#1e40af;font-weight:600}
      .range-value{font-size:20px;font-weight:bold;color:#1e3a8a}
      .footer{margin-top:40px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
    </style></head><body>${printRef.current.innerHTML}
    <div class="footer">Generated by TrueVow LEVERAGE — ${new Date().toLocaleString()} — Calculation tool only; not legal advice.</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const selectedCase = cases.find((c) => c.case_id === caseId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <span>Disbursement Calculator</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Disbursement Calculator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Compute case costs and net-to-client in real time</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Case Costs
          </h2>
          <div className="grid gap-3 grid-cols-2">
            <NumberField label="Filing Fees" value={form.filing_fees} onChange={(v) => updateField('filing_fees', v)} />
            <NumberField label="Medical Records" value={form.medical_records_cost} onChange={(v) => updateField('medical_records_cost', v)} />
            <NumberField label="Expert Fees" value={form.expert_fees} onChange={(v) => updateField('expert_fees', v)} />
            <NumberField label="Deposition Costs" value={form.deposition_costs} onChange={(v) => updateField('deposition_costs', v)} />
            <NumberField label="Investigation" value={form.investigation_costs} onChange={(v) => updateField('investigation_costs', v)} />
            <NumberField label="Travel Expenses" value={form.travel_expenses} onChange={(v) => updateField('travel_expenses', v)} />
            <NumberField label="Other Costs" value={form.other_costs} onChange={(v) => updateField('other_costs', v)} />
            <NumberField label="Attorney Fee %" value={form.attorney_fees_percentage} onChange={(v) => updateField('attorney_fees_percentage', v)} step={0.1} />
          </div>

          {/* Custom Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Custom Cost Items</h3>
              <button onClick={addCustomItem} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>
            {form.custom_items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text" placeholder="Description" value={item.description}
                  onChange={(e) => updateCustomItem(idx, 'description', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="number" min={0} value={item.amount}
                  onChange={(e) => updateCustomItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button onClick={() => removeCustomItem(idx)} className="p-1.5 text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Settlement Slider */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Settlement Negotiation (What-If)</h3>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Gross Settlement Offer: ${form.gross_settlement.toLocaleString()}</label>
            <input
              type="range" min={0} max={500000} step={1000}
              value={form.gross_settlement}
              onChange={(e) => setForm((p) => ({ ...p, gross_settlement: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>$0</span>
              <span>$250K</span>
              <span>$500K</span>
            </div>
            <NumberField label="Or enter exact amount" value={form.gross_settlement} onChange={(v) => setForm((p) => ({ ...p, gross_settlement: v }))} />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4" ref={printRef}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Live Results</h2>
              <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </button>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <ResultBox label="Filing Fees" value={`$${result.breakdown.filing_fees.toLocaleString()}`} />
              <ResultBox label="Medical Records" value={`$${result.breakdown.medical_records_cost.toLocaleString()}`} />
              <ResultBox label="Expert Fees" value={`$${result.breakdown.expert_fees.toLocaleString()}`} />
              <ResultBox label="Depositions" value={`$${result.breakdown.deposition_costs.toLocaleString()}`} />
              <ResultBox label="Investigation" value={`$${result.breakdown.investigation_costs.toLocaleString()}`} />
              <ResultBox label="Travel" value={`$${result.breakdown.travel_expenses.toLocaleString()}`} />
              <ResultBox label="Other" value={`$${result.breakdown.other_costs.toLocaleString()}`} />
              {result.breakdown.custom_items_total > 0 && (
                <ResultBox label="Custom Items" value={`$${result.breakdown.custom_items_total.toLocaleString()}`} />
              )}
              <ResultBox label="Subtotal Costs" value={`$${result.breakdown.subtotal_costs.toLocaleString()}`} />
              <ResultBox label="Attorney Fees" value={`$${result.breakdown.attorney_fees.toLocaleString()}`} />
              <ResultBox label="Total Deductions" value={`$${result.breakdown.total_deductions.toLocaleString()}`} />
              <ResultBox label="Net to Client" value={`$${(result.net_to_client ?? 0).toLocaleString()}`} highlight />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Break-Even Settlement</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-300">${result.break_even_settlement.toLocaleString()}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Any settlement below this costs the firm money.</p>
            </div>

            {form.gross_settlement > 0 && result.net_to_client !== null && (
              <div className={`rounded-lg border p-4 ${result.net_to_client >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className="text-sm font-medium">At ${form.gross_settlement.toLocaleString()} offer:</p>
                <p className={`text-lg font-bold ${result.net_to_client >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {result.net_to_client >= 0 ? 'Profitable' : 'Loss'}: ${result.net_to_client.toLocaleString()}
                </p>
              </div>
            )}

            {/* Save to Case */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Save to Case</label>
              <div className="relative">
                <button
                  onClick={() => setCasePickerOpen(!casePickerOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <span>{selectedCase ? `${selectedCase.case_id.slice(0, 8)}… — ${selectedCase.incident_type || 'Case'}` : casesLoading ? 'Loading cases…' : 'Select a case…'}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                {casePickerOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {cases.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No cases found. <Link href="/dashboard/leverage/cases/new" className="text-blue-600 underline">Open one</Link>.</div>}
                    {cases.map((c) => (
                      <button
                        key={c.case_id}
                        onClick={() => { setCaseId(c.case_id); setCasePickerOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="text-left truncate">{c.case_id.slice(0, 8)}… — {c.incident_type || 'Case'} — {c.state}</span>
                        {caseId === c.case_id && <Check className="h-4 w-4 text-green-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !caseId}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save Worksheet to Case'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="number" min={0} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      />
    </div>
  );
}

function ResultBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-base font-bold ${highlight ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
    </div>
  );
}
