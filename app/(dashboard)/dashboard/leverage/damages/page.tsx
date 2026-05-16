'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calculator, Save, Printer, FileText, ChevronDown, Check, X, Scale, ChevronRight, Lock } from 'lucide-react';
import { leverageClient, DamagesRequest, CaseListItem } from '@/lib/api/leverage-client';
import { useTenant } from '@/hooks/useTenant';
import { useCompanyToast } from '@/hooks/useCompanyToast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

// Real-time damages calculation (mirrors backend logic)
function computeDamages(form: DamagesRequest & { liability_percentage: number; settlement_range_low_pct: number; settlement_range_high_pct: number }) {
  const m = form.medical;
  const pastMedical =
    m.emergency_room + m.hospitalization + m.surgery + m.physical_therapy +
    m.specialist_visits + m.medications + m.other_medical;
  const totalMedical = pastMedical + m.future_medical_estimate;

  const li = form.lost_income;
  const pastLostIncome = li.weekly_wage * li.weeks_missed;
  const totalLostIncome = pastLostIncome + li.future_lost_earning_capacity;

  const totalEconomic = totalMedical + totalLostIncome + form.property_damage + form.out_of_pocket_expenses;
  const painSuffering = totalMedical * form.pain_suffering_multiplier;
  const gross = totalEconomic + painSuffering;

  const liabilityPct = form.liability_percentage;
  const adjustedGross = gross * (liabilityPct / 100);

  const lowPct = Math.max(0, Math.min(100, form.settlement_range_low_pct)) / 100;
  const highPct = Math.max(0, Math.min(100, form.settlement_range_high_pct)) / 100;
  const settlementLow = Math.round(adjustedGross * lowPct * 100) / 100;
  const settlementHigh = Math.round(adjustedGross * highPct * 100) / 100;

  const notes: string[] = [];
  if (m.future_medical_estimate > 0) notes.push('Future medical estimate included — consider expert support for large values.');
  if (li.future_lost_earning_capacity > 0) notes.push('Future lost earning capacity included — vocational expert may strengthen this claim.');
  if (form.pain_suffering_multiplier >= 5.0) notes.push(`Multiplier of ${form.pain_suffering_multiplier}x is high — ensure injury severity supports this.`);
  if (liabilityPct < 100) notes.push(`Liability adjusted to ${liabilityPct}% — settlement range reflects comparative fault.`);
  if (gross === 0) notes.push('All inputs are zero — enter expense values to see a meaningful calculation.');

  return {
    breakdown: {
      medical_total: Math.round(totalMedical * 100) / 100,
      lost_income_total: Math.round(totalLostIncome * 100) / 100,
      pain_suffering: Math.round(painSuffering * 100) / 100,
      property_damage: Math.round(form.property_damage * 100) / 100,
      out_of_pocket: Math.round(form.out_of_pocket_expenses * 100) / 100,
    },
    gross_damages: Math.round(gross * 100) / 100,
    adjusted_gross: Math.round(adjustedGross * 100) / 100,
    settlement_range_low: settlementLow,
    settlement_range_high: settlementHigh,
    liability_percentage: liabilityPct,
    notes,
  };
}

export default function DamagesPage() {
  const { tenantId } = useTenant();
  const toast = useCompanyToast();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const { hasFeature } = useFeatureAccess();
  const settleEnabled = hasFeature('settle');

  const [saving, setSaving] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [multiplierNotes, setMultiplierNotes] = useState('');

  const [form, setForm] = useState<DamagesRequest & { liability_percentage: number; settlement_range_low_pct: number; settlement_range_high_pct: number }>({
    tenant_id: tenantId ?? '',
    medical: { emergency_room: 0, hospitalization: 0, surgery: 0, physical_therapy: 0, specialist_visits: 0, medications: 0, future_medical_estimate: 0, other_medical: 0 },
    lost_income: { weekly_wage: 0, weeks_missed: 0, future_lost_earning_capacity: 0 },
    pain_suffering_multiplier: 3,
    property_damage: 0,
    out_of_pocket_expenses: 0,
    liability_percentage: 100,
    settlement_range_low_pct: 60,
    settlement_range_high_pct: 85,
  });

  useEffect(() => {
    if (!tenantId) return;
    setCasesLoading(true);
    leverageClient.listCases(tenantId, { limit: 100 })
      .then((res) => setCases(res.cases))
      .catch(() => setCases([]))
      .finally(() => setCasesLoading(false));
  }, [tenantId]);

  const result = useMemo(() => computeDamages(form), [form]);

  const updateMedical = (field: keyof typeof form.medical, value: number) => {
    setForm((prev) => ({ ...prev, medical: { ...prev.medical, [field]: value } }));
  };

  const updateIncome = (field: keyof typeof form.lost_income, value: number) => {
    setForm((prev) => ({ ...prev, lost_income: { ...prev.lost_income, [field]: value } }));
  };

  const handleSave = async () => {
    if (!caseId || !tenantId) {
      toast.error('Missing Info', 'Select a case first.');
      return;
    }
    setSaving(true);
    try {
      await leverageClient.saveDamages(caseId, {
        input: { ...form, tenant_id: tenantId },
        result: {
          gross_damages: result.gross_damages,
          breakdown: result.breakdown,
          settlement_range_low: result.settlement_range_low,
          settlement_range_high: result.settlement_range_high,
        },
      });
      toast.success('Damages Saved', `Worksheet saved to case ${caseId}.`);
    } catch {
      toast.error('Save Failed', 'Unable to save damages worksheet.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Damages Worksheet</title><style>
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
      .notes{background:#fffbeb;border:1px solid #fcd34d;padding:12px;border-radius:6px;font-size:13px}
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
          <span>Damages Calculator</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Damages Calculator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Estimate personal injury case value in real time</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Medical Expenses
          </h2>
          <div className="grid gap-3 grid-cols-2">
            <NumberField label="Emergency Room" value={form.medical.emergency_room} onChange={(v) => updateMedical('emergency_room', v)} />
            <NumberField label="Hospitalization" value={form.medical.hospitalization} onChange={(v) => updateMedical('hospitalization', v)} />
            <NumberField label="Surgery" value={form.medical.surgery} onChange={(v) => updateMedical('surgery', v)} />
            <NumberField label="Physical Therapy" value={form.medical.physical_therapy} onChange={(v) => updateMedical('physical_therapy', v)} />
            <NumberField label="Specialist Visits" value={form.medical.specialist_visits} onChange={(v) => updateMedical('specialist_visits', v)} />
            <NumberField label="Medications" value={form.medical.medications} onChange={(v) => updateMedical('medications', v)} />
            <NumberField label="Future Medical" value={form.medical.future_medical_estimate} onChange={(v) => updateMedical('future_medical_estimate', v)} />
            <NumberField label="Other Medical" value={form.medical.other_medical} onChange={(v) => updateMedical('other_medical', v)} />
          </div>

          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Lost Income
          </h2>
          <div className="grid gap-3 grid-cols-2">
            <NumberField label="Weekly Wage" value={form.lost_income.weekly_wage} onChange={(v) => updateIncome('weekly_wage', v)} />
            <NumberField label="Weeks Missed" value={form.lost_income.weeks_missed} onChange={(v) => updateIncome('weeks_missed', v)} />
            <NumberField label="Future Lost Earnings" value={form.lost_income.future_lost_earning_capacity} onChange={(v) => updateIncome('future_lost_earning_capacity', v)} />
          </div>

          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Other Damages & Liability
          </h2>
          <div className="grid gap-3 grid-cols-2">
            <NumberField label="Pain & Suffering Multiplier" value={form.pain_suffering_multiplier} onChange={(v) => setForm((p) => ({ ...p, pain_suffering_multiplier: v }))} step={0.1} />
            <NumberField label="Property Damage" value={form.property_damage} onChange={(v) => setForm((p) => ({ ...p, property_damage: v }))} />
            <NumberField label="Out-of-Pocket" value={form.out_of_pocket_expenses} onChange={(v) => setForm((p) => ({ ...p, out_of_pocket_expenses: v }))} />
            <NumberField label="Liability % (0-100)" value={form.liability_percentage} onChange={(v) => setForm((p) => ({ ...p, liability_percentage: Math.min(100, Math.max(0, v)) }))} step={1} />
          </div>

          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Settlement Range
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">Adjust the negotiation floor and ceiling percentages</p>
          <div className="grid gap-3 grid-cols-2">
            <NumberField label="Range Low % (floor)" value={form.settlement_range_low_pct} onChange={(v) => setForm((p) => ({ ...p, settlement_range_low_pct: Math.min(100, Math.max(0, v)) }))} step={1} />
            <NumberField label="Range High % (ceiling)" value={form.settlement_range_high_pct} onChange={(v) => setForm((p) => ({ ...p, settlement_range_high_pct: Math.min(100, Math.max(0, v)) }))} step={1} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Multiplier Justification / Notes</label>
            <textarea
              value={multiplierNotes}
              onChange={(e) => setMultiplierNotes(e.target.value)}
              placeholder="e.g., 5x justified by permanent scarring and PTSD diagnosis..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
            />
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
              <ResultBox label="Medical Total" value={`$${result.breakdown.medical_total.toLocaleString()}`} />
              <ResultBox label="Lost Income" value={`$${result.breakdown.lost_income_total.toLocaleString()}`} />
              <ResultBox label="Pain & Suffering" value={`$${result.breakdown.pain_suffering.toLocaleString()}`} />
              <ResultBox label="Property Damage" value={`$${result.breakdown.property_damage.toLocaleString()}`} />
              <ResultBox label="Out-of-Pocket" value={`$${result.breakdown.out_of_pocket.toLocaleString()}`} />
              {form.liability_percentage < 100 && (
                <ResultBox label="Gross (before liability)" value={`$${result.gross_damages.toLocaleString()}`} />
              )}
              <ResultBox label="Adjusted Gross" value={`$${result.adjusted_gross.toLocaleString()}`} highlight />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Settlement Range ({form.liability_percentage}% liability)</p>
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/40 px-2 py-0.5 rounded">{form.settlement_range_low_pct}% – {form.settlement_range_high_pct}% of adjusted gross</span>
              </div>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-300">${result.settlement_range_low.toLocaleString()} – ${result.settlement_range_high.toLocaleString()}</p>
            </div>

            {/* SETTLE Intelligence Report CTA */}
            {result.gross_damages > 0 && (
              <div className={`rounded-lg p-4 ${settleEnabled ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm font-semibold flex items-center gap-2 ${!settleEnabled ? 'text-amber-800 dark:text-amber-300' : ''}`}>
                      <Scale className="h-4 w-4" />
                      {settleEnabled ? 'Want comparable settlement data?' : 'SETTLE Intelligence is not included'}
                    </p>
                    <p className={`text-xs mt-1 ${settleEnabled ? 'text-gray-300 dark:text-gray-600' : 'text-amber-700 dark:text-amber-400'}`}>
                      {settleEnabled
                        ? 'See what similar cases have actually settled for in your jurisdiction. Professional 4-page PDF report with anonymized comparables, insurer behavior patterns, and negotiation strategy.'
                        : 'Upgrade to Growth tier or add the SETTLE Intelligence add-on to access comparable settlement data, insurer behavior patterns, and professional PDF reports.'}
                    </p>
                  </div>
                  {settleEnabled ? (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          medical_bills: String(result.breakdown.medical_total),
                          lost_wages: String(result.breakdown.lost_income_total),
                          property_damage: String(result.breakdown.property_damage),
                          pain_suffering: String(result.breakdown.pain_suffering),
                          gross_damages: String(result.gross_damages),
                          liability_pct: String(form.liability_percentage),
                          source: 'leverage_damages',
                        });
                        router.push(`/dashboard/settle/analysis?${params.toString()}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                    >
                      Get SETTLE Report <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/billing"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
                    >
                      <Lock className="h-3.5 w-3.5" /> Upgrade
                    </Link>
                  )}
                </div>
              </div>
            )}

            {result.notes.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1">
                {result.notes.map((note, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">• {note}</p>
                ))}
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
