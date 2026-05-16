'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CertificateBadge } from './CertificateBadge'
import { getCertificateByInteraction } from '@/lib/api/certificates'
import { Shield } from 'lucide-react'

interface CertificateLinkProps {
  interactionType: 'prospect_journey_complete' | 'intake_session_only'
  interactionId: string
  className?: string
}

/**
 * CertificateLink Component
 * 
 * Automatically fetches and displays certificate badge for an interaction
 * Used on session, lead, and booking detail pages
 */
export function CertificateLink({ 
  interactionType, 
  interactionId,
  className = ''
}: CertificateLinkProps) {
  const { getToken } = useAuth()
  const [certificate, setCertificate] = useState<{ certificate_ref: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCertificate()
  }, [interactionType, interactionId])

  async function loadCertificate() {
    setLoading(true)
    try {
      // Get token from Clerk (client-side)
      const token = await getToken()
      
      if (!token) {
        setLoading(false)
        return
      }

      const cert = await getCertificateByInteraction(interactionType, interactionId, token)
      if (cert) {
        setCertificate({
          certificate_ref: cert.certificate_ref,
          status: cert.status
        })
      }
    } catch (error) {
      // Certificate not found is not an error - just don't show badge
      console.debug('Certificate not found for interaction:', interactionType, interactionId)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null  // Don't show anything while loading
  }

  if (!certificate) {
    return null  // No certificate found - don't show badge
  }

  return (
    <div className={className}>
      <CertificateBadge
        certificateRef={certificate.certificate_ref}
        status={certificate.status as 'pending_confirmation' | 'confirmed' | 'failed'}
      />
    </div>
  )
}

