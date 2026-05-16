'use client';

import { useState } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { draftClient, DeadlineResult, CalculateDeadlinesResponse, DeadlineUrgency } from '@/lib/api/draft-client';

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

const URGENCY_CONFIG: Record<DeadlineUrgency, { badge: string; dot: string; label: string; bold: boolean; valueColor: string; }> = {
  OK:       { badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',   dot: 'bg-green-500', label: 'OK',             bold: false, valueColor: 'text-gray-600 dark:text-gray-400' },
  WARNING:  { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',   dot: 'bg-amber-500', label: 'WARNING',        bold: false, valueColor: 'text-amber-600 dark:text-amber-400' },
  CRITICAL: { badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',           dot: 'bg-red-500',   label: 'CRITICAL',       bold: false, valueColor: 'text-red-600 dark:text-red-400' },
  OVERDUE:  { badge: 'bg-red-800 text-red-100',                                                dot: 'bg-red-800',   label: 'ALREADY OVERDUE',bold: true,  valueColor: 'text-red-700 dark:text-red-400' },
};

export default function LeverageDeadlinesPage() {
  const [state, setState] = useState('');
  const [practiceArea, setPracticeArea] = useState<'personal_injury' | 'employment_law'>('personal_injury');
  const [incidentDate, setIncidentDate] = useState('');
  const [discriminationDate, setDiscriminationDate] = useState('');
  const [rightToSueDate, setRightToSueDate] = useState('');
  const [results, setResults] = useState<CalculateDeadlinesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = state !== '' && ((practiceArea === 'personal_injury' && incidentDate !== '') || (practiceArea === 'employment_law' && discriminationDate !== ''));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      const res = await draftClient.calculateDeadlines({
        jurisdiction_state: state, practice_area: practiceArea,
        incident_date: practiceArea === 'personal_injury' ? incidentDate || undefined : undefined,
        discrimination_date: practiceArea === 'employment_law' ? discriminationDate || undefined : undefined,
        right_to_sue_date: practiceArea === 'employment_law' && rightToSueDate ? rightToSueDate : undefined,
      });
      setResults(res);
    } catch {
      setError('Could not calculate deadlines. Please verify the LEVERAGE service is running.');
    } finally { setLoading(false); }
  }

  function formatDate(dateStr: string): string {
    try { return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/dashboard/leverage" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">LEVERAGE Service</Link>
          <span className="mx-1.5">›</span>
          <span>Deadline Calculator</span>
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Deadline Calculator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Enter your case dates — we calculate every deadline automatically</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Enter Case Details</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="dl-state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">State</label>
              <select id="dl-state" value={state} onChange={e => setState(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">Select a state...</option>
                {US_STATES.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dl-pa" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Practice Area</label>
              <select id="dl-pa" value={practiceArea} onChange={e => setPracticeArea(e.target.value as 'personal_injury' | 'employment_law')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="personal_injury">Personal Injury</option>
                <option value="employment_law">Employment Law</option>
              </select>
            </div>
            {practiceArea === 'personal_injury' && (
              <div>
                <label htmlFor="dl-incident" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date of Injury or Incident</label>
                <input type="date" id="dl-incident" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
            )}
            {practiceArea === 'employment_law' && (
              <>
                <div>
                  <label htmlFor="dl-discrim" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Discriminatory Act Occurred</label>
                  <input type="date" id="dl-discrim" value={discriminationDate} onChange={e => setDiscriminationDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label htmlFor="dl-rts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Right-to-Sue Letter Received</label>
                  <input type="date" id="dl-rts" value={rightToSueDate} onChange={e => setRightToSueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave blank if you haven&apos;t received it yet</p>
                </div>
              </>
            )}
            <button type="submit" disabled={!canSubmit || loading} className="w-full py-2.5 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-900" />Calculating...</> : 'Calculate Deadlines'}
            </button>
          </form>
        </div>

        {results ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Your Deadlines</h2>
            <div className="space-y-3">
              {results.deadlines.map((d, i) => <DeadlineRow key={`${d.deadline_type}-${i}`} deadline={d} formatDate={formatDate} />)}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-6 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
              These calculations are based on verified statutory data. Always confirm deadlines independently with the applicable statute. TrueVow LEVERAGE is a compliance aid, not legal advice.
            </p>
          </div>
        ) : !loading && (
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 flex items-center justify-center min-h-[280px]">
            <div className="text-center">
              <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Your deadlines will appear here</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Fill in the form and click Calculate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeadlineRow({ deadline, formatDate }: { deadline: DeadlineResult; formatDate: (d: string) => string }) {
  const cfg = URGENCY_CONFIG[deadline.urgency];
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-0.5 ${cfg.dot}`} />
          <span className={`text-sm text-gray-900 dark:text-gray-100 ${cfg.bold ? 'font-bold' : 'font-semibold'}`}>{deadline.label}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${cfg.badge}`}>{cfg.label}</span>
      </div>
      <div className="pl-4 space-y-1.5">
        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />{formatDate(deadline.deadline_date)}</p>
        <p className={`text-sm font-semibold ${cfg.valueColor}`}>{deadline.urgency === 'OVERDUE' ? `${Math.abs(deadline.days_remaining)} days overdue` : `${deadline.days_remaining} days remaining`}</p>
        {deadline.statute_citation && <p className="text-xs text-gray-500 dark:text-gray-400">Statute: {deadline.statute_citation}</p>}
        {deadline.note && <p className="text-xs text-gray-400 dark:text-gray-500 italic">{deadline.note}</p>}
      </div>
    </div>
  );
}
