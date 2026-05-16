'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { draftClient, FullValidationResult, ValidationError, DeadlineUrgency } from '@/lib/api/draft-client';
import { useTenant } from '@/hooks/useTenant';

const PI_DOC_TYPES  = [{ value: 'complaint', label: 'Complaint' }, { value: 'demand_letter', label: 'Demand Letter' }, { value: 'motion', label: 'Motion' }];
const EMP_DOC_TYPES = [{ value: 'eeoc_charge', label: 'EEOC Charge' }, { value: 'complaint', label: 'Complaint' }, { value: 'motion', label: 'Motion' }];

const US_STATES: [string, string][] = [
  ['AL','Alabama'],    ['AK','Alaska'],     ['AZ','Arizona'],     ['AR','Arkansas'],
  ['CA','California'], ['CO','Colorado'],   ['CT','Connecticut'], ['DE','Delaware'],
  ['FL','Florida'],    ['GA','Georgia'],    ['HI','Hawaii'],      ['ID','Idaho'],
  ['IL','Illinois'],   ['IN','Indiana'],    ['IA','Iowa'],        ['KS','Kansas'],
  ['KY','Kentucky'],   ['LA','Louisiana'],  ['ME','Maine'],       ['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'], ['MN','Minnesota'],   ['MS','Mississippi'],
  ['MO','Missouri'],   ['MT','Montana'],    ['NE','Nebraska'],    ['NV','Nevada'],
  ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'], ['NY','New York'],
  ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],    ['OK','Oklahoma'],
  ['OR','Oregon'],     ['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'], ['TX','Texas'],       ['UT','Utah'],
  ['VT','Vermont'],    ['VA','Virginia'],   ['WA','Washington'],  ['WV','West Virginia'],
  ['WI','Wisconsin'],  ['WY','Wyoming'],
];

const URGENCY_BADGE: Record<DeadlineUrgency, string> = {
  OK:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  WARNING:  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  OVERDUE:  'bg-red-800 text-red-100',
};

export default function LeverageValidatePage() {
  const { tenantId } = useTenant();
  const [practiceArea, setPracticeArea] = useState<'personal_injury' | 'employment_law'>('personal_injury');
  const [documentType, setDocumentType] = useState('complaint');
  const [jurisdiction, setJurisdiction] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [result, setResult] = useState<FullValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docTypes = practiceArea === 'personal_injury' ? PI_DOC_TYPES : EMP_DOC_TYPES;
  const canSubmit = documentType !== '' && jurisdiction !== '' && documentText.trim().length > 20;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !tenantId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await draftClient.validateFull(tenantId, {
        document_type: documentType, jurisdiction, practice_area: practiceArea,
        document_text: documentText,
        ...(incidentDate ? { incident_date: incidentDate } : {}),
      });
      setResult(res);
    } catch {
      setError('Validation failed. Please verify the LEVERAGE service is running.');
    } finally { setLoading(false); }
  }

  const totalIssues = result ? result.errors.length + result.warnings.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE Service</Link>
          <span className="mx-1.5">›</span>
          <span>Validate Document</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Validate Document</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Check your legal document against jurisdiction-specific compliance rules</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Practice Area</label>
            <select value={practiceArea} onChange={e => { setPracticeArea(e.target.value as 'personal_injury' | 'employment_law'); setDocumentType(e.target.value === 'personal_injury' ? PI_DOC_TYPES[0].value : EMP_DOC_TYPES[0].value); }} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="personal_injury">Personal Injury</option>
              <option value="employment_law">Employment Law</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Document Type</label>
            <select value={documentType} onChange={e => setDocumentType(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              {docTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">State / Jurisdiction</label>
            <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              <option value="">Select a state...</option>
              {US_STATES.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Incident Date <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
            <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Document Text</label>
          <textarea value={documentText} onChange={e => setDocumentText(e.target.value)} rows={12} placeholder="Paste your document text here..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{documentText.trim().length} characters — minimum 20 required</p>
        </div>
        <button type="submit" disabled={!canSubmit || loading} className="py-2.5 px-5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {loading ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-900" />Validating...</> : 'Run Validation'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className={`rounded-lg border p-5 ${result.is_valid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className={`text-base font-bold ${result.is_valid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{result.is_valid ? 'COMPLIANT' : 'NON-COMPLIANT'}</span>
              <div className="flex gap-3 text-xs font-medium">
                {result.errors.length > 0 && <span className="text-red-600 dark:text-red-400">{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}</span>}
                {result.warnings.length > 0 && <span className="text-amber-600 dark:text-amber-400">{result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}</span>}
                <span className="text-gray-500 dark:text-gray-400">{result.rules_checked} rules checked</span>
              </div>
            </div>
            {result.deadline_summary && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{result.deadline_summary.label}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${URGENCY_BADGE[result.deadline_summary.urgency]}`}>{result.deadline_summary.urgency}</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{new Date(result.deadline_summary.deadline_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — {result.deadline_summary.days_remaining} days remaining</p>
                {result.deadline_summary.statute_citation && <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">Statute: {result.deadline_summary.statute_citation}</p>}
              </div>
            )}
          </div>
          {totalIssues > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {result.errors.map((e, i) => <IssueRow key={`err-${i}`} issue={e} type="error" />)}
              {result.warnings.map((w, i) => <IssueRow key={`warn-${i}`} issue={w} type="warning" />)}
              {(result.info ?? []).map((inf, i) => (
                <div key={`info-${i}`} className="p-4 flex items-start gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                  <div><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{inf.rule_name}</p><p className="text-sm text-gray-600 dark:text-gray-300">{inf.message}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, type }: { issue: ValidationError; type: 'error' | 'warning' }) {
  const [open, setOpen] = useState(false);
  const color = type === 'error' ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${color}`} />
          <div className="min-w-0"><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{issue.rule_name}</p><p className="text-sm text-gray-700 dark:text-gray-300 truncate">{issue.message}</p></div>
        </div>
        {issue.suggestion && (open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />)}
      </button>
      {open && issue.suggestion && (
        <div className="mt-3 ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-700"><p className="text-sm text-gray-500 dark:text-gray-400 italic">{issue.suggestion}</p></div>
      )}
    </div>
  );
}
