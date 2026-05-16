'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileCheck, CheckCircle, Clock, Users, FileText, Scale, Search, ExternalLink, Copy, Check, Eye, X, ArrowRight } from 'lucide-react';

// Certificate types from VERIFY service
interface PlatformCertificate {
  certificate_id: string;
  certificate_ref: string;
  interaction_type: string;
  interaction_id: string;
  timestamped_at: string;
  status: string;
  bitcoin_block_height?: number;
  bitcoin_block_hash?: string;
  verification_url: string;
  metadata?: Record<string, any>;
}

// Certificate type display info
const certificateTypeInfo: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  'prospect_journey_complete': {
    label: 'Intake Journey Completed',
    icon: <Users className="h-4 w-4" />,
    description: 'Prospect completed full intake journey',
    color: 'bg-blue-100 text-blue-800'
  },
  'intake_session_only': {
    label: 'Intake Session',
    icon: <Users className="h-4 w-4" />,
    description: 'Intake-only session completed',
    color: 'bg-cyan-100 text-cyan-800'
  },
  'settlement_estimate_generated': {
    label: 'Settlement Estimate',
    icon: <Scale className="h-4 w-4" />,
    description: 'Settlement estimate generated',
    color: 'bg-purple-100 text-purple-800'
  },
  'draft_finalized': {
    label: 'Draft Validated',
    icon: <FileText className="h-4 w-4" />,
    description: 'Document validation completed',
    color: 'bg-green-100 text-green-800'
  }
};

export default function VerifyPage() {
  const [certificates, setCertificates] = useState<PlatformCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<PlatformCertificate | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mock API key - in production, get from subscription
  const apiKey = 'mock-verify-api-key';

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      // Mock data - platform-generated certificates
      setCertificates([
        {
          certificate_id: 'cert-001',
          certificate_ref: 'TV-2026-00001',
          interaction_type: 'prospect_journey_complete',
          interaction_id: 'intake-12345',
          timestamped_at: '2026-02-15T10:30:00Z',
          status: 'confirmed',
          bitcoin_block_height: 823451,
          verification_url: 'https://verify.truevow.law/TV-2026-00001',
          metadata: {
            practice_area: 'Personal Injury',
            lead_grade: 'A',
            qualification_score: 92,
            jurisdiction: 'California'
          }
        },
        {
          certificate_id: 'cert-002',
          certificate_ref: 'TV-2026-00002',
          interaction_type: 'settlement_estimate_generated',
          interaction_id: 'estimate-67890',
          timestamped_at: '2026-02-14T14:22:00Z',
          status: 'confirmed',
          bitcoin_block_height: 823420,
          verification_url: 'https://verify.truevow.law/TV-2026-00002',
          metadata: {
            practice_area: 'Workers Compensation',
            jurisdiction: 'Texas',
            state: 'TX',
            bucketed_range: { low: 25000, mid: 50000, high: 75000 }
          }
        },
        {
          certificate_id: 'cert-003',
          certificate_ref: 'TV-2026-00003',
          interaction_type: 'draft_finalized',
          interaction_id: 'doc-settlement-001',
          timestamped_at: '2026-02-13T09:15:00Z',
          status: 'confirmed',
          bitcoin_block_height: 823380,
          verification_url: 'https://verify.truevow.law/TV-2026-00003',
          metadata: {
            document_type: 'Settlement Agreement',
            validation_status: 'passed',
            compliance_level: 'compliant',
            validation_score: 98
          }
        },
        {
          certificate_id: 'cert-004',
          certificate_ref: 'TV-2026-00004',
          interaction_type: 'intake_session_only',
          interaction_id: 'session-98765',
          timestamped_at: '2026-02-12T16:45:00Z',
          status: 'confirmed',
          bitcoin_block_height: 823350,
          verification_url: 'https://verify.truevow.law/TV-2026-00004',
          metadata: {
            practice_area: 'Family Law',
            qualification_score: 78,
            final_state: 'qualified'
          }
        },
        {
          certificate_id: 'cert-005',
          certificate_ref: 'TV-2026-00005',
          interaction_type: 'prospect_journey_complete',
          interaction_id: 'intake-54321',
          timestamped_at: '2026-02-11T11:20:00Z',
          status: 'confirmed',
          bitcoin_block_height: 823310,
          verification_url: 'https://verify.truevow.law/TV-2026-00005',
          metadata: {
            practice_area: 'Car Accident',
            lead_grade: 'B+',
            qualification_score: 85,
            jurisdiction: 'Florida'
          }
        }
      ]);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTypeInfo = (type: string) => {
    return certificateTypeInfo[type] || { 
      label: type, 
      icon: <FileCheck className="h-4 w-4" />, 
      description: type,
      color: 'bg-gray-100 text-gray-800'
    };
  };

  // Get the link to view the original event that generated this certificate
  const getEventLink = (cert: PlatformCertificate): { href: string; label: string; service: string } | null => {
    switch (cert.interaction_type) {
      case 'prospect_journey_complete':
      case 'intake_session_only':
        // Link to INTAKE service - intake details page
        return {
          href: `/dashboard/intake?session=${cert.interaction_id}`,
          label: 'View Intake Session',
          service: 'INTAKE'
        };
      case 'settlement_estimate_generated':
        // Link to SETTLE service - query page with the estimate
        return {
          href: `/dashboard/settle/query?estimate=${cert.interaction_id}`,
          label: 'View Settlement Estimate',
          service: 'SETTLE'
        };
      case 'draft_finalized':
        // Link to DRAFT service - validation page
        return {
          href: `/dashboard/draft/validate?document=${cert.interaction_id}`,
          label: 'View Document Validation',
          service: 'DRAFT'
        };
      default:
        return null;
    }
  };

  const handleViewClick = (cert: PlatformCertificate) => {
    setSelectedCert(cert);
    setViewModalOpen(true);
  };

  const closeModal = () => {
    setViewModalOpen(false);
    setSelectedCert(null);
  };

  // Generate OpenTimestamps verification info
  const getOpenTimestampsInfo = (cert: PlatformCertificate) => {
    return {
      certificateRef: cert.certificate_ref,
      // Direct verification via OpenTimestamps calendar
      verificationInfo: `Certificate: ${cert.certificate_ref}\nTimestamp: ${cert.timestamped_at}\nBitcoin Block: ${cert.bitcoin_block_height}\nHash: ${cert.bitcoin_block_hash || 'N/A'}`,
      // The .ots proof would be hosted at our CDN
      otsProofUrl: `https://certs.truevow.law/${cert.certificate_ref}.ots`,
      // JSON metadata URL
      jsonUrl: `https://certs.truevow.law/${cert.certificate_ref}.json`
    };
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">VERIFY Service</h1>
          <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
            Oakwood Law Firm
          </span>
        </div>
        <p className="mt-2 text-gray-600">
          Blockchain certificates for platform events - automatically generated when intake sessions complete, 
          settlement estimates are generated, or documents are validated.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">How VERIFY Certificates Work</h3>
            <p className="text-sm text-blue-800 mt-1">
              Certificates are automatically generated by the TrueVow platform when:
            </p>
            <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
              <li>A prospect completes an intake journey</li>
              <li>A settlement estimate is generated</li>
              <li>A document is validated through DRAFT</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              Each certificate is anchored to the Bitcoin blockchain using OpenTimestamps, 
              providing immutable proof that can be independently verified by anyone.
            </p>
          </div>
        </div>
      </div>

      {/* Certificate List Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Certificate History</h2>
          <p className="text-sm text-gray-500 mt-1">
            {certificates.length} certificates generated
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificate #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bitcoin Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {certificates.map((cert) => {
                  const typeInfo = getTypeInfo(cert.interaction_type);
                  return (
                    <tr key={cert.certificate_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {cert.certificate_ref}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cert.timestamped_at).toLocaleDateString()} &nbsp;
                        {new Date(cert.timestamped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        #{cert.bitcoin_block_height?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewClick(cert)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No certificates yet</p>
            <p className="text-sm">Certificates will appear when platform events occur</p>
          </div>
        )}
      </div>

      {/* Certificate Details Modal */}
      {viewModalOpen && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Certificate Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Reference: <span className="font-mono">{selectedCert.certificate_ref}</span>
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  {selectedCert.status.toUpperCase()}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeInfo(selectedCert.interaction_type).color}`}>
                  {getTypeInfo(selectedCert.interaction_type).icon}
                  {getTypeInfo(selectedCert.interaction_type).label}
                </span>
              </div>

              {/* Timestamp & Blockchain Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Timestamped At</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedCert.timestamped_at).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Bitcoin Block</p>
                  <p className="font-medium text-gray-900">#{selectedCert.bitcoin_block_height?.toLocaleString()}</p>
                </div>
              </div>

              {/* Metadata */}
              {selectedCert.metadata && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Event Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {Object.entries(selectedCert.metadata).map(([key, value]) => (
                        <div key={key} className="col-span-1">
                          <dt className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}

              {/* View Original Event Link */}
              {(() => {
                const eventLink = getEventLink(selectedCert);
                if (!eventLink) return null;
                return (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Original Event</h3>
                          <p className="text-sm text-gray-600">
                            This certificate was generated from a {getTypeInfo(selectedCert.interaction_type).label.toLowerCase()} event
                          </p>
                        </div>
                      </div>
                      <Link
                        href={eventLink.href}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {eventLink.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Blockchain Verification Hash */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Blockchain Verification Hash</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">SHA-256 Hash</span>
                    <button
                      onClick={() => copyToClipboard(selectedCert.bitcoin_block_hash || '', 'hash')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedField === 'hash' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-green-400 break-all">
                    {selectedCert.bitcoin_block_hash || 'Pending confirmation'}
                  </p>
                </div>
              </div>

              {/* Independent Verification Section */}
              <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary-100 p-2">
                    <ShieldCheck className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Independent Verification</h3>
                    <p className="text-sm text-gray-600 mt-1 mb-4">
                      Copy this certificate reference and share with clients or third parties. 
                      They can verify independently using OpenTimestamps.
                    </p>
                    
                    <div className="space-y-3">
                      {/* Certificate Reference - for OpenTimestamps */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Certificate Reference</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 font-mono text-sm">
                            {selectedCert.certificate_ref}
                          </code>
                          <button
                            onClick={() => copyToClipboard(selectedCert.certificate_ref, 'ref')}
                            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            {copiedField === 'ref' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Verification Instructions */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">How to verify independently:</p>
                        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                          <li>Visit <span className="font-mono">opentimestamps.org</span></li>
                          <li>Download the .ots proof file (if available)</li>
                          <li>Or verify using the certificate reference and timestamp</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Verification Notice */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-200 p-2">
            <ExternalLink className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Independent Public Verification</h3>
            <p className="text-sm text-gray-500">
              Third parties can verify certificates independently using OpenTimestamps at{' '}
              <span className="font-medium">opentimestamps.org</span>. This ensures credibility - 
              verification happens directly against the Bitcoin blockchain, independent of TrueVow systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
