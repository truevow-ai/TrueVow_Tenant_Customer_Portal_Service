'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, MessageSquare, Loader2, AlertCircle, CheckCircle,
  Info, AlertTriangle, Send, ArrowLeft, Bot, User,
  RefreshCw, CheckCheck, ExternalLink, Ticket,
} from 'lucide-react';
import { useTenantDev } from '@/hooks/useTenant';
import { Events } from '@/lib/analytics/events';
import {
  csSupportClient,
  SupportTicket,
  TicketMessage,
  TicketStatus,
} from '@/lib/api/cs-support-client';

// ─── Local Types ────────────────────────────────────────────────────────────

interface PlatformNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

type SupportView = 'list' | 'thread';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function formatFullDate(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending Reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

const NOTIFICATION_ICON: Record<PlatformNotification['type'], React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-600" />,
  error: <AlertCircle className="h-5 w-5 text-red-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { tenantId, isLoading: tenantLoading } = useTenantDev();

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'notifications' | 'support'>('notifications');

  // ── Platform Notifications (SaaS Admin portal_notifications) ─────────────
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  /** Map SaaS Admin notification_type → UI severity bucket */
  function mapType(type: string): PlatformNotification['type'] {
    if (['payment_failed', 'trial_expiring', 'system_alert'].includes(type)) return 'warning';
    if (['lead_unlock_charged', 'billing_invoice'].includes(type)) return 'success';
    return 'info';
  }

  const loadNotifications = useCallback(async () => {
    if (!tenantId) return;
    setNotificationsLoading(true);
    try {
      const res = await fetch(`/api/notifications?tenant_id=${tenantId}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      const rows: PlatformNotification[] = (data.notifications ?? []).map((n: any) => ({
        id:        n.notification_id,
        type:      mapType(n.notification_type),
        title:     n.title,
        message:   n.body || '',
        timestamp: n.created_at,
        read:      n.is_read ?? false,
        actionUrl: n.resource_id ? undefined : undefined,
      }));
      setNotifications(rows);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'notifications' && tenantId && !tenantLoading) {
      loadNotifications();
    }
  }, [activeTab, tenantId, tenantLoading, loadNotifications]);

  const markRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    Events.notificationViewed({ tenant_id: tenantId ?? undefined });
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, notificationId }),
      });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllRead = async () => {
    Events.notificationDismissed({ tenant_id: tenantId ?? undefined });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, markAll: true }),
      });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // ── Support Inbox state ───────────────────────────────────────────────────
  const [supportView, setSupportView] = useState<SupportView>('list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadTickets = useCallback(async () => {
    if (!tenantId) return;
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const result = await csSupportClient.getTickets(tenantId);
      setTickets(result.data);
    } catch (err: any) {
      setTicketsError(err.message || 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'support' && tenantId && !tenantLoading) {
      loadTickets();
    }
  }, [activeTab, tenantId, tenantLoading, loadTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Support actions ───────────────────────────────────────────────────────
  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSupportView('thread');
    setMessagesLoading(true);
    try {
      const msgs = await csSupportClient.getMessages(ticket.ticket_id, tenantId!);
      setMessages(msgs);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || !selectedTicket || !tenantId || sendingReply) return;
    setSendingReply(true);
    setReplyText('');
    try {
      const msg = await csSupportClient.replyToTicket(selectedTicket.ticket_id, tenantId, text);
      setMessages((prev) => [...prev, msg]);
      // Reopen if resolved/closed
      if (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'open' } : prev));
        setTickets((prev) =>
          prev.map((t) =>
            t.ticket_id === selectedTicket.ticket_id ? { ...t, status: 'open' } : t
          )
        );
      }
    } catch (err: any) {
      console.error('Reply failed:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply();
  };

  const resolveTicket = async () => {
    if (!selectedTicket || !tenantId || resolvingTicket) return;
    setResolvingTicket(true);
    try {
      const updated = await csSupportClient.resolveTicket(selectedTicket.ticket_id, tenantId);
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.ticket_id === updated.ticket_id ? updated : t)));
    } catch (err: any) {
      console.error('Resolve failed:', err);
    } finally {
      setResolvingTicket(false);
    }
  };

  const backToList = () => {
    setSupportView('list');
    setSelectedTicket(null);
    setMessages([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Messages & Notifications
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your support inbox and platform updates
          </p>
        </div>
        {activeTab === 'notifications' && (
          <div className="flex gap-2">
            <button
              disabled={unreadCount === 0}
              onClick={markAllRead}
              className="rounded-lg border border-border px-4 py-2 text-sm text-card-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark All Read
            </button>
            <button
              disabled={notifications.length === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm text-card-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        )}
        {activeTab === 'support' && supportView === 'list' && (
          <button
            onClick={loadTickets}
            disabled={ticketsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-card-foreground hover:bg-muted disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${ticketsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(
          [
            {
              key: 'notifications' as const,
              label: 'Notifications',
              icon: <Bell className="h-4 w-4" />,
              badge: unreadCount,
            },
            {
              key: 'support' as const,
              label: 'Support Inbox',
              icon: <MessageSquare className="h-4 w-4" />,
              badge: tickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'support' && supportView !== 'list') {
                setSupportView('list');
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs h-5 min-w-[20px] px-1.5 font-semibold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notifications Tab ─────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-card border border-border rounded-lg shadow">
          <div className="p-6 border-b border-border flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">All Notifications</h2>
          </div>
          {notificationsLoading && (
            <div className="p-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading notifications...</p>
            </div>
          )}
          {notifications.length === 0 && !notificationsLoading ? (
            <div className="p-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-card-foreground font-medium mb-1">No notifications yet</p>
              <p className="text-sm text-muted-foreground">
                Platform updates and TrueVow announcements will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`p-6 flex items-start gap-4 transition-colors ${
                    !n.read ? 'bg-blue-50 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">{NOTIFICATION_ICON[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-card-foreground">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelTime(n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
                      )}
                    </div>
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        className="text-sm text-primary hover:text-primary/80 mt-2 inline-block"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Support Inbox Tab ─────────────────────────────────────────────── */}
      {activeTab === 'support' && (
        <div>

          {/* ── Ticket List ──────────────────────────────────────────────── */}
          {supportView === 'list' && (
            <div className="bg-card border border-border rounded-lg shadow">
              <div className="p-6 border-b border-border flex items-center gap-2">
                <Ticket className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-card-foreground">My Support Tickets</h2>
              </div>

              {/* Loading */}
              {(ticketsLoading || tenantLoading) && (
                <div className="p-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading your tickets...</p>
                </div>
              )}

              {/* Error */}
              {!ticketsLoading && !tenantLoading && ticketsError && (
                <div className="p-16 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                  <p className="text-card-foreground font-medium mb-1">Failed to load tickets</p>
                  <p className="text-sm text-muted-foreground mb-4">{ticketsError}</p>
                  <button
                    onClick={loadTickets}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty */}
              {!ticketsLoading && !tenantLoading && !ticketsError && tickets.length === 0 && (
                <div className="p-16 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <p className="text-card-foreground font-medium mb-1">No support tickets yet</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Need help? Visit the TrueVow website to start a conversation with our support
                    team. Once your case is escalated, it will appear here.
                  </p>
                  <a
                    href="https://truevow.law/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-card-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Go to TrueVow Support
                  </a>
                </div>
              )}

              {/* Ticket list */}
              {!ticketsLoading && !tenantLoading && !ticketsError && tickets.length > 0 && (
                <div className="divide-y divide-border">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.ticket_id}
                      onClick={() => openTicket(ticket)}
                      className="w-full text-left p-5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
                            >
                              {STATUS_LABELS[ticket.status]}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {ticket.priority} priority
                            </span>
                          </div>
                          <p className="font-medium text-card-foreground truncate">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Opened {formatRelTime(ticket.created_at)}
                            {ticket.updated_at !== ticket.created_at &&
                              ` · Updated ${formatRelTime(ticket.updated_at)}`}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-sm">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Thread View ───────────────────────────────────────────────── */}
          {supportView === 'thread' && selectedTicket && (
            <div
              className="bg-card border border-border rounded-lg shadow flex flex-col"
              style={{ minHeight: '600px' }}
            >
              {/* Header */}
              <div className="p-5 border-b border-border flex items-start gap-3">
                <button
                  onClick={backToList}
                  className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-card-foreground"
                  aria-label="Back to tickets"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-card-foreground truncate">
                    {selectedTicket.subject}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedTicket.status]}`}
                    >
                      {STATUS_LABELS[selectedTicket.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Opened {formatFullDate(selectedTicket.created_at)}
                    </span>
                  </div>
                </div>
                {(selectedTicket.status === 'open' || selectedTicket.status === 'pending') && (
                  <button
                    onClick={resolveTicket}
                    disabled={resolvingTicket}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1.5 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-50"
                  >
                    {resolvingTicket ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    Mark Resolved
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No messages in this thread yet
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.sender_type === 'customer';
                    return (
                      <div
                        key={msg.message_id}
                        className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                            isCustomer
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCustomer ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`max-w-[70%] flex flex-col gap-1 ${
                            isCustomer ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm ${
                              isCustomer
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-muted text-card-foreground rounded-tl-sm'
                            }`}
                          >
                            {msg.body}
                          </div>
                          <span className="text-xs text-muted-foreground px-1">
                            {isCustomer ? 'You' : 'TrueVow Support'} ·{' '}
                            {formatRelTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box — open/pending tickets */}
              {(selectedTicket.status === 'open' || selectedTicket.status === 'pending') && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Type your reply… (Ctrl+Enter to send)"
                      rows={3}
                      className="flex-1 resize-none rounded-xl border border-border bg-background text-card-foreground placeholder:text-muted-foreground text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Send reply"
                    >
                      {sendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pl-1">
                    Replies are reviewed by the TrueVow customer success team
                  </p>
                </div>
              )}

              {/* Resolved — allow customer to reopen with a reply */}
              {selectedTicket.status === 'resolved' && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Send a message to reopen this ticket…"
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-border bg-background text-card-foreground placeholder:text-muted-foreground text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Send reply"
                    >
                      {sendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pl-1">
                    Replying will reopen this ticket
                  </p>
                </div>
              )}

              {/* Closed — no reply allowed */}
              {selectedTicket.status === 'closed' && (
                <div className="p-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    This ticket is closed.{' '}
                    <a
                      href="https://truevow.law/support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                    >
                      Contact support
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>{' '}
                    if you need further help.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
