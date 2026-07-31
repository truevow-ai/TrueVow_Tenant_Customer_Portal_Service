/**
 * Composite UI view models for RETAINER workspace.
 *
 * These are UI projections only — NOT canonical records.
 * Do NOT store as database records.
 */
import type { CandidateSummary, CandidateDetailResponse, WorkflowDetail } from './generated/schema';
import type { IntakeAvailability, IntakeCandidateSummary } from '@/lib/api/intake/adapter';

// ---------------------------------------------------------------------------
// Candidate list item (for tables)
// ---------------------------------------------------------------------------

export interface CandidateListItem {
  candidate_id: string;
  workflow_id: string;
  state: string;
  state_label: string;
  /** Person name from INTAKE, or null if unavailable. */
  person_name: string | null;
  /** Label when person_name is unavailable. */
  name_fallback: string | null;
  practice_area: string | null;
  responsible_attorney: string | null;
  review_state: string;
  /** Days in current workflow state. */
  age_days: number;
  candidate_version: number;
  /** True when INTAKE candidate version differs from reviewed version. */
  is_stale: boolean;
  /** Warning message for stale candidates. */
  stale_warning: string | null;
  /** Missing required information indicator. */
  missing_info: string | null;
  /** Next required action label. */
  next_action: string | null;
}

// ---------------------------------------------------------------------------
// Candidate workspace view (for detail pages)
// ---------------------------------------------------------------------------

export interface CandidateWorkspaceView {
  retainer: CandidateDetailResponse;
  intake: IntakeAvailability;
  links: CandidateWorkspaceLinks;
  /** True when intake version no longer matches reviewed version. */
  is_stale: boolean;
  /** Whether sensitive actions (approve, clear conflict, activate) should be disabled. */
  actions_blocked: boolean;
  /** Reason actions are blocked. */
  block_reason: string | null;
}

export interface CandidateWorkspaceLinks {
  intakeRecordUrl: string;
  retainerWorkflowUrl: string;
  traceMatterUrl: string | null;
}

// ---------------------------------------------------------------------------
// Operation queues — separated into action queues and lifecycle summaries
// ---------------------------------------------------------------------------

/**
 * Action queues — items requiring staff or attorney attention.
 * Priority is a TEMPORARY state-based projection. It will be superseded
 * by policy-driven priority that accounts for: due date, SLA, time in state,
 * client waiting, signature expiration, conflict hold duration, delivery failure,
 * activation uncertainty, and tenant policy.
 */
export interface ActionQueue {
  label: string;
  count: number;
  filterUrl: string;
  /** TEMPORARY: state-based only. Policy-driven priority coming later. */
  priority_hint: 'attention' | 'critical' | 'normal';
}

export interface LifecycleSummary {
  label: string;
  count: number;
}

export function buildActionQueues(candidates: CandidateSummary[]): ActionQueue[] {
  return [
    {
      label: 'Awaiting Review',
      count: candidates.filter((c) =>
        ['NOT_STARTED', 'ATTORNEY_APPROVAL_RECORDED'].includes(c.state),
      ).length,
      filterUrl: '/dashboard/retainer/candidates?state=awaiting_review',
      priority_hint: 'attention',
    },
    {
      label: 'Conflict Review Pending',
      count: candidates.filter((c) => c.state === 'CONFLICT_REVIEW_PENDING').length,
      filterUrl: '/dashboard/retainer/candidates?state=conflict_pending',
      priority_hint: candidates.some((c) => c.state === 'CONFLICT_REVIEW_PENDING') ? 'attention' : 'normal',
    },
    {
      label: 'Conflict Hold',
      count: candidates.filter((c) => c.state === 'CONFLICT_HOLD').length,
      filterUrl: '/dashboard/retainer/candidates?state=conflict_hold',
      priority_hint: 'critical',
    },
    {
      label: 'Package Preparation',
      count: candidates.filter((c) => c.state === 'PACKAGE_PREPARATION').length,
      filterUrl: '/dashboard/retainer/candidates?state=package_prep',
      priority_hint: 'normal',
    },
    {
      label: 'Awaiting Client Action',
      count: candidates.filter((c) =>
        ['DELIVERED', 'CLIENT_REVIEW', 'SIGNATURE_PENDING'].includes(c.state),
      ).length,
      filterUrl: '/dashboard/retainer/candidates?state=awaiting_client',
      priority_hint: 'attention',
    },
    {
      label: 'Activation Pending',
      count: candidates.filter((c) => c.state === 'ACTIVATION_PENDING').length,
      filterUrl: '/dashboard/retainer/candidates?state=activation_pending',
      priority_hint: 'attention',
    },
  ];
}

export function buildLifecycleSummaries(candidates: CandidateSummary[]): LifecycleSummary[] {
  return [
    {
      label: 'Activated',
      count: candidates.filter((c) => c.state === 'ACTIVATED').length,
    },
    {
      label: 'Declined or Expired',
      count: candidates.filter((c) => c.state === 'DECLINED_OR_EXPIRED').length,
    },
  ];
}

// ---------------------------------------------------------------------------
// Composite builders
// ---------------------------------------------------------------------------

/**
 * Build a candidate list item from RETAINER + INTAKE data.
 *
 * Adjustment 1: When INTAKE is unavailable, person_name is null and
 *               name_fallback provides the display message. The UUID is
 *               never rendered as the person's name.
 */
export function buildCandidateListItem(
  candidate: CandidateSummary,
  intake: IntakeAvailability,
): CandidateListItem {
  const createdDate = new Date(candidate.created_at);
  const ageDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  let personName: string | null = null;
  let nameFallback: string | null = null;
  let practiceArea: string | null = null;
  let isStale = false;
  let staleWarning: string | null = null;
  let missingInfo: string | null = null;

  if (intake.status === 'available') {
    personName = intake.data.person_name || null;
    practiceArea = (intake.data as IntakeCandidateSummary).practice_area;
  } else if (intake.status === 'stale') {
    personName = intake.data.person_name || null;
    practiceArea = (intake.data as IntakeCandidateSummary).practice_area;
    isStale = true;
    staleWarning = intake.message;
  } else {
    // unavailable — never show UUID as name
    nameFallback = intake.message || 'Intake details unavailable';
    missingInfo = intake.message;
  }

  // Fallback display logic: name first, then fallback message
  if (!personName) {
    nameFallback = nameFallback || 'Intake details unavailable';
  }

  return {
    candidate_id: candidate.candidate_id,
    workflow_id: candidate.workflow_id,
    state: candidate.state,
    state_label: candidate.state.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    person_name: personName,
    name_fallback: nameFallback,
    practice_area: practiceArea,
    responsible_attorney: candidate.responsible_attorney,
    review_state: candidate.review_state,
    age_days: ageDays,
    candidate_version: candidate.candidate_version,
    is_stale: isStale,
    stale_warning: staleWarning,
    missing_info: missingInfo,
    next_action: deriveNextAction(candidate.state, isStale, candidate.responsible_attorney),
  };
}

/**
 * Derive the next required action from workflow state.
 */
function deriveNextAction(
  state: string,
  isStale: boolean,
  attorney: string | null,
): string | null {
  if (isStale) return 'Review updated intake';
  switch (state) {
    case 'NOT_STARTED':
      return 'Assign attorney';
    case 'ATTORNEY_APPROVAL_RECORDED':
      return 'Start conflict search';
    case 'CONFLICT_REVIEW_PENDING':
      return attorney ? 'Attorney clearance required' : 'Assign attorney';
    case 'CONFLICT_HOLD':
      return 'Resolve conflict hold';
    case 'PACKAGE_PREPARATION':
      return 'Prepare engagement package';
    case 'DELIVERY_AUTHORIZED':
      return 'Deliver package';
    case 'DELIVERED':
      return 'Awaiting client review';
    case 'CLIENT_REVIEW':
    case 'SIGNATURE_PENDING':
      return 'Awaiting client signature';
    case 'FULLY_EXECUTED':
      return 'Create activation checklist';
    case 'ACTIVATION_PENDING':
      return attorney ? 'Attorney activation authorization' : 'Assign attorney';
    case 'ACTIVATED':
      return null;
    case 'DECLINED_OR_EXPIRED':
      return null;
    default:
      return null;
  }
}

/**
 * Build a candidate workspace view for the detail page.
 *
 * Adjustment 4: When is_stale, actions_blocked is set to true and
 * block_reason provides the message. Sensitive actions (approve,
 * clear conflict, authorize activation) must be disabled.
 */
export function buildCandidateWorkspace(
  retainer: CandidateDetailResponse,
  intake: IntakeAvailability,
): CandidateWorkspaceView {
  const isStale = intake.status === 'stale';
  const actionsBlocked = isStale;
  const blockReason = isStale
    ? 'The intake record changed after this review began. Refresh the candidate and complete the required re-review before continuing.'
    : null;

  return {
    retainer,
    intake,
    links: {
      intakeRecordUrl: buildIntakeLink(retainer.candidate_id),
      retainerWorkflowUrl: `/dashboard/retainer/candidates/${retainer.candidate_id}`,
      traceMatterUrl: null, // filled later when WorkflowDetail is available
    },
    is_stale: isStale,
    actions_blocked: actionsBlocked,
    block_reason: blockReason,
  };
}

export function buildTraceLink(workflow: WorkflowDetail): string | null {
  if (!workflow.activated_matter_id) return null;
  return `/dashboard/trace/cases/${workflow.activated_matter_id}`;
}

export function buildIntakeLink(matterCandidateId: string): string {
  return `/dashboard/intake/lead/${matterCandidateId}`;
}
