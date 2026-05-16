/**
 * DRAFT Service API Client
 * Connects to Tenant Application which proxies to DRAFT Service
 * 
 * IMPORTANT: tenant_id MUST be passed to each method - no hardcoded defaults
 * All data flows from authenticated session or environment config.
 */

import axios, { AxiosInstance } from "axios";

const TENANT_APP_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_API_URL || "http://localhost:8000";
const TENANT_APP_API_KEY = process.env.NEXT_PUBLIC_TENANT_APP_API_KEY || "";

export interface ValidationRule {
  id: string;
  validator_level: string;
  validator_name: string;
  validator_type: string;
  validator_config: Record<string, any>;
  error_message: string;
  warning_message?: string;
  priority: number;
  status: string;
  practice_area?: string;
  document_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ValidationError {
  rule_id: string;
  rule_name: string;
  message: string;
  severity: "error" | "warning";
  suggestion?: string;
  location?: {
    line?: number;
    column?: number;
    context?: string;
  };
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validation_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ValidationHistory {
  validation_id: string;
  tenant_id: string;
  document_type?: string;
  practice_area?: string;
  jurisdiction?: string;
  is_valid: boolean;
  error_count: number;
  warning_count: number;
  rules_checked?: number;
  created_at: string;
  status: string;
}

export type DeadlineUrgency = 'OK' | 'WARNING' | 'CRITICAL' | 'OVERDUE';

export interface DeadlineResult {
  deadline_type: string;
  label: string;
  deadline_date: string;   // ISO date string YYYY-MM-DD
  days_remaining: number;  // negative = overdue
  urgency: DeadlineUrgency;
  statute_citation?: string;
  note?: string;
}

export interface CalculateDeadlinesRequest {
  jurisdiction_state: string;
  practice_area: string;      // 'personal_injury' | 'employment_law'
  incident_date?: string;     // PI only
  discrimination_date?: string; // Employment only
  right_to_sue_date?: string;   // Employment only
}

export interface CalculateDeadlinesResponse {
  deadlines: DeadlineResult[];
  jurisdiction_state: string;
  practice_area: string;
}

export interface DraftStats {
  validated_this_month: number;
  issues_found: number;
  validations_remaining: number | null; // null = unlimited plan
  deadlines_due_soon: number;
}

export interface FullValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info?: Array<{ rule_name: string; message: string }>;
  validation_id: string;
  timestamp: string;
  rules_checked: number;
  deadline_summary?: {
    label: string;
    deadline_date: string;
    days_remaining: number;
    urgency: DeadlineUrgency;
    statute_citation?: string;
  } | null;
}

class DraftClient {
  private client: AxiosInstance;
  private serviceClient: AxiosInstance;

  constructor() {
    const headers = {
      "Content-Type": "application/json",
      ...(TENANT_APP_API_KEY && { "X-API-Key": TENANT_APP_API_KEY }),
    };
    this.client = axios.create({
      baseURL: `${TENANT_APP_URL}/api/v1/draft`,
      headers,
      timeout: 30000,
    });
    this.serviceClient = axios.create({
      baseURL: `${TENANT_APP_URL}/api/v1`,
      headers,
      timeout: 30000,
    });
  }

  /**
   * Get validation rules
   * @param tenantId - REQUIRED - The tenant ID to fetch rules for
   */
  async getRules(tenantId: string, params?: {
    practice_area?: string;
    document_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rules: ValidationRule[]; total: number }> {
    const response = await this.client.get("/rules", {
      params: {
        tenant_id: tenantId,
        ...params,
      },
    });
    return response.data;
  }

  /**
   * Get a specific validation rule
   * @param tenantId - REQUIRED - The tenant ID
   * @param ruleId - The rule ID to fetch
   */
  async getRule(tenantId: string, ruleId: string): Promise<ValidationRule> {
    const response = await this.client.get(`/rules/${ruleId}`, {
      params: {
        tenant_id: tenantId,
      },
    });
    return response.data;
  }

  /**
   * Validate a document
   * @param tenantId - REQUIRED - The tenant ID
   * @param data - Document data to validate
   */
  async validateDocument(tenantId: string, data: {
    content: string;
    document_type?: string;
    practice_area?: string;
    rule_ids?: string[];
  }): Promise<ValidationResult> {
    const response = await this.client.post("/validate", {
      tenant_id: tenantId,
      ...data,
    });
    return response.data;
  }

  /**
   * Get validation history
   * @param tenantId - REQUIRED - The tenant ID
   */
  async getHistory(tenantId: string, params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ validations: ValidationHistory[]; total: number }> {
    const response = await this.client.get("/history", {
      params: {
        tenant_id: tenantId,
        ...params,
      },
    });
    return response.data;
  }

  /**
   * Get validation details
   * @param tenantId - REQUIRED - The tenant ID
   * @param validationId - The validation ID
   */
  async getValidationDetails(tenantId: string, validationId: string): Promise<{
    validation: ValidationHistory;
    result: ValidationResult;
  }> {
    const response = await this.client.get(`/history/${validationId}`, {
      params: {
        tenant_id: tenantId,
      },
    });
    return response.data;
  }

  /**
   * Calculate filing deadlines for a jurisdiction and practice area
   */
  async calculateDeadlines(req: CalculateDeadlinesRequest): Promise<CalculateDeadlinesResponse> {
    const response = await this.serviceClient.post('/deadlines/calculate', req);
    return response.data;
  }

  /**
   * Full document validation with jurisdiction-specific rules and optional deadline
   * @param tenantId - REQUIRED
   */
  async validateFull(tenantId: string, data: {
    document_type: string;
    jurisdiction: string;
    practice_area: string;
    document_text: string;
    incident_date?: string;
  }): Promise<FullValidationResult> {
    const response = await this.serviceClient.post('/validation/validate', {
      tenant_id: tenantId,
      ...data,
    });
    return response.data;
  }

  /**
   * Get DRAFT service stats for a tenant
   * @param tenantId - REQUIRED
   */
  async getStats(tenantId: string): Promise<DraftStats> {
    const response = await this.client.get('/stats', {
      params: { tenant_id: tenantId },
    });
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    draft_service: any;
    timestamp: string;
  }> {
    const response = await this.client.get("/health");
    return response.data;
  }
}

// Export singleton instance
export const draftClient = new DraftClient();

// Export sample test data
export const SAMPLE_DOCUMENTS = {
  personal_injury: {
    title: "Personal Injury Complaint",
    practice_area: "personal_injury",
    document_type: "complaint",
    content: `SUPERIOR COURT OF CALIFORNIA
COUNTY OF LOS ANGELES

JOHN DOE,
    Plaintiff,
v.
ABC CORPORATION,
    Defendant.

Case No.: 23-CV-12345

COMPLAINT FOR DAMAGES

Plaintiff John Doe alleges as follows:

1. JURISDICTION AND VENUE
This Court has jurisdiction over this matter pursuant to California Code of Civil Procedure Section 410.10.

2. PARTIES
Plaintiff John Doe is an individual residing in Los Angeles County, California.

3. FACTS
On January 15, 2023, Plaintiff was injured due to Defendant's negligence.

4. CAUSES OF ACTION
FIRST CAUSE OF ACTION: Negligence

5. DAMAGES
Plaintiff seeks compensatory damages in the amount of $500,000.

WHEREFORE, Plaintiff prays for judgment as follows:
1. General damages according to proof;
2. Special damages according to proof;
3. Costs of suit;
4. Such other relief as the Court deems just and proper.

Dated: December 26, 2025

_________________________
Attorney for Plaintiff`,
  },
  medical_malpractice: {
    title: "Medical Malpractice Demand Letter",
    practice_area: "medical_malpractice",
    document_type: "demand_letter",
    content: `DEMAND LETTER

TO: Dr. Jane Smith, MD
    ABC Medical Center
    123 Medical Drive
    Los Angeles, CA 90001

RE: Medical Malpractice Claim - Patient: John Doe
    Date of Incident: March 15, 2023

Dear Dr. Smith:

This letter serves as formal notice of our client's claim for medical malpractice.

FACTS:
On March 15, 2023, our client, John Doe, underwent surgery at your facility. During the procedure, you negligently failed to follow standard medical protocols, resulting in severe complications.

INJURIES AND DAMAGES:
As a direct result of your negligence, our client suffered:
- Permanent nerve damage
- Chronic pain requiring ongoing treatment
- Loss of income totaling $150,000
- Medical expenses exceeding $250,000
- Significant emotional distress

DEMAND:
We demand payment of $1,500,000 to settle this matter within 30 days.

If we do not receive a satisfactory response, we will file a lawsuit.

Sincerely,

Attorney for John Doe
State Bar No. 123456`,
  },
  settlement_agreement: {
    title: "Settlement Agreement",
    practice_area: "general",
    document_type: "settlement_agreement",
    content: `SETTLEMENT AGREEMENT AND RELEASE

This Settlement Agreement ("Agreement") is entered into as of December 26, 2025, by and between:

JOHN DOE ("Plaintiff")
and
ABC CORPORATION ("Defendant")

RECITALS:
WHEREAS, Plaintiff filed a lawsuit against Defendant in Case No. 23-CV-12345;
WHEREAS, the parties wish to settle all claims without admission of liability;

NOW, THEREFORE, in consideration of the mutual covenants herein:

1. SETTLEMENT PAYMENT
Defendant shall pay Plaintiff the sum of $350,000 ("Settlement Amount") within 30 days.

2. RELEASE
Plaintiff releases Defendant from all claims arising from the incident on January 15, 2023.

3. CONFIDENTIALITY
The parties agree to keep the terms of this Agreement confidential.

4. NO ADMISSION
This Agreement does not constitute an admission of liability by Defendant.

5. GOVERNING LAW
This Agreement shall be governed by California law.

IN WITNESS WHEREOF, the parties have executed this Agreement.

PLAINTIFF:                    DEFENDANT:
_____________________        _____________________
John Doe                     ABC Corporation
Date: _______________        Date: _______________`,
  },
};

