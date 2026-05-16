/**
 * TrueVow Customer Portal - Certificate API Client
 * 
 * Fetches blockchain certificates from Tenant App API
 * Uses Clerk JWT for authentication
 * 
 * Note: This client can be used both server-side and client-side.
 * For client-side, pass the token explicitly.
 */

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

/**
 * List certificates for the authenticated tenant
 * 
 * @param filters - Optional filters for certificates
 * @param token - Optional Clerk JWT token (if not provided, will be fetched server-side)
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
  // If token not provided, try to get it server-side
  let authToken = token;
  if (!authToken && typeof window === 'undefined') {
    try {
      // Dynamic import for server-side auth
      const clerkServer = await import(/* webpackIgnore: true */ '@clerk/nextjs/server')
      if ('auth' in clerkServer) {
        const authResult = await (clerkServer as any).auth()
        if (authResult?.getToken) {
          authToken = await authResult.getToken() ?? undefined
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
    }
  }

  if (!authToken) {
    throw new Error('Not authenticated - Token required')
  }

  const params = new URLSearchParams()
  if (filters?.interaction_type) params.append('interaction_type', filters.interaction_type)
  if (filters?.from_date) params.append('from_date', filters.from_date)
  if (filters?.to_date) params.append('to_date', filters.to_date)
  params.append('limit', String(filters?.limit || 50))
  params.append('offset', String(filters?.offset || 0))

  const response = await fetch(`${API_BASE_URL}/api/v1/verify/certificates?${params}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
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
 * 
 * @param certificateRef - Certificate reference (e.g., TV-2026-001234)
 * @param token - Optional Clerk JWT token (if not provided, will be fetched server-side)
 */
export async function getCertificate(
  certificateRef: string,
  token?: string
): Promise<Certificate> {
  // If token not provided, try to get it server-side
  let authToken = token;
  if (!authToken && typeof window === 'undefined') {
    try {
      const clerkServer = await import(/* webpackIgnore: true */ '@clerk/nextjs/server')
      if ('auth' in clerkServer) {
        const authResult = await (clerkServer as any).auth()
        if (authResult?.getToken) {
          authToken = await authResult.getToken() ?? undefined
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
    }
  }

  if (!authToken) {
    throw new Error('Not authenticated - Token required')
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/verify/certificates/${certificateRef}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
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
 * 
 * @param interactionType - Interaction type (e.g., prospect_journey_complete)
 * @param interactionId - Interaction ID (e.g., appointment_id, session_id)
 * @param token - Optional Clerk JWT token (if not provided, will be fetched server-side)
 */
export async function getCertificateByInteraction(
  interactionType: string,
  interactionId: string,
  token?: string
): Promise<Certificate | null> {
  // If token not provided, try to get it server-side
  let authToken = token;
  if (!authToken && typeof window === 'undefined') {
    try {
      const clerkServer = await import(/* webpackIgnore: true */ '@clerk/nextjs/server')
      if ('auth' in clerkServer) {
        const authResult = await (clerkServer as any).auth()
        if (authResult?.getToken) {
          authToken = await authResult.getToken() ?? undefined
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
    }
  }

  if (!authToken) {
    throw new Error('Not authenticated - Token required')
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/verify/certificates/by-interaction/${interactionType}/${interactionId}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null  // Certificate not found (not an error)
    }
    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    throw new Error(`Failed to fetch certificate: ${response.statusText}`)
  }

  return response.json()
}

