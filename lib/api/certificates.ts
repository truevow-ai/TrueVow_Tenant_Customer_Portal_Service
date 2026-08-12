/**
 * TrueVow Customer Portal - Certificate API Client
 * 
 * Fetches blockchain certificates from Tenant App API
 * Uses Supabase JWT for authentication
 * 
 * Note: This client can be used both server-side and client-side.
 * For client-side, pass the token explicitly.
 */

import { verifySupabaseJwt } from '@truevow/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_TENANT_APP_API_URL || 'https://api.truevow.law'

export interface Certificate {
  certificate_id?: string
  certificate_ref: string
  verification_url: string
  timestamped_at: string
  status: 'pending_confirmation' | 'confirmed' | 'failed'
  bitcoin_block_height?: number
  bitcoin_block_hash?: string
  verified_at?: string
  interaction_type: string
  interaction_id: string
  session_id?: string
  lead_id?: string
  download_ots_url?: string
}

export interface CertificateListResponse {
  certificates: Certificate[]
  total: number
  limit: number
  offset: number
}

function requireToken(authToken: string | undefined): asserts authToken is string {
  if (!authToken) throw new Error('Not authenticated - Token required')
}

/**
 * List certificates for the authenticated tenant
 */
export async function getCertificates(
  filters?: {
    interaction_type?: string
    from_date?: string
    to_date?: string
    limit?: number
    offset?: number
  },
  token?: string
): Promise<CertificateListResponse> {
  requireToken(token)

  const params = new URLSearchParams()
  if (filters?.interaction_type) params.append('interaction_type', filters.interaction_type)
  if (filters?.from_date) params.append('from_date', filters.from_date)
  if (filters?.to_date) params.append('to_date', filters.to_date)
  params.append('limit', String(filters?.limit || 50))
  params.append('offset', String(filters?.offset || 0))

  const response = await fetch(`${API_BASE_URL}/api/v1/verify/certificates?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    throw new Error(`Failed to fetch certificates: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get certificate by reference ID
 */
export async function getCertificate(
  certificateRef: string,
  token?: string
): Promise<Certificate> {
  requireToken(token)

  const response = await fetch(`${API_BASE_URL}/api/v1/verify/certificates/${certificateRef}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Certificate not found')
    }
    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    throw new Error(`Failed to fetch certificate: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get certificate by interaction type and ID
 */
export async function getCertificateByInteraction(
  interactionType: string,
  interactionId: string,
  token?: string
): Promise<Certificate | null> {
  requireToken(token)

  const response = await fetch(
    `${API_BASE_URL}/api/v1/verify/certificates/by-interaction/${interactionType}/${interactionId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    throw new Error(`Failed to fetch certificate: ${response.statusText}`)
  }

  return response.json()
}
