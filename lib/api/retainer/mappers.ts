/**
 * RETAINER → Customer Portal display mappers.
 *
 * RETAINER stores IDs (candidate_id, matter_candidate_id, workflow_id)
 * and does NOT duplicate INTAKE person details, incident types, or jurisdictions.
 *
 * The Customer Portal is a UI and orchestration layer. It must:
 *   - Use RETAINER APIs for workflow state
 *   - Use INTAKE APIs for person details, incident info, intake answers
 *   - Cross-reference records by ID, not by copying data
 *
 * These functions document what cross-referencing is needed.
 * Actual implementation requires the corresponding API clients.
 */

import type {
  CandidateSummary,
  CandidateDetailResponse,
  EngagementState,
  WorkflowDetail,
} from './generated/schema';

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const STATE_DISPLAY: Record<EngagementState, string> = {
  NOT_STARTED: 'Not Started',
  ATTORNEY_APPROVAL_RECORDED: 'Attorney Approved',
  CONFLICT_REVIEW_PENDING: 'Conflict Review Pending',
  CONFLICT_HOLD: 'Conflict Hold',
  PACKAGE_PREPARATION: 'Package Preparation',
  DELIVERY_AUTHORIZED: 'Delivery Authorized',
  DELIVERED: 'Delivered',
  CLIENT_REVIEW: 'Client Review',
  SIGNATURE_PENDING: 'Signature Pending',
  FULLY_EXECUTED: 'Fully Executed',
  ACTIVATION_PENDING: 'Activation Pending',
  ACTIVATED: 'Activated',
  DECLINED_OR_EXPIRED: 'Declined / Expired',
};

export const STATE_COLOR: Record<EngagementState, 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray'> = {
  NOT_STARTED: 'gray',
  ATTORNEY_APPROVAL_RECORDED: 'blue',
  CONFLICT_REVIEW_PENDING: 'yellow',
  CONFLICT_HOLD: 'red',
  PACKAGE_PREPARATION: 'purple',
  DELIVERY_AUTHORIZED: 'blue',
  DELIVERED: 'blue',
  CLIENT_REVIEW: 'purple',
  SIGNATURE_PENDING: 'yellow',
  FULLY_EXECUTED: 'green',
  ACTIVATION_PENDING: 'yellow',
  ACTIVATED: 'green',
  DECLINED_OR_EXPIRED: 'red',
};

// ---------------------------------------------------------------------------
// INTAKE cross-referencing (requires Tenant App API client)
// ---------------------------------------------------------------------------

/**
 * Given a RETAINER candidate, fetch person + incident details from INTAKE.
 * The RETAINER CandidateSummary does NOT contain person_name, incident_date,
 * incident_type, or jurisdiction. Those are owned by INTAKE.
 *
 * @param candidate - A CandidateSummary from RETAINER
 * @returns Promise resolving to enriched display data
 *
 * @example
 *   const enriched = await enrichWithIntake(candidate);
 *   // enriched.person_name, enriched.incident_type, enriched.jurisdiction
 */
export async function enrichWithIntake(
  _candidate: CandidateSummary | CandidateDetailResponse,
): Promise<Record<string, unknown>> {
  // TODO: Use Tenant App API client to fetch intake record by matter_candidate_id
  // The matter_candidate_id is available on WorkflowDetail (from getWorkflow)
  throw new Error('INTAKE cross-reference not yet implemented');
}

// ---------------------------------------------------------------------------
// TRACE cross-referencing
// ---------------------------------------------------------------------------

/**
 * After activation, the WorkflowDetail.activated_matter_id links to the
 * TRACE matter record. Use this ID for cross-product navigation to TRACE.
 */
export function traceMatterLink(workflow: WorkflowDetail): string | null {
  if (!workflow.activated_matter_id) return null;
  return `/dashboard/trace/cases/${workflow.activated_matter_id}`;
}

/**
 * Intake link from a RETAINER workflow.
 */
export function intakeLink(workflow: WorkflowDetail): string {
  return `/dashboard/intake/lead/${workflow.matter_candidate_id}`;
}

// ---------------------------------------------------------------------------
// Decision outcome display
// ---------------------------------------------------------------------------

export const DECISION_DISPLAY: Record<string, string> = {
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  DEFERRED: 'Deferred',
};

export const DECISION_COLOR: Record<string, 'green' | 'red' | 'yellow'> = {
  APPROVED: 'green',
  DECLINED: 'red',
  DEFERRED: 'yellow',
};

// ---------------------------------------------------------------------------
// Authority class display
// ---------------------------------------------------------------------------

export const AUTHORITY_DISPLAY: Record<string, string> = {
  SYS_ADMIN: 'System',
  FIRM_POLICY: 'Firm Policy',
  STAFF_AUTH: 'Staff',
  ATTY_AUTH: 'Attorney',
  CLIENT_AUTH: 'Client',
  PROHIBITED: 'Prohibited',
};
