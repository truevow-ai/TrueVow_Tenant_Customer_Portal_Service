'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, AlertTriangle, Clock, Loader2, AlertCircle, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { useTenantDev } from '@/hooks/useTenant';
import { Events } from '@/lib/analytics/events';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name: string;
  role: string;
  services: string[];
  practice_areas: string[];
  status: string;
  lastActive?: string;
  lastSignInAt?: number;
  bookings_this_month: number;
  avatar: string;
  imageUrl?: string;
}

interface ServiceAccess {
  id: string;
  name: string;
  enabled: boolean;
  members: number;
}

export default function TeamPage() {
  const { tenantId, isLoading: tenantLoading, error: tenantError } = useTenantDev();
  const { features, isLoading: featuresLoading } = useFeatureAccess();
  const tier = features?.tier;
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceAccess[]>([]);

  useEffect(() => {
    const fetchTeamData = async () => {
      // Wait for tenant context to load
      if (tenantLoading) return;
      
      if (!tenantId) {
        setError(tenantError || 'No tenant context available');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        // Fetch team members from Clerk API
        const response = await fetch('/api/team/invite');
        
        if (!response.ok) {
          throw new Error('Failed to fetch team members');
        }
        
        const data = await response.json();
        
        if (data.success && data.members) {
          // Transform API response to TeamMember format
          const members: TeamMember[] = data.members.map((m: any) => ({
            id: m.id,
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName,
            fullName: m.fullName,
            name: m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
            role: m.role || 'staff',
            services: m.services || [],
            practice_areas: [],
            status: 'active',
            lastActive: m.lastSignInAt ? new Date(m.lastSignInAt).toISOString() : null,
            lastSignInAt: m.lastSignInAt,
            bookings_this_month: 0,
            avatar: m.firstName && m.lastName 
              ? `${m.firstName[0]}${m.lastName[0]}`.toUpperCase()
              : m.email.substring(0, 2).toUpperCase(),
            imageUrl: m.imageUrl,
          }));
          setTeamMembers(members);
          
          // Calculate service access counts
          const serviceCounts: Record<string, number> = {};
          members.forEach(m => {
            m.services.forEach(s => {
              serviceCounts[s] = (serviceCounts[s] || 0) + 1;
            });
          });
          
          setAvailableServices([
            { id: 'intake', name: 'INTAKE', enabled: true, members: serviceCounts['intake'] || 0 },
            { id: 'draft', name: 'LEVERAGE', enabled: true, members: serviceCounts['draft'] || 0 },
            { id: 'settle', name: 'SETTLE', enabled: true, members: serviceCounts['settle'] || 0 },
            { id: 'verify', name: 'VERIFY', enabled: true, members: serviceCounts['verify'] || 0 },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch team data:', err);
        setError('Failed to load team data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [tenantId, tenantLoading, tenantError]);

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch('/api/team/invite', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: memberId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }
      
      // Remove from local state
      Events.staffActionTaken({ tenant_id: tenantId ?? undefined, action: 'member_removed' });
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      setMemberToRemove(null);
      
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      setRemoveError(err.message || 'Failed to remove team member');
    }
  };

  // ─── Solo tier gate ───────────────────────────────────────────────────────
  // Team Management is a Growth-tier feature (multiple user seats).
  // Solo 24/7 is a single-seat plan — show an upgrade prompt instead of a broken error.
  if (!featuresLoading && tier === 'solo') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Team Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage attorneys and staff members across your firm
          </p>
        </div>
        <div className="max-w-2xl">
          <div className="bg-card border-2 border-border rounded-lg p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground mb-2">
              Team Management is a Growth Plan Feature
            </h2>
            <p className="text-muted-foreground mb-2">
              Your account is on the <strong className="text-card-foreground">Solo 24/7 Plan</strong> — a single-seat subscription designed for solo practitioners.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Upgrade to the <strong className="text-card-foreground">Growth Plan</strong> to invite attorneys and staff, assign service access per member, and manage your firm as a team.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6 text-left">
              {[
                'Multiple attorney &amp; staff seats',
                'Per-member service access control',
                'Calendar assignment per attorney',
                'Team-level intake routing',
                'Practice area assignment',
                'Monthly team performance reporting',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-card-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              View Growth Plan Options
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-card-foreground font-medium mb-2">Unable to load team members</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats from actual data
  const attorneysCount = teamMembers.filter(m => m.role.includes('Attorney')).length;
  const today = new Date().toISOString().split('T')[0];
  const activeToday = teamMembers.filter(m => m.lastActive?.startsWith(today)).length;

  return (
    <div>
      <div className="mb-2">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Settings
        </Link>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Manage attorneys and staff members - assign calendars, practice areas, and service access
          </p>
        </div>
        <Link
          href="/dashboard/team/invite"
          className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          Invite Member
        </Link>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Attorneys</p>
              <p className="text-xl font-bold text-gray-900">{attorneysCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Logged In Today</p>
              <p className="text-xl font-bold text-gray-900">{activeToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            {teamMembers.length} active member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {teamMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">No team members yet</p>
            <p className="text-gray-600 text-sm mb-4">Invite your first team member to get started</p>
            <Link
              href="/dashboard/team/invite"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Link>
          </div>
        ) : (
        <div className="divide-y divide-gray-200">
          {teamMembers.map((member) => (
            <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary-100 text-primary-600 p-3 font-bold">
                  {member.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{member.role}</span>
                    {member.practice_areas.length > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{member.practice_areas.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Service Access:</p>
                  <div className="flex gap-2 flex-wrap">
                    {member.services.map((service) => (
                      <span
                        key={service}
                        className="inline-block rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium"
                      >
                        {service.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/team/edit/${member.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setMemberToRemove(member.id)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Removal</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this team member? This action cannot be undone.
            </p>
            {removeError && (
              <p className="text-sm text-red-600 mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-2">{removeError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setMemberToRemove(null); setRemoveError(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

