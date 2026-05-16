/**
 * LEVERAGE Service API Client (Browser-side)
 * Calls the Customer Portal's own API proxy routes at /api/leverage/*
 * The portal routes then forward to the LEVERAGE service backend.
 */

import axios, { AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RewardLedgerEntry {
  id: string;
  tenant_id: string;
  credits: number;
  source: "welcome_bonus" | "settlement" | "consumed";
  granted_at: string;
  expires_at?: string;
  status: "active" | "used" | "expired";
  reference_case_id?: string;
}

export interface RewardSummary {
  active_credits: number;
  total_granted: number;
  total_used: number;
  total_expired: number;
  next_expiration_date?: string;
  welcome_bonus_granted: boolean;
  welcome_bonus_date?: string;
  settlement_credits_count: number;
}

export interface MedicalExpenses {
  emergency_room: number;
  hospitalization: number;
  surgery: number;
  physical_therapy: number;
  specialist_visits: number;
  medications: number;
  future_medical_estimate: number;
  other_medical: number;
}

export interface LostIncome {
  weekly_wage: number;
  weeks_missed: number;
  future_lost_earning_capacity: number;
}

export interface DamagesRequest {
  tenant_id: string;
  case_reference?: string;
  medical: MedicalExpenses;
  lost_income: LostIncome;
  pain_suffering_multiplier: number;
  property_damage: number;
  out_of_pocket_expenses: number;
}

export interface DamagesBreakdown {
  medical_total: number;
  lost_income_total: number;
  pain_suffering: number;
  property_damage: number;
  out_of_pocket: number;
}

export interface DamagesResult {
  gross_damages: number;
  breakdown: DamagesBreakdown;
  settlement_range_low: number;
  settlement_range_high: number;
}

export interface DisbursementRequest {
  tenant_id: string;
  case_reference?: string;
  filing_fees: number;
  medical_records_cost: number;
  expert_fees: number;
  deposition_costs: number;
  investigation_costs: number;
  travel_expenses: number;
  other_costs: number;
  attorney_fees_percentage: number;
  custom_items?: Array<{ description: string; amount: number }>;
  gross_settlement?: number;
}

export interface DisbursementBreakdown {
  filing_fees: number;
  medical_records_cost: number;
  expert_fees: number;
  deposition_costs: number;
  investigation_costs: number;
  travel_expenses: number;
  other_costs: number;
  subtotal_costs: number;
  attorney_fees: number;
  total_deductions: number;
  net_to_client: number;
}

export interface DisbursementResult {
  total_disbursement: number;
  breakdown: DisbursementBreakdown;
  net_to_client: number;
  break_even_settlement?: number;
  attorney_fees_percentage?: number;
}

export interface SavedWorksheet {
  id: string;
  case_id: string;
  tenant_id: string;
  version: number;
  input_json: any;
  result_json: any;
  created_at: string;
}

export interface CaseListItem {
  case_id: string;
  tenant_id: string;
  incident_type?: string;
  state?: string;
  litigation_stage?: string;
  leverage_unlocked: boolean;
  latest_compliance_status?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  tenant_id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
}

export interface CaseDetail {
  case_id: string;
  tenant_id: string;
  status: string;
  incident_type?: string;
  state?: string;
  litigation_stage?: string;
  leverage_unlocked: boolean;
  latest_compliance?: any;
  event_count: number;
  saved_damages?: SavedWorksheet;
  saved_disbursement?: SavedWorksheet;
  created_at: string;
  updated_at: string;
}

export interface OpenCaseRequest {
  tenant_id: string;
  incident_type: string;
  state: string;
  litigation_stage?: string;
}

export interface DeadlineItem {
  id: string;
  case_id: string;
  tenant_id: string;
  deadline_type: "sol" | "eeoc" | "demand_letter" | "right_to_sue";
  deadline_date: string;
  days_remaining: number;
  source_state: string;
  calculation_input_json: any;
  created_at: string;
}

export interface CaseEconomics {
  case_id: string;
  latest_damages?: SavedWorksheet;
  latest_disbursement?: SavedWorksheet;
  net_to_client?: number;
}

export interface LeverageAnalytics {
  total_cases: number;
  active_cases: number;
  settled_cases: number;
  total_compliance_runs: number;
  average_compliance_flags: number;
  total_reward_credits_granted: number;
  total_reward_credits_used: number;
  total_reward_credits_expired: number;
  active_reward_credits: number;
  total_damages_calculated: number;
  average_case_value: number;
  compliance_health_score: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class LeverageClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "/api/leverage",
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });
  }

  // =========================================================================
  // Rewards
  // =========================================================================

  async getRewardsLedger(tenantId: string): Promise<RewardLedgerEntry[]> {
    const res = await this.client.get("/rewards/ledger", {
      params: { tenantId },
    });
    return res.data.ledger ?? [];
  }

  async getRewardsSummary(tenantId: string): Promise<RewardSummary> {
    const res = await this.client.get("/rewards/summary", {
      params: { tenantId },
    });
    return res.data;
  }

  // =========================================================================
  // Damages
  // =========================================================================

  async calculateDamages(data: DamagesRequest): Promise<DamagesResult> {
    const res = await this.client.post("/damages", data);
    return res.data;
  }

  async saveDamages(
    caseId: string,
    data: { input: DamagesRequest; result: DamagesResult }
  ): Promise<SavedWorksheet> {
    const res = await this.client.post(`/case/${caseId}/damages/save`, data);
    return res.data;
  }

  async getDamages(caseId: string): Promise<SavedWorksheet[]> {
    const res = await this.client.get(`/case/${caseId}/damages`);
    return res.data.worksheets ?? [];
  }

  // =========================================================================
  // Disbursement
  // =========================================================================

  async calculateDisbursement(
    data: DisbursementRequest
  ): Promise<DisbursementResult> {
    const res = await this.client.post("/disbursement", data);
    return res.data;
  }

  async saveDisbursement(
    caseId: string,
    data: { input: DisbursementRequest; result: DisbursementResult }
  ): Promise<SavedWorksheet> {
    const res = await this.client.post(
      `/case/${caseId}/disbursement/save`,
      data
    );
    return res.data;
  }

  async getDisbursement(caseId: string): Promise<SavedWorksheet[]> {
    const res = await this.client.get(`/case/${caseId}/disbursement`);
    return res.data.worksheets ?? [];
  }

  // =========================================================================
  // Cases
  // =========================================================================

  async listCases(
    tenantId: string,
    filters?: { status?: string; incident_type?: string; state?: string; limit?: number; offset?: number }
  ): Promise<{ cases: CaseListItem[]; total: number }> {
    const res = await this.client.get("/cases", {
      params: { tenantId, ...filters },
    });
    return res.data;
  }

  async openCase(data: OpenCaseRequest): Promise<{ case_id: string }> {
    const res = await this.client.post("/case/open", data);
    return res.data;
  }

  async getCaseEvents(caseId: string): Promise<CaseEvent[]> {
    const res = await this.client.get(`/case/${caseId}/events`);
    return res.data.events ?? [];
  }

  async getCaseDetail(caseId: string): Promise<CaseDetail> {
    const res = await this.client.get(`/case/${caseId}/detail`);
    return res.data;
  }

  // =========================================================================
  // Deadlines
  // =========================================================================

  async saveDeadline(
    caseId: string,
    data: Omit<DeadlineItem, "id" | "created_at">
  ): Promise<DeadlineItem> {
    const res = await this.client.post(`/case/${caseId}/deadlines/save`, data);
    return res.data;
  }

  async getCaseDeadlines(caseId: string): Promise<DeadlineItem[]> {
    const res = await this.client.get(`/case/${caseId}/deadlines`);
    return res.data.deadlines ?? [];
  }

  async getUpcomingDeadlines(
    tenantId: string,
    days = 30
  ): Promise<DeadlineItem[]> {
    const res = await this.client.get("/deadlines/upcoming", {
      params: { tenantId, days },
    });
    return res.data.deadlines ?? [];
  }

  // =========================================================================
  // Economics & Analytics
  // =========================================================================

  async getCaseEconomics(caseId: string): Promise<CaseEconomics> {
    const res = await this.client.get(`/case/${caseId}/economics`);
    return res.data;
  }

  async getAnalytics(tenantId: string): Promise<LeverageAnalytics> {
    const res = await this.client.get("/analytics", {
      params: { tenantId },
    });
    return res.data;
  }
}

// Export singleton instance
export const leverageClient = new LeverageClient();
