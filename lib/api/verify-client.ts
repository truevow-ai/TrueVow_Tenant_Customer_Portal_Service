/**
 * VERIFY Service API Client for Customer Portal
 * Handles all VERIFY-related API requests
 */

const VERIFY_API_URL = process.env.TENANT_VERIFY_SERVICE_API_URL || 'http://localhost:3010';

export interface VerifyDocumentRequest {
  document_type: string;
  document_content?: string;
  document_url?: string;
  metadata?: Record<string, any>;
}

export interface VerifyDocumentResponse {
  verification_id: string;
  status: 'pending' | 'verified' | 'failed';
  document_type: string;
  verification_result: {
    is_authentic: boolean;
    confidence_score: number;
    checks_performed: string[];
    issues_found?: string[];
  };
  blockchain_verified: boolean;
  verification_hash?: string;
  verified_at?: string;
}

export interface ComplianceCheckRequest {
  document_type: string;
  jurisdiction: string;
  case_type?: string;
  document_content?: string;
}

export interface ComplianceCheckResponse {
  check_id: string;
  status: 'pending' | 'completed' | 'failed';
  jurisdiction: string;
  compliance_results: {
    is_compliant: boolean;
    rules_checked: string[];
    violations?: string[];
    warnings?: string[];
  };
  checked_at: string;
}

export interface BarComplianceRequest {
  attorney_id: string;
  jurisdiction: string;
  bar_number: string;
}

export interface BarComplianceResponse {
  check_id: string;
  attorney_id: string;
  status: 'verified' | 'not_found' | 'suspended' | 'expired';
  bar_number: string;
  jurisdiction: string;
  license_status: string;
  expiration_date?: string;
  verified_at: string;
}

export interface Certificate {
  certificate_id: string;
  document_type: string;
  verification_hash: string;
  blockchain: string;
  issued_at: string;
  expires_at?: string;
  metadata: Record<string, any>;
}

export interface AuditEntry {
  entry_id: string;
  action: string;
  document_type: string;
  performed_by: string;
  performed_at: string;
  details: string;
  blockchain_hash?: string;
}

class VerifyClient {
  private getHeaders(apiKey: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
  }

  async verifyDocument(
    request: VerifyDocumentRequest,
    apiKey: string
  ): Promise<VerifyDocumentResponse> {
    const response = await fetch(`${VERIFY_API_URL}/api/v1/verify/document`, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async runComplianceCheck(
    request: ComplianceCheckRequest,
    apiKey: string
  ): Promise<ComplianceCheckResponse> {
    const response = await fetch(`${VERIFY_API_URL}/api/v1/compliance/check`, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async verifyBarCompliance(
    request: BarComplianceRequest,
    apiKey: string
  ): Promise<BarComplianceResponse> {
    const response = await fetch(`${VERIFY_API_URL}/api/v1/compliance/bar`, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getCertificates(apiKey: string): Promise<Certificate[]> {
    const response = await fetch(`${VERIFY_API_URL}/api/v1/certificates`, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getAuditTrail(apiKey: string): Promise<AuditEntry[]> {
    const response = await fetch(`${VERIFY_API_URL}/api/v1/audit/trail`, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const verifyClient = new VerifyClient();
