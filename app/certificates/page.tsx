'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { CertificateBadge } from '@/components/certificates/CertificateBadge'
import { getCertificates, type Certificate } from '@/lib/api/certificates'
import { 
  Shield,
  Search,
  Filter,
  Download,
  ExternalLink,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    interaction_type: '',
    from_date: '',
    to_date: '',
  })
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadCertificates()
  }, [currentPage, filters])

  const { getToken } = useAuth()

  async function loadCertificates() {
    setLoading(true)
    setError(null)
    try {
      // Get token from Clerk (client-side)
      const token = await getToken()
      
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await getCertificates(
        {
          ...filters,
          limit: pageSize,
          offset: currentPage * pageSize
        },
        token
      )
      setCertificates(response.certificates)
      setTotal(response.total)
    } catch (err: any) {
      setError(err.message || 'Failed to load certificates')
      console.error('Error loading certificates:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Blockchain Certificates</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and verify your blockchain-verified interaction certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">{total} certificates</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interaction Type
            </label>
            <select
              value={filters.interaction_type}
              onChange={(e) => {
                setFilters({ ...filters, interaction_type: e.target.value })
                setCurrentPage(0)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="prospect_journey_complete">Prospect Journey</option>
              <option value="intake_session_only">Intake Session</option>
              <option value="settlement_estimate_generated">Settlement Estimate</option>
              <option value="draft_finalized">Draft Document</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => {
                setFilters({ ...filters, from_date: e.target.value })
                setCurrentPage(0)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => {
                setFilters({ ...filters, to_date: e.target.value })
                setCurrentPage(0)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading certificates...</p>
        </div>
      )}

      {/* Certificates List */}
      {!loading && !error && (
        <>
          {certificates.length === 0 ? (
            <Card className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Found</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(f => f) 
                  ? 'Try adjusting your filters'
                  : 'Certificates will appear here once interactions are completed'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {certificates.map((certificate) => (
                <Card key={certificate.certificate_ref} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <CertificateBadge
                          certificateRef={certificate.certificate_ref}
                          status={certificate.status}
                        />
                        <span className="text-sm font-mono text-gray-500">
                          {certificate.certificate_ref}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2 capitalize">
                        {certificate.interaction_type.replace(/_/g, ' ')}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(certificate.timestamped_at)}
                        </span>
                        {certificate.bitcoin_block_height && (
                          <span className="text-green-600">
                            ✓ Block {certificate.bitcoin_block_height.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/certificates/${certificate.certificate_ref}`}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Details
                      </Link>
                      {certificate.download_ots_url && (
                        <a
                          href={certificate.download_ots_url}
                          download
                          className="p-2 text-gray-600 hover:text-gray-900"
                          title="Download .ots file"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      )}
                      <a
                        href={certificate.verification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Public verification URL"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-600">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

