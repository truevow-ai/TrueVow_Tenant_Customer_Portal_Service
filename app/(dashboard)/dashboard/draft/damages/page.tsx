'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DollarSign, ArrowRight, AlertCircle, Info } from 'lucide-react';

interface MedicalInputs {
  emergency_room: string;
  hospitalization: string;
  surgery: string;
  physical_therapy: string;
  specialist_visits: string;
  medications: string;
  future_medical_estimate: string;
  other_medical: string;
}

interface LostIncomeInputs {
  weekly_wage: string;
  weeks_missed: string;
  future_lost_earning_capacity: string;
}

interface DamagesResult {
  breakdown: {
    total_medical_specials: number;
    total_lost_income: number;
    pain_and_suffering: number;
    property_damage: number;
    out_of_pocket_expenses: number;
    total_economic_damages: number;
    total_non_economic_damages: number;
    gross_damages: number;
    notes: string[];
  };
  gross_damages: number;
  settlement_range_low: number;
  settlement_range_high: number;
  multiplier_used: number;
  disclaimer: string;
}

export default function DamagesPage() {
  const [medical, setMedical] = useState<MedicalInputs>({
    emergency_room: '',
    hospitalization: '',
    surgery: '',
    physical_therapy: '',
    specialist_visits: '',
    medications: '',
    future_medical_estimate: '',
    other_medical: '',
  });
  const [lostIncome, setLostIncome] = useState<LostIncomeInputs>({
    weekly_wage: '',
    weeks_missed: '',
    future_lost_earning_capacity: '',
  });
  const [multiplier, setMultiplier] = useState('3.0');
  const [propertyDamage, setPropertyDamage] = useState('');
  const [outOfPocket, setOutOfPocket] = useState('');
  const [result, setResult] = useState<DamagesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leverage/damages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'portal-user',
          medical: {
            emergency_room: parseFloat(medical.emergency_room) || 0,
            hospitalization: parseFloat(medical.hospitalization) || 0,
            surgery: parseFloat(medical.surgery) || 0,
            physical_therapy: parseFloat(medical.physical_therapy) || 0,
            specialist_visits: parseFloat(medical.specialist_visits) || 0,
            medications: parseFloat(medical.medications) || 0,
            future_medical_estimate: parseFloat(medical.future_medical_estimate) || 0,
            other_medical: parseFloat(medical.other_medical) || 0,
          },
          lost_income: {
            weekly_wage: parseFloat(lostIncome.weekly_wage) || 0,
            weeks_missed: parseFloat(lostIncome.weeks_missed) || 0,
            future_lost_earning_capacity: parseFloat(lostIncome.future_lost_earning_capacity) || 0,
          },
          pain_suffering_multiplier: parseFloat(multiplier) || 3.0,
          property_damage: parseFloat(propertyDamage) || 0,
          out_of_pocket_expenses: parseFloat(outOfPocket) || 0,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
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
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/draft" className="hover:text-gray-600 dark:hover:text-gray-300">LEVERAGE</Link>
          <span className="mx-1.5">›</span>
          <span>Damages Worksheet</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Damages Worksheet</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Calculate total damages and your estimated settlement range.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex gap-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          This tool is a calculation aid only. No data is saved. Results do not constitute legal advice.
        </p>
      </div>

      {/* Medical Expenses */}
      <Section title="Medical Expenses">
        <div className="grid grid-cols-2 gap-4">
          {([
            ['Emergency Room', 'emergency_room'],
            ['Hospitalization', 'hospitalization'],
            ['Surgery', 'surgery'],
            ['Physical Therapy', 'physical_therapy'],
            ['Specialist Visits', 'specialist_visits'],
            ['Medications', 'medications'],
            ['Future Medical (estimate)', 'future_medical_estimate'],
            ['Other Medical', 'other_medical'],
          ] as [string, keyof MedicalInputs][]).map(([label, key]) => (
            <InputField
              key={key}
              label={label}
              value={medical[key]}
              onChange={v => setMedical(prev => ({ ...prev, [key]: v }))}
            />
          ))}
        </div>
      </Section>

      {/* Lost Income */}
      <Section title="Lost Income">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Weekly Wage (before injury)" value={lostIncome.weekly_wage} onChange={v => setLostIncome(prev => ({ ...prev, weekly_wage: v }))} />
          <InputField label="Weeks of Work Missed" value={lostIncome.weeks_missed} onChange={v => setLostIncome(prev => ({ ...prev, weeks_missed: v }))} />
          <InputField label="Future Lost Earning Capacity" value={lostIncome.future_lost_earning_capacity} onChange={v => setLostIncome(prev => ({ ...prev, future_lost_earning_capacity: v }))} />
        </div>
      </Section>

      {/* Other Damages */}
      <Section title="Other Damages">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Property Damage" value={propertyDamage} onChange={setPropertyDamage} />
          <InputField label="Out-of-Pocket Expenses" value={outOfPocket} onChange={setOutOfPocket} />
        </div>
      </Section>

      {/* Multiplier */}
      <Section title="Pain & Suffering Multiplier">
        <div className="flex items-center gap-4">
          <input
            type="range" min="1" max="10" step="0.5"
            value={multiplier}
            onChange={e => setMultiplier(e.target.value)}
            className="flex-1 accent-gray-900 dark:accent-gray-100"
          />
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 w-12 text-right">{multiplier}×</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Typical PI range: 1.5–5×. Applied to total medical specials.
        </p>
      </Section>

      <button
        onClick={calculate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50"
      >
        {loading ? 'Calculating' : 'Calculate Damages'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      {error && (
        <div className="flex gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Results</h2>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Medical Specials" value={fmt(result.breakdown.total_medical_specials)} />
            <ResultCard label="Lost Income" value={fmt(result.breakdown.total_lost_income)} />
            <ResultCard label="Pain & Suffering" value={fmt(result.breakdown.pain_and_suffering)} sub={`${result.multiplier_used} multiplier`} />
            <ResultCard label="Property & Other" value={fmt(result.breakdown.property_damage + result.breakdown.out_of_pocket_expenses)} />
          </div>

          <div className="bg-gray-900 dark:bg-gray-100 rounded-lg p-6 text-white dark:text-gray-900">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Gross Damages</p>
            <p className="text-4xl font-bold tabular-nums">{fmt(result.gross_damages)}</p>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-xs opacity-60">Settlement Low</p>
                <p className="text-xl font-bold">{fmt(result.settlement_range_low)}</p>
              </div>
              <div>
                <p className="text-xs opacity-60">Settlement High</p>
                <p className="text-xl font-bold">{fmt(result.settlement_range_high)}</p>
              </div>
            </div>
          </div>

          {result.breakdown.notes.length > 0 && (
            <div className="space-y-1">
              {result.breakdown.notes.map((note, i) => (
                <div key={i} className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {note}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      {children}
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

function ResultCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
