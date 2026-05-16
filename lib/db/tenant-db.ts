/**
 * Tenant Application Database Client
 * 
 * Direct Supabase connection to the Tenant Application database
 * for querying leads, recordings, transcriptions, etc.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Lead {
  lead_id: string;
  tenant_id: string;
  contact_id: string | null;
  practice_area_code: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string;
  source_phone_number: string | null;
  status: string;
  lead_score: number | null;
  lead_grade: string | null;
  estimated_case_value: number | null;
  is_qualified: boolean | null;
  qualified_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  // Lead Revenue Protection - Unlock State
  unlocked_at: string | null;
  unlocked_by: string | null;
  // Consultation booking (set by Benjamin during intake call)
  booking_date: string | null;
  notes: string | null;
}

export interface IntakeSession {
  session_id: string;
  tenant_id: string;
  lead_id: string | null;
  twilio_call_sid: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  final_state: string | null;
  completed: boolean;
  tags: string[] | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface LeadWithSession extends Lead {
  session_id: string | null;
  twilio_call_sid: string | null;
  session_start_time: string | null;
  session_end_time: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_url: string | null;
  // Intake responses for tokenized summary
  intake_responses?: IntakeResponse[];
}

export interface CallRecording {
  recording_id: string;
  call_sid: string;
  session_id: string;
  recording_sid: string;
  recording_url: string;
  duration_seconds: number;
  channels: string;
  status: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CallTranscription {
  transcription_id: string;
  call_sid: string;
  session_id: string;
  transcription_text: string;
  transcription_url: string | null;
  status: string;
  confidence_score: number | null;
  language_code: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface IntakeResponse {
  response_id: string;
  session_id: string;
  question_key: string;
  response_value: string;
  response_type: string;
  captured_at: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ============================================================================
// DATABASE CLIENT
// ============================================================================

class TenantDatabase {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.TENANT_APP_PROJECT_URL;
    const supabaseKey = process.env.TENANT_APP_DATABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing TENANT_APP_PROJECT_URL or TENANT_APP_DATABASE_SERVICE_KEY');
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // ==========================================================================
  // LEADS
  // ==========================================================================

  /**
   * Get all leads for a tenant with session, recording, and transcription data
   */
  async getLeads(
    tenantId: string,
    options?: {
      status?: string;
      practiceArea?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ leads: LeadWithSession[]; total: number }> {
    // First, query leads separately
    let leadsQuery = this.client
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (options?.status) {
      leadsQuery = leadsQuery.eq('status', options.status);
    }
    if (options?.practiceArea) {
      leadsQuery = leadsQuery.eq('practice_area_code', options.practiceArea);
    }
    if (options?.startDate) {
      leadsQuery = leadsQuery.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      leadsQuery = leadsQuery.lte('created_at', options.endDate);
    }

    // Apply pagination
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    leadsQuery = leadsQuery.range(offset, offset + limit - 1);

    const { data: leadsData, error: leadsError, count } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    if (!leadsData || leadsData.length === 0) {
      return { leads: [], total: count || 0 };
    }

    // Get session_ids from leads that have them
    const sessionIds = leadsData
      .filter(l => l.session_id)
      .map(l => l.session_id);

    // Query intake_sessions separately if there are any session_ids
    let sessionsMap: Record<string, any> = {};
    if (sessionIds.length > 0) {
      const { data: sessionsData, error: sessionsError } = await this.client
        .from('intake_sessions')
        .select('*')
        .in('session_id', sessionIds);

      if (!sessionsError && sessionsData) {
        sessionsData.forEach(s => {
          sessionsMap[s.session_id] = s;
        });
      }
    }

    // Get twilio_call_sids for recordings/transcriptions
    const twilioCallSids = Object.values(sessionsMap)
      .filter((s: any) => s.twilio_call_sid)
      .map((s: any) => s.twilio_call_sid);

    // Query recordings and transcriptions
    let recordingsMap: Record<string, any> = {};
    let transcriptionsMap: Record<string, any> = {};
    
    if (twilioCallSids.length > 0) {
      const [recordingsData, transcriptionsData] = await Promise.all([
        this.client
          .from('call_recordings')
          .select('*')
          .in('call_sid', twilioCallSids)
          .is('deleted_at', null),
        this.client
          .from('call_transcriptions')
          .select('*')
          .in('call_sid', twilioCallSids)
          .is('deleted_at', null),
      ]);

      if (recordingsData.data) {
        recordingsData.data.forEach(r => {
          recordingsMap[r.call_sid] = r;
        });
      }
      if (transcriptionsData.data) {
        transcriptionsData.data.forEach(t => {
          transcriptionsMap[t.call_sid] = t;
        });
      }
    }

    // Combine all data
    const leads: LeadWithSession[] = leadsData.map((lead: any) => {
      const session = sessionsMap[lead.session_id] || null;
      const twilioSid = session?.twilio_call_sid;
      const recording = twilioSid ? recordingsMap[twilioSid] : null;
      const transcription = twilioSid ? transcriptionsMap[twilioSid] : null;

      return {
        ...lead,
        session_id: session?.session_id || null,
        twilio_call_sid: twilioSid || null,
        session_start_time: session?.started_at || session?.created_at || null,
        session_end_time: session?.ended_at || null,
        duration_seconds: session?.duration_seconds || null,
        recording_url: recording?.recording_url || null,
        recording_duration: recording?.duration_seconds || null,
        transcription: transcription?.transcription_text || null,
        transcription_url: transcription?.transcription_url || null,
      };
    });

    return { leads, total: count || 0 };
  }

  /**
   * Get a single lead with full details
   */
  async getLeadById(leadId: string, tenantId: string): Promise<LeadWithSession | null> {
    // Query lead first
    const { data: leadData, error: leadError } = await this.client
      .from('leads')
      .select('*')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (leadError || !leadData) {
      console.error('Error fetching lead:', leadError);
      return null;
    }

    // Get session if exists
    let session: any = null;
    if (leadData.session_id) {
      const { data: sessionData } = await this.client
        .from('intake_sessions')
        .select('*')
        .eq('session_id', leadData.session_id)
        .single();
      session = sessionData;
    }

    // Get recording and transcription
    let recording: any = null;
    let transcription: any = null;
    if (session?.twilio_call_sid) {
      const [recordingData, transcriptionData] = await Promise.all([
        this.client
          .from('call_recordings')
          .select('*')
          .eq('call_sid', session.twilio_call_sid)
          .is('deleted_at', null)
          .maybeSingle(),
        this.client
          .from('call_transcriptions')
          .select('*')
          .eq('call_sid', session.twilio_call_sid)
          .is('deleted_at', null)
          .maybeSingle(),
      ]);
      recording = recordingData.data;
      transcription = transcriptionData.data;
    }

    return {
      ...leadData,
      session_id: session?.session_id || null,
      twilio_call_sid: session?.twilio_call_sid || null,
      session_start_time: session?.started_at || session?.created_at || null,
      session_end_time: session?.ended_at || null,
      duration_seconds: session?.duration_seconds || null,
      recording_url: recording?.recording_url || null,
      recording_duration: recording?.duration_seconds || null,
      transcription: transcription?.transcription_text || null,
      transcription_url: transcription?.transcription_url || null,
    };
  }

  /**
   * Get intake responses for a session
   */
  async getSessionResponses(sessionId: string): Promise<IntakeResponse[]> {
    const { data, error } = await this.client
      .from('intake_responses')
      .select('*')
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .order('captured_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a lead with intake responses (for seeding)
   */
  async createLeadWithResponses(params: {
    tenantId: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone: string;
    status: string;
    practiceAreaCode?: string | null;
    leadScore?: number | null;
    transcription?: string | null;
    responses: Array<{
      question_key: string;
      response_value: string;
      response_type: string;
    }>;
  }): Promise<{ leadId: string; sessionId: string } | null> {
    try {
      const leadId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Create lead FIRST (without session_id due to circular FK)
      const { error: leadError } = await this.client
        .from('leads')
        .insert({
          lead_id: leadId,
          tenant_id: params.tenantId,
          first_name: params.firstName,
          last_name: params.lastName || null,
          email: params.email || null,
          phone: params.phone,
          status: params.status,
          practice_area_code: params.practiceAreaCode || null,
          lead_score: params.leadScore || null,
          session_id: null, // Will be updated after session creation
          created_at: now,
          updated_at: now,
        });

      if (leadError) {
        console.error('Error creating lead:', leadError);
        return null;
      }

      // Create session (with lead_id)
      const { error: sessionError } = await this.client
        .from('intake_sessions')
        .insert({
          session_id: sessionId,
          tenant_id: params.tenantId,
          lead_id: leadId,
          twilio_call_sid: `SEED-${sessionId.slice(0, 8)}`,
          started_at: now,
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        // Session creation failed, but lead was created - continue
      }

      // Update lead with session_id
      if (!sessionError) {
        await this.client
          .from('leads')
          .update({ session_id: sessionId, updated_at: now })
          .eq('lead_id', leadId);
      }

      // Create transcription if provided
      if (params.transcription) {
        await this.client
          .from('call_transcriptions')
          .insert({
            transcription_id: crypto.randomUUID(),
            call_sid: `SEED-${sessionId.slice(0, 8)}`,
            session_id: sessionId,
            transcription_text: params.transcription,
            status: 'completed',
            language_code: 'en-US',
          });
      }

      // Create intake responses
      if (params.responses.length > 0) {
        const responseRecords = params.responses.map((r) => ({
          response_id: crypto.randomUUID(),
          session_id: sessionId,
          question_key: r.question_key,
          response_value: r.response_value,
          response_type: r.response_type,
          captured_at: now,
          // Required field for intake_responses table
          state_name: 'completed',
        }));

        const { error: responsesError } = await this.client
          .from('intake_responses')
          .insert(responseRecords);

        if (responsesError) {
          console.error('Error creating responses:', responsesError);
        }
      }

      return { leadId, sessionId };
    } catch (error) {
      console.error('Error in createLeadWithResponses:', error);
      return null;
    }
  }

  /**
   * Clear all leads for a tenant (for reseeding)
   */
  async clearLeadsForTenant(tenantId: string): Promise<boolean> {
    try {
      // Step 1: Get all session IDs for this tenant directly from sessions table
      const { data: sessions } = await this.client
        .from('intake_sessions')
        .select('session_id')
        .eq('tenant_id', tenantId);

      const sessionIds = (sessions || []).map((s: any) => s.session_id);

      // Step 2: Delete child records first
      if (sessionIds.length > 0) {
        // Delete intake_responses
        await this.client
          .from('intake_responses')
          .delete()
          .in('session_id', sessionIds);
        
        // Delete call_transcriptions
        await this.client
          .from('call_transcriptions')
          .delete()
          .in('session_id', sessionIds);
        
        // Delete call_recordings
        await this.client
          .from('call_recordings')
          .delete()
          .in('session_id', sessionIds);
      }

      // Step 3: Delete sessions (by tenant_id)
      await this.client
        .from('intake_sessions')
        .delete()
        .eq('tenant_id', tenantId);

      // Step 4: Delete leads
      const { error } = await this.client
        .from('leads')
        .delete()
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error clearing leads:', error);
        return false;
      }

      console.log(`Cleared data for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Error in clearLeadsForTenant:', error);
      return false;
    }
  }

  /**
   * Unlock a lead - record unlock event and return updated lead
   */
  async unlockLead(leadId: string, tenantId: string, unlockedBy: string): Promise<boolean> {
    const { error } = await this.client
      .from('leads')
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by: unlockedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error unlocking lead:', error);
      return false;
    }

    return true;
  }

  // ==========================================================================
  // RECORDINGS
  // ==========================================================================

  /**
   * Get call recording by call_sid
   */
  async getRecordingByCallSid(callSid: string): Promise<CallRecording | null> {
    const { data, error } = await this.client
      .from('call_recordings')
      .select('*')
      .eq('call_sid', callSid)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recording:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all recordings for a session
   */
  async getSessionRecordings(sessionId: string): Promise<CallRecording[]> {
    const { data, error } = await this.client
      .from('call_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================================================
  // TRANSCRIPTIONS
  // ==========================================================================

  /**
   * Get call transcription by call_sid
   */
  async getTranscriptionByCallSid(callSid: string): Promise<CallTranscription | null> {
    const { data, error } = await this.client
      .from('call_transcriptions')
      .select('*')
      .eq('call_sid', callSid)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching transcription:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all transcriptions for a session
   */
  async getSessionTranscriptions(sessionId: string): Promise<CallTranscription[]> {
    const { data, error } = await this.client
      .from('call_transcriptions')
      .select('*')
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transcriptions:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get intake statistics for a tenant
   */
  async getIntakeStats(tenantId: string): Promise<{
    total_leads: number;
    new_leads: number;
    qualified_leads: number;
    converted_leads: number;
    avg_lead_score: number;
  }> {
    const { data: totalData, error: totalError } = await this.client
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const { count: totalLeads } = await this.client
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const { count: newLeads } = await this.client
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'new')
      .is('deleted_at', null);

    const { count: qualifiedLeads } = await this.client
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_qualified', true)
      .is('deleted_at', null);

    const { count: convertedLeads } = await this.client
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'converted')
      .is('deleted_at', null);

    // Get average lead score
    const { data: scoreData } = await this.client
      .from('leads')
      .select('lead_score')
      .eq('tenant_id', tenantId)
      .not('lead_score', 'is', null)
      .is('deleted_at', null);

    const avgScore = scoreData && scoreData.length > 0
      ? scoreData.reduce((sum, l) => sum + (l.lead_score || 0), 0) / scoreData.length
      : 0;

    return {
      total_leads: totalLeads || 0,
      new_leads: newLeads || 0,
      qualified_leads: qualifiedLeads || 0,
      converted_leads: convertedLeads || 0,
      avg_lead_score: Math.round(avgScore),
    };
  }

  /**
   * Update lead status (attorney manual action)
   */
  async updateLeadStatus(leadId: string, tenantId: string, status: string): Promise<void> {
    const { error } = await this.client
      .from('leads')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update lead status: ${error.message}`);
    }
  }

  /**
   * Get attorney notes for a lead (stored as JSON array in the notes column)
   */
  async getLeadNotes(leadId: string, tenantId: string): Promise<Array<{ id: string; text: string; timestamp: string }>> {
    const { data, error } = await this.client
      .from('leads')
      .select('notes')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !data || !data.notes) return [];
    try {
      const parsed = JSON.parse(data.notes);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Save attorney notes for a lead (replaces entire notes array)
   */
  async saveLeadNotes(
    leadId: string,
    tenantId: string,
    notes: Array<{ id: string; text: string; timestamp: string }>
  ): Promise<boolean> {
    const { error } = await this.client
      .from('leads')
      .update({
        notes: JSON.stringify(notes),
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error saving lead notes:', error);
      return false;
    }
    return true;
  }

  /**
   * Fetch the SMS thread for a lead from the dedicated sms_threads table.
   * This table is written by the Tenant App (outbound via Twilio send,
   * inbound via Twilio webhook). The portal reads only.
   */
  async getSmsThreadFromTable(
    leadId: string,
    tenantId: string
  ): Promise<Array<{ id: string; direction: 'outbound' | 'inbound'; text: string; timestamp: string; twilio_sid?: string }>> {
    const { data, error } = await this.client
      .from('sms_threads')
      .select('id, direction, message_body, sent_at, twilio_message_sid')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId)
      .order('sent_at', { ascending: true });

    if (error || !data) return [];
    return (data as any[]).map(row => ({
      id:         row.id,
      direction:  row.direction as 'outbound' | 'inbound',
      text:       row.message_body,
      timestamp:  row.sent_at,
      ...(row.twilio_message_sid ? { twilio_sid: row.twilio_message_sid } : {}),
    }));
  }

  /**
   * Get the SMS thread for a lead (stored as JSON array in the sms_thread column)
   * Direction: 'outbound' = attorney sent, 'inbound' = prospect replied
   */
  async getLeadSmsThread(
    leadId: string,
    tenantId: string
  ): Promise<Array<{ id: string; direction: 'outbound' | 'inbound'; text: string; timestamp: string; twilio_sid?: string }>> {
    const { data, error } = await this.client
      .from('leads')
      .select('sms_thread')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !data || !(data as any).sms_thread) return [];
    try {
      const parsed = JSON.parse((data as any).sms_thread);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Append a single SMS message to the lead's thread and persist.
   * Returns the updated full thread.
   */
  async appendSmsMessage(
    leadId: string,
    tenantId: string,
    message: { id: string; direction: 'outbound' | 'inbound'; text: string; timestamp: string; twilio_sid?: string }
  ): Promise<Array<{ id: string; direction: 'outbound' | 'inbound'; text: string; timestamp: string; twilio_sid?: string }>> {
    const existing = await this.getLeadSmsThread(leadId, tenantId);
    const updated  = [...existing, message]; // chronological order (oldest first)

    const { error } = await this.client
      .from('leads')
      .update({
        sms_thread: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error saving SMS thread:', error);
    }
    return updated;
  }
}

// Export singleton instance
export const tenantDb = new TenantDatabase();
