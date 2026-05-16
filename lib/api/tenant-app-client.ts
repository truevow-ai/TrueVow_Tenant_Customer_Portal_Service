/**
 * TrueVow Tenant Application API Client
 * 
 * Connects Customer Portal to Tenant Application backend (FastAPI)
 * Handles all API calls for INTAKE, DRAFT, BILLING, etc.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeStats {
  tenant_id: string;
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  conversion_rate: number;
}

export interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  status: string;
  source: string | null;
  practice_area: string | null;
  created_at: string;
  last_contact: string | null;
  notes: string | null;
}

export interface LeadWithSession extends Lead {
  tenant_id: string;
  session_id: string | null;
  twilio_call_sid: string | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_url: string | null;
  answers?: Array<{
    question_key: string;
    response_value: string;
    response_type: string;
    captured_at: string;
  }>;
  lead_score?: number;
  lead_grade?: string;
  is_qualified?: boolean;
}

export interface LeadsList {
  leads: LeadWithSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadDetail extends LeadWithSession {
  caller_phone?: string;
  session_status?: string;
  practice_area_code?: string;
  duration_seconds?: number;
  answers: Array<{
    question_key: string;
    response_value: string;
    response_type: string;
    captured_at: string;
  }>;
}

export interface CallRecording {
  call_sid: string;
  recording_id: string;
  recording_sid: string;
  recording_url: string;
  duration_seconds: number;
  channels: string;
  status: string;
  created_at: string;
}

export interface CallTranscription {
  call_sid: string;
  transcription_id: string;
  transcription_text: string;
  transcription_url: string | null;
  status: string;
  confidence_score: number | null;
  language_code: string;
  created_at: string;
}

export interface CreateLeadRequest {
  tenant_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  source?: string;
  practice_area?: string;
  notes?: string;
}

export interface DraftRule {
  id: string;
  validator_level: string;
  validator_name: string;
  validator_type: string;
  validator_config: Record<string, any>;
  error_message: string;
  warning_message: string | null;
  priority: number;
  status: string;
}

export interface BillingUsage {
  tenant_id: string;
  period_start: string;
  period_end: string;
  total_usage: number;
  breakdown: Record<string, number>;
}

// ============================================================================
// TENANT CONFIGURATION (Premium/Enterprise Features)
// ============================================================================

/**
 * Tenant configuration - managed by TrueVow CSMs via SaaS Admin
 * Law firm customers have READ-ONLY access
 */
export interface TenantConfiguration {
  tenant_id: string;
  
  // Firm tier and pricing
  firm_tier: 'solo' | 'team' | 'enterprise';
  unlock_price: number; // $99 solo, $89 team, custom enterprise
  
  // Custom threshold (default 75%, configurable 70-85%)
  unlock_threshold: number;
  
  // Intake configuration
  intake_questions: IntakeQuestionConfig[];
  
  // Custom screening rules (Premium/Enterprise only)
  custom_screening?: {
    enabled: boolean;
    rules: CustomScreeningRule[];
  };
  
  // Feature flags
  features: {
    economic_strength_display: boolean;
    custom_questions: boolean;
    team_dashboard: boolean;
    api_access: boolean;
  };
  
  // Metadata
  configured_by: string; // CSM user ID
  configured_at: string;
  version: number;
}

export interface IntakeQuestionConfig {
  question_id: string;
  question_key: string;
  question_text: string;
  question_type: 'text' | 'select' | 'multiselect' | 'date' | 'phone';
  
  // For select/multiselect types
  options?: Array<{
    value: string;
    label: string;
    disqualifying?: boolean; // Auto-disqualify if selected
  }>;
  
  // Scoring weight (optional, for custom screening)
  weight?: number;
  
  // Whether this is a mandatory signal
  is_mandatory: boolean;
  
  // Practice area this question applies to
  practice_area?: string;
  
  // Order in intake flow
  sort_order: number;
}

export interface CustomScreeningRule {
  rule_id: string;
  rule_name: string;
  rule_type: 'disqualifier' | 'boost' | 'threshold';
  
  // Conditions (e.g., "if treatment_status === 'surgery' add 10 points")
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in';
    value: any;
  }>;
  
  // Action
  action: {
    type: 'disqualify' | 'add_score' | 'subtract_score' | 'set_tier';
    value?: any;
  };
  
  priority: number;
  enabled: boolean;
}

// ============================================================================
// API CLIENT
// ============================================================================

export class TenantAppClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Use port 3005 for Tenant Application backend
    this.baseUrl = process.env.TENANT_APP_SERVICE_URL || 'http://localhost:3021';
    this.apiKey = process.env.TENANT_APP_DATABASE_ANON_KEY || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-API-Key': this.apiKey,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.error('[API] Response error:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          console.error('[API] No response received:', error.request);
        } else {
          console.error('[API] Request setup error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // ==========================================================================
  // INTAKE API
  // ==========================================================================

  /**
   * Get intake statistics for a tenant
   */
  async getIntakeStats(tenantId: string): Promise<IntakeStats> {
    const response = await this.client.get<IntakeStats>(
      `/api/v1/intake/stats`,
      { params: { tenant_id: tenantId } }
    );
    return response.data;
  }

  /**
   * Get leads list for a tenant with session, recording, and transcription data
   */
  async getLeads(
    tenantId: string,
    options?: {
      status?: string;
      practice_area?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<LeadsList> {
    const response = await this.client.get<LeadsList>(
      `/api/v1/leads/tenant`,
      {
        params: {
          tenant_id: tenantId,
          status: options?.status,
          practice_area: options?.practice_area,
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        },
      }
    );
    return response.data;
  }

  /**
   * Get single lead with full details including recording and transcription
   */
  async getLeadById(leadId: string, tenantId: string): Promise<LeadDetail> {
    const response = await this.client.get<LeadDetail>(
      `/api/v1/leads/tenant/${leadId}`,
      {
        params: { tenant_id: tenantId },
      }
    );
    return response.data;
  }

  /**
   * Get call recording by call_sid
   */
  async getRecording(callSid: string): Promise<CallRecording> {
    const response = await this.client.get<CallRecording>(
      `/api/v1/recordings/${callSid}`
    );
    return response.data;
  }

  /**
   * Get call transcription by call_sid
   */
  async getTranscription(callSid: string): Promise<CallTranscription> {
    const response = await this.client.get<CallTranscription>(
      `/api/v1/recordings/${callSid}/transcription`
    );
    return response.data;
  }

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadRequest): Promise<Lead> {
    const response = await this.client.post<Lead>(
      `/api/v1/intake/leads`,
      data
    );
    return response.data;
  }

  // ==========================================================================
  // DRAFT API (Future)
  // ==========================================================================

  /**
   * Get validation rules for a tenant
   */
  async getDraftRules(tenantId: string): Promise<DraftRule[]> {
    // TODO: Implement when DRAFT endpoints are ready
    console.warn('[API] DRAFT endpoints not yet implemented');
    return [];
  }

  /**
   * Create a validation rule
   */
  async createDraftRule(tenantId: string, rule: Partial<DraftRule>): Promise<DraftRule> {
    // TODO: Implement when DRAFT endpoints are ready
    throw new Error('DRAFT endpoints not yet implemented');
  }

  // ==========================================================================
  // BILLING API (Future)
  // ==========================================================================

  /**
   * Get billing usage for a tenant
   */
  async getBillingUsage(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BillingUsage> {
    // TODO: Implement when BILLING endpoints are ready
    console.warn('[API] BILLING endpoints not yet implemented');
    return {
      tenant_id: tenantId,
      period_start: periodStart,
      period_end: periodEnd,
      total_usage: 0,
      breakdown: {},
    };
  }

  // ==========================================================================
  // TENANT CONFIGURATION API (Premium/Enterprise Features)
  // ==========================================================================

  /**
   * Get tenant configuration
   * 
   * READ-ONLY for Customer Portal
   * Configuration is managed by TrueVow CSMs via SaaS Admin module
   * 
   * Throws error if configuration not found - NO DEFAULTS
   */
  async getTenantConfiguration(tenantId: string): Promise<TenantConfiguration> {
    const response = await this.client.get<TenantConfiguration>(
      `/api/v1/tenants/${tenantId}/configuration`
    );
    return response.data;
  }

  /**
   * Get intake questions for a tenant and practice area
   * Returns custom questions if configured, otherwise system defaults
   */
  async getIntakeQuestions(
    tenantId: string,
    practiceArea?: string
  ): Promise<IntakeQuestionConfig[]> {
    try {
      const config = await this.getTenantConfiguration(tenantId);
      
      if (config.intake_questions.length > 0) {
        // Filter by practice area if specified
        if (practiceArea) {
          return config.intake_questions.filter(
            q => !q.practice_area || q.practice_area === practiceArea
          );
        }
        return config.intake_questions;
      }
      
      // Return system default questions
      return this.getDefaultIntakeQuestions(practiceArea);
    } catch (error) {
      console.error('[API] Failed to get intake questions:', error);
      return this.getDefaultIntakeQuestions(practiceArea);
    }
  }

  /**
   * Get default intake questions for a practice area
   */
  private getDefaultIntakeQuestions(practiceArea?: string): IntakeQuestionConfig[] {
    // System default questions for personal injury
    const defaultQuestions: IntakeQuestionConfig[] = [
      {
        question_id: 'jurisdiction',
        question_key: 'jurisdiction',
        question_text: 'What state did this happen in?',
        question_type: 'select',
        options: [
          { value: 'FL', label: 'Florida' },
          { value: 'CA', label: 'California' },
          { value: 'TX', label: 'Texas' },
          { value: 'NY', label: 'New York' },
        ],
        is_mandatory: true,
        sort_order: 1,
      },
      {
        question_id: 'incident_date',
        question_key: 'incident_date',
        question_text: 'When did this happen?',
        question_type: 'date',
        is_mandatory: true,
        sort_order: 2,
      },
      {
        question_id: 'liability',
        question_key: 'liability_description',
        question_text: 'What happened?',
        question_type: 'text',
        is_mandatory: true,
        sort_order: 3,
      },
      {
        question_id: 'treatment',
        question_key: 'treatment_description',
        question_text: 'Have you received medical treatment?',
        question_type: 'text',
        is_mandatory: true,
        sort_order: 4,
      },
      {
        question_id: 'prior_rep',
        question_key: 'prior_attorney',
        question_text: 'Have you spoken to another attorney about this case?',
        question_type: 'select',
        options: [
          { value: 'no', label: 'No, this is my first time' },
          { value: 'yes', label: 'Yes, but I want a second opinion' },
          { value: 'fired', label: 'Yes, but I fired them' },
        ],
        is_mandatory: false,
        sort_order: 5,
      },
    ];
    
    return defaultQuestions;
  }

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * Check if the Tenant Application API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.status === 200;
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const tenantAppClient = new TenantAppClient();

