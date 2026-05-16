/**
 * CONNECT Service API Client
 * 
 * Client for interacting with the CONNECT service (referral network).
 */

export interface Referral {
  id: string;
  referringAttorney: {
    name: string;
    firm: string;
    email: string;
  };
  referredAttorney: {
    name: string;
    firm: string;
    email: string;
  };
  caseType: string;
  jurisdiction: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  acceptedAt?: string;
  payoutAmount?: number;
  payoutStatus?: 'pending' | 'paid' | 'cancelled';
}

export interface CreateReferralRequest {
  referredAttorneyEmail: string;
  referredAttorneyName: string;
  referredAttorneyFirm: string;
  caseType: string;
  jurisdiction: string;
  estimatedValue?: number;
  notes?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  acceptedReferrals: number;
  pendingReferrals: number;
  totalPayouts: number;
  pendingPayouts: number;
}

class ConnectClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CONNECT_API_URL || 'http://localhost:8003';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key if available
    const apiKey = typeof window !== 'undefined' 
      ? localStorage.getItem('connect_api_key')
      : null;
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get referral statistics
   */
  async getStats(): Promise<ReferralStats> {
    return this.request<ReferralStats>('GET', '/api/v1/stats');
  }

  /**
   * List referrals
   */
  async listReferrals(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ referrals: Referral[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const path = `/api/v1/referrals${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request('GET', path);
  }

  /**
   * Get referral details
   */
  async getReferral(referralId: string): Promise<Referral> {
    return this.request('GET', `/api/v1/referrals/${referralId}`);
  }

  /**
   * Create a new referral
   */
  async createReferral(request: CreateReferralRequest): Promise<Referral> {
    return this.request('POST', '/api/v1/referrals', request);
  }

  /**
   * Accept a referral
   */
  async acceptReferral(referralId: string): Promise<Referral> {
    return this.request('POST', `/api/v1/referrals/${referralId}/accept`);
  }

  /**
   * Decline a referral
   */
  async declineReferral(referralId: string, reason?: string): Promise<Referral> {
    return this.request('POST', `/api/v1/referrals/${referralId}/decline`, { reason });
  }

  /**
   * Get payout history
   */
  async getPayouts(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ payouts: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const path = `/api/v1/payouts${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request('GET', path);
  }
}

export const connectClient = new ConnectClient();

