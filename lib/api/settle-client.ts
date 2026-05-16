/**
 * SETTLE Service API Client for Customer Portal
 * Routes all requests through server-side Next.js proxy routes.
 * API keys are never exposed to the browser.
 */

// Proxy base -- relative paths so this works in any deployment
const SETTLE_PROXY = '';

export interface EstimateRequest {
  jurisdiction: string;
  case_type: string;
  injury_category: string[];
  severity?: string;
  liability_strength?: string;
  defendant_type?: string;
  additional_factors?: Record<string, unknown>;
}

/**
 * Aligned with backend EstimateResponse Pydantic (app/models/case_bank.py).
 * Cohort V-front-2 (2026-05-17): full alignment replaces stale
 * settlement_range / data_quality_score / factors_considered shape.
 */
export interface EstimateResponse {
  // Statistical ranges
  percentile_25: number;
  median: number;
  percentile_75: number;
  percentile_95: number;

  // Metadata
  n_cases: number;
  confidence: string; // "low" | "medium" | "high" | "insufficient_data"

  // Year-2 guardrails (ADR S-1.1)
  own_case_only: boolean;
  suppressed_features: string[];

  // Aggregation tier (Option D)
  aggregation_level: 'county' | 'state' | 'none';
  n_county: number;
  n_state: number;

  // Pilot-mode signal (ADR S-2 v2)
  is_pilot_response: boolean;

  // Comparable cases (for report — backend returns array)
  comparable_cases: ComparableCase[];

  // Justification
  range_justification: string | null;

  // Query metadata
  query_id: string | null;
  queried_at: string;
  response_time_ms: number | null;
}

export interface ComparableCase {
  jurisdiction: string;
  case_type: string;
  injury_category: string[];
  primary_diagnosis: string | null;
  medical_bills: number;
  outcome_range: string;
  outcome_type: string;
  contributed_at: string;
}

export interface ContributionRequest {
  county: string;
  incident: string;
  injury: string;
  insurer: string;
  band: string;
  litigation_stage: string;
}

export interface ContributionResponse {
  contribution_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  message: string;
}

export interface Report {
  report_id: string;
  case_id: string;
  title: string;
  report_type: string;
  generated_at: string;
  file_url?: string;
  confidence_score?: number;
}

class SettleClient {
  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(SETTLE_PROXY + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.detail || 'HTTP ' + res.status);
    }
    return res.json();
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(SETTLE_PROXY + path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.detail || 'HTTP ' + res.status);
    }
    return res.json();
  }

  async getEstimate(request: EstimateRequest): Promise<EstimateResponse> {
    return this.post('/api/settle/analysis', request);
  }

  async submitContribution(contribution: ContributionRequest): Promise<ContributionResponse> {
    return this.post('/api/settle/contribute', contribution);
  }

  async getReports(): Promise<Report[]> {
    return this.get('/api/settle/reports');
  }

  async generateReport(caseId: string, reportType: string): Promise<Report> {
    return this.post('/api/settle/reports', { case_id: caseId, report_type: reportType });
  }
}

export const settleClient = new SettleClient();
