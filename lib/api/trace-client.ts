/**
 * TRACE Service API Client
 * Calls the Customer Portal's own API proxy routes at /api/trace/*
 * Proxies to the TRACE backend (port 3036).
 */

import axios, { AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TraceCase {
  case_id: string;
  client_token: string;
  incident_date: string;
  jurisdiction_state: string;
  sol_deadline: string;
  sol_urgency: string;
  hipaa_auth_status: string;
  provider_list_status: string;
  case_stage: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCaseRequest {
  intake_record_id: string;
  firm_id?: string;
  client_data: {
    name: string;
    dob: string;
    address: string;
    phone: string;
  };
  incident_date: string;
  jurisdiction_state: string;
  intake_statute?: {
    sol_years: number;
    reference: string;
    version: string;
  };
  provider_hints: string[];
}

export interface CreateCaseResponse {
  case_id: string;
  sol_deadline: string | null;
  sol_urgency: string;
  sol_disclaimer: string;
  stage: string;
}

export interface TraceProvider {
  provider_id: string;
  provider_name: string;
  facility_name: string | null;
  npi_number: string | null;
  specialty: string | null;
  fax_number: string | null;
  confirmation_status: string;
  extraction_confidence: string | null;
  source_reference: string | null;
}

export interface TraceLien {
  lien_id: string;
  case_id: string;
  lien_type: string;
  lienholder: string;
  claimed_amount: number;
  status: string;
  notes: string | null;
}

export interface TraceChronology {
  case_id: string;
  sol_deadline: string;
  sol_urgency: string;
  case_stage: string;
  total_entries: number;
  total_flags: number;
  annotated_flags: number;
  unannotated_priority_flags: number;
  demand_ready_blocked: boolean;
  entries: ChronologyEntry[];
}

export interface ChronologyEntry {
  event_date: string;
  event_type: string;
  clinical_description: string;
  facility_name: string | null;
  document_id: string | null;
}

export interface TraceReadiness {
  case_id: string;
  stage: string;
  hipaa_status: string;
  provider_count: number;
  lien_count: number;
  ready_to_export: boolean;
}

export interface SigningSendRequest {
  client_email: string;
}

export interface ProviderConfirmResponse {
  case_id: string;
  provider_list_status: string;
  confirmed_at: string;
}

export interface FaxPreview {
  provider_id: string;
  provider_name: string;
  fax_number: string;
  ready: boolean;
}

export interface FaxPreviewResponse {
  case_id: string;
  record_types: string;
  requests: FaxPreview[];
}

export interface FaxSendResult {
  provider_id: string;
  status: string;
  fax_transmission_id: string | null;
}

export interface FaxSendResponse {
  case_id: string;
  transmitted: FaxSendResult[];
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  status: string;
}

export interface TraceStats {
  total_cases: number;
  active_cases: number;
  demand_ready: number;
  providers_confirmed: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class TraceClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "/api/trace",
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });
  }

  // =========================================================================
  // Cases
  // =========================================================================

  async createCase(data: CreateCaseRequest): Promise<CreateCaseResponse> {
    const res = await this.client.post("/cases", data);
    return res.data;
  }

  async getCase(caseId: string): Promise<TraceCase> {
    const res = await this.client.get(`/cases/${caseId}`);
    return res.data;
  }

  async listCases(firmId?: string): Promise<{ cases: TraceCase[]; count: number }> {
    const res = await this.client.get("/cases", { params: { firmId } });
    return res.data;
  }

  // =========================================================================
  // Signing
  // =========================================================================

  async sendSigningPackage(caseId: string, data: SigningSendRequest): Promise<any> {
    const res = await this.client.post(`/cases/${caseId}/signing/send`, data);
    return res.data;
  }

  // =========================================================================
  // Providers
  // =========================================================================

  async listProviders(caseId: string): Promise<{ providers: TraceProvider[]; count: number }> {
    const res = await this.client.get(`/cases/${caseId}/providers`);
    return res.data;
  }

  async addProvider(caseId: string, data: Partial<TraceProvider>): Promise<TraceProvider> {
    const res = await this.client.post(`/cases/${caseId}/providers`, data);
    return res.data;
  }

  async updateProvider(caseId: string, providerId: string, data: Partial<TraceProvider>): Promise<TraceProvider> {
    const res = await this.client.put(`/cases/${caseId}/providers/${providerId}`, data);
    return res.data;
  }

  async confirmProviderList(caseId: string): Promise<ProviderConfirmResponse> {
    const res = await this.client.post(`/cases/${caseId}/providers/confirm`);
    return res.data;
  }

  // =========================================================================
  // Fax / Record Requests
  // =========================================================================

  async previewFaxRequests(caseId: string): Promise<FaxPreviewResponse> {
    const res = await this.client.get(`/cases/${caseId}/requests`);
    return res.data;
  }

  async sendFaxRequests(caseId: string): Promise<FaxSendResponse> {
    const res = await this.client.post(`/cases/${caseId}/requests/send`);
    return res.data;
  }

  // =========================================================================
  // Documents
  // =========================================================================

  async uploadDocument(caseId: string, file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await this.client.post(`/cases/${caseId}/documents/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return res.data;
  }

  // =========================================================================
  // Chronology & QA
  // =========================================================================

  async getChronology(caseId: string): Promise<TraceChronology> {
    const res = await this.client.get(`/cases/${caseId}/chronology`);
    return res.data;
  }

  async annotateFlag(caseId: string, nodeId: string, data: { annotation_status: string; annotation_note: string; annotation_version: number }): Promise<any> {
    const res = await this.client.patch(`/cases/${caseId}/event-nodes/${nodeId}`, data);
    return res.data;
  }

  async approveCase(caseId: string): Promise<any> {
    const res = await this.client.post(`/cases/${caseId}/approve`);
    return res.data;
  }

  async getReadiness(caseId: string): Promise<TraceReadiness> {
    const res = await this.client.get(`/cases/${caseId}/readiness`);
    return res.data;
  }

  async exportCase(caseId: string, format: "json" | "pdf" = "json"): Promise<any> {
    const res = await this.client.get(`/cases/${caseId}/export`, {
      params: { format },
      responseType: format === "pdf" ? "blob" : "json",
    });
    return format === "pdf" ? res.data : res.data;
  }

  // =========================================================================
  // Liens
  // =========================================================================

  async addLien(caseId: string, data: { lien_type: string; lienholder: string; claimed_amount: number; reference_number?: string; status?: string }): Promise<TraceLien> {
    const res = await this.client.post(`/cases/${caseId}/liens`, data);
    return res.data;
  }

  async listLiens(caseId: string): Promise<{ case_id: string; liens: TraceLien[] }> {
    const res = await this.client.get(`/cases/${caseId}/liens`);
    return res.data;
  }

  // =========================================================================
  // Stats (aggregated from cases endpoint for landing page)
  // =========================================================================

  async getStats(firmId?: string): Promise<TraceStats> {
    const res = await this.client.get("/cases/stats", { params: { firmId } });
    return res.data;
  }
}

export const traceClient = new TraceClient();
