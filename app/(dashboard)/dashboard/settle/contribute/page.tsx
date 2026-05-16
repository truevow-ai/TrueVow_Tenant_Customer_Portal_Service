'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, CheckCircle, Scale, AlertTriangle } from 'lucide-react';
import { useCompanyToast } from '@/hooks/useCompanyToast';

const COUNTIES = [
  'Duval County, FL', 'Hillsborough County, FL', 'Miami-Dade County, FL',
  'Orange County, FL', 'Palm Beach County, FL', 'Broward County, FL',
  'Pinellas County, FL', 'Polk County, FL', 'Lee County, FL',
  'Maricopa County, AZ', 'Pima County, AZ', 'Clark County, NV',
  'Los Angeles County, CA', 'San Diego County, CA', 'Orange County, CA',
  'Cook County, IL', 'Harris County, TX', 'Dallas County, TX',
];

const INCIDENTS = [
  'Motor Vehicle Accident', 'Slip and Fall', 'Dog Bite',
  'Premises Liability', 'Wrongful Death', 'Medical Malpractice',
  'Product Liability', 'Workplace Injury', 'Other',
];

const INJURIES = [
  'Minor Soft Tissue', 'Moderate Soft Tissue', 'Fracture',
  'Spinal Injury', 'TBI', 'Catastrophic', 'Multiple Injuries',
];

const OUTCOME_BANDS = [
  '$0–$10k', '$10k–$25k', '$25k–$50k', '$50k–$100k',
  '$100k–$250k', '$250k–$500k', '$500k–$1M', '$1M+',
];

const TREATMENT_TYPES = [
  'Emergency Room', 'Physical Therapy', 'Surgery', 'Chiropractic',
  'Pain Management', 'Specialist Consultation', 'Hospitalization',
];

function ContributeForm() {
  const searchParams = useSearchParams();
  const toast = useCompanyToast();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    jurisdiction: searchParams.get('county') || searchParams.get('jurisdiction') || '',
    case_type: searchParams.get('incident_type') || searchParams.get('case_type') || '',
    injury_category: searchParams.get('injury') || '',
    medical_bills: Number(searchParams.get('medical_bills') || 0),
    lost_wages: Number(searchParams.get('lost_wages') || 0),
    outcome_amount_range: '',
    outcome_type: 'Settlement',
    treatment_type: [] as string[],
    duration_of_treatment: '',
    policy_limits: '',
    defendant_category: '',
    consent_confirmed: false,
  });

  const setField = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const toggleTreatment = (t: string) => {
    setForm((p) => ({
      ...p,
      treatment_type: p.treatment_type.includes(t)
        ? p.treatment_type.filter((x) => x !== t)
        : [...p.treatment_type, t],
    }));
  };

  const handleSubmit = async () => {
    if (!form.consent_confirmed) {
      toast.error('Consent Required', 'You must confirm that no PHI/PII is included.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/settle/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdiction: form.jurisdiction,
          case_type: form.case_type,
          injury_category: form.injury_category ? [form.injury_category] : [],
          medical_bills: form.medical_bills,
          lost_wages: form.lost_wages,
          outcome_amount_range: form.outcome_amount_range,
          outcome_type: form.outcome_type,
          treatment_type: form.treatment_type,
          duration_of_treatment: form.duration_of_treatment,
          policy_limits: form.policy_limits,
          defendant_category: form.defendant_category,
          consent_confirmed: form.consent_confirmed,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error('Submission Failed', data.message || 'Unable to submit settlement data.');
      }
    } catch {
      toast.error('Submission Failed', 'SETTLE service unavailable.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settlement Data Submitted</h2>
        <p className="text-sm text-gray-500 mt-2">
          Thank you for contributing to the SETTLE database. Your submission is pending review and will help attorneys nationwide negotiate better outcomes.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard/leverage/cases"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            Back to Cases
          </Link>
          <Link
            href="/dashboard/settle"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Settlement Intelligence
          </Link>
        </div>
      </div>
    );
  }

  const ready = form.jurisdiction && form.case_type && form.injury_category && form.outcome_amount_range && form.consent_confirmed;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/leverage/cases" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Cases
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Contribute Settlement Data
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Help the plaintiff attorney community by sharing anonymized settlement outcomes. Takes under 60 seconds. Zero PHI.
        </p>
      </div>

      {/* Compliance Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No PHI / No PII Policy</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Do NOT include client names, SSNs, case numbers, or free-text narratives. All fields are drop-downs or numeric. Your identity is never stored with the submission.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Case Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Jurisdiction (County)</label>
            <select
              value={form.jurisdiction}
              onChange={(e) => setField('jurisdiction', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select county</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Incident Type</label>
            <select
              value={form.case_type}
              onChange={(e) => setField('case_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select type</option>
              {INCIDENTS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Injury Category</label>
            <select
              value={form.injury_category}
              onChange={(e) => setField('injury_category', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select injury</option>
              {INJURIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Settlement Band</label>
            <select
              value={form.outcome_amount_range}
              onChange={(e) => setField('outcome_amount_range', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select band</option>
              {OUTCOME_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Medical Bills ($)</label>
            <input
              type="number"
              min={0}
              value={form.medical_bills || ''}
              onChange={(e) => setField('medical_bills', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Lost Wages ($)</label>
            <input
              type="number"
              min={0}
              value={form.lost_wages || ''}
              onChange={(e) => setField('lost_wages', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Treatment Types (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {TREATMENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleTreatment(t)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  form.treatment_type.includes(t)
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Duration of Treatment</label>
            <select
              value={form.duration_of_treatment}
              onChange={(e) => setField('duration_of_treatment', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select</option>
              <option value="< 1 month">&lt; 1 month</option>
              <option value="1-3 months">1-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6-12 months">6-12 months</option>
              <option value="1-2 years">1-2 years</option>
              <option value="> 2 years">&gt; 2 years</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Policy Limits</label>
            <select
              value={form.policy_limits}
              onChange={(e) => setField('policy_limits', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select</option>
              <option value="$10k/$20k">$10k/$20k</option>
              <option value="$15k/$30k">$15k/$30k</option>
              <option value="$25k/$50k">$25k/$50k</option>
              <option value="$50k/$100k">$50k/$100k</option>
              <option value="$100k/$300k">$100k/$300k</option>
              <option value="$250k/$500k">$250k/$500k</option>
              <option value="$500k/$1M">$500k/$1M</option>
              <option value="$1M+">$1M+</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Defendant Category</label>
            <select
              value={form.defendant_category}
              onChange={(e) => setField('defendant_category', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select</option>
              <option value="Individual">Individual</option>
              <option value="Business">Business</option>
              <option value="Government">Government</option>
              <option value="Insurance Company">Insurance Company</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Outcome Type</label>
            <select
              value={form.outcome_type}
              onChange={(e) => setField('outcome_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="Settlement">Settlement</option>
              <option value="Verdict">Verdict</option>
              <option value="Arbitration">Arbitration</option>
              <option value="Mediation">Mediation</option>
            </select>
          </div>
        </div>

        {/* Consent */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent_confirmed}
              onChange={(e) => setField('consent_confirmed', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              I confirm this submission contains <strong>no PHI, no PII, no client identifiers, and no free-text narratives</strong>. All data is anonymized and provided with consent.
            </span>
          </label>
        </div>

        <button
          disabled={!ready || submitting}
          onClick={handleSubmit}
          className="w-full py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit to SETTLE Database'}
        </button>
      </div>
    </div>
  );
}

export default function ContributePage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400 p-8">Loading…</div>}>
      <ContributeForm />
    </Suspense>
  );
}
