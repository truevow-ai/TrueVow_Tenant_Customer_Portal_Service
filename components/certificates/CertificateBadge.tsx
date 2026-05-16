'use client'

import Link from 'next/link'
import { Shield, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface CertificateBadgeProps {
  certificateRef: string
  status: 'pending_confirmation' | 'confirmed' | 'failed'
  interactionType?: string
  interactionId?: string
  className?: string
}

export function CertificateBadge({
  certificateRef,
  status,
  className = ''
}: CertificateBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: CheckCircle,
          label: 'Verified'
        }
      case 'pending_confirmation':
        return {
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: Clock,
          label: 'Pending'
        }
      case 'failed':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: AlertTriangle,
          label: 'Failed'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Shield,
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Link
      href={`/certificates/${certificateRef}`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 ${config.color} ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
      <Shield className="h-3 w-3 opacity-60" />
    </Link>
  )
}

