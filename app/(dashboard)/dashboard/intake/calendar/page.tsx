'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useTenantDev } from '@/hooks/useTenant';
import { isUnlockAvailable } from '@/lib/utils/case-scoring';
import { maskProspectId } from '@/components/intake/TokenizedSummaryCard';
import { toast } from 'sonner';

interface Consultation {
  lead_id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  practice_area_code: string | null;
  booking_date: string;
  status: string;
  lead_grade: string | null;
  assigned_attorney: string | null;
  unlocked_at?: string | null;
  answers?: { question_key: string; response_value: string; response_type: string; captured_at: string }[];
}

// Helper: resolve display name based on unlock state
function getDisplayName(slot: Consultation): string {
  const completion = isUnlockAvailable(
    slot.answers || [],
    (slot.practice_area_code || 'personal_injury') as any
  ).completion;
  const isLocked = completion >= 75 && !slot.unlocked_at;
  if (isLocked) return maskProspectId(slot.lead_id);
  return `${slot.first_name} ${slot.last_name || ''}`.trim();
}

export default function CalendarPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleUnlock = async (leadId: string) => {
    setUnlockingId(leadId)
    try {
      const res = await fetch(`/api/intake/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      if (!res.ok) throw new Error('Unlock failed')
      const data = await res.json()
      toast.success('Lead unlocked — appointment pushed to attorney calendar')

      setConsultations((prev) =>
        prev.map((c) =>
          c.lead_id === leadId
            ? { ...c, unlocked_at: new Date().toISOString(), first_name: data.first_name, last_name: data.last_name }
            : c,
        ),
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock lead')
    } finally {
      setUnlockingId(null)
    }
  };

  useEffect(() => {
    const fetchConsultations = async () => {
      if (tenantLoading || !tenantId) {
        if (!tenantLoading && !tenantId) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/intake/leads?tenant_id=${tenantId}&status=scheduled&limit=100`);
        
        if (response.ok) {
          const data = await response.json();
          // Filter to only leads with booking_date
          const scheduled = (data.leads || []).filter((lead: any) => lead.booking_date);
          setConsultations(scheduled);
        }
      } catch (err) {
        console.error('Error fetching consultations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [tenantId, tenantLoading]);

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Get month dates
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: Date[] = [];
    
    // Add days from previous month to fill first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Add all days of the month plus padding
    while (dates.length < 42) { // 6 weeks * 7 days
      dates.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return dates;
  };

  // Group consultations by date
  const consultationsByDate = useMemo(() => {
    const grouped: Record<string, Consultation[]> = {};
    
    consultations.forEach(consultation => {
      const dateKey = new Date(consultation.booking_date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(consultation);
    });
    
    return grouped;
  }, [consultations]);

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date for header
  const formatHeaderDate = () => {
    if (viewMode === 'week') {
      const week = getWeekDates(currentDate);
      const start = week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = week[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with days */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            Time
          </div>
          {weekDates.map((date, idx) => (
            <div 
              key={idx} 
              className={`p-3 text-center border-l border-gray-200 dark:border-gray-700 ${
                isToday(date) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-semibold ${
                isToday(date) 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {date.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-700/50">
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              {weekDates.map((date, idx) => {
                const dateKey = date.toDateString();
                const slots = consultationsByDate[dateKey] || [];
                const hourSlots = slots.filter(s => new Date(s.booking_date).getHours() === hour);

                return (
                  <div 
                    key={idx} 
                    className={`p-1 border-l border-gray-100 dark:border-gray-700/50 min-h-[60px] ${
                      isToday(date) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    {hourSlots.map((slot) => {
                      const completion = isUnlockAvailable(
                        slot.answers || [],
                        (slot.practice_area_code || 'personal_injury') as any,
                      ).completion
                      const isLocked = completion >= 75 && !slot.unlocked_at

                      return (
                        <div key={slot.lead_id} className="mb-1">
                          <Link
                            href={`/dashboard/intake/lead/${slot.lead_id}`}
                            className="block p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <p className="font-medium text-green-800 dark:text-green-300 truncate">
                              {getDisplayName(slot)}
                            </p>
                            <p className="text-green-600 dark:text-green-400">
                              {formatTime(slot.booking_date)}
                            </p>
                          </Link>
                          {isLocked && (
                            <button
                              onClick={(e) => { e.preventDefault(); handleUnlock(slot.lead_id) }}
                              disabled={unlockingId === slot.lead_id}
                              className="mt-1 w-full text-xs bg-amber-100 text-amber-800 px-1 py-0.5 rounded hover:bg-amber-200 disabled:opacity-50"
                            >
                              {unlockingId === slot.lead_id ? 'Unlocking...' : 'Unlock A+ Lead'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with weekdays */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {monthDates.map((date, idx) => {
            const dateKey = date.toDateString();
            const slots = consultationsByDate[dateKey] || [];

            return (
              <div 
                key={idx} 
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-700/50 ${
                  !isCurrentMonth(date) ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                } ${isToday(date) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
              >
                <p className={`text-sm font-medium mb-1 ${
                  isToday(date) 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : isCurrentMonth(date) 
                      ? 'text-gray-900 dark:text-gray-100' 
                      : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {date.getDate()}
                </p>
                {slots.slice(0, 3).map((slot) => {
                  const completion = isUnlockAvailable(
                    slot.answers || [],
                    (slot.practice_area_code || 'personal_injury') as any,
                  ).completion
                  const isLocked = completion >= 75 && !slot.unlocked_at

                  return (
                    <div key={slot.lead_id} className="mb-1">
                      <Link
                        href={`/dashboard/intake/lead/${slot.lead_id}`}
                        className="block p-1.5 bg-green-100 dark:bg-green-900/30 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      >
                        <p className="font-medium text-green-800 dark:text-green-300 truncate">
                          {getDisplayName(slot)}
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          {formatTime(slot.booking_date)}
                        </p>
                      </Link>
                      {isLocked && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleUnlock(slot.lead_id) }}
                          disabled={unlockingId === slot.lead_id}
                          className="mt-0.5 w-full text-[10px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded hover:bg-amber-200 disabled:opacity-50"
                        >
                          {unlockingId === slot.lead_id ? '...' : 'Unlock'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {slots.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                    +{slots.length - 3} more
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Upcoming consultations list
  const upcomingConsultations = useMemo(() => {
    const now = new Date();
    return consultations
      .filter(c => new Date(c.booking_date) >= now)
      .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
      .slice(0, 5);
  }, [consultations]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/intake" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4">
          <ArrowLeft size={20} />
          Back to INTAKE Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">TrueVow Calendar</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View consultations scheduled by Benjamin during intake calls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
              >
                Today
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-4">
                {formatHeaderDate()}
              </h2>
            </div>
            
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {/* Render the grid immediately — loading indicator is non-blocking
              so Week/Month/nav buttons always work while data fetches */}
          {loading ? (
            <div className="relative">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                Loading consultations...
              </div>
              {viewMode === 'week' ? renderWeekView() : renderMonthView()}
            </div>
          ) : consultations.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Scheduled Consultations
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                When Benjamin schedules consultations during intake calls, they'll appear here. 
                Consultations are booked automatically based on your calendar configuration.
              </p>
            </div>
          ) : (
            viewMode === 'week' ? renderWeekView() : renderMonthView()
          )}
        </div>

        {/* Sidebar - Upcoming */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              Upcoming
            </h3>
            
            {upcomingConsultations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No upcoming consultations scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingConsultations.map((consultation) => (
                  <Link
                    key={consultation.lead_id}
                    href={`/dashboard/intake/lead/${consultation.lead_id}`}
                    className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {getDisplayName(consultation)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {consultation.practice_area_code || 'General'}
                        </p>
                      </div>
                      {consultation.lead_grade && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                          {consultation.lead_grade}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {new Date(consultation.booking_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} at {formatTime(consultation.booking_date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              This Week
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {consultations.filter(c => {
                    const bookingDate = new Date(c.booking_date);
                    const weekStart = new Date(currentDate);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    return bookingDate >= weekStart && bookingDate <= weekEnd;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total This Month</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {consultations.filter(c => {
                    const bookingDate = new Date(c.booking_date);
                    return bookingDate.getMonth() === currentDate.getMonth() &&
                           bookingDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
