/**
 * Customer Support API Client
 * Calls the portal's own cs-support proxy routes — never the FLS service directly.
 * All requests go through Next.js API routes that inject the service API key server-side.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketChannel = 'chat' | 'email' | 'sms' | 'form' | 'phone';
export type SenderType = 'customer' | 'agent';

export interface SupportTicket {
  ticket_id: string;
  tenant_id: string;
  customer_email: string;
  customer_name?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  source: string;
  stage: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketMessage {
  message_id: string;
  ticket_id: string;
  sender_type: SenderType;
  sender_id: string;
  body: string;
  created_at: string;
  metadata?: {
    ai_generated?: boolean;
    ai_processed?: boolean;
    confidence?: number;
    channel?: string;
    [key: string]: unknown;
  };
}

export interface KBArticle {
  id: string;
  title: string;
  content?: string;
  category_id?: string;
  slug?: string;
  helpful_count?: number;
}

// ─── Client ────────────────────────────────────────────────────────────────

export const csSupportClient = {

  /**
   * List tickets for the current customer
   */
  async getTickets(tenantId: string, options?: {
    status?: TicketStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ data: SupportTicket[]; count: number }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const res = await fetch(`/api/cs-support/tickets?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
    const json = await res.json();
    // FLS returns { data: [...] } or { tickets: [...] }
    return {
      data: json.data ?? json.tickets ?? [],
      count: json.count ?? json.data?.length ?? json.tickets?.length ?? 0,
    };
  },

  /**
   * Create a new support ticket
   */
  async createTicket(params: {
    tenant_id: string;
    subject: string;
    message: string;
    channel?: TicketChannel;
    priority?: TicketPriority;
  }): Promise<SupportTicket> {
    const res = await fetch('/api/cs-support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create ticket: ${res.status}`);
    }
    const json = await res.json();
    return json.data ?? json.ticket;
  },

  /**
   * Get messages for a ticket thread (non-internal only)
   */
  async getMessages(ticketId: string, tenantId: string): Promise<TicketMessage[]> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    const res = await fetch(
      `/api/cs-support/tickets/${ticketId}/messages?${params.toString()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
    const json = await res.json();
    return json.data ?? json.messages ?? [];
  },

  /**
   * Send a customer reply to an existing ticket
   */
  async replyToTicket(ticketId: string, tenantId: string, message: string): Promise<TicketMessage> {
    const res = await fetch(`/api/cs-support/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to send reply: ${res.status}`);
    }
    const json = await res.json();
    return json.data ?? json.message;
  },

  /**
   * Mark a ticket as resolved (customer self-close)
   */
  async resolveTicket(ticketId: string, tenantId: string): Promise<SupportTicket> {
    const res = await fetch(`/api/cs-support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, status: 'resolved' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to resolve ticket: ${res.status}`);
    }
    const json = await res.json();
    return json.data ?? json.ticket;
  },

  /**
   * Search the knowledge base
   */
  async searchKB(query: string, tenantId?: string, limit = 8): Promise<KBArticle[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (tenantId) params.set('tenant_id', tenantId);
    const res = await fetch(`/api/cs-support/kb?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? json.articles ?? [];
  },
};
