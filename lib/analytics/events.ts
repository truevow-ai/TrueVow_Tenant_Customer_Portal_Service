/**
 * events.ts - Semantic event facade over track().
 *
 * Engineers call ONE function per domain action. No categories,
 * no string literals scattered across the codebase.
 *
 * Usage: Events.leadUnlocked({ tenant_id, lead_id })
 */

import { track } from './track'

type Base = { tenant_id?: string; user_id?: string }
type WithLead = Base & { lead_id?: string }

export const Events = {
  // ── Lead Lifecycle ──────────────────────────────────────────────────────
  leadDetailViewed(p: WithLead & { lead_grade?: string | null; lead_score?: number | null }) {
    track('lead_detail_viewed', 'LEAD', {
      ...p,
      metadata: { lead_grade: p.lead_grade, lead_score: p.lead_score },
    })
  },

  leadPreviewOpened(p: WithLead) {
    track('lead_preview_opened', 'LEAD', p)
  },

  leadUnlocked(p: WithLead) {
    track('lead_unlocked', 'LEAD', p)
  },

  leadUnlockFailed(p: WithLead & { reason?: string }) {
    track('lead_unlock_failed', 'LEAD', {
      ...p,
      metadata: { reason: p.reason },
    })
  },

  leadClosedRetained(p: WithLead) {
    track('lead_closed_retained', 'PIPELINE', p)
  },

  leadClosedLost(p: WithLead) {
    track('lead_closed_lost', 'PIPELINE', p)
  },

  leadStatusChanged(p: WithLead & { from_status?: string; to_status?: string }) {
    track('lead_status_changed', 'LEAD', {
      ...p,
      metadata: { from: p.from_status, to: p.to_status },
    })
  },

  leadNoteAdded(p: WithLead) {
    track('lead_note_added', 'LEAD', p)
  },

  leadFollowupScheduled(p: WithLead) {
    track('lead_followup_scheduled', 'LEAD', p)
  },

  leadTagged(p: WithLead & { tag?: string }) {
    track('lead_tagged', 'LEAD', { ...p, metadata: { tag: p.tag } })
  },

  leadUntagged(p: WithLead & { tag?: string }) {
    track('lead_untagged', 'LEAD', { ...p, metadata: { tag: p.tag } })
  },

  // ── Lead Contact ────────────────────────────────────────────────────────
  contactAttemptedCall(p: WithLead) {
    track('lead_contact_attempted_call', 'COMMUNICATION', p)
  },

  contactAttemptedSms(p: WithLead) {
    track('lead_contact_attempted_sms', 'COMMUNICATION', p)
  },

  contactAttemptedEmail(p: WithLead) {
    track('lead_contact_attempted_email', 'COMMUNICATION', p)
  },

  leadCallLogged(p: WithLead) {
    track('lead_call_logged', 'COMMUNICATION', p)
  },

  leadVoicemailLeft(p: WithLead) {
    track('lead_voicemail_left', 'COMMUNICATION', p)
  },

  leadContactSuccess(p: WithLead) {
    track('lead_contact_success', 'COMMUNICATION', p)
  },

  leadContactFailed(p: WithLead) {
    track('lead_contact_failed', 'COMMUNICATION', p)
  },

  // Call bridge events (fired by portal on initiation; completed/connected fired by SaaS Admin webhook)
  callStarted(p: WithLead) {
    track('call_started', 'COMMUNICATION', p)
  },

  callCompleted(p: WithLead & { duration_seconds?: number }) {
    track('call_completed', 'COMMUNICATION', {
      ...p,
      metadata: { duration_seconds: p.duration_seconds },
    })
  },

  leadContactConnected(p: WithLead & { channel?: 'call' | 'sms' | 'email' }) {
    track('lead_contact_connected', 'COMMUNICATION', {
      ...p,
      metadata: { channel: p.channel },
    })
  },

  // SMS thread events
  smsSent(p: WithLead) {
    track('sms_sent', 'COMMUNICATION', p)
  },

  smsReceived(p: WithLead) {
    track('sms_received', 'COMMUNICATION', p)
  },

  smsReply(p: WithLead) {
    track('sms_reply', 'COMMUNICATION', p)
  },

  // Email intent — logs the mailto click; no inbox access
  emailOpenedClient(p: WithLead) {
    track('email_opened_client', 'COMMUNICATION', p)
  },

  // ── Lead List / Search / Filter ─────────────────────────────────────────
  leadListViewed(p: Base) {
    track('lead_list_viewed', 'LEAD', p)
  },

  searchUsed(p: Base & { query?: string }) {
    track('search_used', 'FEATURE', { ...p, metadata: { query: p.query } })
  },

  filterApplied(p: Base & { filter_key?: string; filter_value?: unknown }) {
    track('filter_applied', 'FEATURE', {
      ...p,
      metadata: { filter_key: p.filter_key, filter_value: p.filter_value },
    })
  },

  filterCleared(p: Base) {
    track('filter_cleared', 'FEATURE', p)
  },

  // ── Consult Pipeline ────────────────────────────────────────────────────
  consultRequested(p: WithLead) {
    track('consult_requested', 'SCHEDULE', p)
  },

  consultScheduled(p: WithLead & { scheduled_at?: string }) {
    track('consult_scheduled', 'SCHEDULE', {
      ...p,
      metadata: { scheduled_at: p.scheduled_at },
    })
  },

  consultNoShow(p: WithLead) {
    track('consult_no_show', 'SCHEDULE', p)
  },

  consultCompleted(p: WithLead) {
    track('consult_completed', 'SCHEDULE', p)
  },

  // Fires when an already-scheduled consult is moved to a new time slot
  consultRescheduled(p: WithLead & { rescheduled_to?: string }) {
    track('consult_rescheduled', 'SCHEDULE', {
      ...p,
      metadata: { rescheduled_to: p.rescheduled_to },
    })
  },

  // ── Portal Session ──────────────────────────────────────────────────────
  portalLogin(p: Base) {
    track('portal_login', 'SESSION', p)
  },

  portalLogout(p: Base) {
    track('portal_logout', 'SESSION', p)
  },

  notificationViewed(p: Base & { notification_type?: string }) {
    track('notification_viewed', 'SESSION', {
      ...p,
      metadata: { notification_type: p.notification_type },
    })
  },

  notificationDismissed(p: Base & { notification_type?: string }) {
    track('notification_dismissed', 'SESSION', {
      ...p,
      metadata: { notification_type: p.notification_type },
    })
  },

  idleTimeout(p: Base & { idle_seconds?: number }) {
    track('staff_idle_timeout', 'STAFF', {
      ...p,
      metadata: { idle_seconds: p.idle_seconds },
    })
  },

  // ── Staff ───────────────────────────────────────────────────────────────
  staffInvited(p: Base & { invitee_email?: string }) {
    track('staff_invited', 'STAFF', {
      ...p,
      metadata: { invitee_email: p.invitee_email },
    })
  },

  staffActionTaken(p: Base & { action?: string }) {
    track('staff_action_taken', 'STAFF', {
      ...p,
      metadata: { action: p.action },
    })
  },

  // ── Feature Adoption ────────────────────────────────────────────────────
  // Generic calendar connection (use specific variant below when integration type is known)
  calendarConnected(p: Base & { integration_type?: string }) {
    track('calendar_connected', 'FEATURE', {
      ...p,
      metadata: { integration_type: p.integration_type },
    })
  },

  // Specific third-party integration connection events
  clioConnected(p: Base) {
    track('clio_connected', 'FEATURE', p)
  },

  practicePantherConnected(p: Base) {
    track('practice_panther_connected', 'FEATURE', p)
  },

  gmailCalendarConnected(p: Base) {
    track('gmail_calendar_connected', 'FEATURE', p)
  },

  outlookCalendarConnected(p: Base) {
    track('outlook_calendar_connected', 'FEATURE', p)
  },

  // Fires when TrueVow creates a calendar entry (masked = prospect not yet unlocked)
  calendarEventCreated(p: WithLead & { event_date?: string; event_type?: 'masked' | 'revealed' }) {
    track('calendar_event_created', 'FEATURE', {
      ...p,
      metadata: { event_date: p.event_date, event_type: p.event_type },
    })
  },

  reportGenerated(p: Base & { report_type?: string }) {
    track('report_generated', 'FEATURE', {
      ...p,
      metadata: { report_type: p.report_type },
    })
  },

  reportExported(p: Base & { report_type?: string }) {
    track('report_exported', 'FEATURE', {
      ...p,
      metadata: { report_type: p.report_type },
    })
  },
}
