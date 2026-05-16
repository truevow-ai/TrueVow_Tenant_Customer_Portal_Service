'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  RefreshCw,
  Star
} from 'lucide-react';
import {
  calculateDEVBScore,
  calculateEconomicStrengthScore,
  getTierDisplay,
  getJurisdictionFromPhone,
  isUnlockAvailable,
  IntakeResponse,
  LeadForScoring,
  StructuredCoreSignals,
  extractCaseSignals
} from '@/lib/utils/case-scoring';

// ============================================================================
// TYPES
// ============================================================================

interface TokenizedSummaryCardProps {
  lead: LeadForScoring & {
    phone: string;
    qualification_grade?: string | null;
    unlocked_at?: string | null;
    duration_seconds?: number | null;
    booking_date?: string | null;
  };
  responses: IntakeResponse[];
  marketingSource?: {
    channel: string;
    cost: number | null;
  };
  onUnlock?: () => void;
  onClose?: () => void;
  onViewDetails?: () => void;
  isUnlocked?: boolean;
  compact?: boolean;
  practiceAreaCode?: string;
}

// ============================================================================
// URGENCY HELPERS
// ============================================================================

/**
 * Deterministic reservation window: 24h from lead creation.
 * Returns seconds remaining (0 if expired).
 */
export function getReservationSecondsRemaining(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 24 * 60 * 60 * 1000; // 24 hours
  const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return remaining;
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Deterministic "views" indicator — derived from completion %, not random.
 * Gives a consistent number per lead without a real-time counter.
 */
function getViewCount(completion: number, leadId: string): number {
  // Use last char of lead ID as a stable seed (0-9, a-f)
  const seed = parseInt(leadId.slice(-1), 16) % 3; // 0, 1, or 2
  if (completion >= 90) return 2 + seed;  // 2–4
  if (completion >= 80) return 1 + seed;  // 1–3
  return seed;                             // 0–2
}

// ============================================================================
// HELPER FUNCTIONS - HYBRID TRANSPARENCY MODEL
// ============================================================================

/**
 * Data Quality Level - Based on completion percentage
 * Standard: 85-89% | Strong: 90-94% | Comprehensive: 95%+
 */
function getDataQualityLevel(completion: number): { level: string; color: string } {
  if (completion >= 95) return { level: 'Comprehensive', color: 'text-green-700' };
  if (completion >= 90) return { level: 'Strong', color: 'text-blue-700' };
  if (completion >= 85) return { level: 'Standard', color: 'text-gray-700' };
  return { level: 'Incomplete', color: 'text-amber-700' };
}

/**
 * Build Core Signals display list - shows what's captured, NOT weights
 */
function buildCoreSignalsDisplay(
  coreSignals: StructuredCoreSignals,
  jurisdiction: { county: string; stateCode: string }
): { captured: string[]; additional: string[]; missing: string[] } {
  const captured: string[] = [];
  const additional: string[] = [];
  const missing: string[] = [];

  // Core Signal 1: Jurisdiction
  if (coreSignals.isValidJurisdiction) {
    captured.push(`Jurisdiction confirmed (${jurisdiction.county}, ${jurisdiction.stateCode})`);
  } else {
    missing.push('Jurisdiction');
  }

  // Core Signal 2: Incident Date / Statute
  if (coreSignals.incidentDate && coreSignals.isInStatuteWindow) {
    captured.push('Within statute window');
  } else if (coreSignals.incidentDate && !coreSignals.isInStatuteWindow) {
    missing.push('Within statute window');
  } else {
    missing.push('Incident date');
  }

  // Core Signal 3: Medical Treatment
  if (coreSignals.treatmentStatus) {
    captured.push(`Medical treatment documented`);
  } else {
    missing.push('Medical treatment status');
  }

  // Core Signal 4: Liability Indicators
  if (coreSignals.liabilityIndicator) {
    captured.push('Liability indicators present (clear third-party fault)');
  } else {
    missing.push('Liability indicators');
  }

  // Core Signal 5: Prior Representation
  if (coreSignals.representationStatus != null) {
    if (coreSignals.representationStatus === 'not_represented') {
      captured.push('No prior representation disclosed');
    } else {
      captured.push('Prior representation status confirmed');
    }
  } else {
    missing.push('Prior representation status');
  }

  // Additional Signals (optional)
  if (coreSignals.injurySeverity) {
    additional.push('Injury severity documented');
  }
  if (coreSignals.lostWages) {
    additional.push('Work impact reported');
  }

  return { captured, additional, missing };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenizedSummaryCard({
  lead,
  responses,
  marketingSource,
  onUnlock,
  onClose,
  onViewDetails,
  isUnlocked = false,
  compact = false,
  practiceAreaCode
}: TokenizedSummaryCardProps) {
  const [showFullCard, setShowFullCard] = useState(!compact);
  const [countdown, setCountdown] = useState(() => getReservationSecondsRemaining(lead.created_at));

  // Live countdown ticker
  useEffect(() => {
    if (isUnlocked) return;
    const interval = setInterval(() => {
      setCountdown(getReservationSecondsRemaining(lead.created_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [lead.created_at, isUnlocked]);

  // STEP 1: Check completion threshold (no mandatory signals gate)
  // CRITICAL: Practice area MUST be passed for correct liability check
  const unlockStatus = isUnlockAvailable(responses, (practiceAreaCode || lead.practice_area_code || 'personal_injury') as any);
  const canUnlock = unlockStatus.completion >= 75 || isUnlocked;
  const isAPlusLead = (lead.qualification_grade === 'A+' || lead.lead_grade === 'A+');
  const jurisdiction = getJurisdictionFromPhone(lead.phone);
  
  // STEP 2: Build Core Signals display - HYBRID TRANSPARENCY
  const signalsDisplay = buildCoreSignalsDisplay(unlockStatus.coreSignals, jurisdiction);
  const dataQuality = getDataQualityLevel(unlockStatus.completion);
  
  // STEP 3: Calculate Economic Strength ONLY if unlock threshold met
  // GUARDRAIL: Economic Strength does NOT exist until unlock threshold passes
  // This prevents intake contamination and ensures regulatory defensibility
  const economicScore = canUnlock ? calculateEconomicStrengthScore(responses, lead.phone) : null;
  const tierDisplay = canUnlock ? getTierDisplay(economicScore!.tier) : null;

  // Urgency / social-proof derived values
  const isExpired = countdown === 0;
  const viewCount = getViewCount(unlockStatus.completion, lead.lead_id);
  const callDurationMins = lead.duration_seconds ? Math.round(lead.duration_seconds / 60) : null;

  // Case strength signals (economic indicators that drive unlock decisions)
  const caseSignals = extractCaseSignals(responses);
  const hasStrongSignals = caseSignals.signals.length >= 3;

  // Case strength label (attorney-friendly terminology)
  const getCaseStrengthLabel = (score: number) => {
    if (score >= 85) return { label: 'Strong Case', color: 'text-green-600 dark:text-green-400' };
    if (score >= 70) return { label: 'Moderate Case', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Preliminary Intake', color: 'text-gray-500 dark:text-gray-400' };
  };
  const caseStrength = getCaseStrengthLabel(unlockStatus.completion);

  // Helper to format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Compact preview for table row
  if (compact && !showFullCard) {
    return (
      <button
        onClick={() => setShowFullCard(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Eye className="h-4 w-4" />
        Preview Summary
      </button>
    );
  }

  // Border color based on unlock status
  const borderColorClass = canUnlock && tierDisplay 
    ? tierDisplay.borderColor 
    : isExpired
    ? 'border-red-400 dark:border-red-600'
    : 'border-amber-300 dark:border-amber-600';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${borderColorClass} shadow-lg ${compact ? 'max-w-md' : 'max-w-lg'} relative overflow-hidden`}>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full transition-colors z-10 shadow-sm"
          title="Close preview"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
      
      {/* HEADER — simple, neutral */}
      <div className={`px-5 py-4 border-b ${borderColorClass} ${onClose ? 'pr-12' : ''}`}>
        {canUnlock ? (
          <>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Case Summary
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Intake completed by Benjamin
            </p>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Partial Intake
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Additional screening required.
            </p>
          </>
        )}
      </div>

      {/* Content — Case Summary format */}
      <div className="p-5">
        
        {/* Case Summary — case memo style */}
        <div className="space-y-3">
          {/* Incident */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Incident</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {lead.practice_area_code === 'dog_bite' ? 'Dog bite - neighbor dog' : 
               lead.practice_area_code === 'slip_fall' ? 'Slip and fall' : 
               lead.practice_area_code === 'workplace_injury' ? 'Workplace injury' :
               lead.practice_area_code === 'product_liability' ? 'Product liability' :
               lead.practice_area_code === 'other_pi' ? 'Personal injury - other' :
               'Personal injury'}
            </span>
          </div>
          
          {/* Accident Timing */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">When</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {caseSignals.timing || 'Not specified'}
            </span>
          </div>
          
          {/* Injury */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Injury</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const injury = responses.find(a => a.question_key.includes('Q05_INJURY') || a.question_key.includes('Q04_INJURY') || a.question_key.includes('Q08_INJURY'));
                if (!injury) return 'Not specified';
                const val = injury.response_value;
                if (val === '1') return 'Minor';
                if (val === '2') return 'Moderate - herniated disc';
                if (val === '3') return 'Severe - multiple injuries';
                if (val === '4') return 'Traumatic brain injury';
                return 'Not specified';
              })()}
            </span>
          </div>
          
          {/* Medical Treatment */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Treatment</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const med = responses.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'));
                if (!med) return 'Not specified';
                const val = med.response_value;
                if (val === '1') return 'No treatment yet';
                if (val === '2') return 'ER visit';
                if (val === '3') return 'ER + ongoing treatment';
                if (val === '4') return 'Surgery scheduled';
                if (val === '5') return 'Multiple surgeries';
                return 'Not specified';
              })()}
            </span>
          </div>
          
          {/* Liability */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Liability</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const fault = responses.find(a => a.question_key === 'CA_Q04_AT_FAULT');
                if (fault?.response_value === '1') return 'Other party at fault';
                if (fault?.response_value === '2') return 'Shared fault';
                if (fault?.response_value === '3') return 'Client at fault';
                const prop = responses.find(a => a.question_key === 'SF_Q06_PROPERTY_OWNER_AWARENESS');
                if (prop?.response_value === '1') return 'Property owner aware - strong liability';
                if (prop?.response_value === '2') return 'Property owner should have known';
                return 'To be determined';
              })()}
            </span>
          </div>
          
          {/* Police Report */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Police Report</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const citation = responses.find(a => a.question_key === 'CA_Q07_CITATION');
                if (citation?.response_value === '2') return 'Filed - other driver cited';
                if (citation?.response_value === '1') return 'Not filed';
                return 'Not specified';
              })()}
            </span>
          </div>
          
          {/* Witnesses */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Witnesses</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const witness = responses.find(a => a.question_key === 'CA_Q08_WITNESSES');
                if (witness?.response_value === '1') return 'Available';
                if (witness?.response_value === '2') return 'Passenger in vehicle';
                if (witness?.response_value === '3') return 'None';
                return 'Not specified';
              })()}
            </span>
          </div>
          
          {/* Prior Attorney */}
          <div className="flex gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Prior Attorney</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {(() => {
                const prior = responses.find(a => a.question_key === 'CONFLICT_Q01_PRIOR_REP');
                if (prior?.response_value === '1') return 'None';
                if (prior?.response_value === '2') return 'Consulted another attorney';
                if (prior?.response_value === '3') return 'Previously represented';
                return 'Not specified';
              })()}
            </span>
          </div>
          
          {/* Lost Wages */}
          {(() => {
            const wages = responses.find(a => a.question_key === 'CA_Q09_LOST_WAGES');
            if (!wages || wages.response_value === '1') return null;
            return (
              <div className="flex gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-32 shrink-0">Lost Wages</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {wages.response_value === '2' ? 'Less than 1 week' :
                   wages.response_value === '3' ? '1+ months' :
                   wages.response_value === '4' ? 'Lost job / cannot work' :
                   'Not specified'}
                </span>
              </div>
            );
          })()}
        </div>
        
        {/* Benjamin Intake Summary */}
        {lead.duration_seconds && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Benjamin intake: {formatDuration(lead.duration_seconds)} conversation</span>
          </div>
        )}
        
        {/* Brief summary line */}
        {canUnlock && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
            Benjamin intake summary: Indicators consistent with a {caseStrength.label.toLowerCase()}.
          </p>
        )}

        {/* UNLOCK SECTION — A+ leads only */}
        {isAPlusLead && !isUnlocked && canUnlock && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Contact Protected Indicator */}
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-3">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Contact details protected</span>
            </div>
                    
            {/* EXPIRED STATE — replace button entirely */}
            {isExpired ? (
              <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-3 flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">This lead has expired</span>
              </div>
            ) : (
              <>
                {/* UNLOCK BUTTON */}
                <button
                  onClick={onUnlock}
                  className="w-full font-medium py-3 px-6 rounded transition-all flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white"
                >
                  <><Lock className="h-5 w-5" /> Unlock A+ Lead</>
                </button>
                        
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Phone • Email • Full transcript
                </p>
              </>
            )}
          </div>
        )}

        {/* INCOMPLETE STATE — all leads with insufficient data */}
        {!canUnlock && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Incomplete State - Clear Blocking */}
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-400 font-semibold mb-2">
                Intake Incomplete
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Additional structured screening required by the law firm to complete intake.
              </p>
            </div>
            
            {/* Action for incomplete state - FREE access */}
            {onViewDetails ? (
              // <75% — FREE access, NEUTRAL button
              <button
                onClick={onViewDetails}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-5 w-5" />
                View Details - No Charge
              </button>
            ) : (
              // On lead detail page (already viewing) — show info only
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  This intake is below the 75% threshold - contact details are accessible without charge.
                </p>
              </div>
            )}
          </div>
        )}

        {/* UNLOCKED STATE */}
        {isUnlocked && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Contact Info Unlocked</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Full contact details and transcript are now available.
              </p>
            </div>
            {/* Instant call CTA */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3 border border-blue-100 dark:border-blue-800">
              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                Call now - prospects contacted within 5 min are 8x more likely to retain.
              </span>
            </div>
            
            {/* Action buttons after unlock */}
            <div className="space-y-2">
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="h-5 w-5" />
                  View Full Details
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Close button for locked state */}
        {!isUnlocked && onClose && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              Close Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VIABILITY TIER BADGE
// ============================================================================

interface ViabilityTierBadgeProps {
  tier: 'Moderate' | 'High' | 'Premium';
  confidenceLevel?: number;
}

export function ViabilityTierBadge({ tier, confidenceLevel }: ViabilityTierBadgeProps) {
  // Dark mode compatible tier colors with proper contrast
  const tierStyles = {
    'Moderate': {
      bg: 'bg-blue-100 dark:bg-blue-900/60',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-400 dark:border-blue-500',
      percentBg: 'bg-blue-200 dark:bg-blue-800',
      percentText: 'text-blue-900 dark:text-white'
    },
    'High': {
      bg: 'bg-green-100 dark:bg-green-900/60',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-400 dark:border-green-500',
      percentBg: 'bg-green-200 dark:bg-green-800',
      percentText: 'text-green-900 dark:text-white'
    },
    'Premium': {
      bg: 'bg-purple-100 dark:bg-purple-900/60',
      text: 'text-purple-800 dark:text-purple-200',
      border: 'border-purple-400 dark:border-purple-500',
      percentBg: 'bg-purple-200 dark:bg-purple-800',
      percentText: 'text-purple-900 dark:text-white'
    }
  };
  
  const style = tierStyles[tier];
  
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text} border-2 ${style.border}`}>
        {tier}
      </span>
      {confidenceLevel !== undefined && (
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${style.percentBg} ${style.percentText}`}>
          {confidenceLevel}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

interface ViabilityBandBadgeProps {
  band: 0 | 1 | 2 | 3;
  confidenceLevel?: number;
}

export function ViabilityBandBadge({ band, confidenceLevel }: ViabilityBandBadgeProps) {
  // Map band to 3-tier system (no "Low" tier for unlockable prospects)
  const tierMap: Record<number, 'Moderate' | 'High' | 'Premium'> = {
    0: 'Moderate',  // Legacy "Low" → now Moderate (shouldn't appear for unlockable)
    1: 'Moderate',
    2: 'High',
    3: 'Premium'
  };
  
  return <ViabilityTierBadge tier={tierMap[band]} confidenceLevel={confidenceLevel} />;
}

export function CaseGradeBadge({ grade, score }: { grade: 'A' | 'B' | 'C' | 'F'; score?: number }) {
  const gradeColors = {
    'A': 'bg-green-100 text-green-800',
    'B': 'bg-blue-100 text-blue-800',
    'C': 'bg-yellow-100 text-yellow-800',
    'F': 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold ${gradeColors[grade]}`}>
        {grade}
      </span>
      {score !== undefined && (
        <span className="text-xs text-gray-500">{score}%</span>
      )}
    </div>
  );
}

export function maskProspectId(leadId: string): string {
  const suffix = leadId.replace(/-/g, '').slice(-6).toUpperCase();
  return `Prospect #TV-${suffix}`;
}
