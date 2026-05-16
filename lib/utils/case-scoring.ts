/**
 * Deterministic Economic Viability Band (DEVB™) Scoring System
 * 
 * TRUEVOW PRE-UNLOCK SUMMARY SPEC v1.0
 * 
 * Rules:
 * 1. No PII pre-unlock (name, phone, email, full transcript hidden)
 * 2. No numeric case value ranges
 * 3. No predictive language ("estimated," "projected," "likely")
 * 4. All output is deterministic, rule-based, from existing intake fields
 * 5. Labeling is explicit: "Internal Screening Indicator — Not Legal Advice"
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeResponse {
  question_key: string;
  response_value: string;
  response_type: string;
  captured_at: string;
}

export interface LeadForScoring {
  lead_id: string;
  lead_score: number | null;
  lead_grade: string | null;
  practice_area_code: string | null;
  created_at: string;
}

export interface DEVBScore {
  // Total score (0-16)
  totalScore: number;
  
  // Economic Strength Tier (3 tiers - Fiduciary Grade)
  // No "Low" tier - weak cases don't reach 85% threshold
  tier: 'Moderate' | 'High' | 'Premium';
  
  // Confidence Level (score/16 as percentage)
  confidenceLevel: number;
  
  // Individual dimension scores
  dimensions: {
    injurySeverity: { score: number; label: string };
    treatmentIntensity: { score: number; label: string };
    liabilityStrength: { score: number; label: string };
    lostWages: { score: number; label: string; duration: string };
    statuteValidity: { score: number; label: string };
    witnessConfirmed: { score: number; label: string };
    policyType: { score: number; label: string };
  };
  
  // Structured indicators for UI
  indicators: {
    incidentDate: string;
    jurisdiction: string;
    statuteStatus: 'valid' | 'expired' | 'unknown';
    liabilitySignal: string;
    injurySeverity: string;
    treatmentPattern: string;
    lostWages: string;
    policyType: string;
  };
  
  // Disclaimer
  disclaimer: string;
}

// ============================================================================
// ECONOMIC STRENGTH SCORE (Separate from Unlock Score)
// ============================================================================

/**
 * Economic Strength Score - 0-100 scale
 * 
 * Measures DAMAGES POTENTIAL + COLLECTABILITY INDICATORS
 * Does NOT measure: win probability, legal complexity, jury sympathy
 * 
 * Components:
 * - Treatment Severity: 30%
 * - Injury Severity: 20%
 * - Work Impact / Wage Loss: 15%
 * - Liability Clarity: 15%
 * - Insurance / Asset Indicator: 10%
 * - Evidence Strength: 10%
 * 
 * Bands:
 * - Moderate: 50-64 (viable damages, some treatment)
 * - High: 65-79 (strong treatment, clear liability, wage impact)
 * - Premium: 80-100 (surgery/permanent injury, clear liability, wage loss, insurance)
 */
export interface EconomicStrengthScore {
  // Total score (0-100)
  totalScore: number;
  
  // Economic Strength Tier
  tier: 'Moderate' | 'High' | 'Premium';
  
  // Component scores (shown internally only, never to user)
  components: {
    treatmentSeverity: { score: number; weight: number; label: string };
    injurySeverity: { score: number; weight: number; label: string };
    workImpact: { score: number; weight: number; label: string };
    liabilityClarity: { score: number; weight: number; label: string };
    insuranceIndicator: { score: number; weight: number; label: string };
    evidenceStrength: { score: number; weight: number; label: string };
    propertyDamageSeverity: { score: number; weight: number; label: string }; // NEW
  };
  
  // Signals captured for UI display (no scores shown)
  signals: {
    treatmentLevel: string;
    injuryLevel: string;
    workImpactLevel: string;
    liabilityLevel: string;
    insuranceLevel: string;
    evidenceLevel: string;
    propertyDamageLevel: string; // NEW
  };
}

/**
 * Economic Strength component weights (must sum to 100)
 */
export const ECONOMIC_STRENGTH_WEIGHTS = {
  treatmentSeverity: 25, // Reduced from 30 to accommodate property damage
  injurySeverity: 20,
  workImpact: 15,
  liabilityClarity: 15,
  insuranceIndicator: 10,
  evidenceStrength: 10,
  propertyDamageSeverity: 5, // NEW - correlates with settlement value
} as const;

// ============================================================================
// STATUTE OF LIMITATIONS
// ============================================================================

const STATUTE_YEARS: Record<string, number> = {
  'personal_injury': 2,
  'car_accident': 2,
  'slip_and_fall': 2,
  'medical_malpractice': 2,
  'wrongful_death': 2,
  'workers_comp': 2,
  'default': 2
};

/**
 * Parse incident date from various formats
 */
export function parseIncidentDate(value: string | null): Date | null {
  if (!value) return null;
  
  // Handle relative dates
  const relativeMatch = value.match(/(\d+)\s*(day|week|month|year)s?\s*ago/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();
    
    switch (unit) {
      case 'day': date.setDate(date.getDate() - amount); break;
      case 'week': date.setDate(date.getDate() - (amount * 7)); break;
      case 'month': date.setMonth(date.getMonth() - amount); break;
      case 'year': date.setFullYear(date.getFullYear() - amount); break;
    }
    return date;
  }
  
  // Handle "today", "yesterday"
  if (value.toLowerCase() === 'today') return new Date();
  if (value.toLowerCase() === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  
  // Try direct parsing
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

/**
 * Format incident date for display
 */
export function formatIncidentDate(value: string | null): string {
  if (!value) return 'Not specified';
  
  // Handle common phrases
  const lower = value.toLowerCase();
  if (lower === 'today') return 'Today';
  if (lower === 'yesterday') return 'Yesterday';
  if (lower.includes('ago')) return value;
  
  // Handle "this week", "last week", "last month", etc.
  if (lower === 'this week') return 'This week';
  if (lower === 'last week') return 'Last week';
  if (lower === 'last month') return 'Last month';
  if (lower === 'six months ago') return 'Six months ago';
  
  // Try parsing as date
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {}
  
  return value;
}

/**
 * Check statute validity
 */
export function checkStatuteValidity(
  incidentDate: Date | null,
  practiceArea: string | null
): { status: 'valid' | 'expired' | 'unknown'; label: string } {
  if (!incidentDate) {
    return { status: 'unknown', label: 'Unknown' };
  }
  
  const years = STATUTE_YEARS[practiceArea?.toLowerCase() || 'default'] || 2;
  const deadline = new Date(incidentDate);
  deadline.setFullYear(deadline.getFullYear() + years);
  
  const now = new Date();
  
  if (deadline < now) {
    return { status: 'expired', label: 'Out of limitation window' };
  }
  
  return { status: 'valid', label: 'Within limitation window' };
}

// ============================================================================
// SCORING DIMENSIONS
// ============================================================================

/**
 * Get response value from intake answers
 */
export function getResponseValue(
  responses: IntakeResponse[],
  key: string
): string | null {
  const response = responses.find(r => r.question_key === key);
  return response?.response_value || null;
}

/**
 * Score Injury Severity (1-3 points)
 */
function scoreInjurySeverity(injuryDescription: string | null): { score: number; label: string } {
  if (!injuryDescription) return { score: 1, label: 'Unknown' };
  
  const desc = injuryDescription.toLowerCase();
  
  // Severe indicators
  const severeIndicators = ['surgery', 'surgical', 'fracture', 'broken', 'traumatic', 'brain', 
                           'spinal', 'paralysis', 'amputation', 'permanent', 'disability'];
  if (severeIndicators.some(i => desc.includes(i))) {
    return { score: 3, label: 'Severe' };
  }
  
  // Moderate indicators
  const moderateIndicators = ['fracture', 'broken', 'herniated', 'disc', 'torn', 'ligament',
                              'sprain', 'strain', 'contusion', 'laceration'];
  if (moderateIndicators.some(i => desc.includes(i))) {
    return { score: 2, label: 'Moderate' };
  }
  
  // Default to Minor (soft tissue)
  return { score: 1, label: 'Minor (soft tissue)' };
}

/**
 * Score Treatment Intensity (1-3 points)
 */
function scoreTreatmentIntensity(treatmentDescription: string | null): { score: number; label: string } {
  if (!treatmentDescription) return { score: 1, label: 'Treatment pending' };
  
  const desc = treatmentDescription.toLowerCase();
  
  // Surgery scheduled/completed
  if (desc.includes('surgery') || desc.includes('surgical')) {
    return { score: 3, label: 'Surgery scheduled/completed' };
  }
  
  // Ongoing care
  if (desc.includes('ongoing') || desc.includes('pt') || desc.includes('physical therapy') ||
      desc.includes('ortho') || desc.includes('specialist') || desc.includes('follow-up')) {
    return { score: 2, label: 'Ongoing care' };
  }
  
  // ER only
  if (desc.includes('er') || desc.includes('emergency')) {
    return { score: 1, label: 'ER only' };
  }
  
  return { score: 1, label: 'ER only' };
}

/**
 * Score Liability Strength (0-3 points)
 */
function scoreLiabilityStrength(
  liabilityDescription: string | null,
  faultDescription: string | null,
  hasWitness: boolean,
  hasPoliceReport: boolean
): { score: number; label: string } {
  const combined = `${liabilityDescription || ''} ${faultDescription || ''}`.toLowerCase();
  
  // Check for shared fault admission
  if (combined.includes('my fault') || combined.includes('i was at fault') || 
      combined.includes('shared fault') || combined.includes('partial')) {
    return { score: 0, label: 'Shared fault admitted' };
  }
  
  // Clear liability + witness
  const clearIndicators = ['rear-ended', 'rear ended', 'ran red light', 'ran stop sign', 
                           'drunk driver', 'dui', 'speeding', 'texting', 'distracted'];
  const hasClearIndicators = clearIndicators.some(i => combined.includes(i));
  
  if (hasClearIndicators && hasWitness) {
    return { score: 3, label: 'Clear third-party fault + witness confirmed' };
  }
  
  // Police report + other at fault
  if (hasPoliceReport && (combined.includes('other') || combined.includes('their'))) {
    return { score: 2, label: 'Police report + other at fault' };
  }
  
  if (hasClearIndicators) {
    return { score: 2, label: 'Clear third-party fault' };
  }
  
  // Unclear
  if (combined.includes('unclear') || combined.includes('disputed')) {
    return { score: 1, label: 'Unclear liability' };
  }
  
  return { score: 1, label: 'Liability under review' };
}

/**
 * Score Lost Wages (0-3 points)
 */
function scoreLostWages(
  lostWagesResponse: string | null,
  missedWorkDuration: string | null
): { score: number; label: string; duration: string } {
  const combined = `${lostWagesResponse || ''} ${missedWorkDuration || ''}`.toLowerCase();
  
  // No lost wages
  if (combined.includes('no') || combined.includes('none') || !combined.trim()) {
    return { score: 0, label: 'None', duration: 'None' };
  }
  
  // Extract duration
  const weekMatch = combined.match(/(\d+)\s*weeks?/);
  const dayMatch = combined.match(/(\d+)\s*days?/);
  const monthMatch = combined.match(/(\d+)\s*months?/);
  
  let duration = '';
  let weeks = 0;
  
  if (monthMatch) {
    weeks = parseInt(monthMatch[1]) * 4;
    duration = `${monthMatch[1]} month${parseInt(monthMatch[1]) > 1 ? 's' : ''}`;
  } else if (weekMatch) {
    weeks = parseInt(weekMatch[1]);
    duration = `${weekMatch[1]} week${parseInt(weekMatch[1]) > 1 ? 's' : ''}`;
  } else if (dayMatch) {
    const days = parseInt(dayMatch[1]);
    weeks = days / 5;
    duration = `${days} day${days > 1 ? 's' : ''}`;
  } else if (combined.includes('yes') || combined.includes('lost') || combined.includes('missed')) {
    duration = 'Documented';
    weeks = 1;
  }
  
  // Score based on duration
  if (weeks >= 4) {
    return { score: 3, label: '>1 month', duration: duration || '>1 month' };
  }
  if (weeks >= 1) {
    return { score: 2, label: '1–4 weeks', duration: duration || '1-4 weeks' };
  }
  if (weeks > 0 || combined.includes('yes')) {
    return { score: 1, label: '<1 week', duration: duration || '<1 week' };
  }
  
  return { score: 0, label: 'None', duration: 'None' };
}

/**
 * Score Statute Validity (0-1 points)
 */
function scoreStatuteValidity(
  incidentDate: Date | null,
  practiceArea: string | null
): { score: number; label: string } {
  const result = checkStatuteValidity(incidentDate, practiceArea);
  
  if (result.status === 'expired') {
    return { score: 0, label: 'Expired' };
  }
  if (result.status === 'valid') {
    return { score: 1, label: 'Valid' };
  }
  return { score: 0, label: 'Unknown' };
}

/**
 * Score Witness Confirmed (0-1 points)
 */
function scoreWitnessConfirmed(witnessResponse: string | null): { score: number; label: string } {
  if (!witnessResponse) return { score: 0, label: 'Not confirmed' };
  
  const resp = witnessResponse.toLowerCase();
  if (resp.includes('yes') || resp.includes('willing')) {
    return { score: 1, label: 'Witness confirmed' };
  }
  return { score: 0, label: 'Not confirmed' };
}

/**
 * Score Policy Type (0-3 points)
 */
function scorePolicyType(policyResponse: string | null): { score: number; label: string } {
  if (!policyResponse) return { score: 0, label: 'Unknown' };
  
  const resp = policyResponse.toLowerCase();
  
  // Trucking/corporate
  if (resp.includes('truck') || resp.includes('semi') || resp.includes('commercial vehicle') ||
      resp.includes('18-wheeler') || resp.includes('corporate')) {
    return { score: 3, label: 'Trucking/corporate' };
  }
  
  // Commercial vehicle
  if (resp.includes('commercial') || resp.includes('company') || resp.includes('business')) {
    return { score: 2, label: 'Commercial vehicle' };
  }
  
  // Personal auto
  if (resp.includes('personal') || resp.includes('auto') || resp.includes('insured')) {
    return { score: 1, label: 'Personal auto' };
  }
  
  return { score: 0, label: 'Unknown' };
}

// ============================================================================
// JURISDICTION
// ============================================================================

/**
 * Extract jurisdiction from phone number area code
 */
export function getJurisdictionFromPhone(phone: string): {
  county: string;
  state: string;
  stateCode: string;
} {
  const defaultJurisdiction = {
    county: 'Hillsborough County',
    state: 'Florida',
    stateCode: 'FL'
  };
  
  if (!phone) return defaultJurisdiction;
  
  const areaCode = phone.replace(/\D/g, '').slice(0, 3);
  
  const floridaAreaCodes: Record<string, string> = {
    '813': 'Hillsborough County',
    '727': 'Pinellas County',
    '305': 'Miami-Dade County',
    '786': 'Miami-Dade County',
    '954': 'Broward County',
    '561': 'Palm Beach County',
    '407': 'Orange County',
    '321': 'Brevard County',
    '904': 'Duval County'
  };
  
  const county = floridaAreaCodes[areaCode];
  if (county) {
    return { county, state: 'Florida', stateCode: 'FL' };
  }
  
  return defaultJurisdiction;
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate DEVB Score (0-16) and Economic Viability Tier
 */
export function calculateDEVBScore(
  lead: LeadForScoring,
  responses: IntakeResponse[],
  phone?: string
): DEVBScore {
  // Extract intake data
  const injuryDescription = getResponseValue(responses, 'injury_description') ||
                           getResponseValue(responses, 'what_injury') ||
                           getResponseValue(responses, 'describe_your_injuries');
  
  const treatmentDescription = getResponseValue(responses, 'treatment_description') ||
                               getResponseValue(responses, 'what_treatment') ||
                               getResponseValue(responses, 'did_you_seek_medical_treatment');
  
  const liabilityDescription = getResponseValue(responses, 'liability_description') ||
                               getResponseValue(responses, 'what_happened') ||
                               getResponseValue(responses, 'incident_description');
  
  const faultDescription = getResponseValue(responses, 'who_was_at_fault') ||
                           getResponseValue(responses, 'fault_description');
  
  const witnessResponse = getResponseValue(responses, 'witness_available') ||
                          getResponseValue(responses, 'were_there_any_witnesses');
  
  const policeReportResponse = getResponseValue(responses, 'police_report_filed') ||
                               getResponseValue(responses, 'was_a_police_report_filed');
  
  const lostWagesResponse = getResponseValue(responses, 'lost_wages') ||
                            getResponseValue(responses, 'have_you_missed_work');
  
  const missedWorkDuration = getResponseValue(responses, 'missed_work_duration') ||
                             getResponseValue(responses, 'how_long_missed_work');
  
  const incidentDateValue = getResponseValue(responses, 'incident_date') ||
                            getResponseValue(responses, 'date_of_incident') ||
                            getResponseValue(responses, 'when_did_this_happen');
  
  const policyResponse = getResponseValue(responses, 'other_driver_insurance') ||
                         getResponseValue(responses, 'policy_type');
  
  // Parse booleans
  const hasWitness = witnessResponse?.toLowerCase().includes('yes') || 
                     witnessResponse?.toLowerCase().includes('willing') || false;
  const hasPoliceReport = policeReportResponse?.toLowerCase().includes('yes') || false;
  
  // Score each dimension
  const injurySeverity = scoreInjurySeverity(injuryDescription);
  const treatmentIntensity = scoreTreatmentIntensity(treatmentDescription);
  const liabilityStrength = scoreLiabilityStrength(liabilityDescription, faultDescription, hasWitness, hasPoliceReport);
  const lostWages = scoreLostWages(lostWagesResponse, missedWorkDuration);
  const statuteResult = scoreStatuteValidity(parseIncidentDate(incidentDateValue), lead.practice_area_code);
  const witnessConfirmed = scoreWitnessConfirmed(witnessResponse);
  const policyType = scorePolicyType(policyResponse);
  
  // Calculate total score (0-16)
  const totalScore = 
    injurySeverity.score +
    treatmentIntensity.score +
    liabilityStrength.score +
    lostWages.score +
    statuteResult.score +
    witnessConfirmed.score +
    policyType.score;
  
  // Map to tier
  const tier = mapScoreToTier(totalScore);
  
  // Calculate confidence level (score/16 as percentage)
  const confidenceLevel = Math.round((totalScore / 16) * 100);
  
  // Build indicators
  const jurisdiction = getJurisdictionFromPhone(phone || '');
  const incidentDate = parseIncidentDate(incidentDateValue);
  const statuteStatus = checkStatuteValidity(incidentDate, lead.practice_area_code);
  
  const indicators = {
    incidentDate: formatIncidentDate(incidentDateValue),
    jurisdiction: `${jurisdiction.county}, ${jurisdiction.stateCode}`,
    statuteStatus: statuteStatus.status,
    liabilitySignal: liabilityStrength.label,
    injurySeverity: injurySeverity.label,
    treatmentPattern: treatmentDescription || 'Treatment pending',
    lostWages: lostWages.duration,
    policyType: policyType.label
  };
  
  // Disclaimer
  const disclaimer = 'This indicator is generated from structured intake responses using fixed screening logic. It does not replace attorney judgment and does not constitute legal advice.';
  
  return {
    totalScore,
    tier,
    confidenceLevel,
    dimensions: {
      injurySeverity,
      treatmentIntensity,
      liabilityStrength,
      lostWages,
      statuteValidity: statuteResult,
      witnessConfirmed,
      policyType
    },
    indicators,
    disclaimer
  };
}

// ============================================================================
// ECONOMIC STRENGTH SCORING (Separate from Unlock Score)
// ============================================================================

/**
 * Score Treatment Severity (30% weight)
 * Treatment drives economic value
 */
function scoreTreatmentSeverity(treatmentDescription: string | null): { score: number; label: string } {
  if (!treatmentDescription) return { score: 0, label: 'No treatment documented' };
  
  const lower = treatmentDescription.toLowerCase();
  
  // Surgery = highest economic value
  if (lower.includes('surgery') || lower.includes('surgical') || lower.includes('operation')) {
    return { score: 30, label: 'Surgery performed/scheduled' };
  }
  
  // ER + follow-up
  if ((lower.includes('er') || lower.includes('emergency')) && 
      (lower.includes('follow') || lower.includes('ortho') || lower.includes('specialist') || lower.includes('pt') || lower.includes('physical therapy'))) {
    return { score: 24, label: 'ER + ongoing treatment' };
  }
  
  // ER only
  if (lower.includes('er') || lower.includes('emergency') || lower.includes('hospital')) {
    return { score: 18, label: 'ER visit' };
  }
  
  // PT/Chiropractor only
  if (lower.includes('pt') || lower.includes('physical therapy') || lower.includes('chiropractor') || lower.includes('chiro')) {
    return { score: 10, label: 'Outpatient treatment' };
  }
  
  // Some treatment mentioned
  if (lower.includes('treatment') || lower.includes('doctor') || lower.includes('medical')) {
    return { score: 8, label: 'Medical treatment' };
  }
  
  return { score: 0, label: 'No treatment documented' };
}

/**
 * Score Injury Severity for Economic Strength (20% weight)
 */
function scoreEconomicInjurySeverity(injuryDescription: string | null): { score: number; label: string } {
  if (!injuryDescription) return { score: 0, label: 'Injury not documented' };
  
  const lower = injuryDescription.toLowerCase();
  
  // Severe/Permanent
  const severeIndicators = [
    'permanent', 'disability', 'paralyz', 'brain injury', 'tbi', 'traumatic brain',
    'fracture', 'broken', 'shattered', 'collapsed lung', 'herniated disc',
    'ruptured', 'torn', 'acl', 'rotator cuff', 'spinal', 'amputat'
  ];
  
  if (severeIndicators.some(ind => lower.includes(ind))) {
    return { score: 20, label: 'Severe/Permanent injury' };
  }
  
  // Serious
  const seriousIndicators = [
    'surgery', 'surgical', 'herniat', 'disc', 'concussion', 'contusion',
    'laceration', 'multiple', 'whiplash'
  ];
  
  if (seriousIndicators.some(ind => lower.includes(ind))) {
    return { score: 16, label: 'Serious injury' };
  }
  
  // Moderate
  const moderateIndicators = [
    'sprain', 'strain', 'back pain', 'neck pain', 'contusion', 'bruise',
    'swelling', 'inflammation'
  ];
  
  if (moderateIndicators.some(ind => lower.includes(ind))) {
    return { score: 10, label: 'Moderate injury' };
  }
  
  // Minor soft tissue
  if (lower.includes('pain') || lower.includes('sore') || lower.includes('stiff')) {
    return { score: 5, label: 'Minor injury' };
  }
  
  return { score: 3, label: 'Injury reported' };
}

/**
 * Score Work Impact / Wage Loss (15% weight)
 */
function scoreWorkImpact(lostWagesDescription: string | null): { score: number; label: string } {
  if (!lostWagesDescription) return { score: 0, label: 'Work impact unknown' };
  
  const lower = lostWagesDescription.toLowerCase();
  
  // Lost job / can't return
  if (lower.includes('lost job') || lower.includes('lost my job') || 
      lower.includes("can't work") || lower.includes('cannot work') ||
      lower.includes('unable to work') || lower.includes('out of work')) {
    return { score: 15, label: 'Lost employment' };
  }
  
  // Medical leave
  if (lower.includes('medical leave') || lower.includes('disability') || 
      lower.includes('weeks') || lower.includes('months')) {
    const weeksMatch = lower.match(/(\d+)\s*(weeks?|months?)/);
    if (weeksMatch) {
      const num = parseInt(weeksMatch[1]);
      const unit = weeksMatch[2];
      const weeks = unit.includes('month') ? num * 4 : num;
      if (weeks >= 8) return { score: 15, label: 'Extended medical leave' };
      if (weeks >= 4) return { score: 12, label: 'Medical leave' };
      return { score: 8, label: 'Missed work' };
    }
    return { score: 12, label: 'Medical leave' };
  }
  
  // Missed work
  if (lower.includes('yes') || lower.includes('missed') || lower.includes('time off')) {
    return { score: 8, label: 'Missed work' };
  }
  
  // No impact
  if (lower.includes('no') || lower.includes('not yet')) {
    return { score: 0, label: 'No work impact' };
  }
  
  return { score: 4, label: 'Work impact reported' };
}

/**
 * Score Liability Clarity (15% weight)
 * Affects economic viability, not just win odds
 */
function scoreLiabilityClarity(liabilityDescription: string | null): { score: number; label: string } {
  if (!liabilityDescription) return { score: 0, label: 'Liability unclear' };
  
  const lower = liabilityDescription.toLowerCase();
  
  // Clear third-party fault with citation/admission
  if (lower.includes('cited') || lower.includes('ticket') || lower.includes('dui') ||
      lower.includes('arrested') || lower.includes('admitted') || lower.includes('confessed')) {
    return { score: 15, label: 'Clear liability (cited/admitted)' };
  }
  
  // Witness + report
  if ((lower.includes('witness') || lower.includes('saw')) && 
      (lower.includes('police') || lower.includes('report'))) {
    return { score: 12, label: 'Strong liability (witness + report)' };
  }
  
  // Clear fault indicators
  const clearFaultIndicators = [
    'rear-ended', 'rear ended', 't-boned', 'ran red light', 'ran a red',
    'ran stop sign', 'fell asleep', 'distracted', 'texting', 'drunk driver',
    'crossed into my lane', 'wrong way', 'sideswiped', 'hit me', 'struck'
  ];
  
  if (clearFaultIndicators.some(ind => lower.includes(ind))) {
    return { score: 12, label: 'Clear third-party fault' };
  }
  
  // Mixed fault
  if (lower.includes('shared') || lower.includes('partial') || lower.includes('both')) {
    return { score: 6, label: 'Shared fault' };
  }
  
  // Caller cited
  if (lower.includes('my fault') || lower.includes('i was at fault')) {
    return { score: 3, label: 'Caller at fault' };
  }
  
  return { score: 8, label: 'Liability under review' };
}

/**
 * Score Insurance / Asset Indicator (10% weight)
 * Measures recoverability
 */
function scoreInsuranceIndicator(responses: IntakeResponse[]): { score: number; label: string } {
  const rawAnswers: Record<string, string> = {};
  for (const r of responses) {
    if (r.question_key && r.response_value) {
      rawAnswers[r.question_key] = r.response_value;
    }
  }
  
  const insuranceAnswer = rawAnswers['insurance'] || rawAnswers['other_insurance'] ||
                         rawAnswers['policy_type'] || rawAnswers['insurance_coverage'] || '';
  const liabilityDesc = rawAnswers['liability_description'] || '';
  const combined = (insuranceAnswer + ' ' + liabilityDesc).toLowerCase();
  
  // Commercial / corporate insured
  if (combined.includes('truck') || combined.includes('semi') || combined.includes('18-wheeler') ||
      combined.includes('commercial') || combined.includes('company') || combined.includes('uber') ||
      combined.includes('lyft') || combined.includes('delivery') || combined.includes('amazon')) {
    return { score: 10, label: 'Commercial/corporate policy' };
  }
  
  // Confirmed policy
  if (combined.includes('insurance') || combined.includes('policy') || combined.includes('coverage')) {
    return { score: 8, label: 'Insurance present' };
  }
  
  // Unknown
  return { score: 4, label: 'Insurance unknown' };
}

/**
 * Score Evidence Strength (10% weight)
 * Stronger documentation = higher economic leverage
 */
function scoreEvidenceStrength(responses: IntakeResponse[]): { score: number; label: string } {
  const rawAnswers: Record<string, string> = {};
  for (const r of responses) {
    if (r.question_key && r.response_value) {
      rawAnswers[r.question_key] = r.response_value;
    }
  }
  
  const liabilityDesc = rawAnswers['liability_description'] || '';
  const combined = Object.values(rawAnswers).join(' ').toLowerCase();
  
  let evidenceCount = 0;
  const evidenceTypes: string[] = [];
  
  // Police report
  if (combined.includes('police') || combined.includes('report') || combined.includes('officer')) {
    evidenceCount++;
    evidenceTypes.push('police report');
  }
  
  // Photos
  if (combined.includes('photo') || combined.includes('picture') || combined.includes('video') || combined.includes('camera')) {
    evidenceCount++;
    evidenceTypes.push('photos/video');
  }
  
  // Witnesses
  if (combined.includes('witness') || combined.includes('saw') || combined.includes('passenger')) {
    evidenceCount++;
    evidenceTypes.push('witnesses');
  }
  
  // Score based on evidence count
  if (evidenceCount >= 3) {
    return { score: 10, label: 'Strong evidence (police + photos + witnesses)' };
  }
  if (evidenceCount === 2) {
    return { score: 7, label: `Good evidence (${evidenceTypes.slice(0, 2).join(' + ')})` };
  }
  if (evidenceCount === 1) {
    return { score: 4, label: `Some evidence (${evidenceTypes[0]})` };
  }
  
  return { score: 0, label: 'No documented evidence' };
}

/**
 * Score Property Damage Severity (5% weight)
 * Property damage correlates strongly with settlement value
 */
function scorePropertyDamageSeverity(responses: IntakeResponse[]): { score: number; label: string } {
  const rawAnswers: Record<string, string> = {};
  for (const r of responses) {
    if (r.question_key && r.response_value) {
      rawAnswers[r.question_key] = r.response_value;
    }
  }
  
  const propertyDamage = rawAnswers['property_damage'] || 
                        rawAnswers['vehicle_damage'] ||
                        rawAnswers['damage_amount'] ||
                        rawAnswers['damage_description'] || '';
  
  if (!propertyDamage) return { score: 0, label: 'Property damage unknown' };
  
  const lower = propertyDamage.toLowerCase();
  
  // Total loss / extensive damage
  if (lower.includes('total loss') || lower.includes('totaled') || lower.includes('extensive') ||
      lower.includes('structural') || lower.includes('frame damage')) {
    return { score: 5, label: 'Total loss / extensive damage' };
  }
  
  // Significant damage
  if (lower.includes('significant') || lower.includes('severe') || lower.includes('major') ||
      lower.includes('airbag deployed') || lower.includes('towed')) {
    return { score: 4, label: 'Significant damage' };
  }
  
  // Moderate damage
  if (lower.includes('moderate') || lower.includes('dent') || lower.includes('scratch') ||
      lower.includes('bumper') || lower.includes('fender bender')) {
    return { score: 2, label: 'Moderate damage' };
  }
  
  // Minor damage
  if (lower.includes('minor') || lower.includes('small') || lower.includes('cosmetic')) {
    return { score: 1, label: 'Minor damage' };
  }
  
  return { score: 0, label: 'Property damage unknown' };
}

/**
 * Map Economic Strength score to tier
 * Moderate: 50-64 | High: 65-79 | Premium: 80-100
 */
function mapEconomicScoreToTier(score: number): 'Moderate' | 'High' | 'Premium' {
  if (score >= 80) return 'Premium';
  if (score >= 65) return 'High';
  return 'Moderate';
}

/**
 * Calculate Economic Strength Score (0-100)
 * 
 * SEPARATE from unlock score - measures economic potential, not intake completeness
 * 
 * GUARDRAILS:
 * - NEVER show if unlock threshold not met
 * - NO dollar estimates
 * - NO "likely settlement" language
 */
export function calculateEconomicStrengthScore(
  responses: IntakeResponse[],
  phone?: string
): EconomicStrengthScore {
  const rawAnswers: Record<string, string> = {};
  for (const r of responses) {
    if (r.question_key && r.response_value) {
      rawAnswers[r.question_key] = r.response_value;
    }
  }
  
  const injuryDescription = rawAnswers['injury_description'] || rawAnswers['what_injury'] || '';
  const treatmentDescription = rawAnswers['treatment_description'] || rawAnswers['what_treatment'] || '';
  const liabilityDescription = rawAnswers['liability_description'] || rawAnswers['what_happened'] || '';
  const lostWagesDescription = rawAnswers['lost_wages'] || rawAnswers['have_you_missed_work'] || '';
  
  // Score each component (NEW: property damage severity)
  const treatment = scoreTreatmentSeverity(treatmentDescription);
  const injury = scoreEconomicInjurySeverity(injuryDescription);
  const workImpact = scoreWorkImpact(lostWagesDescription);
  const liability = scoreLiabilityClarity(liabilityDescription);
  const insurance = scoreInsuranceIndicator(responses);
  const evidence = scoreEvidenceStrength(responses);
  const propertyDamage = scorePropertyDamageSeverity(responses);
  
  // Calculate total (each component already weighted)
  const totalScore = treatment.score + injury.score + workImpact.score + 
                     liability.score + insurance.score + evidence.score + 
                     propertyDamage.score;
  
  // Map to tier
  const tier = mapEconomicScoreToTier(totalScore);
  
  return {
    totalScore,
    tier,
    components: {
      treatmentSeverity: { score: treatment.score, weight: 25, label: treatment.label },
      injurySeverity: { score: injury.score, weight: 20, label: injury.label },
      workImpact: { score: workImpact.score, weight: 15, label: workImpact.label },
      liabilityClarity: { score: liability.score, weight: 15, label: liability.label },
      insuranceIndicator: { score: insurance.score, weight: 10, label: insurance.label },
      evidenceStrength: { score: evidence.score, weight: 10, label: evidence.label },
      propertyDamageSeverity: { score: propertyDamage.score, weight: 5, label: propertyDamage.label }, // NEW
    },
    signals: {
      treatmentLevel: treatment.label,
      injuryLevel: injury.label,
      workImpactLevel: workImpact.label,
      liabilityLevel: liability.label,
      insuranceLevel: insurance.label,
      evidenceLevel: evidence.label,
      propertyDamageLevel: propertyDamage.label, // NEW
    }
  };
}

/**
 * Map total score to Economic Strength Tier (3 tiers - Fiduciary Grade)
 * 
 * No "Low" tier - weak cases don't reach 85% threshold
 * All unlockable prospects are at least "Moderate"
 */
function mapScoreToTier(score: number): 'Moderate' | 'High' | 'Premium' {
  if (score >= 13) return 'Premium';  // Exceptional signals
  if (score >= 9) return 'High';      // Strong signals
  return 'Moderate';                   // Core signals present
}

/**
 * Get tier display info for Economic Strength
 */
export function getTierDisplay(tier: 'Moderate' | 'High' | 'Premium'): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const tiers = {
    'Moderate': { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
    'High': { color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
    'Premium': { color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-400' }
  };
  return tiers[tier];
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

export interface CaseScore {
  confidenceScore: number;
  caseGrade: 'A' | 'B' | 'C' | 'F';
  statuteStatus: 'valid' | 'expiring_soon' | 'expired' | 'unknown';
  liabilityClarity: number;
}

export interface EconomicViabilitySignal {
  band: 0 | 1 | 2 | 3;
  bandLabel: string;
  injurySeverityTier: 'Minor' | 'Moderate' | 'Severe' | 'Unknown';
  liabilityStrength: 'Low' | 'Medium' | 'High' | 'Unknown';
  treatmentPattern: string;
  lostWages: { documented: boolean; duration?: string };
  confidenceLevel: number;
  criteriaMet: number;
  criteriaTotal: number;
  statuteStatus: 'valid' | 'expiring_soon' | 'expired' | 'unknown';
  disclaimer: string;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateDEVBScore instead
 */
export function calculateEconomicViabilitySignal(
  lead: LeadForScoring,
  responses: IntakeResponse[]
): EconomicViabilitySignal {
  const devb = calculateDEVBScore(lead, responses);
  
  // Map tier to band (3-tier system)
  const tierToBand: Record<string, 0 | 1 | 2 | 3> = {
    'Moderate': 1,
    'High': 2,
    'Premium': 3
  };
  
  // Map injury severity
  const severityMap: Record<string, 'Minor' | 'Moderate' | 'Severe' | 'Unknown'> = {
    'Minor': 'Minor',
    'Minor (soft tissue)': 'Minor',
    'Moderate': 'Moderate',
    'Severe': 'Severe'
  };
  
  // Map liability strength
  const liabilityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Unknown'> = {
    'Shared fault admitted': 'Low',
    'Unclear liability': 'Low',
    'Liability under review': 'Medium',
    'Clear third-party fault': 'High',
    'Clear third-party fault + witness confirmed': 'High',
    'Police report + other at fault': 'High'
  };
  
  return {
    band: tierToBand[devb.tier],
    bandLabel: `${devb.tier} Economic Viability`,
    injurySeverityTier: severityMap[devb.dimensions.injurySeverity.label] || 'Unknown',
    liabilityStrength: liabilityMap[devb.dimensions.liabilityStrength.label] || 'Unknown',
    treatmentPattern: devb.indicators.treatmentPattern,
    lostWages: {
      documented: devb.dimensions.lostWages.score > 0,
      duration: devb.dimensions.lostWages.duration !== 'None' ? devb.dimensions.lostWages.duration : undefined
    },
    confidenceLevel: devb.confidenceLevel,
    criteriaMet: devb.totalScore,
    criteriaTotal: 16,
    statuteStatus: devb.indicators.statuteStatus === 'expired' ? 'expired' : 
                   devb.indicators.statuteStatus === 'valid' ? 'valid' : 'unknown',
    disclaimer: devb.disclaimer
  };
}

export function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'F';
}

export function getGradeDisplay(grade: 'A' | 'B' | 'C' | 'F'): {
  label: string;
  color: string;
  bgColor: string;
} {
  const grades = {
    'A': { label: 'High Probability', color: 'text-green-700', bgColor: 'bg-green-100' },
    'B': { label: 'Good Potential', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'C': { label: 'Moderate Risk', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    'F': { label: 'High Risk', color: 'text-red-700', bgColor: 'bg-red-100' }
  };
  return grades[grade];
}

export function getBandDisplay(band: 0 | 1 | 2 | 3): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const bands = {
    0: { label: 'Low Strength', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
    1: { label: 'Limited Strength', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
    2: { label: 'Moderate Strength', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
    3: { label: 'Strong Strength', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' }
  };
  return bands[band];
}

/**
 * Time saved estimate (industry standard)
 */
export function getTimeSavedEstimate(): number {
  return 37; // minutes - industry average for solo PI attorney intake screening
}

/**
 * Check intake completeness percentage
 * Returns percentage of core questions answered
 */
export function checkIntakeCompleteness(responses: IntakeResponse[]): number {
  // Core questions that should be answered for a complete intake
  const coreQuestions = [
    'incident_date',
    'date_of_incident',
    'when_did_this_happen',
    'injury_description',
    'what_injury',
    'describe_your_injuries',
    'treatment_description',
    'what_treatment',
    'did_you_seek_medical_treatment',
    'liability_description',
    'what_happened',
    'incident_description',
    'who_was_at_fault',
    'witness_available',
    'were_there_any_witnesses',
    'police_report_filed',
    'lost_wages',
    'have_you_missed_work',
    'prior_attorney',
    'have_you_spoken_to_another_attorney'
  ];
  
  // Check which core questions have been answered
  const answeredCount = coreQuestions.filter(q => {
    const response = responses.find(r => r.question_key === q);
    return response && response.response_value && response.response_value.trim() !== '';
  }).length;
  
  // Return percentage (unique questions answered / unique questions asked)
  const uniqueQuestions = new Set(responses.map(r => r.question_key)).size;
  const coreAnswered = Math.min(answeredCount, uniqueQuestions);
  
  // Calculate based on core questions coverage
  return Math.round((answeredCount / coreQuestions.length) * 100);
}

/**
 * Intake completion threshold - unlock only available at 75%+
 * Fiduciary-grade: protects long-term data moat and settlement intelligence integrity
 * 
 * HARD REQUIREMENT: All 4 MANDATORY signals must be present (total = 70%):
 * - Jurisdiction: 15% (must be valid state, in-state)
 * - Incident Date: 15% (must be within statute)
 * - Liability Indicator: 20% (clear third-party fault, no admission)
 * - Treatment Status: 20% (ER, specialist, or surgery)
 * 
 * + Any combination of optional fields to reach ≥75%
 * - Prior Representation: 5%
 * - Injury Severity: 15%
 * - Lost Wages: 10%
 * 
 * If ANY mandatory signal is missing → unlock disabled regardless of score
 * 
 * TENANT-SPECIFIC THRESHOLD:
 * Premium/Enterprise tenants may have custom thresholds (70-85%)
 * Configured by TrueVow CSMs via SaaS Admin module
 */
export const INTAKE_COMPLETION_THRESHOLD = 75;

/**
 * Valid threshold range for tenant-specific configuration
 * CSMs can configure thresholds within this range
 */
export const THRESHOLD_RANGE = {
  MIN: 70,
  MAX: 85,
  DEFAULT: 75,
} as const;

/**
 * Mandatory signals that are REQUIRED for unlock (total = 75%)
 * These 5 are non-negotiable - missing any disables unlock
 */
export const MANDATORY_SIGNALS = {
  jurisdiction: { weight: 15, label: 'Jurisdiction' },
  incidentDate: { weight: 15, label: 'Incident Date' },
  liabilityIndicator: { weight: 20, label: 'Liability Indicator' },
  treatmentStatus: { weight: 20, label: 'Treatment Status' },
  representationStatus: { weight: 5, label: 'Representation Status' }, // NEW - ethical compliance
} as const;

/**
 * Optional fields that contribute to score (25% total)
 */
export const OPTIONAL_SIGNALS = {
  injurySeverity: { weight: 15, label: 'Injury Severity' },
  lostWageIndicator: { weight: 10, label: 'Lost Wages' },
} as const;

/**
 * Weighted intake completion categories
 * Based on importance, not question count
 * 
 * MANDATORY (75% total - all 5 required for unlock):
 * - Jurisdiction: 15%
 * - Incident Date: 15%
 * - Liability Indicator: 20%
 * - Treatment Status: 20%
 * - Representation Status: 5% (NEW - ethical compliance)
 * 
 * OPTIONAL (25% total - reach 75% threshold):
 * - Injury Severity: 15%
 * - Lost Wages: 10%
 */
export const WEIGHTED_CATEGORIES = {
  // Mandatory signals (required for unlock)
  jurisdiction: { weight: 15, label: 'Jurisdiction' },
  incidentDate: { weight: 15, label: 'Incident Date' },
  liabilityIndicator: { weight: 20, label: 'Liability Indicator' },
  treatmentStatus: { weight: 20, label: 'Treatment Status' },
  representationStatus: { weight: 5, label: 'Representation Status' }, // NEW - ethical compliance
  // Optional signals (contribute to score)
  injurySeverity: { weight: 15, label: 'Injury Severity' },
  lostWageIndicator: { weight: 10, label: 'Lost Wages' },
} as const;

/**
 * Practice area codes for liability determination
 */
export type PracticeAreaCode = 
  | 'CAR_ACCIDENT' 
  | 'SLIP_FALL' 
  | 'WORKPLACE_INJURY' 
  | 'DOG_BITE' 
  | 'PRODUCT_LIABILITY' 
  | 'OTHER_PI'
  | 'personal_injury';

/**
 * Structured core signals derived from raw intake answers
 */
export interface StructuredCoreSignals {
  jurisdiction: string | null;
  isValidJurisdiction: boolean;
  incidentDate: string | null;
  isInStatuteWindow: boolean;
  liabilityIndicator: boolean;
  treatmentStatus: string | null;
  representationStatus: 'not_represented' | 'represented' | null; // NEW - ethical compliance
  injurySeverity: string | null;
  lostWages: string | null;
}

/**
 * Statute of limitations by state (years) for personal injury
 */
const STATUTE_OF_LIMITATIONS: Record<string, number> = {
  FL: 4, // Florida is 4 years for PI
  CA: 2,
  NY: 3,
  TX: 2,
  GA: 2,
  IL: 2,
  PA: 2,
  OH: 2,
  MI: 3,
  NJ: 2,
  VA: 2,
  WA: 3,
  AZ: 2,
  MA: 3,
  TN: 1,
  IN: 2,
  MO: 5,
  MD: 3,
  WI: 3,
  CO: 2,
  MN: 6,
  SC: 3,
  AL: 2,
  LA: 1,
  KY: 1,
  OR: 2,
  OK: 2,
  CT: 2,
  UT: 4,
  NV: 2,
  AR: 3,
  MS: 3,
  KS: 2,
  IA: 2,
  NM: 3,
  NE: 4,
  WV: 2,
  ID: 2,
  HI: 2,
  NH: 3,
  ME: 6,
  MT: 3,
  RI: 3,
  DE: 2,
  SD: 3,
  ND: 6,
  VT: 3,
  WY: 4,
  AK: 2,
  DC: 3,
};

/**
 * Infer date from relative timing answers
 */
export function inferDateFromAnswers(answers: Record<string, string>): string | null {
  // Check for various timing question patterns
  const timing = answers['CA_Q02_WHEN_OCCURRED'] ||
                 answers['SF_Q02_WHEN_OCCURRED'] ||
                 answers['WI_Q02_WHEN_OCCURRED'] ||
                 answers['DB_Q02_WHEN_OCCURRED'] ||
                 answers['PL_Q02_WHEN_OCCURRED'] ||
                 answers['OPI_Q02_WHEN_OCCURRED'] ||
                 answers['when_did_this_happen'] ||
                 answers['incident_date'] ||
                 answers['date_of_incident'];

  if (!timing) return null;

  // If already a date string, return it
  if (timing.match(/^\d{4}-\d{2}-\d{2}$/)) return timing;
  if (timing.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [month, day, year] = timing.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const today = new Date();
  let daysAgo = 0;

  // Parse relative timing codes
  if (timing === '1') daysAgo = 1;       // Today/yesterday
  else if (timing === '2') daysAgo = 3;  // Within week
  else if (timing === '3') daysAgo = 15; // Within month
  else if (timing === '4') {
    const followup = answers['CA_Q02B_TIMING_FOLLOWUP'] ||
                    answers['SF_Q02B_TIMING_FOLLOWUP'] ||
                    answers['WI_Q02B_TIMING_FOLLOWUP'] ||
                    answers['DB_Q02B_TIMING_FOLLOWUP'] ||
                    answers['PL_Q02B_TIMING_FOLLOWUP'] ||
                    answers['OPI_Q02B_TIMING_FOLLOWUP'];

    if (followup === '1') daysAgo = 60;   // 1-3 months
    else if (followup === '2') daysAgo = 120;  // 3-6 months
    else if (followup === '3') daysAgo = 270;  // 6-12 months
    else if (followup === '4') {
      const years = answers['CA_Q02C_YEARS_FOLLOWUP'] ||
                   answers['SF_Q02C_YEARS_FOLLOWUP'] ||
                   answers['WI_Q02C_YEARS_FOLLOWUP'] ||
                   answers['DB_Q02C_YEARS_FOLLOWUP'] ||
                   answers['PL_Q02C_YEARS_FOLLOWUP'] ||
                   answers['OPI_Q02C_YEARS_FOLLOWUP'];

      if (years === '1') daysAgo = 547;   // 1-2 years
      else if (years === '2') return null; // >2 years → outside typical statute
    }
  } else {
    // Try parsing natural language
    const lowerTiming = timing.toLowerCase();
    if (lowerTiming.includes('today') || lowerTiming.includes('yesterday')) daysAgo = 1;
    else if (lowerTiming.includes('week')) daysAgo = 7;
    else if (lowerTiming.includes('two weeks') || lowerTiming.includes('2 weeks')) daysAgo = 14;
    else if (lowerTiming.includes('three weeks') || lowerTiming.includes('3 weeks')) daysAgo = 21;
    else if (lowerTiming.includes('month') && !lowerTiming.includes('months')) daysAgo = 30;
    else if (lowerTiming.includes('two months') || lowerTiming.includes('2 months')) daysAgo = 60;
    else if (lowerTiming.includes('three months') || lowerTiming.includes('3 months')) daysAgo = 90;
    else if (lowerTiming.includes('months')) daysAgo = 120;
    else if (lowerTiming.includes('year') && !lowerTiming.includes('years')) daysAgo = 365;
    else if (lowerTiming.includes('last year') || lowerTiming.includes('a year')) daysAgo = 365;
    else if (lowerTiming.includes('years')) daysAgo = 730;
  }

  const inferredDate = new Date(today);
  inferredDate.setDate(today.getDate() - daysAgo);
  return inferredDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Check if date is within statute of limitations
 */
export function isWithinStatute(incidentDate: string | null, jurisdiction: string | null): boolean {
  if (!incidentDate || !jurisdiction) return false;

  const statuteYears = STATUTE_OF_LIMITATIONS[jurisdiction.toUpperCase()] ?? 2;
  const statuteDate = new Date(incidentDate);
  statuteDate.setFullYear(statuteDate.getFullYear() + statuteYears);

  return new Date() <= statuteDate;
}

/**
 * Determine liability indicator based on practice area
 */
export function determineLiability(answers: Record<string, string>, practiceArea: PracticeAreaCode): boolean {
  switch (practiceArea) {
    case 'CAR_ACCIDENT':
      // Clear liability if other driver cited OR witness confirms fault
      const citation = answers['CA_Q07_CITATION'];
      const witness = answers['CA_Q08_WITNESSES'];
      // Citation "2" = other driver cited, Witness "1" or "2" = witness confirms
      return citation === '2' || witness === '1' || witness === '2';

    case 'SLIP_FALL':
      // Hazard exists and owner was aware
      const hazard = answers['SF_Q04_HAZARD_CONDITION'];
      const ownerAware = answers['SF_Q06_PROPERTY_OWNER_AWARENESS'];
      // Hazard exists (not "6" = no hazard) and owner had notice
      return hazard !== '6' && (ownerAware === '1' || ownerAware === '2' || ownerAware === '3');

    case 'WORKPLACE_INJURY':
      // Third party liability exists (not employer only)
      const thirdParty = answers['WI_Q07_THIRD_PARTY_LIABILITY'];
      return thirdParty !== '4'; // Not "employer only"

    case 'DOG_BITE':
      // Not provoked
      const provocation = answers['DB_Q05_PROVOCATION'];
      return provocation === '1' || provocation === '2' || provocation === '3';

    case 'PRODUCT_LIABILITY':
      // No or inadequate warnings
      const warnings = answers['PL_Q08_WARNING_LABELS'];
      return warnings === '1' || warnings === '2';

    case 'OTHER_PI':
      // Not "Other" incident type (has defined category)
      const incidentType = answers['OPI_Q03_INCIDENT_TYPE'];
      return incidentType !== '7';

    case 'personal_injury':
    default:
      // Default: check for liability description indicating clear fault
      const liabilityDesc = answers['liability_description'] ||
                           answers['what_happened'] ||
                           answers['who_was_at_fault'];
      if (!liabilityDesc) return false;
      
      // Check for indicators of clear third-party fault
      const faultIndicators = [
        'rear-ended', 't-boned', 'sideswiped', 'hit by', 'struck by',
        'ran red light', 'ran a red', 'drunk driver', 'dui',
        'ran stop sign', 'failed to yield', 'crossed into my lane',
        'fell asleep', 'distracted', 'texting',
        'wet floor', 'no warning', 'no sign', 'broken', 'defective',
        'unsafe', 'negligent', 'negligence'
      ];
      
      const lowerDesc = liabilityDesc.toLowerCase();
      return faultIndicators.some(indicator => lowerDesc.includes(indicator));
  }
}

/**
 * Normalize raw intake answers to structured core signals
 */
export function normalizeCoreSignals(
  rawAnswers: Record<string, string>,
  practiceArea: PracticeAreaCode = 'personal_injury'
): StructuredCoreSignals {
  // 1. JURISDICTION - check multiple question key patterns
  const jurisdiction = rawAnswers['CA_Q01_JURISDICTION'] ||
                      rawAnswers['SF_Q01_JURISDICTION'] ||
                      rawAnswers['WI_Q01_JURISDICTION'] ||
                      rawAnswers['DB_Q01_JURISDICTION'] ||
                      rawAnswers['PL_Q01_JURISDICTION'] ||
                      rawAnswers['OPI_Q01_JURISDICTION'] ||
                      rawAnswers['jurisdiction'] ||
                      rawAnswers['state'];
  
  // Valid if answer is "1" (yes, in state) or a valid 2-letter state code
  const isValidJurisdiction = jurisdiction === '1' || 
    (jurisdiction?.length === 2 && Object.keys(STATUTE_OF_LIMITATIONS).includes(jurisdiction.toUpperCase()));

  // 2. INCIDENT DATE with statute validation
  const incidentDate = inferDateFromAnswers(rawAnswers);
  const jurisdictionCode = isValidJurisdiction && jurisdiction?.length === 2 
    ? jurisdiction.toUpperCase() 
    : 'FL'; // Default to FL for statute check
  const isInStatuteWindow = isWithinStatute(incidentDate, jurisdictionCode);

  // 3. LIABILITY INDICATOR (practice-specific)
  const liabilityIndicator = determineLiability(rawAnswers, practiceArea);

  // 4. TREATMENT STATUS
  const treatmentStatus = rawAnswers['CA_Q06_MEDICAL_TREATMENT'] ||
                         rawAnswers['SF_Q10_MEDICAL_TREATMENT'] ||
                         rawAnswers['WI_Q08_MEDICAL_TREATMENT'] ||
                         rawAnswers['DB_Q07_MEDICAL_TREATMENT'] ||
                         rawAnswers['PL_Q11_MEDICAL_TREATMENT'] ||
                         rawAnswers['OPI_Q07_MEDICAL_TREATMENT'] ||
                         rawAnswers['treatment_description'] ||
                         rawAnswers['what_treatment'] ||
                         rawAnswers['did_you_seek_medical_treatment'];

  // 5. REPRESENTATION STATUS - ETHICAL COMPLIANCE: cannot solicit represented clients
  const representationAnswer = rawAnswers['CONFLICT_Q01_PRIOR_REP'] ||
                              rawAnswers['prior_attorney'] ||
                              rawAnswers['have_you_spoken_to_another_attorney'];
  
  // Determine if client is currently represented (hard disqualifier)
  // "1" = No prior attorney (not represented)
  // "2" = Consulted another attorney (not represented, but shopping)
  // "3" = Hired another attorney (REPRESENTED - ethical bar)
  let representationStatus: 'not_represented' | 'represented' | null = null;
  if (representationAnswer) {
    representationStatus = representationAnswer === '3' ? 'represented' : 'not_represented';
  }

  // Optional fields
  const injurySeverity = rawAnswers['injury_description'] ||
                        rawAnswers['what_injury'] ||
                        rawAnswers['describe_your_injuries'] ||
                        rawAnswers['CA_Q05_INJURY_DESCRIPTION'] ||
                        rawAnswers['SF_Q08_INJURY_DESCRIPTION'];

  const lostWages = rawAnswers['lost_wages'] ||
                   rawAnswers['have_you_missed_work'] ||
                   rawAnswers['CA_Q09_LOST_WAGES'] ||
                   rawAnswers['SF_Q12_LOST_WAGES'];

  return {
    jurisdiction,
    isValidJurisdiction,
    incidentDate,
    isInStatuteWindow,
    liabilityIndicator,
    treatmentStatus,
    representationStatus, // NEW - ethical compliance
    injurySeverity,
    lostWages,
  };
}

/**
 * Calculate weighted intake completion percentage
 * Uses structured core signals for deterministic scoring
 * Returns percentage based on weighted importance
 */
export function calculateWeightedCompletion(
  responses: IntakeResponse[],
  practiceArea: PracticeAreaCode = 'personal_injury'
): {
  completion: number;
  categories: {
    key: string;
    label: string;
    weight: number;
    completed: boolean;
  }[];
  missingCategories: string[];
  coreSignals: StructuredCoreSignals;
} {
  const categories: {
    key: string;
    label: string;
    weight: number;
    completed: boolean;
  }[] = [];
  
  const missingCategories: string[] = [];
  
  // Convert responses array to Record for signal processing
  const rawAnswers: Record<string, string> = {};
  for (const response of responses) {
    if (response.question_key && response.response_value) {
      rawAnswers[response.question_key] = response.response_value;
    }
  }
  
  // Normalize raw answers to structured core signals
  const coreSignals = normalizeCoreSignals(rawAnswers, practiceArea);
  
  // === MANDATORY SIGNALS (required for unlock - 70% total) ===
  
  // Jurisdiction (15%) - must be valid state
  const jurisdictionComplete = coreSignals.isValidJurisdiction;
  categories.push({
    key: 'jurisdiction',
    label: WEIGHTED_CATEGORIES.jurisdiction.label,
    weight: WEIGHTED_CATEGORIES.jurisdiction.weight,
    completed: jurisdictionComplete
  });
  if (!jurisdictionComplete) missingCategories.push(WEIGHTED_CATEGORIES.jurisdiction.label);
  
  // Incident Date (15%) - must be within statute
  const incidentDateComplete = coreSignals.incidentDate !== null && coreSignals.isInStatuteWindow;
  categories.push({
    key: 'incidentDate',
    label: WEIGHTED_CATEGORIES.incidentDate.label,
    weight: WEIGHTED_CATEGORIES.incidentDate.weight,
    completed: incidentDateComplete
  });
  if (!incidentDateComplete) missingCategories.push(WEIGHTED_CATEGORIES.incidentDate.label);
  
  // Liability Indicator (20%) - practice-specific logic
  categories.push({
    key: 'liabilityIndicator',
    label: WEIGHTED_CATEGORIES.liabilityIndicator.label,
    weight: WEIGHTED_CATEGORIES.liabilityIndicator.weight,
    completed: coreSignals.liabilityIndicator
  });
  if (!coreSignals.liabilityIndicator) missingCategories.push(WEIGHTED_CATEGORIES.liabilityIndicator.label);
  
  // Treatment Status (20%)
  const treatmentComplete = coreSignals.treatmentStatus !== null;
  categories.push({
    key: 'treatmentStatus',
    label: WEIGHTED_CATEGORIES.treatmentStatus.label,
    weight: WEIGHTED_CATEGORIES.treatmentStatus.weight,
    completed: treatmentComplete
  });
  if (!treatmentComplete) missingCategories.push(WEIGHTED_CATEGORIES.treatmentStatus.label);
  
  // === MANDATORY SIGNALS (75% total - all 5 required for unlock) ===
  
  // Representation Status (5%) - ETHICAL COMPLIANCE: cannot solicit represented clients
  const representationComplete = coreSignals.representationStatus !== null && 
                                  coreSignals.representationStatus === 'not_represented';
  categories.push({
    key: 'representationStatus',
    label: WEIGHTED_CATEGORIES.representationStatus.label,
    weight: WEIGHTED_CATEGORIES.representationStatus.weight,
    completed: representationComplete
  });
  if (!representationComplete) missingCategories.push(WEIGHTED_CATEGORIES.representationStatus.label);
  
  // === OPTIONAL SIGNALS (25% total - reach 75% threshold) ===
  
  // Injury Severity (15%)
  categories.push({
    key: 'injurySeverity',
    label: WEIGHTED_CATEGORIES.injurySeverity.label,
    weight: WEIGHTED_CATEGORIES.injurySeverity.weight,
    completed: coreSignals.injurySeverity !== null
  });
  
  // Lost Wages (10%)
  categories.push({
    key: 'lostWageIndicator',
    label: WEIGHTED_CATEGORIES.lostWageIndicator.label,
    weight: WEIGHTED_CATEGORIES.lostWageIndicator.weight,
    completed: coreSignals.lostWages !== null
  });
  
  // Calculate weighted completion
  const completedWeight = categories
    .filter(c => c.completed)
    .reduce((sum, c) => sum + c.weight, 0);
  
  return {
    completion: completedWeight,
    categories,
    missingCategories: missingCategories.slice(0, 3), // Max 3 shown
    coreSignals
  };
}

/**
 * Check if unlock is available based on weighted completion threshold
 * 
 * FIDUCIARY-GRADE RULES:
 * 1. All 4 MANDATORY signals must be present AND valid (hard requirement)
 *    - Jurisdiction: must be valid state (in-state)
 *    - Incident Date: must be within statute of limitations
 *    - Liability Indicator: clear third-party fault
 *    - Treatment Status: ER, specialist, or surgery
 * 2. Total score must be ≥ threshold (default 75%)
 * 3. If any mandatory signal is missing → unlock disabled regardless of score
 * 
 * TENANT-SPECIFIC THRESHOLD:
 * Premium/Enterprise tenants may have custom thresholds (70-85%)
 * Pass customThreshold parameter from tenant configuration
 */
export function isUnlockAvailable(
  responses: IntakeResponse[],
  practiceArea: PracticeAreaCode = 'personal_injury',
  customThreshold?: number
): {
  available: boolean;
  completion: number;
  threshold: number;
  missingCategories: string[];
  missingMandatoryFields: string[];
  categories: {
    key: string;
    label: string;
    weight: number;
    completed: boolean;
    isMandatory: boolean;
  }[];
  coreSignals: StructuredCoreSignals;
} {
  const weighted = calculateWeightedCompletion(responses, practiceArea);
  
  // Use custom threshold if provided and within valid range
  // Otherwise use default 75%
  const threshold = (
    customThreshold !== undefined &&
    customThreshold >= THRESHOLD_RANGE.MIN &&
    customThreshold <= THRESHOLD_RANGE.MAX
  ) ? customThreshold : INTAKE_COMPLETION_THRESHOLD;
  
  // Identify mandatory vs optional signals
  const mandatoryFieldKeys = Object.keys(MANDATORY_SIGNALS);
  
  // Mark each category as mandatory or optional
  const categoriesWithMandatoryFlag = weighted.categories.map(cat => ({
    ...cat,
    isMandatory: mandatoryFieldKeys.includes(cat.key)
  }));
  
  // Check for missing mandatory signals (hard requirement)
  const missingMandatoryFields = categoriesWithMandatoryFlag
    .filter(cat => cat.isMandatory && !cat.completed)
    .map(cat => cat.label);
  
  // HARD REQUIREMENT: All 4 mandatory signals must be present AND valid
  // - Jurisdiction (in-state)
  // - Incident Date (within statute)
  // - Liability Indicator (clear third-party fault)
  // - Treatment Status (ER, specialist, or surgery)
  const allMandatoryFieldsComplete = missingMandatoryFields.length === 0;
  
  // Unlock available only if:
  // 1. All 4 mandatory signals present (70%)
  // 2. Total score ≥ threshold (default 75%)
  const available = weighted.completion >= threshold && allMandatoryFieldsComplete;
  
  // Log scoring decision for compliance audit
  console.log(`[UNLOCK CHECK] completion=${weighted.completion}%, threshold=${threshold}%, allMandatoryComplete=${allMandatoryFieldsComplete}, available=${available}, missing=[${missingMandatoryFields.join(', ')}]`);
  
  return {
    available,
    completion: weighted.completion,
    threshold,
    missingCategories: weighted.missingCategories,
    missingMandatoryFields,
    categories: categoriesWithMandatoryFlag,
    coreSignals: weighted.coreSignals
  };
}

// ============================================================================
// QUESTION KEY & RESPONSE CODE LABELS
// ============================================================================

/**
 * Human-readable labels for Benjamin intake question keys
 */
export const QUESTION_LABELS: Record<string, string> = {
  // Car Accident questions
  'CA_Q01_JURISDICTION': 'Jurisdiction',
  'CA_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'CA_Q02B_TIMING_FOLLOWUP': 'Timing Follow-up',
  'CA_Q02C_YEARS_FOLLOWUP': 'Years Follow-up',
  'CA_Q03_ACCIDENT_TYPE': 'Accident Type',
  'CA_Q04_AT_FAULT': 'Who Was At Fault',
  'CA_Q05_INJURY_DESCRIPTION': 'Injury Description',
  'CA_Q06_MEDICAL_TREATMENT': 'Medical Treatment',
  'CA_Q07_CITATION': 'Citation Issued',
  'CA_Q08_WITNESSES': 'Witnesses',
  'CA_Q09_LOST_WAGES': 'Lost Wages',
  
  // Slip & Fall questions
  'SF_Q01_JURISDICTION': 'Jurisdiction',
  'SF_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'SF_Q04_HAZARD_CONDITION': 'Hazard Condition',
  'SF_Q06_PROPERTY_OWNER_AWARENESS': 'Property Owner Awareness',
  'SF_Q08_INJURY_DESCRIPTION': 'Injury Description',
  'SF_Q10_MEDICAL_TREATMENT': 'Medical Treatment',
  'SF_Q12_LOST_WAGES': 'Lost Wages',
  
  // Dog Bite questions
  'DB_Q01_JURISDICTION': 'Jurisdiction',
  'DB_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'DB_Q03_DOG_OWNER': 'Dog Owner',
  'DB_Q04_INJURY_DESCRIPTION': 'Injury Description',
  'DB_Q05_PROVOCATION': 'Provocation',
  'DB_Q07_MEDICAL_TREATMENT': 'Medical Treatment',
  
  // Workplace Injury questions
  'WI_Q01_JURISDICTION': 'Jurisdiction',
  'WI_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'WI_Q07_THIRD_PARTY_LIABILITY': 'Third Party Liability',
  'WI_Q08_MEDICAL_TREATMENT': 'Medical Treatment',
  
  // Other PI questions
  'OPI_Q01_JURISDICTION': 'Jurisdiction',
  'OPI_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'OPI_Q03_INCIDENT_TYPE': 'Incident Type',
  'OPI_Q07_MEDICAL_TREATMENT': 'Medical Treatment',
  
  // Product Liability questions
  'PL_Q01_JURISDICTION': 'Jurisdiction',
  'PL_Q02_WHEN_OCCURRED': 'When Did This Happen',
  'PL_Q08_WARNING_LABELS': 'Warning Labels',
  'PL_Q11_MEDICAL_TREATMENT': 'Medical Treatment',
  
  // Conflict check (all practice areas)
  'CONFLICT_Q01_PRIOR_REP': 'Prior Attorney',
};

/**
 * Human-readable labels for response codes by question
 */
export const RESPONSE_LABELS: Record<string, Record<string, string>> = {
  // Jurisdiction responses
  'CA_Q01_JURISDICTION': {
    '1': 'Yes, in Florida',
    '2': 'No, outside Florida',
  },
  'SF_Q01_JURISDICTION': {
    '1': 'Yes, in Florida',
    '2': 'No, outside Florida',
  },
  'DB_Q01_JURISDICTION': {
    '1': 'Yes, in Florida',
    '2': 'No, outside Florida',
  },
  'WI_Q01_JURISDICTION': {
    '1': 'Yes, in Florida',
    '2': 'No, outside Florida',
  },
  
  // Timing responses
  'CA_Q02_WHEN_OCCURRED': {
    '1': 'Today/Yesterday',
    '2': 'Within the past week',
    '3': 'Within the past month',
    '4': 'More than a month ago',
  },
  'SF_Q02_WHEN_OCCURRED': {
    '1': 'Today/Yesterday',
    '2': 'Within the past week',
    '3': 'Within the past month',
    '4': 'More than a month ago',
  },
  'DB_Q02_WHEN_OCCURRED': {
    '1': 'Today/Yesterday',
    '2': 'Within the past week',
    '3': 'Within the past month',
    '4': 'More than a month ago',
  },
  'CA_Q02B_TIMING_FOLLOWUP': {
    '1': '1-3 months ago',
    '2': '3-6 months ago',
    '3': '6-12 months ago',
    '4': 'More than a year ago',
  },
  'CA_Q02C_YEARS_FOLLOWUP': {
    '1': '1-2 years ago',
    '2': 'More than 2 years ago',
  },
  
  // Accident type
  'CA_Q03_ACCIDENT_TYPE': {
    '1': 'Rear-end collision',
    '2': 'T-bone/Side-impact',
    '3': 'Sideswipe',
    '4': 'Head-on collision',
    '5': 'Commercial vehicle/Truck',
  },
  
  // At fault
  'CA_Q04_AT_FAULT': {
    '1': 'Other driver at fault',
    '2': 'Shared fault',
    '3': 'I was at fault',
  },
  
  // Injury description
  'CA_Q05_INJURY_DESCRIPTION': {
    '1': 'Minor (whiplash/soft tissue)',
    '2': 'Herniated disc',
    '3': 'Multiple severe injuries',
    '4': 'Traumatic brain injury',
  },
  'DB_Q04_INJURY_DESCRIPTION': {
    '1': 'Minor (scratches/bruises)',
    '2': 'Moderate (stitches required)',
    '3': 'Severe (surgery required)',
  },
  
  // Medical treatment
  'CA_Q06_MEDICAL_TREATMENT': {
    '1': 'No treatment yet',
    '2': 'ER only',
    '3': 'ER + ongoing PT',
    '4': 'Chiropractor only',
    '5': 'Surgery scheduled',
    '6': 'Multiple surgeries',
  },
  'SF_Q10_MEDICAL_TREATMENT': {
    '1': 'No treatment yet',
    '2': 'ER + follow-up',
    '3': 'Ongoing PT/Chiropractor',
    '4': 'Surgery scheduled',
  },
  'DB_Q07_MEDICAL_TREATMENT': {
    '1': 'No treatment yet',
    '2': 'ER only',
    '3': 'Stitches',
    '4': 'Plastic surgery',
    '5': 'Reconstructive surgery scheduled',
  },
  
  // Citation
  'CA_Q07_CITATION': {
    '1': 'No citation issued',
    '2': 'Other driver cited',
    '3': 'I was cited',
  },
  
  // Witnesses
  'CA_Q08_WITNESSES': {
    '1': 'Yes, witness available',
    '2': 'Passenger in my car',
    '3': 'No witnesses',
  },
  
  // Lost wages
  'CA_Q09_LOST_WAGES': {
    '1': 'No lost wages',
    '2': 'Less than 1 week',
    '3': '1+ months missed',
    '4': "Lost job/can't work",
  },
  
  // Slip & Fall specific
  'SF_Q04_HAZARD_CONDITION': {
    '1': 'Wet floor',
    '2': 'Uneven surface',
    '3': 'Debris/obstacle',
    '4': 'No handrail',
    '5': 'Poor lighting',
    '6': 'No hazard found',
  },
  'SF_Q06_PROPERTY_OWNER_AWARENESS': {
    '1': 'Owner was aware',
    '2': 'Owner should have known',
    '3': 'Unknown',
  },
  
  // Dog Bite specific
  'DB_Q03_DOG_OWNER': {
    '1': "Neighbor's dog",
    '2': "Friend's dog",
    '3': 'Stray dog',
    '4': 'My own dog',
  },
  'DB_Q05_PROVOCATION': {
    '1': 'No provocation',
    '2': 'I was on my property',
    '3': 'Dog was loose',
  },
  
  // Prior representation
  'CONFLICT_Q01_PRIOR_REP': {
    '1': 'No prior attorney',
    '2': 'Consulted another attorney',
    '3': 'Hired another attorney',
  },
};

/**
 * Extract case strength signals from intake responses for attorney preview.
 * Returns high-value economic indicators that drive unlock decisions.
 * Safe to display before unlock (no PII).
 */
export function extractCaseSignals(responses: IntakeResponse[]): {
  signals: { label: string; category: 'liability' | 'damages' | 'urgency' }[];
  accidentType: string | null;
  timing: string | null;
} {
  const answers: Record<string, string> = {};
  for (const r of responses) {
    if (r.response_value) answers[r.question_key] = r.response_value;
  }

  const signals: { label: string; category: 'liability' | 'damages' | 'urgency' }[] = [];

  // LIABILITY SIGNALS
  // Police report / citation
  const citation = answers['CA_Q07_CITATION'];
  if (citation === '2') signals.push({ label: 'Police Report Filed', category: 'liability' });

  // Witness available
  const witness = answers['CA_Q08_WITNESSES'];
  if (witness === '1' || witness === '2') signals.push({ label: 'Witness Available', category: 'liability' });

  // Other driver at fault
  const atFault = answers['CA_Q04_AT_FAULT'];
  if (atFault === '1') signals.push({ label: 'Other Driver At Fault', category: 'liability' });

  // DAMAGES SIGNALS
  // Medical treatment level
  const medCar = answers['CA_Q06_MEDICAL_TREATMENT'];
  const medSf = answers['SF_Q10_MEDICAL_TREATMENT'];
  const medDb = answers['DB_Q07_MEDICAL_TREATMENT'];
  
  if (medCar === '2' || medSf === '2' || medDb === '2') {
    signals.push({ label: 'ER Visit', category: 'damages' });
  } else if (medCar === '3' || medSf === '3') {
    signals.push({ label: 'ER + Ongoing Treatment', category: 'damages' });
  } else if (medCar === '5' || medCar === '6' || medSf === '4' || medDb === '4' || medDb === '5') {
    signals.push({ label: 'Surgery Required', category: 'damages' });
  }

  // Injury severity
  const injuryCar = answers['CA_Q05_INJURY_DESCRIPTION'];
  const injuryDb = answers['DB_Q04_INJURY_DESCRIPTION'];
  if (injuryCar === '3' || injuryCar === '4' || injuryDb === '3') {
    signals.push({ label: 'Severe Injury', category: 'damages' });
  }

  // Lost wages
  const wages = answers['CA_Q09_LOST_WAGES'];
  if (wages === '2') signals.push({ label: 'Missed Work', category: 'damages' });
  if (wages === '3' || wages === '4') signals.push({ label: 'Significant Lost Wages', category: 'damages' });

  // URGENCY SIGNALS
  // No prior attorney
  const priorRep = answers['CONFLICT_Q01_PRIOR_REP'];
  if (priorRep === '1') signals.push({ label: 'No Attorney Yet', category: 'urgency' });

  // Recent accident
  const when = answers['CA_Q02_WHEN_OCCURRED'] || answers['SF_Q02_WHEN_OCCURRED'];
  if (when === '1' || when === '2') signals.push({ label: 'Recent Incident', category: 'urgency' });

  // Accident type
  const accidentTypeCode = answers['CA_Q03_ACCIDENT_TYPE'];
  const accidentType = accidentTypeCode ? (RESPONSE_LABELS['CA_Q03_ACCIDENT_TYPE']?.[accidentTypeCode] || null) : null;

  // Timing for display
  const timing = when ? (RESPONSE_LABELS['CA_Q02_WHEN_OCCURRED']?.[when] || null) : null;

  return { signals, accidentType, timing };
}

/**
 * Get human-readable label for a question key
 */
export function getQuestionLabel(questionKey: string): string {
  return QUESTION_LABELS[questionKey] || questionKey.replace(/_/g, ' ');
}

/**
 * Get human-readable label for a response code
 */
export function getResponseLabel(questionKey: string, responseValue: string): string {
  const responses = RESPONSE_LABELS[questionKey];
  if (responses && responses[responseValue]) {
    return responses[responseValue];
  }
  // Return the raw value if no mapping found
  return responseValue;
}
