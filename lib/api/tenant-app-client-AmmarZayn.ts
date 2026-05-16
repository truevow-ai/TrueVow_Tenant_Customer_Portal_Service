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

export interface LeadsList {
  tenant_id: string;
  leads: Lead[];
  count: number;
  total: number;
  limit: number;
  offset: number;
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
// API CLIENT
// ============================================================================

export class TenantAppClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_TENANT_APP_API_URL || 'http://localhost:8000';
    this.apiKey = process.env.NEXT_PUBLIC_TENANT_APP_API_KEY || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
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
   * Get leads list for a tenant
   */
  async getLeads(
    tenantId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<LeadsList> {
    const response = await this.client.get<LeadsList>(
      `/api/v1/intake/leads`,
      {
        params: {
          tenant_id: tenantId,
          status: options?.status || 'all',
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        },
      }
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
  // HEALTH CHECK
  // ==========================================================================

  /**
   * Check if the Tenant Application API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
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


