'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Clock, Settings, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTenantDev } from '@/hooks/useTenant'

interface Attorney {
  attorney_id: string
  first_name: string
  last_name: string
  email: string
  calendar_feed_url: string | null
  calendar_provider: string | null
  is_lead_attorney: boolean
}

interface RoutingConfig {
  tenant_id: string
  routing_mode: string
  max_cases_per_day: number
}

export default function CalendarConfigPage() {
  const { tenantId, isLoading: tenantLoading } = useTenantDev()

  const [attorneys, setAttorneys] = useState<Attorney[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routingConfig, setRoutingConfig] = useState<RoutingConfig | null>(null)

  const [routingMode, setRoutingMode] = useState('hybrid')
  const [maxCasesPerDay, setMaxCasesPerDay] = useState(8)
  const [practiceAreaAssignments] = useState<Record<string, string[]>>({})
  const [timeSlotPreferences] = useState<Record<string, { morning: boolean; afternoon: boolean; evening: boolean }>>({})

  useEffect(() => {
    const loadConfig = async () => {
      if (tenantLoading || !tenantId) return
      try {
        const res = await fetch(`/api/calendar/config?tenantId=${encodeURIComponent(tenantId)}`)
        if (!res.ok) throw new Error('Failed to load')
        const body = await res.json()
        setAttorneys(body.attorneys || [])
        if (body.routingConfig) {
          setRoutingConfig(body.routingConfig)
          setRoutingMode(body.routingConfig.routing_mode || 'hybrid')
          setMaxCasesPerDay(body.routingConfig.max_cases_per_day || 8)
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load calendar config')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [tenantId, tenantLoading])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/calendar/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          routingMode,
          practiceAreaAssignments,
          timeSlotPreferences,
          maxCasesPerDay,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      toast.success('Calendar configuration saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (tenantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/intake" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4">
          <ArrowLeft size={20} />
          Back to INTAKE Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Calendar Configuration</h1>
        <p className="mt-2 text-gray-600">
          Configure how Benjamin books consultations based on practice areas, attorneys, and time preferences
        </p>
      </div>

      {/* Routing Method */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Booking Routing Method</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose how Benjamin assigns consultations when multiple attorneys are available
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: 'round_robin', label: 'Round Robin', desc: 'Distribute evenly across attorneys' },
            { value: 'calendar', label: 'Calendar', desc: 'Check attorney availability' },
            { value: 'specialization', label: 'Specialization', desc: 'Route by attorney specialization' },
            { value: 'hybrid', label: 'Hybrid', desc: 'Specialization first, then round-robin' },
          ].map((option) => (
            <label
              key={option.value}
              className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                routingMode === option.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="routing"
                value={option.value}
                checked={routingMode === option.value}
                onChange={(e) => setRoutingMode(e.target.value)}
                className="text-primary-600"
              />
              <div>
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-600">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Max cases per attorney per day</label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxCasesPerDay}
            onChange={(e) => setMaxCasesPerDay(Number(e.target.value))}
            className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {/* Attorneys */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Attorneys</h2>
        </div>
        {attorneys.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No attorneys configured</p>
            <p className="text-sm text-gray-400">
              Attorneys are configured during the onboarding process. Contact your TrueVow CSM to add attorneys.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attorneys.map((attorney) => (
              <div key={attorney.attorney_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">
                    {attorney.first_name} {attorney.last_name}
                  </p>
                  {attorney.is_lead_attorney && (
                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">Lead</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{attorney.email}</p>
                <div className="mt-2">
                  {attorney.calendar_provider ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded capitalize">
                      {attorney.calendar_provider.replace('_', ' ')} connected
                    </span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      No calendar connected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Slots */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Time Slot Preferences</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set preferred consultation times for each attorney. Benjamin will only book consultations during available time slots.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {['morning', 'afternoon', 'evening'].map((slot) => {
            const labels: Record<string, string> = { morning: 'Morning (8am-12pm)', afternoon: 'Afternoon (12pm-5pm)', evening: 'Evening (5pm-8pm)' }
            return (
              <div key={slot} className="border border-gray-200 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">{labels[slot]}</p>
                <p className="text-xs text-gray-500">
                  Configured per attorney via their calendar availability. Benjamin checks connected calendars
                  automatically before booking.
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-4">
        <Link
          href="/dashboard/intake"
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save size={20} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Benjamin will only book consultations with attorneys who have available time slots in their
          connected calendars. Calendar availability is checked in real-time when the routing mode is set to "Calendar".
        </p>
      </div>
    </div>
  )
}
