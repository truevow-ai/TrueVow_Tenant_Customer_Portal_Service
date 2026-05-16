'use client';

import { Events } from '@/lib/analytics/events';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Search, Calendar, Filter, X, Eye, Phone, FileText, AlertCircle, Lock, ShieldCheck, Clock, User, TrendingUp, AlertTriangle, PhoneCall, ArrowRight, Flame, MessageSquare, Download } from 'lucide-react';
import { TokenizedSummaryCard, ViabilityTierBadge, maskProspectId, getReservationSecondsRemaining, formatCountdown } from '@/components/intake/TokenizedSummaryCard';
import { calculateEconomicStrengthScore, IntakeResponse, LeadForScoring, isUnlockAvailable } from '@/lib/utils/case-scoring';
import { useTenantDev } from '@/hooks/useTenant';

// Types for leads from database
interface LeadFromAPI {
  lead_id: string;
  tenant_id: string;
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
  answers?: IntakeResponse[];
  /**
   * Layer 2 intelligence: pre-computed by SaaS Admin Recommendation Engine.
   * Present when SaaS Admin enriched API is reachable; absent on fallback path.
   */
  recommendation?: {
    priority: 'call_now' | 'follow_up' | 'low';
    sub?: string;
    href?: string;
  } | null;
}

// Internal lead type with UI fields
interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  status: string;
  source: string;
  practice_area: string;
  sub_practice_area: string;
  qualification_grade: string;
  qualification_score: number;
  created_at: string;
  last_contact: string | null;
  notes: string;
  booking_date: string | null;
  session_id: string | null;
  twilio_call_sid: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_url: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  answers?: IntakeResponse[];
  // Fields required by LeadForScoring
  lead_score: number | null;
  lead_grade: string | null;
  practice_area_code: string | null;
  /**
   * Layer 2 intelligence: pre-computed by SaaS Admin Recommendation Engine.
   * Present when SaaS Admin enriched API is reachable; absent on fallback path.
   */
  recommendation?: {
    priority: 'call_now' | 'follow_up' | 'low';
    sub?: string;
    href?: string;
  } | null;
}

// Seed data removed - all data comes from API
// HARD REQUIREMENT: All 5 core fields must be complete for unlock (Liability, Treatment, Jurisdiction, Incident Date, Injury)

// Helper function to convert qualification score to viability band (4 tiers)
function scoreToBand(score: number): 0 | 1 | 2 | 3 {
  if (score >= 70) return 3; // Strong
  if (score >= 50) return 2; // Moderate
  if (score >= 30) return 1; // Limited
  return 0; // Low
}

// ── Behavioral intelligence helpers ──────────────────────────────────────────

type ActionLevel = 'call_now' | 'follow_up' | 'low';

function getActionPriority(lead: Lead): { level: ActionLevel; label: string } {
  // Layer 2 preferred: SaaS Admin Recommendation Engine output
  if (lead.recommendation?.priority) {
    const p = lead.recommendation.priority;
    const labels: Record<ActionLevel, string> = { call_now: 'Call Now', follow_up: 'Follow Up', low: 'Low Priority' };
    return { level: p, label: labels[p] };
  }
  // FALLBACK: local heuristic using intake signals (acceptable when SaaS Admin unavailable)
  const ageMin = (Date.now() - new Date(lead.created_at).getTime()) / 60000;
  const score = lead.lead_score ?? lead.qualification_score ?? 0;
  const isHighScore = score >= 70 || ['A', 'A+', 'B', 'B+'].includes(lead.lead_grade ?? '');
  const isNew = lead.status === 'new';
  const isScheduled = lead.status === 'scheduled';
  const isQualified = lead.status === 'qualified';
  if (isNew && isHighScore && ageMin > 30) return { level: 'call_now', label: 'Call Now' };
  if (isNew && ageMin > 15) return { level: 'follow_up', label: 'Follow Up' };
  if (isNew) return { level: 'follow_up', label: 'Follow Up' };
  if (isScheduled) return { level: 'follow_up', label: 'Consult Booked' };
  if (isQualified) return { level: 'follow_up', label: 'Intake Qualified' };
  return { level: 'low', label: 'Low Priority' };
}

function getContactStatus(lead: Lead): 'called' | 'voicemail' | 'none' {
  const d = lead.duration_seconds;
  if (d == null || d < 1) return 'none';
  if (d >= 120) return 'called';
  return 'voicemail';
}

function getLeadFreshness(createdAt: string): { label: string; cls: string } {
  const ageMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (ageMin < 30) {
    const m = Math.floor(ageMin);
    return { label: m < 1 ? 'Just now' : `${m}m`, cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  }
  if (ageMin < 120) return { label: `${Math.floor(ageMin)}m`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  const hrs = Math.floor(ageMin / 60);
  if (hrs < 24) return { label: `${hrs}h`, cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  return { label: `${Math.floor(hrs / 24)}d`, cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
}

export default function IntakePage() {
  const router = useRouter();
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();


  // Track lead list viewed once tenant is ready
  useEffect(() => {
    if (!tenantId) return;
    Events.leadListViewed({ tenant_id: tenantId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSeedData, setUsingSeedData] = useState(false);
  
  // Tracks which lead IDs the attorney has opened (for unread dot on new leads)
  const [viewedLeads, setViewedLeads] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('tv_viewed_leads');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const markLeadViewed = useCallback((leadId: string) => {
    setViewedLeads(prev => {
      if (prev.has(leadId)) return prev;
      const next = new Set(prev);
      next.add(leadId);
      try { localStorage.setItem('tv_viewed_leads', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  // Tracks leads where "Unlock A+ Lead" was clicked on the list but the actual
  // unlock has NOT yet been completed on the detail page.
  // Persisted to localStorage so state survives navigation.
  const [clickedForUnlock, setClickedForUnlock] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('tv_unlock_intent');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  // Mark a lead as "unlock intent clicked" without calling the API
  const markUnlockIntent = useCallback((leadId: string) => {
    setClickedForUnlock(prev => {
      const next = new Set(prev);
      next.add(leadId);
      try { localStorage.setItem('tv_unlock_intent', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  // Clear intent once actually unlocked (called after unlock API confirms)
  const clearUnlockIntent = useCallback((leadId: string) => {
    setClickedForUnlock(prev => {
      const next = new Set(prev);
      next.delete(leadId);
      try { localStorage.setItem('tv_unlock_intent', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [practiceAreaFilter, setPracticeAreaFilter] = useState('all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Preview modal state
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [unlockingLeadId, setUnlockingLeadId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Live countdown for all unlockable-but-locked leads
  useEffect(() => {
    const tick = () => {
      const updated: Record<string, number> = {};
      leads.forEach(l => {
        if ((l.qualification_grade === 'A+' || l.lead_grade === 'A+') && !l.unlocked_at) {
          updated[l.lead_id] = getReservationSecondsRemaining(l.created_at);
        }
      });
      setCountdowns(updated);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [leads]);

  // Transform API lead to UI lead
  const transformLead = (apiLead: LeadFromAPI): Lead => ({
    lead_id: apiLead.lead_id,
    first_name: apiLead.first_name,
    last_name: apiLead.last_name,
    email: apiLead.email,
    phone: apiLead.phone,
    status: apiLead.status || 'new',
    source: apiLead.twilio_call_sid ? 'Phone - Benjamin' : 'Website Form',
    practice_area: apiLead.practice_area_code || 'Unknown',
    sub_practice_area: '',
    qualification_grade: apiLead.lead_grade || '',
    qualification_score: apiLead.lead_score || 0,
    created_at: apiLead.created_at,
    last_contact: null,
    notes: '',
    booking_date: null,
    session_id: apiLead.session_id,
    twilio_call_sid: apiLead.twilio_call_sid,
    duration_seconds: apiLead.duration_seconds,
    recording_url: apiLead.recording_url,
    recording_duration: apiLead.recording_duration,
    transcription: apiLead.transcription,
    transcription_url: apiLead.transcription_url,
    unlocked_at: apiLead.unlocked_at || null,
    unlocked_by: apiLead.unlocked_by || null,
    // Preserve intake responses for weighted completion scoring
    answers: apiLead.answers || [],
    lead_score: apiLead.lead_score || null,
    lead_grade: apiLead.lead_grade || null,
    practice_area_code: apiLead.practice_area_code || null,
    // Layer 2 passthrough: SaaS Admin recommendation if enriched API was reached
    recommendation: apiLead.recommendation ?? null,
  });
  
  // Open preview modal
  const handlePreview = (lead: Lead) => {
    setPreviewLead(lead);
    setShowPreviewModal(true);
  };
  
  // Handle unlock action — called ONLY from the detail page (via preview → navigate)
  // The list-level button only sets intent + navigates; actual unlock is on detail page
  const handleUnlock = async (leadId: string) => {
    if (!tenantId) return;
    
    setUnlockingLeadId(leadId);
    try {
      const response = await fetch(`/api/intake/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      
      if (response.ok) {
        // Mark as fully unlocked in React state
        setLeads(prev => prev.map(l => 
          l.lead_id === leadId 
            ? { ...l, unlocked_at: new Date().toISOString() }
            : l
        ));
        if (previewLead?.lead_id === leadId) {
          setPreviewLead(prev => prev ? { ...prev, unlocked_at: new Date().toISOString() } : null);
        }
        // Remove from "intent clicked" set — it's now fully unlocked (GREEN)
        clearUnlockIntent(leadId);
      }
    } catch (err) {
      console.error('Failed to unlock lead:', err);
    } finally {
      setUnlockingLeadId(null);
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      // Wait for tenant context to load
      if (tenantLoading) return;
      
      if (!tenantId) {
        setError(tenantError || 'No tenant context available. Please log in.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Build query params
        const params = new URLSearchParams({
          tenant_id: tenantId,
          limit: '100',
        });
        
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        if (practiceAreaFilter !== 'all') {
          params.set('practice_area', practiceAreaFilter);
        }
        if (dateRange.start) {
          params.set('start_date', dateRange.start);
        }
        if (dateRange.end) {
          params.set('end_date', dateRange.end);
        }

        const response = await fetch(`/api/intake/leads?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (data.leads && data.leads.length > 0) {
          const transformedLeads = data.leads.map(transformLead);
          setLeads(transformedLeads);
          setUsingSeedData(false);
        } else {
          // No leads in database - show empty state
          console.log('No leads found in database');
          setLeads([]);
          setUsingSeedData(false);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
        setError('Failed to load leads from database');
        // Show empty state on error
        setLeads([]);
        setUsingSeedData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [tenantId, tenantLoading, tenantError, statusFilter, practiceAreaFilter, dateRange.start, dateRange.end]);

  // Get unique practice areas for dropdown
  const mainPracticeAreas = [...new Set(leads.map(l => l.practice_area).filter(Boolean))];

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      
      // Practice area filter
      if (practiceAreaFilter !== 'all' && lead.practice_area !== practiceAreaFilter) return false;
      
      // Sub-practice area filter removed (API does not return sub_practice_area)
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.phone,
          lead.practice_area,
          lead.sub_practice_area,
          lead.source,
          lead.notes,
          lead.transcription,
        ].map(f => f?.toLowerCase() || '');
        
        if (!searchFields.some(f => f.includes(query))) return false;
      }
      
      // Date range filter
      if (dateRange.start || dateRange.end) {
        const leadDate = parseISO(lead.created_at);
        if (dateRange.start) {
          const startDate = parseISO(dateRange.start);
          if (leadDate < startDate) return false;
        }
        if (dateRange.end) {
          const endDate = parseISO(dateRange.end);
          endDate.setHours(23, 59, 59);
          if (leadDate > endDate) return false;
        }
      }
      
      return true;
    });
  }, [leads, statusFilter, practiceAreaFilter, searchQuery, dateRange]);

  // ── Export leads to CSV ─────────────────────────────────────────────────
  const exportToCSV = () => {
    const rows = filteredLeads.map(l => ({
      'Name':           [l.first_name, l.last_name].filter(Boolean).join(' '),
      'Phone':          l.phone || '',
      'Email':          l.email || '',
      'Status':         l.status || '',
      'Practice Area':  l.practice_area || '',
      'Score':          l.qualification_score ?? '',
      'Grade':          l.qualification_grade || '',
      'Date Received':  l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
      'Last Contact':   l.last_contact ? new Date(l.last_contact).toLocaleDateString() : '',
      'Booking Date':   l.booking_date ? new Date(l.booking_date).toLocaleDateString() : '',
      'Source':         l.source || '',
      'Notes':          (l.notes || '').replace(/"/g, '""'),
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csvLines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Events.reportExported({ tenant_id: tenantId ?? undefined, report_type: 'leads_csv' });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPracticeAreaFilter('all');
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    if (tenantId) Events.filterCleared({ tenant_id: tenantId });
  };

  const hasActiveFilters = statusFilter !== 'all' || practiceAreaFilter !== 'all' || searchQuery || dateRange.start || dateRange.end;

  // ── Analytics: track search (debounced 600ms) ─────────────────────────────
  useEffect(() => {
    if (!tenantId || !searchQuery) return;
    const timer = setTimeout(() => {
      Events.searchUsed({ tenant_id: tenantId, query: searchQuery });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, tenantId]);

  // ── Analytics: track filter changes ──────────────────────────────────────
  useEffect(() => {
    if (!tenantId || statusFilter === 'all') return;
    Events.filterApplied({ tenant_id: tenantId, filter_key: 'status', filter_value: statusFilter });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!tenantId || practiceAreaFilter === 'all') return;
    Events.filterApplied({ tenant_id: tenantId, filter_key: 'practice_area', filter_value: practiceAreaFilter });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceAreaFilter]);

  // Highest-priority lead for the Call Queue block
  const nextLeadToCall = useMemo(() => {
    const candidates = leads.filter(l => l.status === 'new');
    if (candidates.length === 0) return null;
    const pOrder: Record<ActionLevel, number> = { call_now: 0, follow_up: 1, low: 2 };
    return [...candidates].sort((a, b) => {
      const pA = pOrder[getActionPriority(a).level];
      const pB = pOrder[getActionPriority(b).level];
      if (pA !== pB) return pA - pB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })[0];
  }, [leads]);

  // Helper function to check if date is this week (Mon–Sun, mutation-safe)
  function isThisWeek(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
  }

  function isThisMonth(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">INTAKE Dashboard</h1>
          {usingSeedData && (
            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 inline-flex">
              <AlertCircle className="h-4 w-4" />
              Demo Data
            </span>
          )}
          {error && (
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Stats Overview — attorney funnel sequence:
           Total Pipeline → Needs Action → Vetted → Booked → Unlocked (spend) → New This Week */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatCard title="Total Leads" value={leads.length} color="blue" />
        {/* Awaiting Review: needs attorney attention */}
        <StatCard title="Awaiting Review" value={leads.filter(l => l.status === 'new').length} color="orange" />
        {/* Qualified: completion ≥ 75% OR downstream status */}
        <StatCard
          title="Qualified"
          value={leads.filter(l => {
            if (['qualified', 'scheduled', 'loe_sent', 'converted'].includes(l.status)) return true;
            const { completion } = isUnlockAvailable(l.answers || [], (l.practice_area_code || 'personal_injury') as any);
            return completion >= 75;
          }).length}
          color="green"
        />
        {/* Bookings: consultation scheduled OR converted */}
        <StatCard
          title="Bookings"
          value={leads.filter(l => l.status === 'converted' || l.status === 'scheduled' || !!l.booking_date).length}
          color="purple"
        />
        {/* Unlocked This Month: paid unlocks — reflects monthly investment */}
        <StatCard title="Unlocked This Month" value={leads.filter(l => !!l.unlocked_at && isThisMonth(l.unlocked_at)).length} color="teal" />
        {/* This Week: recent engagement velocity */}
        <StatCard title="This Week" value={leads.filter(l => isThisWeek(l.created_at)).length} color="yellow" />
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status Filter */}
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="new">Awaiting Review</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="loe_sent">LoE Sent</option>
            <option value="scheduled">Consultation Scheduled</option>
            <option value="lost">Did Not Proceed</option>
          </select>

          {/* Practice Area Filter */}
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium px-4 py-2"
            value={practiceAreaFilter}
            onChange={(e) => setPracticeAreaFilter(e.target.value)}
          >
            <option value="all">All Practice Areas</option>
            {mainPracticeAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>

          {/* Date Range Toggle */}
          <button 
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${showDateFilter ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-400' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'}`}
          >
            <Calendar className="h-4 w-4" />
            Date Range
          </button>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          {/* Export to CSV / Excel */}
          <button
            onClick={exportToCSV}
            disabled={filteredLeads.length === 0}
            title="Download as spreadsheet — opens in Excel, Google Sheets, or Numbers"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
        {showDateFilter && (
          <div className="flex gap-4 items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">From:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1"
            />
          </div>
        )}

        {/* Results Count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredLeads.length} of {leads.length} leads
          </p>
        )}
      </div>

      {/* ── Call Queue ────────────────────────────────────────────────────── */}
      {nextLeadToCall && (() => {
        const priority = getActionPriority(nextLeadToCall);
        const freshness = getLeadFreshness(nextLeadToCall.created_at);
        const isCallNow = priority.level === 'call_now';
        return (
          <div className={`mb-6 rounded-lg border px-6 py-4 flex items-center justify-between gap-4 ${
            isCallNow
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-2.5 shrink-0 ${
                isCallNow ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <PhoneCall className={`h-5 w-5 ${
                  isCallNow ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Next Lead to Call</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {nextLeadToCall.practice_area
                    ? nextLeadToCall.practice_area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    : 'Personal Injury'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {(nextLeadToCall.lead_score ?? 0) >= 70 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Flame className="h-3 w-3" /> Strong case
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${freshness.cls}`}>
                    Waiting {freshness.label}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/dashboard/intake/lead/${nextLeadToCall.lead_id}`}
              onClick={() => markLeadViewed(nextLeadToCall.lead_id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                isCallNow
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-300 text-white dark:text-gray-900'
              }`}
            >
              Open Lead <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        );
      })()}

      {/* Leads Table */}
      <div className="rounded-lg bg-card shadow border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Prospect
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Case Strength
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Practice Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Freshness
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.lead_id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      {(() => {
                        const isAPlusLead = (lead.qualification_grade === 'A+' || lead.lead_grade === 'A+');
                        const isLeadLocked = isAPlusLead && !lead.unlocked_at;
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {lead.status === 'new' && !viewedLeads.has(lead.lead_id) && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Not yet viewed" />
                              )}
                              {isLeadLocked ? (
                                <span className="font-medium text-muted-foreground">
                                  {maskProspectId(lead.lead_id)}
                                </span>
                              ) : (
                                <span className="font-medium text-card-foreground">
                                  {lead.first_name} {lead.last_name || ''}
                                </span>
                              )}
                              {lead.unlocked_at && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs" title="Contact info unlocked">
                                  <ShieldCheck className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                            {/* Source badges moved inline */}
                            <div className="flex gap-1">
                              {lead.recording_url && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                  <Phone className="h-3 w-3" />
                                  {lead.recording_duration ? `${Math.round(lead.recording_duration / 60)}m` : 'Rec'}
                                </span>
                              )}
                              {lead.transcription && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                                  <FileText className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <ViabilityBandFromAnswers answers={lead.answers || []} practiceAreaCode={lead.practice_area_code || undefined} />
                    </td>
                    {/* Action Priority cell */}
                    <td className="whitespace-nowrap px-6 py-4">
                      {(() => {
                        const { level, label } = getActionPriority(lead);
                        const contact = getContactStatus(lead);
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              level === 'call_now'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : level === 'follow_up'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {level === 'call_now' ? '🔴' : level === 'follow_up' ? '🟡' : '⚪'} {label}
                            </span>
                            {/* Contact status */}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {contact === 'called' && <><PhoneCall className="h-3 w-3 text-green-500" /> Called</>}
                              {contact === 'voicemail' && <><MessageSquare className="h-3 w-3 text-amber-500" /> Voicemail</>}
                              {contact === 'none' && <span className="text-gray-400">✕ No contact</span>}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-card-foreground">{lead.practice_area}</div>
                    </td>
                    {/* Freshness replaces Created + Source */}
                    <td className="whitespace-nowrap px-6 py-4">
                      {(() => {
                        const f = getLeadFreshness(lead.created_at);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${f.cls}`}>
                            <Clock className="h-3 w-3" /> {f.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        {lead.unlocked_at ? (
                          // ✅ Fully unlocked — GREEN "View Details"
                          <Link 
                            href={`/dashboard/intake/lead/${lead.lead_id}`}
                            onClick={() => markLeadViewed(lead.lead_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        ) : (() => {
                          const isAPlusLead = (lead.qualification_grade === 'A+' || lead.lead_grade === 'A+');
                          if (isAPlusLead) {
                            const hasIntent = clickedForUnlock.has(lead.lead_id);
                            if (hasIntent) {
                              // 🔵 Intent clicked, navigated to detail page, but NOT yet unlocked — BLUE
                              return (
                                <Link
                                  href={`/dashboard/intake/lead/${lead.lead_id}`}
                                  onClick={() => markLeadViewed(lead.lead_id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Link>
                              );
                            }
                            // 🔐 Never clicked — Yellow "Unlock A+ Lead"
                            const secs = countdowns[lead.lead_id] ?? getReservationSecondsRemaining(lead.created_at);
                            const isExpired = secs === 0;
                            return (
                              <div className="flex flex-col items-start gap-1">
                                {!isExpired && secs < 3600 && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                    <Clock className="h-3 w-3" />
                                    {formatCountdown(secs)}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    markUnlockIntent(lead.lead_id);
                                    markLeadViewed(lead.lead_id);
                                    router.push(`/dashboard/intake/lead/${lead.lead_id}`);
                                  }}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                                    isExpired
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                      : secs < 3600
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'
                                      : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                                  }`}
                                >
                                  <Lock className="h-4 w-4" />
                                  {isExpired ? 'Expired' : 'Unlock A+ Lead'}
                                </button>
                              </div>
                            );
                          } else {
                            // ✅ <75% — FREE access, always GREEN
                            return (
                              <Link
                                href={`/dashboard/intake/lead/${lead.lead_id}`}
                                onClick={() => markLeadViewed(lead.lead_id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Link>
                            );
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">
                      {hasActiveFilters ? 'No leads match your filters' : 'No leads found'}
                    </p>
                    {hasActiveFilters && (
                      <button 
                        onClick={clearFilters}
                        className="mt-2 text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Preview Modal */}
      {showPreviewModal && previewLead && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="my-8 max-w-lg w-full space-y-4">
            {/* Contact Info — masked for locked prospects */}
            {(() => {
              const isPreviewAPlus = (previewLead.qualification_grade === 'A+' || previewLead.lead_grade === 'A+');
              const isPreviewLocked = isPreviewAPlus && !previewLead.unlocked_at;
              return (
                <div className={`bg-card rounded-lg shadow p-6 border ${
                  isPreviewLocked ? 'border-amber-300 dark:border-amber-600' : 'border-border'
                }`}>
                  <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                    {isPreviewLocked && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-normal">
                        <Lock className="h-3 w-3" /> Protected
                      </span>
                    )}
                  </h3>
                  {isPreviewLocked ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium text-muted-foreground">{maskProspectId(previewLead.lead_id)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium text-gray-400 dark:text-gray-600 tracking-widest">+1 (•••) •••-••••</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-gray-400 dark:text-gray-600 tracking-widest">••••••@••••.com</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium text-card-foreground">{previewLead.first_name} {previewLead.last_name || ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium text-card-foreground">{previewLead.phone}</p>
                      </div>
                      {previewLead.email && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium text-card-foreground">{previewLead.email}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Link
                      href={`/dashboard/intake/lead/${previewLead.lead_id}`}
                      onClick={() => setShowPreviewModal(false)}
                      className="text-primary hover:text-primary-600 dark:hover:text-primary-400 hover:underline text-sm"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>
              );
            })()}
            
            {/* Intake Analysis */}
            <TokenizedSummaryCard
              lead={previewLead}
              responses={previewLead.answers || []}
              isUnlocked={!!previewLead.unlocked_at}
              practiceAreaCode={previewLead.practice_area_code || undefined}
              onUnlock={() => {
                // Do NOT call the unlock API from the list page.
                // Set intent (BLUE state on list) and navigate to detail page
                // where the user makes the deliberate unlock decision.
                markUnlockIntent(previewLead.lead_id);
                setShowPreviewModal(false);
                router.push(`/dashboard/intake/lead/${previewLead.lead_id}`);
              }}
              onClose={() => setShowPreviewModal(false)}
              onViewDetails={() => {
                setShowPreviewModal(false);
                window.location.href = `/dashboard/intake/lead/${previewLead.lead_id}`;
              }}
            />
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    new: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400', label: 'Awaiting Review' },
    scheduled: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', label: 'Consultation Scheduled' },
    contacted: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', label: 'Contacted' },
    qualified: { color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400', label: 'Intake Qualified' },
    loe_sent: { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400', label: 'LoE Sent' },
    lost: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300', label: 'Did Not Proceed' },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.new;

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const gradeColors: Record<string, string> = {
    'A': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    'A+': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    'B+': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    'B': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    'C': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    'D': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  };

  const color = gradeColors[grade?.toUpperCase()] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
      {grade || '-'}
    </span>
  );
}

function StatCard({ title, value }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-lg shadow px-7 py-5 border border-border flex-none w-52">
      <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider leading-none">{title}</p>
      <p className="mt-3 text-3xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}

/**
 * Viability band badge calculated from Economic Strength Score
 * Shows Economic Strength tier (Moderate/High/Premium) based on damages potential
 * 
 * NOTE: This is DIFFERENT from completion percentage:
 * - Completion % = intake form completeness (determines unlock threshold)
 * - Economic Strength = damages potential (treatment, injury, liability, wages)
 * 
 * Shows tier if ≥75% completion (no mandatory signals gate)
 */
function ViabilityBandFromAnswers({ answers, practiceAreaCode }: { answers: IntakeResponse[]; practiceAreaCode?: string }) {
  const unlockStatus = isUnlockAvailable(answers, (practiceAreaCode || 'personal_injury') as any);
  
  // If below 75% threshold, show completion status instead of Economic Strength
  if (unlockStatus.completion < 75) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-500">
          Screening
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white">
          {unlockStatus.completion}%
        </span>
      </div>
    );
  }
  
  // Calculate Economic Strength for ≥75% prospects
  const economicScore = calculateEconomicStrengthScore(answers);
  
  return (
    <ViabilityTierBadge
      tier={economicScore.tier}
      confidenceLevel={unlockStatus.completion}
    />
  );
}
