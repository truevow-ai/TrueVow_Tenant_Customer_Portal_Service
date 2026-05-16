/**
 * track() - fire-and-forget behavioral event emitter for the Customer Portal.
 * Never throws, never blocks UI.
 * Posts to /api/analytics/track (same-origin proxy).
 */

export type EventCategory =
  | 'DASHBOARD'
  | 'LEAD'
  | 'INTAKE'
  | 'SCHEDULE'
  | 'PIPELINE'
  | 'COMMUNICATION'
  | 'SESSION'
  | 'FEATURE'
  | 'STAFF'

export type EventType =
  // 1. Dashboard
  | 'dashboard_viewed' | 'widget_clicked' | 'widget_expanded'
  | 'quick_action_clicked' | 'quick_action_used' | 'alert_banner_clicked' | 'banner_alert_clicked'
  | 'pipeline_card_clicked' | 'consult_schedule_viewed' | 'activity_feed_opened'
  // 2. Lead Lifecycle
  | 'lead_received' | 'lead_created' | 'lead_viewed' | 'lead_opened'
  | 'lead_preview_opened' | 'lead_unlocked' | 'lead_unlock_failed'
  | 'lead_unlock_preview_viewed' | 'lead_detail_viewed'
  | 'lead_tag_added' | 'lead_tag_removed' | 'lead_tagged' | 'lead_untagged'
  | 'lead_note_added' | 'lead_note_edited' | 'lead_notes_added' | 'lead_notes_viewed'
  | 'lead_followup_set' | 'lead_followup_scheduled' | 'lead_followup_completed' | 'lead_followup_missed'
  | 'lead_closed_retained' | 'lead_closed_lost'
  | 'lead_called' | 'lead_contacted' | 'lead_qualified' | 'lead_rejected'
  | 'lead_marked_unreachable' | 'lead_marked_duplicate'
  | 'lead_status_changed' | 'lead_moved_to_consult' | 'lead_moved_to_retained'
  // 3. Lead Contact
  | 'lead_contact_attempted_call' | 'lead_contact_attempted_sms' | 'lead_contact_attempted_email'
  | 'lead_call_logged' | 'lead_sms_sent' | 'lead_email_sent' | 'lead_voicemail_left'
  | 'lead_contact_success' | 'lead_contact_failed' | 'lead_contact_rescheduled' | 'lead_contact_connected'
  | 'call_started' | 'call_completed'
  | 'sms_sent' | 'sms_received' | 'sms_reply'
  | 'email_opened_client'
  // 4. Intake & Case Qualification
  | 'intake_started' | 'intake_completed' | 'lead_signal_viewed'
  | 'case_strength_viewed' | 'practice_area_detected' | 'high_value_case_flagged'
  // 5. Consult Pipeline
  | 'consult_requested' | 'consult_scheduled' | 'consult_rescheduled'
  | 'consult_cancelled' | 'consult_confirmed' | 'consult_reminder_sent'
  | 'consult_completed' | 'consult_no_show' | 'consult_followup_required'
  | 'scheduler_opened' | 'scheduler_used' | 'calendar_view_opened' | 'calendar_event_clicked'
  // 6. Pipeline
  | 'pipeline_viewed' | 'case_created' | 'client_signed' | 'case_closed'
  // 7. Portal Engagement
  | 'portal_login' | 'portal_logout'
  | 'lead_list_viewed' | 'search_used' | 'filter_applied' | 'filter_cleared'
  | 'notification_viewed' | 'notification_dismissed'
  | 'lead_filter_applied' | 'pipeline_filter_applied'
  // 8. Session
  | 'user_login' | 'user_logout' | 'session_started' | 'session_ended'
  | 'page_viewed' | 'page_navigation' | 'settings_opened' | 'profile_updated' | 'notification_opened'
  // 9. Staff Activity
  | 'staff_invited' | 'staff_account_created' | 'staff_login' | 'staff_logout'
  | 'staff_action_taken' | 'staff_idle_timeout'
  // 10. Feature Adoption
  | 'calendar_connected' | 'calendar_sync_used' | 'calendar_event_created'
  | 'clio_connected' | 'practice_panther_connected' | 'gmail_calendar_connected' | 'outlook_calendar_connected'
  | 'report_generated' | 'report_exported'
  | 'feature_exposed' | 'feature_used' | 'feature_abandoned'
  | 'export_performed'

export interface TrackProps {
  tenant_id?:   string
  user_id?:     string
  lead_id?:     string
  widget_name?: string
  page_path?:   string
  source?:      string
  metadata?:    Record<string, unknown>
  session_id?:  string
}

const SESSION_KEY = 'tv_analytics_session_id'

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return `s_${Date.now()}_ssr`
  }
}

export function track(
  event_type: EventType,
  event_category: EventCategory,
  props?: TrackProps
): void {
  if (typeof window === 'undefined') return

  const session_id = props?.session_id ?? getOrCreateSessionId()
  const page_path  = props?.page_path  ?? (typeof location !== 'undefined' ? location.pathname : null)

  const payload = JSON.stringify({
    event: {
      event_type,
      event_category,
      tenant_id:   props?.tenant_id   ?? null,
      user_id:     props?.user_id     ?? null,
      session_id,
      page_path,
      widget_name: props?.widget_name ?? null,
      lead_id:     props?.lead_id     ?? null,
      source:      props?.source      ?? null,
      metadata:    props?.metadata    ?? {},
      client_ts:   new Date().toISOString(),
    },
  })

  const endpoint = '/api/analytics/track'

  if (navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))
      return
    } catch { /* fall through */ }
  }

  try {
    void fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: payload, keepalive: true,
    })
  } catch { /* silently swallow */ }
}
