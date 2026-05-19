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
  medical_bills: number;
  severity?: string;
  liability_strength?: string;
  defendant_type?: string;
  additional_factors?: Record<string, unknown>;
  // Cohort W — optional filters
  insurance_carrier?: string;
  injury_severity?: string;
  court_level?: string;
  is_verdict?: boolean;
  // Phase 2.2: Advanced search filters
  outcome_type?: string;
  date_range_from?: string;
  date_range_to?: string;
  medical_bills_min?: number;
  medical_bills_max?: number;
  exclude_outliers?: boolean;
  min_reputation_score?: number;
  comparative_negligence_min?: number;
  comparative_negligence_max?: number;
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

  // Phase 2.1: Demand Confidence Score
  confidence_score: ConfidenceScoreData | null;

  // Phase 3.1: Multiplier Model Layer
  multiplier_method: MultiplierMethod | null;
  active_method: string;  // "percentile" (primary) or "multiplier"

  // Phase 3.2: Overdemand Cliff Warning
  overdemand_cliff: OverdemandCliff | null;

  // Phase 4: Outcome Distribution
  outcome_distribution: OutcomeDistribution | null;
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
  // Cohort W — rich fields
  insurance_carrier?: string;
  injury_severity?: string;
  court_level?: string;
  is_verdict?: boolean;
  exact_outcome_amount?: number;
  comparative_negligence_pct?: number;
  date_of_verdict?: string;
}

// Phase 2.1: Confidence Score types
export interface ConfidenceFactor {
  score: number;
  max: number;
  weight: number;
  detail: string;
}

export interface ConfidenceScoreData {
  overall: number;
  label: string;
  factors: Record<string, ConfidenceFactor>;
  warnings: string[];
}

// Phase 3.1: Multiplier Model Layer
export interface MultiplierMethod {
  low: number;
  median: number;
  high: number;
  model_label: string;      // "Community Comp Set (64 cases)" | "Statewide Benchmark (30 cases)" | "Industry Baseline — Not Personalized"
  base_multiplier: number;  // e.g., 3.5
  adjustments_applied: string[];  // e.g., ["Government defendant: -15%"]
}

// Phase 3.2: Overdemand Cliff Warning
export interface OverdemandCliff {
  threshold: number | null;       // e.g., 180000
  settlement_rate_below: number | null;  // e.g., 0.72
  settlement_rate_above: number | null;  // e.g., 0.31
  warning: string | null;         // e.g., "Historical data shows demands above $180,000 settle 41% less often"
  has_cliff: boolean;
  methodology: string;
}

// Phase 4: Outcome Distribution
export interface OutcomeDistribution {
  outcome_distribution: {
    settlement: { rate: number; avg_amount: number | null; count: number };
    plaintiff_verdict: { rate: number; avg_amount: number | null; count: number };
    defense_verdict: { rate: number; avg_amount: number | null; count: number };
    dismissed: { rate: number; avg_amount: number | null; count: number };
  };
  trial_risk_indicators: {
    trial_propensity: number;        // e.g., 0.18
    plaintiff_verdict_rate: number;  // e.g., 0.65
    defense_verdict_rate: number;    // e.g., 0.35
    verdict_premium: number | null;  // e.g., 45.0 (verdicts are 45% higher than settlements)
  } | null;
  sample_size: number;
  methodology: string;
}

// Phase 2.3: Carrier Patterns types
export interface CarrierPattern {
  defendant_category: string;
  defendant_industry: string | null;
  case_count: number;
  avg_settlement_range: { low: number; median: number; high: number };
  settlement_rate: number;
  avg_time_to_resolution_days: number | null;
  trial_rate: number;
  lowball_indicator: number;
  median_settlement: number | null;
  p25_settlement: number | null;
  p75_settlement: number | null;
}

export interface CarrierPatternsResponse {
  patterns: CarrierPattern[];
  total_cases: number;
  jurisdiction: string | null;
  case_type: string | null;
  methodology: string;
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
      const msg = err.error
        || (Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ') : err.detail)
        || 'HTTP ' + res.status;
      throw new Error(msg);
    }
    return res.json();
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(SETTLE_PROXY + path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      const msg = err.error
        || (Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ') : err.detail)
        || 'HTTP ' + res.status;
      throw new Error(msg);
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

  // Phase 2.3: Carrier Patterns analytics
  async getCarrierPatterns(params?: {
    jurisdiction?: string;
    case_type?: string;
    injury_category?: string[];
    defendant_category?: string;
    min_case_count?: number;
  }): Promise<CarrierPatternsResponse> {
    const query = new URLSearchParams();
    if (params?.jurisdiction) query.set('jurisdiction', params.jurisdiction);
    if (params?.case_type) query.set('case_type', params.case_type);
    if (params?.injury_category) params.injury_category.forEach(i => query.append('injury_category', i));
    if (params?.defendant_category) query.set('defendant_category', params.defendant_category);
    if (params?.min_case_count) query.set('min_case_count', String(params.min_case_count));

    const qs = query.toString();
    return this.get(`/api/settle/carrier-patterns${qs ? `?${qs}` : ''}`);
  }
}

export const settleClient = new SettleClient();
