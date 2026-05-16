'use client';



import { useState, useEffect, useRef } from 'react';

import {

  AlertTriangle, Phone, Calendar, Users, TrendingUp,

  CheckCircle, Clock, AlertCircle, ChevronRight, Zap,

  BarChart2, Activity, ArrowRight, Target, Flame, Plus,

  Lock, PhoneCall, PhoneMissed, MessageSquare, Mail

} from 'lucide-react';

import { isFeatureEnabled } from '@/lib/billing/client';

import { useFeatureAccess } from '@/hooks/useFeatureAccess';

import { useTenant } from '@/hooks/useTenant';

import { track } from '@/lib/analytics/track';
import { Events } from '@/lib/analytics/events';



// ============================================================================

// TYPES

// ============================================================================



interface Lead {

  lead_id: string;

  status: string;

  practice_area_code: string | null;

  lead_score: number | null;

  lead_grade: string | null;

  is_qualified: boolean;

  created_at: string;

  duration_seconds: number | null;

  callDurationFormatted?: string | null;

  signalPanel?: {

    signals: Array<{ label: string; status: 'confirmed' | 'concerning' | 'unknown' }>;

    completionPct: number;

    missingCategories: string[];

    followUp: string[];

  } | null;

  answers: Array<{ question_key: string; response_value: string }>;

  booking_date?: string | null;

  first_name?: string | null;

  last_name?: string | null;

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



/**
 * Layer 2 (SaaS Admin) behavioral metrics returned at the firm level.
 * Portal uses these when present. Falls back to local approximation when absent.
 * @see three-layer architecture — behavioral metrics belong in SaaS Admin, not portal.
 */
interface SaasMetrics {
  avgResponseMins?: number | null;
  unlockedToContactRate?: number | null;
  contactAttempts?: { calls: number; reached: number; voicemail: number; noAnswer: number } | null;
  nextAction?: { label: string; sub: string; href: string } | null;
}



interface CommandCenterData {

  // Row 0 — Attention + Next Action

  attentionItems: string[];

  nextBestAction: { label: string; sub: string; href: string; ageMinutes: number | null } | null;

  sinceLastLogin: { newLeads: number; consultsBooked: number; leadsQualified: number } | null;



  // Row 1 — Immediate Alerts

  newLeadsToday: number;

  lastLeadMinutesAgo: number | null;

  lockedLeads: number;           // status='new' not yet worked

  lockedLeadsOldestMins: number | null;

  highValueCases: Lead[];

  urgentFollowUps: number;

  waitingLeads: number;          // leads 15-30 min old (yellow)

  missedCalls: number;



  // Row 2 — Today's Schedule

  todaysConsults: Lead[];



  // Row 3 — Lead Pipeline

  pipeline: { locked: number; unlocked: number; contacted: number; scheduled: number; retained: number };

  unlockedToContacted: number;   // % conversion

  leadsToConsults: number;

  consultsToRetained: number;



  // Row 4 — Insights

  caseTypesThisWeek: Record<string, number>;

  leadQualitySignals: { severeInjury: number; strongLiability: number; policeReport: number; medicalTreatment: number };

  avgResponseMins: number | null;

  contactAttempts: { calls: number; reached: number; voicemail: number; noAnswer: number };



  // Row 5 — Daily Progress

  dailyProgress: { leadsToday: number; consultsToday: number; retainedToday: number };



  // Row 6 — Activity + Actions

  recentActivity: Array<{ time: string; label: string; leadId: string; ageMinutes: number }>;



  draftValidations: number;

  settleQueries: number;

  revenueRisk: {
    strongLeadsWaiting: number;
    oldestWaitMinutes: number | null;
  } | null;

}



const PA_LABELS: Record<string, string> = {

  dog_bite: 'Dog Bite',

  auto_accident: 'Auto Accident',

  car_accident: 'Car Accident',

  slip_fall: 'Slip & Fall',

  premises_liability: 'Premises Liability',

  wrongful_death: 'Wrongful Death',

  truck_accident: 'Truck Accident',

  motorcycle_accident: 'Motorcycle Accident',

  personal_injury: 'Personal Injury',

};



function paLabel(code: string | null): string {

  if (!code) return 'Unknown';

  return PA_LABELS[code] || code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

}



function statusLabel(status: string): string {

  const m: Record<string, string> = {

    new: 'New Lead', qualified: 'Qualified', scheduled: 'Consult Scheduled',

    loe_sent: 'LOE Sent', converted: 'Retained', disqualified: 'Disqualified',

  };

  return m[status] || status;

}



function isHighValue(lead: Lead): boolean {

  const highAreas = ['truck_accident', 'wrongful_death', 'motorcycle_accident'];

  if (lead.practice_area_code && highAreas.includes(lead.practice_area_code)) return true;

  if (lead.signalPanel?.signals) {

    const s = lead.signalPanel.signals.find(s =>

      s.label.toLowerCase().includes('severe') || s.label.toLowerCase().includes('surgery')

    );

    if (s?.status === 'confirmed') return true;

  }

  if (lead.lead_score != null && lead.lead_score >= 70) return true;

  const inj = lead.answers?.find(a =>

    a.question_key.includes('INJURY') || a.question_key.includes('Q05') || a.question_key.includes('Q08')

  );

  if (inj && ['3', '4'].includes(inj.response_value)) return true;

  return false;

}



function deriveCommandCenter(leads: Lead[], lastLoginTime: Date | null, saasMetrics?: SaasMetrics | null): CommandCenterData {

  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekStart = new Date(now);

  weekStart.setDate(weekStart.getDate() - 6);



  const todayLeads = leads.filter(l => new Date(l.created_at) >= todayStart);

  const weekLeads = leads.filter(l => new Date(l.created_at) >= weekStart);



  const sorted = [...leads].sort((a, b) =>

    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

  );



  const newLeadsToday = todayLeads.length;

  const lastLeadMinutesAgo = sorted.length > 0

    ? Math.floor((now.getTime() - new Date(sorted[0].created_at).getTime()) / 60000)

    : null;



  const highValueCases = todayLeads.filter(isHighValue);

  // Locked = status 'new' (unprocessed), Unlocked = qualified, Contacted = has a meaningful call

  const lockedLeads = leads.filter(l => l.status === 'new').length;

  const lockedLeadsOldestMins = (() => {

    const locked = leads.filter(l => l.status === 'new');

    if (locked.length === 0) return null;

    const oldest = locked.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

    return Math.floor((now.getTime() - new Date(oldest.created_at).getTime()) / 60000);

  })();

  const unlockedLeads = leads.filter(l => l.status === 'qualified').length;

  // Contacted proxy: lead has a call with duration > 30s and status progressed past 'new'

  const contactedLeads = leads.filter(l =>

    !['new', 'qualified', 'scheduled', 'converted', 'disqualified'].includes(l.status) ||

    (l.duration_seconds != null && l.duration_seconds > 30 && l.status === 'qualified')

  ).length;



  // Leads waiting > 30 min = urgent (red), 15-30 min = warning (amber)

  const urgentLeads = leads.filter(l => {

    if (!['new', 'qualified'].includes(l.status)) return false;

    return (now.getTime() - new Date(l.created_at).getTime()) / 60000 > 30;

  });

  const urgentFollowUps = urgentLeads.length;



  // Revenue Risk: strong leads (isHighValue) with no contact yet
  const uncontactedStrong = leads.filter(l =>
    ['new', 'qualified'].includes(l.status) &&
    isHighValue(l) &&
    !(l.duration_seconds != null && l.duration_seconds > 30)
  );

  const revenueRisk = uncontactedStrong.length > 0 ? {
    strongLeadsWaiting: uncontactedStrong.length,
    oldestWaitMinutes: Math.floor(
      (now.getTime() - new Date(
        [...uncontactedStrong].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0].created_at
      ).getTime()) / 60000
    ),
  } : null;



  const waitingLeads = leads.filter(l => {

    if (!['new', 'qualified'].includes(l.status)) return false;

    const age = (now.getTime() - new Date(l.created_at).getTime()) / 60000;

    return age > 15 && age <= 30;

  }).length;



  const missedCalls = leads.filter(l =>

    l.duration_seconds != null && l.duration_seconds < 15

  ).length;



  const todaysConsults = leads.filter(l => {

    if (!['scheduled', 'loe_sent'].includes(l.status)) return false;

    const d = l.booking_date ? new Date(l.booking_date) : null;

    return d && d >= todayStart;

  });



  const pipeline = {

    locked:    leads.filter(l => l.status === 'new').length,

    unlocked:  leads.filter(l => l.status === 'qualified').length,

    contacted: leads.filter(l =>

      l.duration_seconds != null && l.duration_seconds > 30 &&

      ['new', 'qualified'].includes(l.status)

    ).length,

    scheduled: leads.filter(l => l.status === 'scheduled').length,

    retained:  leads.filter(l => l.status === 'converted').length,

  };



  const totalLeads = leads.length;

  const scheduledCount = pipeline.scheduled + pipeline.retained;

  const unlockedToContacted = saasMetrics?.unlockedToContactRate

    // Layer 2 preferred: SaaS Admin unlock_to_contact_rate behavioral metric
    // FALLBACK: approximated from pipeline stage counts
    ?? (pipeline.unlocked > 0

    ? Math.round((pipeline.contacted / (pipeline.unlocked + pipeline.contacted)) * 100)

    : 0);

  const leadsToConsults = totalLeads > 0 ? Math.round((scheduledCount / totalLeads) * 100) : 0;

  const consultsToRetained = scheduledCount > 0 ? Math.round((pipeline.retained / scheduledCount) * 100) : 0;



  const caseTypesThisWeek: Record<string, number> = {};

  weekLeads.forEach(l => {

    const label = paLabel(l.practice_area_code);

    caseTypesThisWeek[label] = (caseTypesThisWeek[label] || 0) + 1;

  });



  let severeInjury = 0;

  let strongLiability = 0;

  let policeReport = 0;

  let medicalTreatment = 0;

  leads.forEach(l => {

    if (l.signalPanel?.signals) {

      if (l.signalPanel.signals.find(s =>

        s.label.toLowerCase().includes('severe') || s.label.toLowerCase().includes('surgery')

      )?.status === 'confirmed') severeInjury++;

      if (l.signalPanel.signals.find(s =>

        s.label.toLowerCase().includes('liability') || s.label.toLowerCase().includes('fault')

      )?.status === 'confirmed') strongLiability++;

      if (l.signalPanel.signals.find(s =>

        s.label.toLowerCase().includes('police') || s.label.toLowerCase().includes('incident report')

      )?.status === 'confirmed') policeReport++;

      if (l.signalPanel.signals.find(s =>

        s.label.toLowerCase().includes('medical') || s.label.toLowerCase().includes('treatment')

      )?.status === 'confirmed') medicalTreatment++;

    } else {

      const inj = l.answers?.find(a => a.question_key.includes('INJURY'));

      if (inj && ['3', '4'].includes(inj.response_value)) severeInjury++;

      if (l.lead_score != null && l.lead_score >= 65) strongLiability++;

      if (l.answers?.some(a =>

        a.question_key.toLowerCase().includes('police') && ['yes', '1', 'true'].includes(a.response_value.toLowerCase())

      )) policeReport++;

      if (l.answers?.some(a =>

        a.question_key.toLowerCase().includes('medical') && ['yes', '1', 'true'].includes(a.response_value.toLowerCase())

      )) medicalTreatment++;

    }

  });



  // Contact attempts
  // └─ Layer 2 preferred: SaaS Admin behavioral metric (unlock_to_contact tracking)
  // └─ FALLBACK: approximated from call duration data (acceptable when SaaS Admin down)

  const callLeads = leads.filter(l => l.duration_seconds != null && l.duration_seconds > 0);

  const contactAttempts = saasMetrics?.contactAttempts ?? {

    calls:     callLeads.length,

    reached:   callLeads.filter(l => (l.duration_seconds ?? 0) >= 120).length,

    voicemail: callLeads.filter(l => { const d = l.duration_seconds ?? 0; return d >= 15 && d < 120; }).length,

    noAnswer:  callLeads.filter(l => (l.duration_seconds ?? 0) < 15).length,

  };



  // Avg response time
  // └─ Layer 2 preferred: SaaS Admin tenant_behavior_metrics.avg_response_time
  // └─ FALLBACK: mean call duration for leads with calls > 30s

  const withDuration = leads.filter(l => l.duration_seconds && l.duration_seconds > 30);

  const avgResponseMins = saasMetrics?.avgResponseMins

    ?? (withDuration.length > 0

      ? Math.round(withDuration.reduce((s, l) => s + (l.duration_seconds! / 60), 0) / withDuration.length)

      : null);



  // Daily progress scoreboard

  const dailyProgress = {

    leadsToday: todayLeads.length,

    consultsToday: todaysConsults.length,

    retainedToday: leads.filter(l =>

      l.status === 'converted' && new Date(l.created_at) >= todayStart

    ).length,

  };



  // Recent activity feed

  const recentActivity = sorted.slice(0, 6).map(l => ({

    time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

    label: `${statusLabel(l.status)} - ${paLabel(l.practice_area_code)}`,

    leadId: l.lead_id,

    ageMinutes: Math.floor((now.getTime() - new Date(l.created_at).getTime()) / 60000),

  }));



  // Attention banner items

  const attentionItems: string[] = [];

  if (newLeadsToday > 0) attentionItems.push(`${newLeadsToday} new lead${newLeadsToday > 1 ? 's' : ''} today`);

  if (highValueCases.length > 0) attentionItems.push(`${highValueCases.length} high-value case${highValueCases.length > 1 ? 's' : ''}`);

  if (urgentFollowUps > 0) attentionItems.push(`${urgentFollowUps} follow-up${urgentFollowUps > 1 ? 's' : ''} overdue`);

  if (missedCalls > 0) attentionItems.push(`${missedCalls} missed call${missedCalls > 1 ? 's' : ''}`);



  // Next best action
  // Layer 2 preferred: SaaS Admin Recommendation Engine output (nextAction)
  // FALLBACK chain: per-lead recommendation → missed call → overdue lead → new lead

  let nextBestAction: CommandCenterData['nextBestAction'] = null;

  if (saasMetrics?.nextAction) {

    // ✔ Layer 2: Recommendation Engine output takes full precedence

    nextBestAction = {

      label: saasMetrics.nextAction.label,

      sub:   saasMetrics.nextAction.sub,

      href:  saasMetrics.nextAction.href,

      ageMinutes: null,

    };

  } else {

    // Check for per-lead SaaS Admin 'call_now' recommendation before local fallback

    const callNowLead = leads.find(l => l.recommendation?.priority === 'call_now');

    if (callNowLead) {

      const age = Math.floor((now.getTime() - new Date(callNowLead.created_at).getTime()) / 60000);

      nextBestAction = {

        label: callNowLead.recommendation!.sub || `Follow up on ${paLabel(callNowLead.practice_area_code)} lead`,

        sub: `Waiting ${age} minutes`,

        href: callNowLead.recommendation!.href || `/dashboard/intake/lead/${callNowLead.lead_id}`,

        ageMinutes: age,

      };

    } else if (missedCalls > 0) {

    nextBestAction = { label: 'Return missed call', sub: `${missedCalls} caller${missedCalls > 1 ? 's' : ''} waiting`, href: '/dashboard/intake', ageMinutes: null };

  } else if (urgentLeads.length > 0) {

    const oldest = urgentLeads.sort((a, b) =>

      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

    )[0];

    const age = Math.floor((now.getTime() - new Date(oldest.created_at).getTime()) / 60000);

    nextBestAction = {

      label: `Follow up on ${paLabel(oldest.practice_area_code)} lead`,

      sub: `Waiting ${age} minutes`,

      href: `/dashboard/intake/lead/${oldest.lead_id}`,

      ageMinutes: age,

    };

  } else if (newLeadsToday > 0) {

    const newest = todayLeads.sort((a, b) =>

      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

    )[0];

    const age = Math.floor((now.getTime() - new Date(newest.created_at).getTime()) / 60000);

    nextBestAction = {

      label: `Review new ${paLabel(newest.practice_area_code)} lead`,

      sub: `Arrived ${age}m ago`,

      href: `/dashboard/intake/lead/${newest.lead_id}`,

      ageMinutes: age,

    };

    }

  }

  let sinceLastLogin: CommandCenterData['sinceLastLogin'] = null;

  if (lastLoginTime) {

    const newSince = leads.filter(l => new Date(l.created_at) > lastLoginTime).length;

    const consultsSince = leads.filter(l =>

      ['scheduled', 'loe_sent'].includes(l.status) && new Date(l.created_at) > lastLoginTime

    ).length;

    const qualifiedSince = leads.filter(l =>

      l.status === 'qualified' && new Date(l.created_at) > lastLoginTime

    ).length;

    if (newSince > 0 || consultsSince > 0 || qualifiedSince > 0) {

      sinceLastLogin = { newLeads: newSince, consultsBooked: consultsSince, leadsQualified: qualifiedSince };

    }

  }



  return {

    attentionItems,

    nextBestAction,

    sinceLastLogin,

    newLeadsToday,

    lastLeadMinutesAgo,

    lockedLeads,

    lockedLeadsOldestMins,

    highValueCases,

    urgentFollowUps,

    waitingLeads,

    missedCalls,

    todaysConsults,

    pipeline,

    unlockedToContacted,

    leadsToConsults,

    consultsToRetained,

    caseTypesThisWeek,

    leadQualitySignals: { severeInjury, strongLiability, policeReport, medicalTreatment },

    avgResponseMins,

    contactAttempts,

    dailyProgress,

    recentActivity,

    draftValidations: 0,

    settleQueries: 0,

    revenueRisk,

  };

}



// ============================================================================

// MAIN PAGE

// ============================================================================



export default function DashboardPage() {

  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenant();

  const { features } = useFeatureAccess();

  const [data, setData] = useState<CommandCenterData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const lastLoginRef = useRef<Date | null>(null);



  useEffect(() => {

    // Read + update last login time from localStorage

    try {

      const stored = localStorage.getItem('tv_last_login');

      if (stored) lastLoginRef.current = new Date(stored);

      localStorage.setItem('tv_last_login', new Date().toISOString());

    } catch { /* SSR or storage unavailable */ }

  }, []);



  useEffect(() => {

    if (tenantLoading) return;

    if (!tenantId) {

      setError(tenantError || 'No tenant context.');

      setLoading(false);

      return;

    }



    (async () => {

      try {

        setLoading(true);

        const res = await fetch(`/api/intake/leads?tenant_id=${tenantId}&limit=200`);

        if (res.ok) {

          const json = await res.json();

          const leads: Lead[] = json.leads || [];

          // Layer 2: SaaS Admin may return pre-computed firm-level behavioral metrics.
          // When present, deriveCommandCenter() uses these instead of local approximations.
          const saasMetrics: SaasMetrics | null = json.firmMetrics ?? null;

          const cc = deriveCommandCenter(leads, lastLoginRef.current, saasMetrics);

          setData(cc);

          track('dashboard_viewed', 'DASHBOARD', { tenant_id: tenantId ?? undefined });

        }

      } catch {

        setError('Could not load dashboard data');

      } finally {

        setLoading(false);

      }

    })();

  }, [tenantId, tenantLoading, tenantError]);



  const now = new Date();

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });



  return (

    <div className="space-y-6">



      {/* ── Header ──────────────────────────────────────────────── */}

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{today}</p>

          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{greeting}</h1>

        </div>

        {/* Quick action strip */}

        <div className="hidden lg:flex items-center gap-2">

          {[

            { label: 'View New Leads', href: '/dashboard/intake' },

            { label: 'Schedule Consult', href: '/dashboard/intake/calendar' },

          ].map(a => (

            <a

              key={a.href}

              href={a.href}

              className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"

            >

              {a.label}

            </a>

          ))}

        </div>

      </div>



      {error && (

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 flex items-center gap-3">

          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />

          <p className="text-sm text-yellow-800 dark:text-yellow-300">{error}</p>

        </div>

      )}



      {loading ? (

        <div className="flex items-center justify-center py-24">

          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>

        </div>

      ) : data ? (

        <>

          {/* ── Since Last Login ──────────────────────────────────── */}

          {data.sinceLastLogin && (

            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">

              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Since you were last here:</span>

              {data.sinceLastLogin.newLeads > 0 && (

                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">

                  {data.sinceLastLogin.newLeads} new lead{data.sinceLastLogin.newLeads > 1 ? 's' : ''}

                </span>

              )}

              {data.sinceLastLogin.consultsBooked > 0 && (

                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">

                  {data.sinceLastLogin.consultsBooked} consult{data.sinceLastLogin.consultsBooked > 1 ? 's' : ''} booked

                </span>

              )}

              {data.sinceLastLogin.leadsQualified > 0 && (

                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">

                  {data.sinceLastLogin.leadsQualified} lead{data.sinceLastLogin.leadsQualified > 1 ? 's' : ''} qualified

                </span>

              )}

            </div>

          )}



          {/* ── Attention Banner ──────────────────────────────────── */}

          {data.attentionItems.length > 0 && (

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4">

              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Needs your attention</p>

              <div className="flex flex-wrap gap-x-6 gap-y-1">

                {data.attentionItems.map((item, i) => (

                  <span key={i} className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200">

                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${

                      item.includes('overdue') || item.includes('missed') ? 'bg-red-500' :

                      item.includes('high-value') ? 'bg-amber-500' : 'bg-gray-400'

                    }`} />

                    {item}

                  </span>

                ))}

              </div>

            </div>

          )}



          {/* ── Revenue Risk ──────────────────────────────────── */}

          {data.revenueRisk && (
            <a
              href="/dashboard/intake"
              className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-5 py-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/40">
                  <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">Revenue Risk</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {data.revenueRisk.strongLeadsWaiting} strong lead{data.revenueRisk.strongLeadsWaiting > 1 ? 's' : ''} waiting — no contact yet
                  </p>
                  {data.revenueRisk.oldestWaitMinutes != null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Oldest waiting: {data.revenueRisk.oldestWaitMinutes} minute{data.revenueRisk.oldestWaitMinutes !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 shrink-0">
                Review Leads <ArrowRight className="h-4 w-4" />
              </div>
            </a>
          )}



          {/* ── Next Best Action ──────────────────────────────────── */}

          {data.nextBestAction && (

            <a

              href={data.nextBestAction.href}

              className={`flex items-center justify-between rounded-lg border px-5 py-4 transition-all hover:shadow-sm ${

                data.nextBestAction.ageMinutes != null && data.nextBestAction.ageMinutes > 30

                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'

                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'

              }`}

            >

              <div className="flex items-center gap-3">

                <div className={`rounded-full p-2 ${

                  data.nextBestAction.ageMinutes != null && data.nextBestAction.ageMinutes > 30

                    ? 'bg-red-100 dark:bg-red-900/40'

                    : 'bg-gray-100 dark:bg-gray-700'

                }`}>

                  <Target className={`h-4 w-4 ${

                    data.nextBestAction.ageMinutes != null && data.nextBestAction.ageMinutes > 30

                      ? 'text-red-600 dark:text-red-400'

                      : 'text-gray-600 dark:text-gray-400'

                  }`} />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Next Action</p>

                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.nextBestAction.label}</p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">{data.nextBestAction.sub}</p>

                </div>

              </div>

              <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" />

            </a>

          )}



          {/* ══════════════════════════════════════════════════════

              ROW 1 — IMMEDIATE ALERTS

          ══════════════════════════════════════════════════════ */}

          <Section label="Immediate Alerts">

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">

              <AlertCard

                title="New Leads Today"

                value={data.newLeadsToday}

                sub={data.lastLeadMinutesAgo != null

                  ? data.lastLeadMinutesAgo < 60

                    ? `Last lead ${data.lastLeadMinutesAgo}m ago`

                    : `Last lead ${Math.floor(data.lastLeadMinutesAgo / 60)}h ago`

                  : 'No leads yet today'}

                icon={<Users className="h-5 w-5" />}

                href="/dashboard/intake"

                level="neutral"

              />

              <AlertCard

                title="Locked Leads"

                value={data.lockedLeads}

                sub={data.lockedLeads > 0

                  ? `Oldest waiting: ${data.lockedLeadsOldestMins}m`

                  : 'No uncontacted leads'}

                icon={<Lock className="h-5 w-5" />}

                href="/dashboard/intake"

                level={data.lockedLeads > 0 ? 'warning' : 'neutral'}

              />

              <AlertCard

                title="Urgent Follow-Ups"

                value={data.urgentFollowUps}

                sub={data.urgentFollowUps > 0

                  ? 'Waiting >30 minutes'

                  : data.waitingLeads > 0

                    ? `${data.waitingLeads} lead${data.waitingLeads > 1 ? 's' : ''} reaching 30 min`

                    : 'All leads responded to'}

                icon={<AlertTriangle className="h-5 w-5" />}

                href="/dashboard/intake"

                level={data.urgentFollowUps > 0 ? 'urgent' : data.waitingLeads > 0 ? 'warning' : 'neutral'}

              />

              <AlertCard

                title="Missed Calls"

                value={data.missedCalls}

                sub={data.missedCalls > 0 ? 'Call back now' : 'No missed calls'}

                icon={<Phone className="h-5 w-5" />}

                href="/dashboard/intake"

                level={data.missedCalls > 0 ? 'urgent' : 'neutral'}

              />

            </div>

          </Section>



          {/* ══════════════════════════════════════════════════════

              ROW 2 — TODAY'S CONSULTATIONS

          ══════════════════════════════════════════════════════ */}

          <Section label="Today's Consultations">

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">

              {data.todaysConsults.length === 0 ? (

                <div className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">

                  No consultations scheduled for today.

                </div>

              ) : (

                <ul className="divide-y divide-gray-100 dark:divide-gray-700">

                  {data.todaysConsults.map(lead => (

                    <li key={lead.lead_id}>

                      <a

                        href={`/dashboard/intake/lead/${lead.lead_id}`}

                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"

                      >

                        <div className="flex items-center gap-3">

                          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />

                          <div>

                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">

                              {lead.booking_date

                                ? new Date(lead.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                                : 'Time TBD'}

                              {' - '}{paLabel(lead.practice_area_code)}

                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{lead.status.replace(/_/g, ' ')}</p>

                          </div>

                        </div>

                        <ChevronRight className="h-4 w-4 text-gray-400" />

                      </a>

                    </li>

                  ))}

                </ul>

              )}

              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700">

                <a href="/dashboard/intake/calendar" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">

                  Open full calendar <ChevronRight className="h-3 w-3" />

                </a>

              </div>

            </div>

          </Section>



          {/* ══════════════════════════════════════════════════════

              ROW 3 — LEAD PIPELINE

          ══════════════════════════════════════════════════════ */}

          <Section label="Lead Funnel">

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">

              <PipelineCard label="Locked" value={data.pipeline.locked} href="/dashboard/intake" accent="gray" />

              <PipelineCard label="Unlocked" value={data.pipeline.unlocked} href="/dashboard/intake" accent="amber" />

              <PipelineCard label="Contacted" value={data.pipeline.contacted} href="/dashboard/intake" accent="blue" />

              <PipelineCard label="Consult Scheduled" value={data.pipeline.scheduled} href="/dashboard/intake" accent="green" />

              <PipelineCard label="Retained" value={data.pipeline.retained} href="/dashboard/intake" accent="green" />

            </div>

            <div className="mt-3 grid gap-3 grid-cols-3">

              <FunnelCard label="Unlocked → Contacted" value={data.unlockedToContacted} />

              <FunnelCard label="Contacted → Consult" value={data.leadsToConsults} />

              <FunnelCard label="Consult → Retained" value={data.consultsToRetained} />

            </div>

          </Section>



          {/* ══════════════════════════════════════════════════════

              ROW 4 — CASE INSIGHTS

          ══════════════════════════════════════════════════════ */}

          <Section label="Case Insights">

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">



              {/* Case Types This Week */}

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

                <div className="flex items-center gap-2 mb-4">

                  <BarChart2 className="h-4 w-4 text-gray-400" />

                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cases This Week</h3>

                </div>

                {Object.keys(data.caseTypesThisWeek).length === 0 ? (

                  <p className="text-sm text-gray-400 dark:text-gray-500">No cases this week yet.</p>

                ) : (

                  <ul className="space-y-2.5">

                    {Object.entries(data.caseTypesThisWeek)

                      .sort((a, b) => b[1] - a[1])

                      .map(([label, count]) => {

                        const maxCount = Math.max(...Object.values(data.caseTypesThisWeek));

                        return (

                          <li key={label}>

                            <div className="flex items-center justify-between mb-1">

                              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>

                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{count}</span>

                            </div>

                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">

                              <div

                                className="h-1 rounded-full bg-gray-400 dark:bg-gray-500"

                                style={{ width: `${(count / maxCount) * 100}%` }}

                              />

                            </div>

                          </li>

                        );

                      })}

                  </ul>

                )}

              </div>



              {/* Lead Quality Signals */}

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

                <div className="flex items-center gap-2 mb-4">

                  <CheckCircle className="h-4 w-4 text-gray-400" />

                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Lead Quality Signals</h3>

                </div>

                <ul className="space-y-4">

                  <li className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-gray-700 dark:text-gray-300">Severe Injury Cases</p>

                      <p className="text-xs text-gray-400 dark:text-gray-500">From intake answers</p>

                    </div>

                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.leadQualitySignals.severeInjury}</span>

                  </li>

                  <li className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-gray-700 dark:text-gray-300">Strong Liability Cases</p>

                      <p className="text-xs text-gray-400 dark:text-gray-500">Score 65+</p>

                    </div>

                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.leadQualitySignals.strongLiability}</span>

                  </li>

                  <li className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-gray-700 dark:text-gray-300">Police Report Available</p>

                      <p className="text-xs text-gray-400 dark:text-gray-500">Strong PI signal</p>

                    </div>

                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.leadQualitySignals.policeReport}</span>

                  </li>

                  <li className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-gray-700 dark:text-gray-300">Medical Treatment Started</p>

                      <p className="text-xs text-gray-400 dark:text-gray-500">Strong PI signal</p>

                    </div>

                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.leadQualitySignals.medicalTreatment}</span>

                  </li>

                </ul>

                {(data.highValueCases.length > 0) && (

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">

                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">High-value today</p>

                    {data.highValueCases.slice(0, 2).map(l => (

                      <a

                        key={l.lead_id}

                        href={`/dashboard/intake/lead/${l.lead_id}`}

                        className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-1"

                      >

                        <Flame className="h-3 w-3 text-amber-500 shrink-0" />

                        {paLabel(l.practice_area_code)}

                      </a>

                    ))}

                  </div>

                )}

              </div>



              {/* Avg Intake Duration + Daily Progress */}

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

                <div className="flex items-center gap-2 mb-4">

                  <Flame className="h-4 w-4 text-gray-400" />

                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Today's Progress</h3>

                </div>

                <ul className="space-y-3">

                  <li className="flex items-center justify-between">

                    <span className="text-sm text-gray-600 dark:text-gray-400">Leads received</span>

                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.dailyProgress.leadsToday}</span>

                  </li>

                  <li className="flex items-center justify-between">

                    <span className="text-sm text-gray-600 dark:text-gray-400">Consults scheduled</span>

                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.dailyProgress.consultsToday}</span>

                  </li>

                  <li className="flex items-center justify-between">

                    <span className="text-sm text-gray-600 dark:text-gray-400">Clients retained</span>

                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.dailyProgress.retainedToday}</span>

                  </li>

                </ul>

                {data.avgResponseMins != null && (

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">

                    <div>

                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg intake call</p>

                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.avgResponseMins}m</p>

                    </div>

                    <div className="text-right">

                      <p className="text-xs text-gray-500 dark:text-gray-400">Industry avg</p>

                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">35m</p>

                    </div>

                  </div>

                )}

              </div>



            </div>

          </Section>



          {/* Contact Attempts widget — below Case Insights */}

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

            <div className="flex items-center gap-2 mb-4">

              <PhoneCall className="h-4 w-4 text-gray-400" />

              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contact Attempts</h3>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {[

                { label: 'Call Attempts', value: data.contactAttempts.calls, icon: <Phone className="h-4 w-4" /> },

                { label: 'Reached', value: data.contactAttempts.reached, icon: <PhoneCall className="h-4 w-4" /> },

                { label: 'Voicemail', value: data.contactAttempts.voicemail, icon: <PhoneMissed className="h-4 w-4" /> },

                { label: 'No Answer', value: data.contactAttempts.noAnswer, icon: <Phone className="h-4 w-4" /> },

              ].map(stat => (

                <div key={stat.label} className="text-center">

                  <div className="flex justify-center mb-1 text-gray-400">{stat.icon}</div>

                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>

                </div>

              ))}

            </div>

          </div>

          {/* ══════════════════════════════════════════════════════
              ROW 5 — ACTIVITY + QUICK ACTIONS
          ══════════════════════════════════════════════════════ */}

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">



            {/* Recent Lead Activity */}

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

              <div className="flex items-center gap-2 mb-4">

                <Activity className="h-4 w-4 text-gray-400" />

                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Lead Activity</h3>

              </div>

              {data.recentActivity.length === 0 ? (

                <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity.</p>

              ) : (

                <ul className="space-y-2.5">

                  {data.recentActivity.map((item, i) => (

                    <li key={i}>

                      <a href={`/dashboard/intake/lead/${item.leadId}`} className="flex items-start gap-3 group">

                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums mt-0.5 w-12 shrink-0">{item.time}</span>

                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 flex-1">

                          {item.label}

                        </span>

                        {/* Lead age badge */}

                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 tabular-nums ${

                          item.ageMinutes > 30

                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'

                            : item.ageMinutes > 15

                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'

                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'

                        }`}>

                          {item.ageMinutes < 60 ? `${item.ageMinutes}m` : `${Math.floor(item.ageMinutes / 60)}h`}

                        </span>

                      </a>

                    </li>

                  ))}

                </ul>

              )}

            </div>



            {/* Quick Actions */}

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>

              <ul className="space-y-1.5">

                {[

                  { label: 'View New Leads', href: '/dashboard/intake', desc: 'Open intake queue' },

                  { label: 'Schedule a Consult', href: '/dashboard/intake/calendar', desc: 'Open calendar' },

                  ...(features && isFeatureEnabled(features.features.draft)

                    ? [{ label: 'LEVERAGE Service', href: '/dashboard/leverage', desc: 'Document compliance & deadline tools' }]

                    : []),

                  ...(features && isFeatureEnabled(features.features.settle)

                    ? [{ label: 'SETTLE Data Bank', href: '/dashboard/settle', desc: 'Query & contribute' }]

                    : []),

                ].map(action => (

                  <li key={action.href}>

                    <a

                      href={action.href}

                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 group transition-colors"

                    >

                      <div>

                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>

                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />

                    </a>

                  </li>

                ))}

              </ul>

            </div>



          </div>

        </>

      ) : null}



      {/* ── Persistent Floating Toolbar (M11) ─────────────────────────────

       * Always visible regardless of scroll position.

       * Mobile: fixed bottom bar. Desktop: also fixed but offset for sidebar.

       */}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">

        <div className="pointer-events-auto w-full max-w-2xl mx-auto mb-4 px-4">

          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-2.5">

            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block">Quick:</span>

            {[

              { label: 'New Leads', href: '/dashboard/intake', icon: <Users className="h-3.5 w-3.5" /> },

              { label: 'Calendar', href: '/dashboard/intake/calendar', icon: <Calendar className="h-3.5 w-3.5" /> },

              { label: 'Call Queue', href: '/dashboard/intake', icon: <Phone className="h-3.5 w-3.5" /> },

            ].map(action => (

              <a

                key={action.href + action.label}

                href={action.href}

                onClick={() => track('quick_action_clicked', 'DASHBOARD', { widget_name: action.label })}

                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"

              >

                {action.icon}

                {action.label}

              </a>

            ))}

            <div className="flex-1" />

            <a

              href="/dashboard/intake"

              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors shrink-0"

            >

              <Plus className="h-3.5 w-3.5" />

              View All Leads

            </a>

          </div>

        </div>

      </div>



      {/* Bottom spacer so content doesn't hide under toolbar */}

      <div className="h-16" />



    </div>

  );

}



// ============================================================================

// SUB-COMPONENTS

// ============================================================================



function Section({ label, children }: { label: string; children: React.ReactNode }) {

  return (

    <div>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{label}</h2>

      {children}

    </div>

  );

}



type AlertLevel = 'neutral' | 'good' | 'warning' | 'urgent';



function AlertCard({

  title, value, sub, icon, href, level,

}: {

  title: string;

  value: number;

  sub: string;

  icon: React.ReactNode;

  href: string;

  level: AlertLevel;

}) {

  const bg: Record<AlertLevel, string> = {

    neutral: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',

    good:    'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',

    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',

    urgent:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',

  };

  const val: Record<AlertLevel, string> = {

    neutral: 'text-gray-900 dark:text-gray-100',

    good:    'text-gray-900 dark:text-gray-100',

    warning: 'text-amber-700 dark:text-amber-400',

    urgent:  'text-red-700 dark:text-red-400',

  };

  const ico: Record<AlertLevel, string> = {

    neutral: 'text-gray-400 dark:text-gray-500',

    good:    'text-gray-600 dark:text-gray-400',

    warning: 'text-amber-500 dark:text-amber-400',

    urgent:  'text-red-500 dark:text-red-400',

  };



  return (

    <a href={href} className={`block rounded-lg border p-5 transition-all hover:shadow-sm ${bg[level]}`}>

      <div className={`mb-3 ${ico[level]}`}>{icon}</div>

      <p className={`text-3xl font-bold tabular-nums ${val[level]}`}>{value}</p>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{title}</p>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>

    </a>

  );

}



function PipelineCard({ label, value, href, accent }: { label: string; value: number; href: string; accent: string }) {

  const bar: Record<string, string> = {

    gray: 'bg-gray-300 dark:bg-gray-600',

    amber: 'bg-amber-400 dark:bg-amber-500',

    blue: 'bg-blue-400 dark:bg-blue-500',

    green: 'bg-green-500 dark:bg-green-400',

  };

  return (

    <a href={href} className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-sm transition-all">

      <div className={`w-8 h-1 rounded-full mb-4 ${bar[accent] || bar.gray}`} />

      <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</p>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>

    </a>

  );

}



function FunnelCard({ label, value }: { label: string; value: number }) {

  return (

    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">

      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>

      <div className="flex items-end gap-3">

        <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}%</p>

        <TrendingUp className="h-5 w-5 text-gray-400 mb-1" />

      </div>

      <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">

        <div className="h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" style={{ width: `${Math.min(value, 100)}%` }} />

      </div>

    </div>

  );

}

