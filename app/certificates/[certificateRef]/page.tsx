'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { CertificateBadge } from '@/components/certificates/CertificateBadge'
import { getCertificate, type Certificate } from '@/lib/api/certificates'
import { 
  Shield,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Calendar,
  ArrowLeft,
  Copy,
} from 'lucide-react'

export default function CertificateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const certificateRef = params.certificateRef as string
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (certificateRef) {
      loadCertificate()
    }
  }, [certificateRef])

  async function loadCertificate() {
    setLoading(true)
    setError(null)
    try {
      // Get token from Clerk (client-side)
      const token = await getToken()
      
      if (!token) {
        throw new Error('Not authenticated')
      }

      const data = await getCertificate(certificateRef, token)
      setCertificate(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load certificate')
      console.error('Error loading certificate:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Certificates
        </button>
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Certificate Not Found</h2>
          <p className="text-gray-600">{error || 'The certificate you are looking for does not exist.'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Certificate Details</h1>
            <p className="mt-1 text-sm text-gray-600">Blockchain-verified interaction certificate</p>
          </div>
        </div>
        <CertificateBadge
          certificateRef={certificate.certificate_ref}
          status={certificate.status}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Certificate Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Certificate Information
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Certificate Reference</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-900">{certificate.certificate_ref}</span>
                  <button
                    onClick={() => copyToClipboard(certificate.certificate_ref)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {copied && <span className="text-xs text-green-600">Copied!</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Interaction Type</dt>
                <dd className="text-sm text-gray-900 capitalize">
                  {certificate.interaction_type.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Interaction ID</dt>
                <dd className="text-sm font-mono text-gray-900">{certificate.interaction_id}</dd>
              </div>
              {certificate.session_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Session ID</dt>
                  <dd className="text-sm font-mono text-gray-900">{certificate.session_id}</dd>
                </div>
              )}
              {certificate.lead_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Lead ID</dt>
                  <dd className="text-sm font-mono text-gray-900">{certificate.lead_id}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Timestamped At</dt>
                <dd className="text-sm text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(certificate.timestamped_at)}
                </dd>
              </div>
              {certificate.verified_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Verified At</dt>
                  <dd className="text-sm text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {formatDate(certificate.verified_at)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Blockchain Information */}
          {certificate.bitcoin_block_height && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Blockchain Confirmation
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Bitcoin Block Height</dt>
                  <dd className="text-sm font-mono text-gray-900">
                    {certificate.bitcoin_block_height.toLocaleString()}
                  </dd>
                </div>
                {certificate.bitcoin_block_hash && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Block Hash</dt>
                    <dd className="text-sm font-mono text-gray-900 break-all">
                      {certificate.bitcoin_block_hash}
                    </dd>
                  </div>
                )}
                {certificate.bitcoin_block_hash && (
                  <div>
                    <a
                      href={`https://blockstream.info/block/${certificate.bitcoin_block_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Blockchain Explorer
                    </a>
                  </div>
                )}
              </dl>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Verification Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Verification
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Download the OpenTimestamps proof file to verify this certificate independently.
                </p>
                {certificate.download_ots_url && (
                  <a
                    href={certificate.download_ots_url}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download .ots File
                  </a>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Public Verification URL</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={certificate.verification_url}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => copyToClipboard(certificate.verification_url)}
                    className="p-2 text-gray-600 hover:text-gray-900"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={certificate.verification_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-gray-900"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this URL with external authorities for independent verification
                </p>
              </div>
            </div>
          </Card>

          {/* Zero-Knowledge Notice */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Zero-Knowledge Architecture
                </p>
                <p className="text-xs text-blue-700">
                  This certificate contains no personally identifiable information (PII). 
                  Only interaction metadata is stored and verified on the blockchain.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

