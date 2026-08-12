/**
 * INTAKE Service API Client (server-side only)
 *
 * Proxies calls to the Tenant App's INTAKE API. All data flows through
 * the Tenant App's REST endpoints — never queries the Tenant App Supabase
 * directly. This preserves the service-ownership boundary.
 */

const TENANT_APP_URL = process.env.TENANT_APP_URL || 'http://localhost:8000';
const API_KEY = process.env.TENANT_APP_API_KEY || '';

async function intakeFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<T | null> {
  const url = new URL(`${TENANT_APP_URL}/api/v1/${path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface IntakeRecording {
  recording_id: string;
  call_sid: string;
  session_id: string;
  recording_url: string;
  duration_seconds: number;
  status: string;
}

export interface IntakeTranscription {
  transcription_id: string;
  call_sid: string;
  session_id: string;
  transcription_text: string;
  status: string;
  language_code: string;
}

export interface SmsThreadMessage {
  id: string;
  direction: 'outbound' | 'inbound';
  text: string;
  timestamp: string;
  twilio_sid?: string;
}

export interface IntakeLead {
  lead_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  status: string;
}

export async function getRecording(callSid: string): Promise<IntakeRecording | null> {
  return intakeFetch<IntakeRecording>(`intake/recordings/${callSid}`);
}

export async function getTranscription(callSid: string): Promise<IntakeTranscription | null> {
  return intakeFetch<IntakeTranscription>(`intake/transcriptions/${callSid}`);
}

export async function getSmsThread(leadId: string, tenantId: string): Promise<SmsThreadMessage[]> {
  const result = await intakeFetch<{ thread: SmsThreadMessage[] }>(
    `intake/leads/${leadId}/sms`,
    { params: { tenant_id: tenantId } }
  );
  return result?.thread ?? [];
}

export async function getLeads(
  tenantId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ leads: IntakeLead[]; total: number } | null> {
  const params: Record<string, string> = { tenant_id: tenantId };
  if (options?.status) params.status = options.status;
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  return intakeFetch<{ leads: IntakeLead[]; total: number }>('intake/leads', { params });
}

export async function sendSms(
  leadId: string,
  tenantId: string,
  messageText: string
): Promise<{ success: boolean; message_sid?: string } | null> {
  return intakeFetch<{ success: boolean; message_sid?: string }>(
    `intake/leads/${leadId}/sms`,
    {
      method: 'POST',
      body: { tenant_id: tenantId, message_text: messageText },
    }
  );
}

const intakeApi = {
  getRecording,
  getTranscription,
  getSmsThread,
  getLeads,
  sendSms,
};

export default intakeApi;
