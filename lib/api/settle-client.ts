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

export interface EstimateResponse {
  estimate_id: string;
  settlement_range: {
    low: number;
    mid: number;
    high: number;
    confidence_level: string;
  };
  comparable_cases: number;
  data_quality_score: number;
  factors_considered: string[];
  jurisdiction: string;
  case_type: string;
  created_at: string;
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
