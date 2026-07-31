/**
 * INTAKE Reference Adapter — resolves INTAKE fields for RETAINER display.
 *
 * RETAINER stores IDs only (matter_candidate_id, intake_session_ids).
 * Person names, incident details, and contact info are owned by INTAKE.
 * This adapter fetches only the display fields needed, without duplicating data.
 */
import { tenantAppClient, LeadDetail, Lead } from '@/lib/api/tenant-app-client';

// ---------------------------------------------------------------------------
// Types — display-only projection of INTAKE fields
// ---------------------------------------------------------------------------

export interface IntakeCandidateSummary {
  /** The INTAKE lead_id (maps to RETAINER matter_candidate_id). */
  lead_id: string;
  /** Person name (from INTAKE first_name + last_name). */
  person_name: string;
  /** Primary phone number. */
  phone: string;
  /** Email if available. */
  email: string | null;
  /** Practice area (e.g., Personal Injury, Medical Malpractice). */
  practice_area: string | null;
  /** Lead status in INTAKE. */
  status: string;
  /** Source of the lead. */
  source: string | null;
  /** When the lead was created. */
  created_at: string;
}

export interface IntakeCandidateDetail extends IntakeCandidateSummary {
  /** Session status. */
  session_status: string | null;
  /** Intake question answers. */
  answers: Array<{
    question_key: string;
    response_value: string;
    response_type: string;
    captured_at: string;
  }>;
  /** Lead qualification grade. */
  lead_grade: string | null;
  /** Whether the lead was qualified. */
  is_qualified: boolean | null;
}

// ---------------------------------------------------------------------------
// Availability states
// ---------------------------------------------------------------------------

export type IntakeAvailability =
  | { status: 'available'; data: IntakeCandidateSummary | IntakeCandidateDetail }
  | { status: 'unavailable'; reason: 'intake_down' | 'record_not_found' | 'record_restricted'; message: string }
  | { status: 'stale'; data: IntakeCandidateSummary | IntakeCandidateDetail; message: string };

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

function toSummary(lead: LeadDetail | Lead): IntakeCandidateSummary {
  return {
    lead_id: lead.lead_id,
    person_name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
    phone: lead.phone,
    email: lead.email ?? null,
    practice_area: lead.practice_area ?? null,
    status: lead.status,
    source: lead.source ?? null,
    created_at: lead.created_at,
  };
}

function toDetail(lead: LeadDetail): IntakeCandidateDetail {
  return {
    ...toSummary(lead),
    session_status: lead.session_status ?? null,
    answers: lead.answers || [],
    lead_grade: lead.lead_grade ?? null,
    is_qualified: lead.is_qualified ?? null,
  };
}

/**
 * Resolve intake summary fields for a RETAINER candidate.
 * @param intakeLeadId — RETAINER's matter_candidate_id maps to INTAKE lead_id
 * @param tenantId — Current tenant context
 */
export async function resolveIntakeSummary(
  intakeLeadId: string,
  tenantId: string,
): Promise<IntakeAvailability> {
  try {
    const lead = await tenantAppClient.getLeadById(intakeLeadId, tenantId);
    if (!lead) {
      return {
        status: 'unavailable',
        reason: 'record_not_found',
        message: 'Intake record not found. The lead may have been removed.',
      };
    }
    return { status: 'available', data: toSummary(lead) };
  } catch (err: any) {
    // Check for 404 vs connection error
    if (err?.response?.status === 404 || err?.message?.includes('not found')) {
      return {
        status: 'unavailable',
        reason: 'record_not_found',
        message: 'Intake details temporarily unavailable.',
      };
    }
    return {
      status: 'unavailable',
      reason: 'intake_down',
      message: 'Intake details temporarily unavailable.',
    };
  }
}

/**
 * Resolve full intake detail (including answers) for a RETAINER candidate.
 */
export async function resolveIntakeDetail(
  intakeLeadId: string,
  tenantId: string,
): Promise<IntakeAvailability> {
  try {
    const lead = await tenantAppClient.getLeadById(intakeLeadId, tenantId);
    if (!lead) {
      return {
        status: 'unavailable',
        reason: 'record_not_found',
        message: 'Intake record not found.',
      };
    }
    return { status: 'available', data: toDetail(lead) };
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.message?.includes('not found')) {
      return {
        status: 'unavailable',
        reason: 'record_not_found',
        message: 'Intake details temporarily unavailable.',
      };
    }
    return {
      status: 'unavailable',
      reason: 'intake_down',
      message: 'Intake details temporarily unavailable.',
    };
  }
}

/**
 * Resolve intake summaries in batch for a list of RETAINER candidates.
 * Gracefully handles individual failures.
 */
export async function resolveIntakeBatch(
  leadIds: string[],
  tenantId: string,
): Promise<Map<string, IntakeAvailability>> {
  const results = new Map<string, IntakeAvailability>();
  const uniqueIds = [...new Set(leadIds)];

  const promises = uniqueIds.map(async (id) => {
    const result = await resolveIntakeSummary(id, tenantId);
    results.set(id, result);
  });

  await Promise.allSettled(promises);
  return results;
}
