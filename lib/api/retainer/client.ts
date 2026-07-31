/**
 * RETAINER API Client — typed against the live backend contract.
 * Routes through the restricted proxy at /api/retainer.
 * No invented types. All types from lib/api/retainer/generated/schema.ts
 */
import axios, { AxiosInstance } from 'axios';
import { mapRetainerError } from './errors';
import type * as T from './generated/schema';

class RetainerClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/retainer',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }

  // =========================================================================
  // Review Queue
  // =========================================================================

  async getReviewQueue(): Promise<T.ReviewQueueResponse> {
    const res = await this.client.get('/review-queue');
    return res.data;
  }

  // =========================================================================
  // Candidates
  // =========================================================================

  async listCandidates(): Promise<T.CandidateListResponse> {
    const res = await this.client.get('/candidates');
    return res.data;
  }

  async getCandidate(candidateId: string): Promise<T.CandidateDetailResponse> {
    const res = await this.client.get(`/candidates/${candidateId}`);
    return res.data;
  }

  async recordDecision(
    candidateId: string,
    data: T.RepresentationDecisionRequest,
  ): Promise<T.RepresentationDecisionResponse> {
    const res = await this.client.post(`/candidates/${candidateId}/decisions`, data);
    return res.data;
  }

  async getCandidateAudit(candidateId: string): Promise<T.AuditResponse> {
    const res = await this.client.get(`/candidates/${candidateId}/audit`);
    return res.data;
  }

  // =========================================================================
  // Workflows
  // =========================================================================

  async getWorkflow(workflowId: string): Promise<T.WorkflowDetail> {
    const res = await this.client.get(`/workflows/${workflowId}`);
    return res.data;
  }

  async getWorkflowTimeline(workflowId: string): Promise<T.WorkflowTimelineResponse> {
    const res = await this.client.get(`/workflows/${workflowId}/timeline`);
    return res.data;
  }

  async getTraceManifest(workflowId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/workflows/${workflowId}/trace-manifest`);
    return res.data;
  }

  async getPolicyCompliance(workflowId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/workflows/${workflowId}/policy-compliance`);
    return res.data;
  }

  async getWorkflowHealth(workflowId: string): Promise<Record<string, unknown>> {
    const res = await this.client.get(`/workflows/${workflowId}/health`);
    return res.data;
  }

  // =========================================================================
  // Conflicts
  // =========================================================================

  async startConflictSearch(
    candidateId: string,
    data: T.StartConflictSearchRequest,
  ): Promise<T.StartConflictSearchResponse> {
    const res = await this.client.post(`/candidates/${candidateId}/conflicts/search`, data);
    return res.data;
  }

  async getConflictSearch(searchId: string): Promise<T.ConflictSearchDetailResponse> {
    const res = await this.client.get(`/conflicts/searches/${searchId}`);
    return res.data;
  }

  async clearConflict(
    searchId: string,
    data: T.ClearConflictRequest,
  ): Promise<T.ClearConflictResponse> {
    const res = await this.client.post(`/conflicts/${searchId}/clear`, data);
    return res.data;
  }

  async applyConflictHold(
    workflowId: string,
    data: T.ApplyHoldRequest,
  ): Promise<T.ApplyHoldResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/conflict-holds`, data);
    return res.data;
  }

  async releaseConflictHold(holdId: string, data: T.ReleaseHoldRequest): Promise<T.ReleaseHoldResponse> {
    const res = await this.client.delete(`/conflict-holds/${holdId}`, { data });
    return res.data;
  }

  async rerunConflictSearch(
    candidateId: string,
    data: T.RerunSearchRequest,
  ): Promise<T.RerunSearchResponse> {
    const res = await this.client.post(`/candidates/${candidateId}/conflicts/rerun`, data);
    return res.data;
  }

  async getConflictAudit(searchId: string): Promise<T.ConflictAuditResponse> {
    const res = await this.client.get(`/conflicts/searches/${searchId}/audit`);
    return res.data;
  }

  // =========================================================================
  // Templates & Packages
  // =========================================================================

  async resolveTemplate(
    workflowId: string,
    data: T.ResolveTemplateRequest,
  ): Promise<T.ResolveTemplateResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/templates/resolve`, data);
    return res.data;
  }

  async generatePackage(
    workflowId: string,
    data: T.GeneratePackageRequest,
  ): Promise<T.GeneratePackageResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/packages`, data);
    return res.data;
  }

  async getPackage(packageId: string): Promise<T.PackageDetailResponse> {
    const res = await this.client.get(`/packages/${packageId}`);
    return res.data;
  }

  async authorizeDelivery(
    packageId: string,
    data: T.AuthorizeDeliveryRequest,
  ): Promise<T.AuthorizeDeliveryResponse> {
    const res = await this.client.post(`/packages/${packageId}/authorize-delivery`, data);
    return res.data;
  }

  // =========================================================================
  // Signatures (firm-facing)
  // =========================================================================

  async createCeremony(
    packageId: string,
    data: T.CreateCeremonyRequest,
  ): Promise<T.CreateCeremonyResponse> {
    const res = await this.client.post(`/packages/${packageId}/ceremonies`, data);
    return res.data;
  }

  async getCeremony(ceremonyId: string): Promise<T.CeremonyDetailResponse> {
    const res = await this.client.get(`/ceremonies/${ceremonyId}`);
    return res.data;
  }

  async markExecuted(ceremonyId: string): Promise<T.MarkExecutedResponse> {
    const res = await this.client.post(`/ceremonies/${ceremonyId}/mark-executed`);
    return res.data;
  }

  // =========================================================================
  // Operations
  // =========================================================================

  async createReminderSchedule(
    workflowId: string,
    data: T.CreateReminderScheduleRequest,
  ): Promise<T.CreateReminderScheduleResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/reminders`, data);
    return res.data;
  }

  async sendReminder(
    scheduleId: string,
    data: T.SendReminderRequest,
  ): Promise<T.SendReminderResponse> {
    const res = await this.client.post(`/reminders/${scheduleId}/send`, data);
    return res.data;
  }

  async suppressReminders(scheduleId: string): Promise<Record<string, unknown>> {
    const res = await this.client.post(`/reminders/${scheduleId}/suppress`);
    return res.data;
  }

  async expireEngagement(workflowId: string): Promise<T.ExpireEngagementResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/expire`);
    return res.data;
  }

  async createActivationChecklist(
    workflowId: string,
    data: T.CreateChecklistRequest,
  ): Promise<T.CreateChecklistResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/activation-checklist`, data);
    return res.data;
  }

  async evaluateChecklistItem(
    itemId: string,
    data: T.EvaluateItemRequest,
  ): Promise<T.EvaluateItemResponse> {
    const res = await this.client.post(`/checklist-items/${itemId}/evaluate`, data);
    return res.data;
  }

  async authorizeActivation(checklistId: string): Promise<T.AuthorizeActivationResponse> {
    const res = await this.client.post(`/checklists/${checklistId}/authorize`);
    return res.data;
  }

  async confirmActivation(
    workflowId: string,
    data: T.ConfirmActivationRequest,
  ): Promise<T.ConfirmActivationResponse> {
    const res = await this.client.post(`/workflows/${workflowId}/activate`, data);
    return res.data;
  }
}

export const retainerClient = new RetainerClient();

/** Re-export all mapped contract types */
export * from './generated/schema';
export { mapRetainerError } from './errors';
export type { RetainerErrorCode } from './errors';
export {
  STATE_DISPLAY,
  STATE_COLOR,
  DECISION_DISPLAY,
  DECISION_COLOR,
  AUTHORITY_DISPLAY,
  intakeLink,
  traceMatterLink,
} from './mappers';

export {
  buildActionQueues,
  buildLifecycleSummaries,
  buildCandidateListItem,
  buildCandidateWorkspace,
  buildTraceLink,
  buildIntakeLink,
  type CandidateWorkspaceView,
  type CandidateWorkspaceLinks,
  type CandidateListItem,
  type ActionQueue,
  type LifecycleSummary,
} from './composite-views';
