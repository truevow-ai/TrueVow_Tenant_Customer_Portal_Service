'use client';

/**
 * IntakeSignalPanel — 12-Signal Deterministic Case Triage
 *
 * Architecture: Intake Data → Deterministic Signals → Attorney Actions
 *
 * All signals derived from FSM-captured answers only.
 * No AI. No predictions. No settlement estimates. No legal advice.
 * Designed for solo PI firm 5-second case screening workflow.
 */

import { CheckCircle2, AlertTriangle, Clock, MessageSquare, ListChecks, ChevronRight } from 'lucide-react';
import { IntakeResponse, isUnlockAvailable, getJurisdictionFromPhone } from '@/lib/utils/case-scoring';

// ============================================================================
// TYPES
// ============================================================================

interface IntakeSignalPanelProps {
  responses: IntakeResponse[];
  practiceAreaCode: string | null;
  durationSeconds?: number | null;
  phone?: string;
}

type SignalStatus = 'ok' | 'warn' | 'unknown';

interface Signal {
  label: string;
  status: SignalStatus;
  note?: string;
}

// ============================================================================
// SIGNAL EXTRACTORS
// ============================================================================

function getVal(responses: IntakeResponse[], key: string): string | null {
  return responses.find(r => r.question_key === key)?.response_value ?? null;
}

function getValByPartial(responses: IntakeResponse[], partial: string): string | null {
  return responses.find(r => r.question_key.includes(partial))?.response_value ?? null;
}

/**
 * Build all 12 deterministic signals from intake answers + coreSignals.
 */
function buildSignals(
  responses: IntakeResponse[],
  practiceAreaCode: string | null,
  phone: string | undefined,
  coreSignals: ReturnType<typeof isUnlockAvailable>['coreSignals'],
  jurisdiction: ReturnType<typeof getJurisdictionFromPhone>
): Signal[] {
  const pa = practiceAreaCode || '';

  // ── Signal 1: Jurisdiction ──────────────────────────────────────────────
  const jurisdictionSignal: Signal = coreSignals.isValidJurisdiction
    ? { label: `Jurisdiction confirmed (${jurisdiction.stateCode})`, status: 'ok' }
    : { label: 'Outside jurisdiction or not confirmed', status: 'warn' };

  // ── Signal 2: Statute Window ────────────────────────────────────────────
  const when = getValByPartial(responses, 'WHEN_OCCURRED') || getValByPartial(responses, 'Q02_WHEN');
  let statuteSignal: Signal;
  if (!when) {
    statuteSignal = { label: 'Incident timing not captured', status: 'unknown' };
  } else if (when === '1' || when === '2' || when === '3') {
    statuteSignal = { label: 'Recent incident - statute window safe', status: 'ok' };
  } else if (when === '4') {
    statuteSignal = { label: 'Incident over 6 months ago - confirm date', status: 'warn' };
  } else {
    statuteSignal = { label: 'Older incident - statute window at risk', status: 'warn' };
  }

  // ── Signal 3: Injury Severity ───────────────────────────────────────────
  const injury = getValByPartial(responses, 'Q05_INJURY') ||
    getValByPartial(responses, 'Q04_INJURY') ||
    getValByPartial(responses, 'Q08_INJURY') ||
    getValByPartial(responses, 'INJURY_DESCRIPTION');
  let injurySignal: Signal;
  if (!injury) {
    injurySignal = { label: 'Injury not described', status: 'unknown' };
  } else if (injury === '3' || injury === '4') {
    injurySignal = { label: 'Severe injury reported', status: 'ok' };
  } else if (injury === '2') {
    injurySignal = { label: 'Moderate injury reported', status: 'ok' };
  } else {
    injurySignal = { label: 'Minor injury reported', status: 'warn', note: 'May not meet damages threshold' };
  }

  // ── Signal 4: Medical Treatment ─────────────────────────────────────────
  const treatment = getValByPartial(responses, 'MEDICAL_TREATMENT') ||
    getValByPartial(responses, 'Q06_MEDICAL') ||
    getValByPartial(responses, 'Q07_MEDICAL') ||
    getValByPartial(responses, 'Q10_MEDICAL') ||
    getValByPartial(responses, 'Q11_MEDICAL');
  let treatmentSignal: Signal;
  if (!treatment) {
    treatmentSignal = { label: 'Treatment status unknown', status: 'unknown' };
  } else if (treatment === '1') {
    treatmentSignal = { label: 'No medical treatment yet', status: 'warn' };
  } else if (treatment === '4' || treatment === '5' || treatment === '6') {
    treatmentSignal = { label: 'Surgery / extensive treatment confirmed', status: 'ok' };
  } else {
    treatmentSignal = { label: 'Medical treatment documented', status: 'ok' };
  }

  // ── Signal 5: Liability Clarity ─────────────────────────────────────────
  let liabilitySignal: Signal;
  if (pa === 'dog_bite') {
    const owner = getVal(responses, 'DB_Q02_DOG_OWNER');
    const prov = getVal(responses, 'DB_Q03_PROVOCATION');
    if (owner === '1' && prov === '1') {
      liabilitySignal = { label: 'Owner identified, no provocation reported', status: 'ok' };
    } else if (!owner) {
      liabilitySignal = { label: 'Dog owner not yet identified', status: 'warn' };
    } else if (prov === '2') {
      liabilitySignal = { label: 'Possible provocation claimed', status: 'warn' };
    } else {
      liabilitySignal = { label: 'Liability details captured', status: 'ok' };
    }
  } else if (pa === 'slip_fall') {
    const awareness = getVal(responses, 'SF_Q06_PROPERTY_OWNER_AWARENESS');
    if (awareness === '1') liabilitySignal = { label: 'Property owner knew of hazard', status: 'ok' };
    else if (awareness === '2') liabilitySignal = { label: 'Property owner should have known', status: 'ok' };
    else liabilitySignal = { label: 'Property owner awareness unclear', status: 'warn' };
  } else {
    const fault = getVal(responses, 'CA_Q04_AT_FAULT');
    if (fault === '1') liabilitySignal = { label: 'Other party at fault', status: 'ok' };
    else if (fault === '2') liabilitySignal = { label: 'Shared fault reported', status: 'warn' };
    else if (fault === '3') liabilitySignal = { label: 'Client may be at fault', status: 'warn' };
    else liabilitySignal = { label: 'Liability not yet established', status: 'unknown' };
  }

  // ── Signal 6: Third-Party / Insurance Possibility ───────────────────────
  let insuranceSignal: Signal;
  if (pa === 'dog_bite') {
    const owner = getVal(responses, 'DB_Q02_DOG_OWNER');
    if (owner === '1' || owner === '2') {
      insuranceSignal = { label: 'Third-party owner identified (insurance possible)', status: 'ok' };
    } else {
      insuranceSignal = { label: 'Owner unknown - insurance unconfirmed', status: 'unknown' };
    }
  } else {
    const fault = getVal(responses, 'CA_Q04_AT_FAULT');
    if (fault === '1') {
      insuranceSignal = { label: 'Third-party at fault - insurance probable', status: 'ok' };
    } else if (fault) {
      insuranceSignal = { label: 'Liability split - insurance uncertain', status: 'warn' };
    } else {
      insuranceSignal = { label: 'Insurance status not established', status: 'unknown' };
    }
  }

  // ── Signal 7: Prior Attorney ────────────────────────────────────────────
  const priorAtty = getVal(responses, 'CONFLICT_Q01_PRIOR_REP');
  let priorAttySignal: Signal;
  if (priorAtty === '1') {
    priorAttySignal = { label: 'No prior attorney', status: 'ok' };
  } else if (priorAtty === '2') {
    priorAttySignal = { label: 'Has consulted another attorney', status: 'warn' };
  } else if (priorAtty === '3') {
    priorAttySignal = { label: 'Previously represented - conflict check required', status: 'warn' };
  } else {
    priorAttySignal = { label: 'Attorney status unknown', status: 'unknown' };
  }

  // ── Signal 8: Witness Availability ─────────────────────────────────────
  const witness = getVal(responses, 'CA_Q08_WITNESSES') || getVal(responses, 'SF_Q08_WITNESSES');
  let witnessSignal: Signal;
  if (witness === '1') {
    witnessSignal = { label: 'Witness available', status: 'ok' };
  } else if (witness === '2') {
    witnessSignal = { label: 'Passenger witness available', status: 'ok' };
  } else if (witness === '3') {
    witnessSignal = { label: 'No witnesses reported', status: 'warn' };
  } else {
    witnessSignal = { label: 'Witness status unknown', status: 'unknown' };
  }

  // ── Signal 9: Police / Incident Report ─────────────────────────────────
  const citation = getVal(responses, 'CA_Q07_CITATION') || getVal(responses, 'SF_Q07_INCIDENT_REPORT');
  let policeSignal: Signal;
  if (citation === '1' || citation === '2') {
    policeSignal = { label: 'Police report / incident report filed', status: 'ok' };
  } else if (citation === '3' || citation === '0') {
    policeSignal = { label: 'No police report filed', status: 'warn' };
  } else {
    policeSignal = { label: 'Police report status unknown', status: 'unknown' };
  }

  // ── Signal 10: Intake Completion — handled separately in completeness bar ──
  // (returned via unlockStatus, rendered in its own section)

  // ── Signal 11: Consultation Readiness ──────────────────────────────────
  // Deterministic rule: jurisdiction + injury + treatment + contact
  const hasContact = !!(phone && phone.replace(/\D/g, '').length >= 10);
  const consultReadyCount = [
    coreSignals.isValidJurisdiction,
    !!injury,
    !!(treatment && treatment !== '1'),
    hasContact,
  ].filter(Boolean).length;
  const consultReady = consultReadyCount >= 3;
  const consultSignal: Signal = consultReady
    ? { label: `Ready for consultation (${consultReadyCount}/4 checks passed)`, status: 'ok' }
    : { label: `Not yet consultation-ready (${consultReadyCount}/4 checks passed)`, status: 'warn' };

  // ── Signal 12: Lost Wages ───────────────────────────────────────────────
  const wages = getVal(responses, 'CA_Q09_LOST_WAGES');
  let wagesSignal: Signal;
  if (!wages || wages === '1') {
    wagesSignal = { label: 'No lost wages reported', status: 'warn', note: 'Lower damages potential' };
  } else if (wages === '4') {
    wagesSignal = { label: 'Significant lost wages - unable to work', status: 'ok' };
  } else {
    wagesSignal = { label: 'Lost wages reported', status: 'ok' };
  }

  return [
    jurisdictionSignal,
    statuteSignal,
    injurySignal,
    treatmentSignal,
    liabilitySignal,
    insuranceSignal,
    priorAttySignal,
    witnessSignal,
    policeSignal,
    consultSignal,
    wagesSignal,
  ];
}

/**
 * Build the attorney follow-up checklist from missing / weak answers only.
 */
function buildFollowUpChecklist(
  responses: IntakeResponse[],
  practiceAreaCode: string | null,
  missingLabels: string[]
): string[] {
  const actions: string[] = [];
  const pa = practiceAreaCode || '';

  const witness = getVal(responses, 'CA_Q08_WITNESSES') || getVal(responses, 'SF_Q08_WITNESSES');
  const citation = getVal(responses, 'CA_Q07_CITATION') || getVal(responses, 'SF_Q07_INCIDENT_REPORT');
  const treatment = getValByPartial(responses, 'MEDICAL_TREATMENT') ||
    getValByPartial(responses, 'Q06_MEDICAL') || getValByPartial(responses, 'Q07_MEDICAL');
  const wages = getVal(responses, 'CA_Q09_LOST_WAGES');
  const priorAtty = getVal(responses, 'CONFLICT_Q01_PRIOR_REP');

  if (!witness || witness === '3') actions.push('Ask about witnesses at the scene');
  if (!citation) actions.push('Confirm whether police report was filed');
  if (!treatment || treatment === '1') actions.push('Follow up on medical treatment status');
  if (!wages) actions.push('Ask about work impact and lost wages');
  if (priorAtty === '2') actions.push('Clarify prior attorney consultation');
  if (priorAtty === '3') actions.push('Run conflict check — prior representation disclosed');
  if (pa === 'dog_bite') {
    if (!getVal(responses, 'DB_Q02_DOG_OWNER')) actions.push('Confirm dog owner identity and address');
    if (!getVal(responses, 'DB_Q06_INSURANCE')) actions.push('Ask about homeowner or renter insurance');
  }
  if (missingLabels.includes('Jurisdiction')) actions.push('Confirm client location / county');
  if (missingLabels.includes('Incident Date')) actions.push('Get exact incident date');

  return actions.slice(0, 6);
}

// ============================================================================
// SIGNAL ICON
// ============================================================================

function SignalRow({ signal }: { signal: Signal }) {
  const icon = signal.status === 'ok'
    ? <CheckCircle2 className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
    : signal.status === 'warn'
    ? <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
    : <span className="h-4 w-4 flex items-center justify-center shrink-0 mt-0.5 text-gray-300 dark:text-gray-600 text-xs font-bold">?</span>;

  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <span className={`text-sm ${
          signal.status === 'ok' ? 'text-gray-900 dark:text-gray-100' :
          signal.status === 'warn' ? 'text-gray-700 dark:text-gray-200' :
          'text-gray-400 dark:text-gray-500'
        }`}>
          {signal.label}
        </span>
        {signal.note && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">({signal.note})</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function IntakeSignalPanel({
  responses,
  practiceAreaCode,
  durationSeconds,
  phone,
}: IntakeSignalPanelProps) {

  const unlockStatus = isUnlockAvailable(responses, (practiceAreaCode || 'personal_injury') as any);
  const { coreSignals, completion, categories, missingCategories } = unlockStatus;

  const jurisdiction = getJurisdictionFromPhone(phone || '');
  const answered = categories.filter(c => c.completed).length;
  const total = categories.length;

  const signals = buildSignals(responses, practiceAreaCode, phone, coreSignals, jurisdiction);
  const followUp = buildFollowUpChecklist(responses, practiceAreaCode, missingCategories);

  const durationMins = durationSeconds ? Math.floor(durationSeconds / 60) : null;
  const durationSecs = durationSeconds ? durationSeconds % 60 : null;
  const answeredQ = responses.filter(r => r.response_value && r.response_value !== '').length;
  const skippedQ = responses.length - answeredQ;

  return (
    <div className="space-y-4">

      {/* ── Intake Completeness ────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Intake Completeness</h3>
          <span className={`ml-auto text-sm font-semibold tabular-nums ${
            completion >= 90 ? 'text-gray-700 dark:text-gray-300' :
            completion >= 75 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>{completion}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-3">
          <div
            className={`h-1.5 rounded-full transition-all ${
              completion >= 90 ? 'bg-gray-500 dark:bg-gray-400' :
              completion >= 75 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(completion, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {answered} of {total} categories captured
        </p>
        {missingCategories.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Missing:</p>
            <div className="flex flex-wrap gap-1">
              {missingCategories.map(label => (
                <span key={label} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Case Signals ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Case Signals</h3>
        <div className="space-y-2.5">
          {signals.map((signal, i) => (
            <SignalRow key={i} signal={signal} />
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 italic">
          Facts from intake answers only. Not legal assessment.
        </p>
      </div>

      {/* ── Attorney Follow-Up Checklist ────────────────────────── */}
      {followUp.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Attorney Follow-Up</h3>
          <ul className="space-y-2">
            {followUp.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                {action}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 italic">
            Derived from unanswered intake fields only.
          </p>
        </div>
      )}

      {/* ── Intake Session ─────────────────────────────────────── */}
      {(durationSeconds != null || responses.length > 0) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Intake Session</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {durationSeconds != null && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Duration</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                  {durationMins}m {String(durationSecs).padStart(2, '0')}s
                </p>
              </div>
            )}
            {responses.length > 0 && (
              <>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Answered</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{answeredQ}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Skipped</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{skippedQ}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
