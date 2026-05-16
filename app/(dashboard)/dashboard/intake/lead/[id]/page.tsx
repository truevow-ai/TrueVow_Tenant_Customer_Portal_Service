'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, MessageSquare, Clock, CheckCircle, CheckCircle2, User, Edit, Trash2, Star, Shield, PlayCircle, FileAudio, AlertCircle, Volume2, Lock, XCircle, Info, Copy, Plus, Tag, Send, Loader2 } from 'lucide-react';
import { TokenizedSummaryCard } from '@/components/intake/TokenizedSummaryCard';
import { IntakeSignalPanel } from '@/components/intake/IntakeSignalPanel';
import { IntakeResponse, isUnlockAvailable, getQuestionLabel, getResponseLabel } from '@/lib/utils/case-scoring';
import { useTenantDev } from '@/hooks/useTenant';
import { track } from '@/lib/analytics/track';
import { Events } from '@/lib/analytics/events';

interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  status: string;
  practice_area_code: string | null;
  lead_score: number | null;
  lead_grade: string | null;
  is_qualified: boolean | null;
  created_at: string;
  session_id: string | null;
  twilio_call_sid: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_url: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  booking_date: string | null;
  answers?: IntakeResponse[];
}

interface LeadNote {
  id: string;
  text: string;
  timestamp: string;
}

interface SmsMessage {
  id: string;
  direction: 'outbound' | 'inbound';
  text: string;
  timestamp: string;
  twilio_sid?: string;
}

const WORKFLOW_TAGS = [
  { id: 'follow_up_required', label: 'Follow-Up Required', activeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300' },
  { id: 'hot_lead',           label: 'Hot Lead',           activeClass: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300' },
  { id: 'do_not_call',        label: 'Do Not Call',        activeClass: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400' },
  { id: 'sms_preferred',      label: 'SMS Preferred',      activeClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-300' },
  { id: 'awaiting_docs',      label: 'Awaiting Docs',      activeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300' },
  { id: 'rebook_needed',      label: 'Rebook Needed',      activeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300' },
];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showEconomicInfo, setShowEconomicInfo] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  // Communication state
  const [callState, setCallState]     = useState<'idle' | 'calling' | 'initiated' | 'failed'>('idle');
  const [callError, setCallError]     = useState<string | null>(null);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsThread, setSmsThread]     = useState<SmsMessage[]>([]);
  const [smsText, setSmsText]         = useState('');
  const [smsSending, setSmsSending]   = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      // Wait for tenant context to load
      if (tenantLoading) return;
      
      if (!tenantId) {
        setError(tenantError || 'No tenant context available. Please log in.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch(`/api/intake/leads/${leadId}?tenant_id=${tenantId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch lead');
        }
        
        const data = await response.json();
        setLead(data.lead);
      } catch (err) {
        console.error('Error fetching lead:', err);
        setError('Failed to load lead details');
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLead();
    }
  }, [leadId, tenantId, tenantLoading, tenantError]);

  // Handle unlock
  const handleUnlock = async () => {
    if (!lead || unlocking) return;
    if (!tenantId) return;
    
    setUnlocking(true);
    try {
      const response = await fetch(`/api/intake/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLead(prev => prev ? { ...prev, unlocked_at: data.unlocked_at } : null);
        Events.leadUnlocked({ tenant_id: tenantId ?? undefined, lead_id: leadId });
      } else {
        Events.leadUnlockFailed({ tenant_id: tenantId ?? undefined, lead_id: leadId, reason: `status_${response.status}` });
      }
    } catch (err) {
      console.error('Failed to unlock lead:', err);
      Events.leadUnlockFailed({ tenant_id: tenantId ?? undefined, lead_id: leadId, reason: 'network_error' });
    } finally {
      setUnlocking(false);
    }
  };

  // Handle status update (attorney manual action)
  const handleSaveNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed || !tenantId) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/intake/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, note: { text: trimmed } }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        setNoteText('');
        Events.leadNoteAdded({ tenant_id: tenantId ?? undefined, lead_id: leadId });
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!lead || !tenantId) return;
    
    try {
      const response = await fetch(`/api/intake/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, status: newStatus }),
      });
      
      if (response.ok) {
        Events.leadStatusChanged({
          tenant_id: tenantId ?? undefined,
          lead_id: leadId,
          from_status: lead?.status,
          to_status: newStatus,
        });
        if (newStatus === 'scheduled') {
          Events.consultScheduled({ tenant_id: tenantId ?? undefined, lead_id: leadId, scheduled_at: new Date().toISOString() });
          // Register reminder cadence with SaaS Admin (fire-and-forget; graceful fail)
          fetch(`/api/intake/leads/${leadId}/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_id: tenantId,
              consultation_date: lead.booking_date,
              phone: lead.phone,
              email: lead.email,
            }),
          }).catch(() => {});
        }
        if (newStatus === 'no_show') Events.consultNoShow({ tenant_id: tenantId ?? undefined, lead_id: leadId });
        if (newStatus === 'consult_completed') Events.consultCompleted({ tenant_id: tenantId ?? undefined, lead_id: leadId });
        if (newStatus === 'retained') Events.leadClosedRetained({ tenant_id: tenantId ?? undefined, lead_id: leadId });
        if (newStatus === 'lost') Events.leadClosedLost({ tenant_id: tenantId ?? undefined, lead_id: leadId });
        setLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Format duration in minutes and seconds
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format booking date with day of week and time
  const formatBookingDate = (dateString: string | null) => {
    if (!dateString) return 'Date/Time: Not specified';
    const date = new Date(dateString);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dayOfWeek}, ${formattedDate} • ${time}`;
  };

  // Track lead_opened when lead is successfully loaded
  useEffect(() => {
    if (!lead || !tenantId) return;
    track('lead_opened', 'LEAD', {
      tenant_id: tenantId,
      lead_id:   lead.lead_id,
      metadata:  { practice_area: lead.practice_area_code, lead_score: lead.lead_score },
    });
    Events.leadDetailViewed({
      tenant_id: tenantId ?? undefined,
      lead_id:   lead.lead_id,
      lead_grade: lead.lead_grade,
      lead_score: lead.lead_score,
    });
    const isHighValue = (lead.lead_score != null && lead.lead_score >= 70) ||
      lead.lead_grade === 'A' || lead.lead_grade === 'B';
    if (isHighValue) {
      track('high_value_case_flagged', 'INTAKE', {
        tenant_id: tenantId,
        lead_id:   lead.lead_id,
        metadata:  { lead_score: lead.lead_score, lead_grade: lead.lead_grade },
      });
    }
  }, [lead, tenantId]);

  // Load notes from API after mount (server-side, cross-device)
  useEffect(() => {
    if (!leadId || !tenantId) return;
    fetch(`/api/intake/leads/${leadId}/notes?tenant_id=${tenantId}`)
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => setNotes(data.notes || []))
      .catch(() => {});
  }, [leadId, tenantId]);

  // Load workflow tags from localStorage (portal-side only, per-device)
  useEffect(() => {
    if (!leadId) return;
    try {
      const stored = localStorage.getItem(`tv_lead_tags_${leadId}`);
      if (stored) setActiveTags(JSON.parse(stored));
    } catch {}
  }, [leadId]);

  // Load SMS thread when the panel is opened
  useEffect(() => {
    if (!showSmsPanel || !leadId || !tenantId) return;
    fetch(`/api/intake/leads/${leadId}/sms?tenant_id=${tenantId}`)
      .then(r => r.ok ? r.json() : { thread: [] })
      .then(data => setSmsThread(data.thread || []))
      .catch(() => {});
  }, [showSmsPanel, leadId, tenantId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lead details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            {error || 'Lead Not Found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The lead you're looking for doesn't exist or couldn't be loaded.</p>
          <Link href="/dashboard/intake" className="text-primary-600 dark:text-primary-400 hover:underline">
            Back to Intake Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      new: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400', label: 'Awaiting Review' },
      scheduled: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', label: 'Consultation Scheduled' },
      contacted: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', label: 'Contacted' },
      qualified: { color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400', label: 'Intake Qualified' },
      loe_sent: { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400', label: 'LoE Sent' },
      no_show: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400', label: 'No Show' },
      consult_completed: { color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400', label: 'Consult Completed' },
      lost: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300', label: 'Did Not Proceed' },
    };
    return config[status] || config.new;
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-gray-400';
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'A+': 'bg-green-600',
      'B+': 'bg-blue-500',
      'B': 'bg-blue-400',
      'C': 'bg-yellow-500',
      'D': 'bg-red-500',
    };
    return colors[grade] || 'bg-gray-400';
  };

  // Check if this lead has a phone source (call recording)
  const hasCallRecording = !!lead.recording_url;
  const hasTranscription = !!lead.transcription;
  const isUnlocked = !!lead.unlocked_at;
  
  // A+ lead locking: only A+ leads require unlock. A/B/C/D are free.
  const isAPlusLead = (lead.qualification_grade === 'A+' || lead.lead_grade === 'A+');
  const isAboveThreshold = isAPlusLead;
  
  // Transcript access rules:
  // - A+ leads: Available after unlock
  // - A/B/C/D leads: Available by default (free)
  const canAccessTranscript = !isAboveThreshold || isUnlocked;
  
  // Recording access rules: same as transcript
  const canAccessRecording = canAccessTranscript;

  // Recording expires 7 days after lead creation; transcript expires 90 days after
  const callDate = new Date(lead.created_at);
  const recordingExpiryDate = new Date(callDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const transcriptExpiryDate = new Date(callDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isRecordingExpired = hasCallRecording && now > recordingExpiryDate;
  const isTranscriptExpired = hasTranscription && now > transcriptExpiryDate;
  const formatExpiryDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const copyLeadId = () => {
    navigator.clipboard.writeText(lead.lead_id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    });
  };

  const handleToggleTag = (tagId: string) => {
    const isActive = activeTags.includes(tagId);
    const updated = isActive ? activeTags.filter(t => t !== tagId) : [...activeTags, tagId];
    setActiveTags(updated);
    try { localStorage.setItem(`tv_lead_tags_${leadId}`, JSON.stringify(updated)); } catch {}
    if (isActive) {
      Events.leadUntagged({ tenant_id: tenantId ?? undefined, lead_id: leadId, tag: tagId });
    } else {
      Events.leadTagged({ tenant_id: tenantId ?? undefined, lead_id: leadId, tag: tagId });
    }
  };

  // Initiate Twilio call bridge — attorney's phone rings, then bridges to prospect
  const handleInitiateCall = async () => {
    if (!tenantId || !lead) return;
    setCallState('calling');
    setCallError(null);
    Events.contactAttemptedCall({ tenant_id: tenantId ?? undefined, lead_id: leadId });
    try {
      const res = await fetch(`/api/intake/leads/${leadId}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      if (res.ok) {
        setCallState('initiated');
        Events.callStarted({ tenant_id: tenantId ?? undefined, lead_id: leadId });
        setTimeout(() => setCallState('idle'), 7000);
      } else {
        const data = await res.json().catch(() => ({}));
        setCallState('failed');
        setCallError(data.error || 'Call could not be started.');
      }
    } catch {
      setCallState('failed');
      setCallError('Connection error. Please try again.');
    }
  };

  // Send outbound SMS through the portal thread
  const handleSendSms = async () => {
    const trimmed = smsText.trim();
    if (!trimmed || !tenantId) return;
    setSmsSending(true);
    try {
      const res = await fetch(`/api/intake/leads/${leadId}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, message_text: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmsThread(data.thread || []);
        setSmsText('');
        Events.smsSent({ tenant_id: tenantId ?? undefined, lead_id: leadId });
      }
    } catch (err) {
      console.error('Failed to send SMS:', err);
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/intake" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {isAboveThreshold && !isUnlocked
                      ? `Prospect #TV-${lead.lead_id.substring(0, 6).toUpperCase()}`
                      : `${lead.first_name} ${lead.last_name || ''}`}
                  </h1>
                  {lead.lead_grade && (
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getGradeColor(lead.lead_grade)}`}>
                      Grade: {lead.lead_grade}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(lead.status).color}`}>
                    {getStatusConfig(lead.status).label}
                  </span>
                  {isAboveThreshold && !isUnlocked ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Protected
                    </span>
                  ) : isUnlocked ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Shield className="h-3 w-3 inline mr-1" />
                      Unlocked
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  {lead.practice_area_code || 'Unknown Practice Area'} • Lead ID: {lead.lead_id.substring(0, 8)}...
                  <button
                    onClick={copyLeadId}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={`Copy full ID: ${lead.lead_id}`}
                  >
                    {idCopied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {idCopied ? 'Copied' : 'Copy ID'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information - gated by unlock threshold */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border ${
              isAboveThreshold && !isUnlocked
                ? 'border-amber-300 dark:border-amber-600'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
                {isAboveThreshold && !isUnlocked && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-normal">
                    <Lock className="h-3 w-3" /> Protected
                  </span>
                )}
              </h2>
              {isAboveThreshold && !isUnlocked ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-400 dark:text-gray-600 tracking-widest">••••••@••••.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-400 dark:text-gray-600 tracking-widest">+1 (•••) •••-••••</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{lead.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{lead.phone}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Immediate Action Bar — only shown after unlock */}
              {isUnlocked && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {/* Call Bridge — Twilio connects attorney's phone to prospect */}
                    <button
                      type="button"
                      onClick={handleInitiateCall}
                      disabled={callState === 'calling'}
                      className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                        callState === 'initiated'
                          ? 'bg-green-700 text-white'
                          : callState === 'failed'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : callState === 'calling'
                          ? 'bg-amber-500 text-white cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {callState === 'calling'  ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                      {callState === 'calling'   ? 'Connecting...' :
                       callState === 'initiated' ? 'Phone ringing ✓' :
                       callState === 'failed'    ? 'Retry Call' :
                       'Call Prospect'}
                    </button>

                    {/* SMS — toggles in-portal thread */}
                    {lead.phone && (
                      <button
                        type="button"
                        onClick={() => setShowSmsPanel(v => !v)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                          showSmsPanel
                            ? 'bg-violet-700 text-white'
                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {showSmsPanel ? 'Close SMS' : 'Send SMS'}
                      </button>
                    )}

                    {/* Email — opens mailto, logs intent only (no inbox access) */}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={() => Events.emailOpenedClient({ tenant_id: tenantId ?? undefined, lead_id: leadId })}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        <Mail className="h-4 w-4" /> Send Email
                      </a>
                    )}

                    <button
                      onClick={() => router.push('/dashboard/intake/calendar')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      <Calendar className="h-4 w-4" /> Calendar
                    </button>
                  </div>

                  {/* Call state feedback */}
                  {callState === 'initiated' && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Your phone will ring shortly. Answer to connect with the prospect.
                    </p>
                  )}
                  {callState === 'failed' && callError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{callError}</p>
                  )}

                  {/* SMS Thread Panel */}
                  {showSmsPanel && (
                    <div className="border border-border rounded-lg bg-background overflow-hidden">
                      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">SMS Thread</span>
                        <span className="text-xs text-muted-foreground">Messages sent through TrueVow</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto p-3 space-y-2">
                        {smsThread.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No messages yet. Send the first one below.
                          </p>
                        ) : (
                          smsThread.map(msg => (
                            <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                                msg.direction === 'outbound'
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-muted text-card-foreground border border-border'
                              }`}>
                                <p>{msg.text}</p>
                                <p className="text-xs opacity-70 mt-0.5">
                                  {msg.direction === 'outbound' ? 'You' : 'Prospect'}
                                  {' · '}
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-3 border-t border-border flex gap-2">
                        <input
                          type="text"
                          value={smsText}
                          onChange={e => setSmsText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendSms(); } }}
                          placeholder="Type a message..."
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={handleSendSms}
                          disabled={smsSending || !smsText.trim()}
                          className="flex items-center justify-center px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {smsSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attorney Quick View — 5-second case summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Attorney Quick View</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Incident:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.practice_area_code === 'dog_bite' ? 'Dog bite' : 
                     lead.practice_area_code === 'slip_fall' ? 'Slip and fall' : 
                     lead.practice_area_code === 'workplace_injury' ? 'Workplace injury' :
                     lead.practice_area_code === 'product_liability' ? 'Product liability' :
                     'Personal injury'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">When:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.answers?.find(a => a.question_key.includes('Q02_WHEN_OCCURRED'))?.response_value === '1' ? 'Today/Yesterday' :
                     lead.answers?.find(a => a.question_key.includes('Q02_WHEN_OCCURRED'))?.response_value === '2' ? 'Within the past week' :
                     lead.answers?.find(a => a.question_key.includes('Q02_WHEN_OCCURRED'))?.response_value === '3' ? 'Within the past month' :
                     lead.answers?.find(a => a.question_key.includes('Q02_WHEN_OCCURRED'))?.response_value === '4' ? 'More than a month ago' :
                     'Not specified'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Injury:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.answers?.find(a => a.question_key.includes('Q05_INJURY') || a.question_key.includes('Q04_INJURY') || a.question_key.includes('Q08_INJURY'))?.response_value === '1' ? 'Minor' :
                     lead.answers?.find(a => a.question_key.includes('Q05_INJURY') || a.question_key.includes('Q04_INJURY') || a.question_key.includes('Q08_INJURY'))?.response_value === '2' ? 'Moderate' :
                     lead.answers?.find(a => a.question_key.includes('Q05_INJURY') || a.question_key.includes('Q04_INJURY') || a.question_key.includes('Q08_INJURY'))?.response_value === '3' ? 'Severe' :
                     lead.answers?.find(a => a.question_key.includes('Q05_INJURY') || a.question_key.includes('Q04_INJURY') || a.question_key.includes('Q08_INJURY'))?.response_value === '4' ? 'Traumatic brain injury' :
                     'Not specified'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Treatment:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.answers?.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'))?.response_value === '1' ? 'No treatment yet' :
                     lead.answers?.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'))?.response_value === '2' ? 'ER visit' :
                     lead.answers?.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'))?.response_value === '3' ? 'ER + ongoing treatment' :
                     lead.answers?.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'))?.response_value === '4' ? 'Surgery scheduled/planned' :
                     lead.answers?.find(a => a.question_key.includes('Q06_MEDICAL') || a.question_key.includes('Q07_MEDICAL') || a.question_key.includes('Q10_MEDICAL') || a.question_key.includes('Q11_MEDICAL'))?.response_value === '5' ? 'Multiple surgeries' :
                     'Not specified'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Liability:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.answers?.find(a => a.question_key === 'CA_Q04_AT_FAULT')?.response_value === '1' ? 'Other party at fault' :
                     lead.answers?.find(a => a.question_key === 'CA_Q04_AT_FAULT')?.response_value === '2' ? 'Shared fault' :
                     lead.answers?.find(a => a.question_key === 'CA_Q04_AT_FAULT')?.response_value === '3' ? 'Client at fault' :
                     lead.answers?.find(a => a.question_key === 'SF_Q06_PROPERTY_OWNER_AWARENESS')?.response_value ? 'Property owner awareness established' :
                     'To be determined'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Prior Attorney:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.answers?.find(a => a.question_key === 'CONFLICT_Q01_PRIOR_REP')?.response_value === '1' ? 'None' :
                     lead.answers?.find(a => a.question_key === 'CONFLICT_Q01_PRIOR_REP')?.response_value === '2' ? 'Consulted another attorney' :
                     lead.answers?.find(a => a.question_key === 'CONFLICT_Q01_PRIOR_REP')?.response_value === '3' ? 'Previously represented' :
                     'Not specified'}
                  </span>
                </div>
              </div>
              {/* Consultation status — prominent */}
              {lead.booking_date && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Consultation Scheduled</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(lead.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* Structured Intake Summary */}
            {!isUnlocked ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Structured Intake Summary
                </h2>
                <TokenizedSummaryCard
                  lead={lead}
                  responses={lead.answers || []}
                  isUnlocked={false}
                  practiceAreaCode={lead.practice_area_code || undefined}
                  onUnlock={handleUnlock}
                />
                {unlocking && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mx-auto inline-block mr-2"></div>
                    Processing unlock...
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Structured Intake Summary
                </h2>
                <TokenizedSummaryCard
                  lead={lead}
                  responses={lead.answers || []}
                  isUnlocked={true}
                  practiceAreaCode={lead.practice_area_code || undefined}
                  onUnlock={handleUnlock}
                />
              </div>
            )}

            {/* Full Intake Responses */}
            {lead.answers && lead.answers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Full Intake Responses
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Structured responses captured during the Benjamin voice intake.
                </p>
                <div className="space-y-3">
                  {lead.answers.map((answer, idx) => {
                    const questionLabel = getQuestionLabel(answer.question_key);
                    const responseLabel = getResponseLabel(answer.question_key, answer.response_value);
                    return (
                      <div key={idx} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{questionLabel}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{responseLabel}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Call Recording */}
            <div className={`bg-white dark:bg-gray-800 border p-5 ${
              hasCallRecording && isAboveThreshold && !isUnlocked
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Call Recording
              </h2>
              
              {!hasCallRecording ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Recording: Not enabled</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Enable call recording in Settings → Calendar Configuration to capture recordings (7-day retention).
                  </p>
                </div>
              ) : isRecordingExpired ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Recording expired - 7-day retention period has passed</span>
                </div>
              ) : !canAccessRecording ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                  <span>Recording available after unlock</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Enabled
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>Expires {formatExpiryDate(recordingExpiryDate)}</span>
                    {lead.recording_duration && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Duration: {formatDuration(lead.recording_duration)}
                        </span>
                      </>
                    )}
                  </div>
                  <audio
                    controls
                    className="w-full"
                    src={lead.recording_url || undefined}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div className={`bg-white dark:bg-gray-800 border p-5 ${
              hasTranscription && isAboveThreshold && !isUnlocked
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Transcript
              </h2>
              
              {!hasTranscription ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>Transcription: Not enabled</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Enable transcription in Settings → Calendar Configuration. Transcripts are available for 90 days (opt-in required).
                  </p>
                </div>
              ) : isTranscriptExpired ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Transcript expired - 90-day retention period has passed</span>
                </div>
              ) : !canAccessTranscript ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                  <span>Transcript available after unlock</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Enabled
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>Expires {formatExpiryDate(transcriptExpiryDate)}</span>
                  </div>
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
                  >
                    {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                  </button>
                  {showTranscript && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {lead.transcription}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Lead Created</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
                {lead.session_id && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Intake Session Completed</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Session ID: {lead.session_id.substring(0, 8)}...</p>
                      {lead.duration_seconds && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Duration: {formatDuration(lead.duration_seconds)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            {/* Lead Source */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Source</h2>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {lead.twilio_call_sid ? (
                    <Phone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {lead.twilio_call_sid ? 'Incoming call handled by Benjamin' : 'Website Form'}
                  </p>
                  {lead.duration_seconds && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Call duration: {formatDuration(lead.duration_seconds)}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Intake completed: {formatDate(lead.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Status Control - Attorney Only */}
            <div className="bg-card rounded-lg shadow p-6 border border-border">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Update Status</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Record the current stage of your engagement with this prospect.
              </p>
              <div className="space-y-2">
                {/* Consultation Scheduled */}
                {lead.status === 'scheduled' ? (
                  <button
                    onClick={() => router.push('/dashboard/intake/calendar')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left border border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-colors hover:bg-green-100 dark:hover:bg-green-900/50"
                  >
                    <Calendar className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="font-medium">Consultation Scheduled</span>
                      {lead.booking_date ? (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {formatBookingDate(lead.booking_date)}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Date/Time: Not yet specified
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-green-500 dark:text-green-400 ml-auto shrink-0">View Calendar →</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusUpdate('scheduled')}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left border border-border hover:bg-muted text-card-foreground rounded-lg transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <div className="flex-1">
                      <span className="font-medium">Schedule Consultation</span>
                      <p className="text-xs text-muted-foreground">Mark consultation as booked</p>
                    </div>
                  </button>
                )}
                {/* No-Show and Completed — only shown when a consult is scheduled */}
                {lead.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('no_show')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left border border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <div className="flex-1">
                        <span className="font-medium">Mark No-Show</span>
                        <p className="text-xs text-orange-600 dark:text-orange-400">Prospect did not attend — triggers rebook follow-up</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('consult_completed')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left border border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <div className="flex-1">
                        <span className="font-medium">Mark Consultation Completed</span>
                        <p className="text-xs text-teal-600 dark:text-teal-400">Consultation took place successfully</p>
                      </div>
                    </button>
                  </>
                )}
                {/* Qualified */}
                <button
                  onClick={() => handleStatusUpdate('qualified')}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left border rounded-lg transition-colors ${
                    lead.status === 'qualified'
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'border-border hover:bg-muted text-card-foreground'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Intake Qualified</span>
                    <p className="text-xs text-muted-foreground">Prospect requested LoE or callback - no consult scheduled</p>
                  </div>
                </button>
                {/* Converted / Retained */}
                <button
                  onClick={() => handleStatusUpdate('converted')}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left border rounded-lg transition-colors ${
                    lead.status === 'converted'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      : 'border-border hover:bg-muted text-card-foreground'
                  }`}
                >
                  <Star className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Retained - Signed Retainer</span>
                    <p className="text-xs text-muted-foreground">Attorney–client relationship established</p>
                  </div>
                </button>
                {/* Lost */}
                <button
                  onClick={() => handleStatusUpdate('lost')}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left border rounded-lg transition-colors ${
                    lead.status === 'lost'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'border-border hover:bg-muted text-card-foreground'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  <div>
                    <span className="font-medium">Did Not Proceed</span>
                    <p className="text-xs text-muted-foreground">Prospect declined or no response after 2+ follow-ups</p>
                  </div>
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Status guide:</strong><br/>
                  Scheduled → consultation booked<br/>
                  Qualified → prospect declined consult but requested LoE or callback<br/>
                  Retained → signed retainer agreement<br/>
                  Did Not Proceed → rejected or no response
                </p>
              </div>
            </div>
          {/* Signal Layer — deterministic intake signals */}
            <IntakeSignalPanel
              responses={lead.answers || []}
              practiceAreaCode={lead.practice_area_code}
              durationSeconds={lead.duration_seconds}
              phone={lead.phone}
            />

            {/* Workflow Tags */}
            <div className="bg-card rounded-lg shadow p-5 border border-border">
              <h2 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Workflow Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_TAGS.map(tag => {
                  const isActive = activeTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isActive
                          ? `${tag.activeClass}`
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {isActive ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attorney Notes */}
            <div className="bg-card rounded-lg shadow p-5 border border-border">
              <h2 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                My Notes
              </h2>
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNote();
                  }}
                  placeholder="Add a private note about this lead..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Notes are for scheduling and follow-up only. Do not include privileged communications, medical details, or case strategy.
                </p>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || noteSaving}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Note
                </button>
                {notes.length > 0 && (
                  <div className="space-y-2 mt-1 max-h-64 overflow-y-auto">
                    {notes.map(note => (
                      <div key={note.id} className="rounded-lg bg-muted px-3 py-2">
                        <p className="text-sm text-card-foreground whitespace-pre-wrap">{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.timestamp).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
