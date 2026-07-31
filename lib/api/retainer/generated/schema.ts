/**
 * RETAINER TypeScript types — mapped 1:1 from RETAINER Pydantic schemas.
 *
 * Generated from: TrueVow_Tenant_RETAINER_Service/app/schemas/*.py
 * Spec source:  lib/api/retainer/openapi.yaml (committed copy)
 * Spec hash:    lib/api/retainer/generated/openapi-hash.txt
 *
 * Regenerate:   npm run generate:retainer-api  (updates hash)
 * CI check:     npm run check:retainer-contract
 *
 * DO NOT invent fields. Every interface mirrors a Pydantic model.
 * uuid.UUID -> string
 * datetime   -> string (ISO 8601)
 * int        -> number
 * Optional[T], T | None -> T | null
 *
 * @generated — manual edits will be overwritten when Pydantic schemas change.
 */

// =========================================================================
// EventEnvelope v1.0.1 — JSON Schema + envelope.py
// =========================================================================

export type AuthorityClass =
  | 'SYS_ADMIN'
  | 'FIRM_POLICY'
  | 'STAFF_AUTH'
  | 'ATTY_AUTH'
  | 'CLIENT_AUTH'
  | 'PROHIBITED';

export interface EventEnvelope {
  event_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  tenant_id: string;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: number;
  actor_type: string;
  actor_id: string;
  authority_class: AuthorityClass;
  authority_record_id: string | null;
  policy_version_id: string | null;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  sensitivity_class: string;
  schema_version: string;
}

// =========================================================================
// Engagement State — states.yaml
// =========================================================================

export type EngagementState =
  | 'NOT_STARTED'
  | 'ATTORNEY_APPROVAL_RECORDED'
  | 'CONFLICT_REVIEW_PENDING'
  | 'CONFLICT_HOLD'
  | 'PACKAGE_PREPARATION'
  | 'DELIVERY_AUTHORIZED'
  | 'DELIVERED'
  | 'CLIENT_REVIEW'
  | 'SIGNATURE_PENDING'
  | 'FULLY_EXECUTED'
  | 'ACTIVATION_PENDING'
  | 'ACTIVATED'
  | 'DECLINED_OR_EXPIRED';

// =========================================================================
// Candidate schemas — candidate.py
// =========================================================================

export interface CandidateHandoffRequest {
  tenant_id: string;
  matter_candidate_id: string;
  candidate_version: number;
  prospective_client_party_role_ids: string[];
  intake_session_ids: string[];
  qualification_assessment_id: string | null;
  consent_record_ids: string[];
  communication_ids: string[];
  source_event_ids: string[];
  submitted_by_actor_id: string;
  submitted_at: string;
}

export interface CandidateImportResponse {
  workflow_id: string;
  candidate_id: string;
  state: EngagementState;
  candidate_version: number;
}

export interface CandidateSummary {
  candidate_id: string;
  workflow_id: string;
  state: EngagementState;
  candidate_version: number;
  review_state: string;
  responsible_attorney: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateListResponse {
  candidates: CandidateSummary[];
}

export interface CandidateDetailResponse {
  candidate_id: string;
  workflow_id: string;
  tenant_id: string;
  state: EngagementState;
  candidate_version: number;
  version: number;
  review_state: string | null;
  prepared_by_actor_id: string | null;
  responsible_attorney_actor_id: string | null;
  representation_decision_id: string | null;
  decision_outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartReviewResponse {
  review_id: string;
  review_state: string;
}

export interface AssignAttorneyRequest {
  attorney_actor_id: string;
}

export interface AssignAttorneyResponse {
  review_id: string;
  responsible_attorney_actor_id: string;
}

export interface RequestInformationRequest {
  reason: string;
  fields_required: string[];
}

export interface RequestInformationResponse {
  request_id: string;
  state: string;
}

export type DecisionOutcome = 'APPROVED' | 'DECLINED' | 'DEFERRED';

export interface RepresentationDecisionRequest {
  outcome: DecisionOutcome;
  scope_json: Record<string, unknown>;
  authority_record_id: string;
  policy_snapshot_id: string | null;
}

export interface RepresentationDecisionResponse {
  decision_id: string;
  outcome: string;
  decided_at: string;
}

export interface AuditEntry {
  event_id: string;
  event_type: string;
  actor_id: string;
  actor_role: string | null;
  authority_class: string | null;
  action: string;
  result: string;
  occurred_at: string;
}

export interface AuditResponse {
  candidate_id: string;
  audit_entries: AuditEntry[];
}

export interface WorkflowSummary {
  workflow_id: string;
  matter_candidate_id: string;
  state: EngagementState;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetail {
  workflow_id: string;
  tenant_id: string;
  matter_candidate_id: string;
  candidate_version: number;
  state: EngagementState;
  version: number;
  representation_decision_id: string | null;
  conflict_review_id: string | null;
  engagement_package_id: string | null;
  activation_checklist_id: string | null;
  activated_matter_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueResponse {
  workflows: WorkflowSummary[];
}

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  authority_class: string;
  actor_id: string;
  from_state: string | null;
  to_state: string | null;
}

export interface WorkflowTimelineResponse {
  workflow_id: string;
  events: TimelineEvent[];
}

// =========================================================================
// Conflict schemas — conflict.py
// =========================================================================

export interface ConflictSearchPartyInput {
  party_type: string;
  canonical_ref: string;
  legal_name: string;
  prior_names: string[];
  aliases: string[];
  normalized_name: string | null;
  date_of_birth: string | null;
  organization_identifiers: string[];
  relationship_to_candidate: string | null;
  source: string | null;
  confidence: string | null;
}

export interface StartConflictSearchRequest {
  parties: ConflictSearchPartyInput[];
  candidate_version: number;
  scope_json: Record<string, unknown>;
}

export interface ConflictSearchPartyResponse {
  id: string;
  party_type: string;
  canonical_ref: string;
  legal_name: string;
  prior_names: unknown[];
  aliases: unknown[];
  normalized_name: string | null;
  relationship_to_candidate: string | null;
}

export interface ConflictCandidateResponse {
  id: string;
  matched_party_ref: string;
  match_basis_json: Record<string, unknown>;
  rule_or_score: string | null;
  disposition: string;
}

export interface StartConflictSearchResponse {
  search_id: string;
  status: string;
  started_at: string;
  party_count: number;
}

export interface ConflictSearchDetailResponse {
  search_id: string;
  workflow_id: string;
  tenant_id: string;
  status: string;
  party_set_version: number;
  algorithm_version: string;
  started_at: string;
  completed_at: string | null;
  parties: ConflictSearchPartyResponse[];
  candidates: ConflictCandidateResponse[];
  current_hold: Record<string, unknown> | null;
  review_outcome: string | null;
}

export interface ConflictListResponse {
  searches: ConflictSearchDetailResponse[];
}

export interface DispositionRequest {
  disposition: string;
  rationale: string | null;
}

export interface DispositionResponse {
  candidate_id: string;
  disposition: string;
}

export interface ApplyHoldRequest {
  reason: string;
  authority_record_id: string;
  affected_candidate_id: string | null;
  supporting_evidence: Record<string, unknown>;
  required_followup: string | null;
  policy_snapshot_id: string | null;
}

export interface ApplyHoldResponse {
  hold_id: string;
  held_at: string;
}

export interface ReleaseHoldRequest {
  authority_record_id: string;
  reason: string;
}

export interface ReleaseHoldResponse {
  hold_id: string;
  released_at: string | null;
}

export interface ClearConflictRequest {
  authority_record_id: string;
  rationale: string | null;
  policy_snapshot_id: string | null;
}

export interface ClearConflictResponse {
  review_id: string;
  outcome: string;
  decided_at: string;
}

export interface RerunSearchRequest {
  reason: string;
  parties: ConflictSearchPartyInput[];
  candidate_version: number;
}

export interface RerunSearchResponse {
  search_id: string;
  status: string;
  started_at: string;
  supersedes_search_id: string;
}

export interface ConflictAuditEntry {
  event_id: string;
  event_type: string;
  actor_id: string;
  actor_role: string | null;
  authority_class: string | null;
  action: string;
  result: string;
  occurred_at: string;
}

export interface ConflictAuditResponse {
  search_id: string;
  audit_entries: ConflictAuditEntry[];
}

// =========================================================================
// Template/Package schemas — template.py
// =========================================================================

export interface MergeFieldInput {
  field_name: string;
  field_value: string;
  source: string;
}

export interface ResolveTemplateRequest {
  template_definition_id: string;
  template_version: string;
  policy_version_id: string;
  merge_fields: MergeFieldInput[];
  jurisdiction_profile_version_id: string | null;
}

export interface MergeFieldResponse {
  field_name: string;
  field_value: string;
  source: string;
  validated: boolean;
}

export interface ResolveTemplateResponse {
  resolution_id: string;
  template_definition_id: string;
  template_version: string;
  template_hash: string;
  resolved_at: string;
  merge_fields: MergeFieldResponse[];
}

export interface PreflightControlInput {
  control_id: string;
  control_name: string;
  passed: boolean;
  detail: string | null;
}

export interface GeneratePackageRequest {
  template_resolution_id: string;
  document_roles: string[];
  preflight_controls: PreflightControlInput[];
}

export interface PreflightResultResponse {
  control_id: string;
  control_name: string;
  passed: boolean;
  detail: string | null;
}

export interface PackageDocumentResponse {
  document_version_id: string;
  document_role: string;
  required: boolean;
  sequence: number;
  document_hash: string;
}

export interface GeneratePackageResponse {
  package_id: string;
  status: string;
  package_hash: string;
  generated_at: string;
  documents: PackageDocumentResponse[];
  preflight_results: PreflightResultResponse[];
}

export interface PackageDetailResponse {
  package_id: string;
  workflow_id: string;
  tenant_id: string;
  status: string;
  package_hash: string;
  generated_at: string;
  locked_at: string | null;
  documents: PackageDocumentResponse[];
  preflight_results: PreflightResultResponse[];
}

// =========================================================================
// Portal schemas — portal.py
// =========================================================================

export interface AuthorizeDeliveryRequest {
  authority_record_id: string;
  channel: string;
  recipient_verified: boolean;
}

export interface AuthorizeDeliveryResponse {
  authorization_id: string;
  authorized_at: string;
}

export interface GeneratePortalTokenRequest {
  prospect_party_role_id: string;
  package_id: string;
}

export interface PortalTokenResponse {
  access_token: string;
  token_hash: string;
  issued_at: string;
  expires_at: string | null;
}

export interface PortalAccessDetailResponse {
  access_id: string;
  package_id: string;
  state: string;
  issued_at: string;
  first_accessed_at: string | null;
  documents: Record<string, unknown>[];
  consent_status: string | null;
}

export interface GrantConsentRequest {
  prospect_party_role_id: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface GrantConsentResponse {
  consent_id: string;
  state: string;
  granted_at: string;
}

export interface SubmitQuestionRequest {
  question_text: string;
  document_version_id: string | null;
  page_or_clause_ref: string | null;
}

export interface SubmitQuestionResponse {
  question_id: string;
  state: string;
  created_at: string;
}

export interface ClientDeclineRequest {
  reason: string | null;
}

export interface ClientDeclineResponse {
  workflow_id: string;
  state: string;
  declined_at: string;
}

// =========================================================================
// Signature schemas — signature.py
// =========================================================================

export interface SignerRequirementInput {
  party_role_id: string;
  signer_role: string;
  authority_scope: string | null;
  required: boolean;
}

export interface CreateCeremonyRequest {
  provider_type: string;
  signers: SignerRequirementInput[];
  expires_at: string | null;
}

export interface SignerRequirementResponse {
  id: string;
  party_role_id: string;
  signer_role: string;
  required: boolean;
}

export interface CreateCeremonyResponse {
  ceremony_id: string;
  provider_type: string;
  state: string;
  created_at: string;
  signers: SignerRequirementResponse[];
}

export interface CeremonyDetailResponse {
  ceremony_id: string;
  package_id: string;
  provider_type: string;
  state: string;
  created_at: string;
  expires_at: string | null;
  signers: SignerRequirementResponse[];
  signatures: Record<string, unknown>[];
}

export interface ApplySignatureRequest {
  party_role_id: string;
  shared_signature_evidence_id: string;
  signer_requirement_id: string;
}

export interface ApplySignatureResponse {
  evidence_id: string;
  validity_state: string;
}

export interface InvalidateSignatureRequest {
  evidence_id: string;
  reason: string;
}

export interface InvalidateSignatureResponse {
  evidence_id: string;
  validity_state: string;
}

export interface MarkExecutedResponse {
  ceremony_id: string;
  state: string;
  executed_at: string;
}

// =========================================================================
// Operations schemas — operations.py
// =========================================================================

export interface CreateReminderScheduleRequest {
  policy_version_id: string;
  max_attempts: number;
  next_due_at: string | null;
}

export interface CreateReminderScheduleResponse {
  schedule_id: string;
  state: string;
}

export interface SendReminderRequest {
  communication_id: string;
  attempt_no: number;
  result: string;
}

export interface SendReminderResponse {
  attempt_id: string;
  attempt_no: number;
}

export interface ExpireEngagementResponse {
  workflow_id: string;
  state: string;
}

export interface ChecklistItemInput {
  control_id: string;
  required: boolean;
}

export interface CreateChecklistRequest {
  policy_version_id: string;
  items: ChecklistItemInput[];
}

export interface ChecklistItemResponse {
  id: string;
  control_id: string;
  required: boolean;
  result: string;
}

export interface CreateChecklistResponse {
  checklist_id: string;
  state: string;
  items: ChecklistItemResponse[];
}

export interface EvaluateItemRequest {
  result: string;
  evidence_refs: unknown[] | null;
}

export interface EvaluateItemResponse {
  item_id: string;
  result: string;
}

export interface AuthorizeActivationResponse {
  checklist_id: string;
  state: string;
}

export interface ConfirmActivationRequest {
  activated_matter_id: string;
}

export interface ConfirmActivationResponse {
  workflow_id: string;
  state: string;
  activated_matter_id: string;
}

// =========================================================================
// Canonical Events — events.yaml
// =========================================================================

export type RetainerEventType =
  | 'conflict.search_started'
  | 'conflict.candidate_detected'
  | 'conflict.review_requested'
  | 'conflict.cleared_by_attorney'
  | 'conflict.hold_applied'
  | 'representation.approved_by_attorney'
  | 'representation.declined_by_attorney'
  | 'engagement.workflow_started'
  | 'template.resolved'
  | 'package.generated'
  | 'package.delivery_authorized'
  | 'package.delivered'
  | 'esign.consent_granted'
  | 'engagement.question_received'
  | 'engagement.question_escalated'
  | 'signature.applied'
  | 'signature.invalidated'
  | 'package.fully_executed'
  | 'completed_copy.delivered'
  | 'matter.activation_authorized'
  | 'matter.activated'
  | 'engagement.expired'
  | 'candidate.submitted_for_representation_review'
  | 'engagement.client_review_started'
  | 'signature.requested'
  | 'engagement.declined_by_client'
  | 'engagement.authorization_withdrawn'
  | 'engagement.delivery_failed'
  | 'engagement.reminder_sent'
  | 'engagement.reminder_suppressed'
  | 'engagement.reconciliation_required';
