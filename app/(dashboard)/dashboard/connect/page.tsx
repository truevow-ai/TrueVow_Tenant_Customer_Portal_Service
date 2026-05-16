'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Users, DollarSign, TrendingUp, Clock, Handshake, Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { connectClient, ReferralStats, Referral } from '@/lib/api/connect-client';

// Default empty stats
const emptyStats: ReferralStats = {
  totalReferrals: 0,
  acceptedReferrals: 0,
  pendingReferrals: 0,
  totalPayouts: 0,
  pendingPayouts: 0,
};

// Network partner interface
interface NetworkPartner {
  id: string;
  name: string;
  specialty: string;
  referrals_sent: number;
  rating: number;
}

export default function ConnectPage() {
  const [stats, setStats] = useState<ReferralStats>(emptyStats);
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [networkPartners, setNetworkPartners] = useState<NetworkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats from API
        const statsData = await connectClient.getStats();
        setStats(statsData);
        
        // Fetch referrals from API
        const referralsData = await connectClient.listReferrals({ limit: 10 });
        // Split into sent/received based on direction (API should provide this)
        // For now, show all as sent referrals
        setSentReferrals(referralsData.referrals);
        setReceivedReferrals([]);
        
        // TODO: Fetch network partners from API
        // const partnersData = await connectClient.getNetworkPartners();
        // setNetworkPartners(partnersData.partners);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch connect data:', err);
        setError('Failed to load referral data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">CONNECT Referral Network</h1>
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
              Oakwood Law Firm
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            Manage referrals, track payouts, and grow your network
          </p>
        </div>
        <Link
          href="/dashboard/connect/referrals/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          + Send Referral
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Referrals"
          value={stats.totalReferrals}
          subtitle="All time"
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Accepted"
          value={stats.acceptedReferrals}
          subtitle="Referrals accepted"
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Pending"
          value={stats.pendingReferrals}
          subtitle="Awaiting response"
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Total Payouts"
          value={`$${stats.totalPayouts.toLocaleString()}`}
          subtitle={`$${stats.pendingPayouts} pending`}
          icon={<DollarSign className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Send ReferralRefer a case to another attorney in the"
          description=" network"
          href="/dashboard/connect/referrals/new"
          icon={<Handshake className="h-8 w-8" />}
        />
        <ActionCard
          title="View Referrals"
          description="See all your sent and received referrals"
          href="/dashboard/connect/referrals"
          icon={<Gift className="h-8 w-8" />}
        />
        <ActionCard
          title="Payouts"
          description="Track your referral payouts and earnings"
          href="/dashboard/connect/payouts"
          icon={<DollarSign className="h-8 w-8" />}
        />
      </div>

      {/* Recent Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sent Referrals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sent Referrals</h2>
            <Link href="/dashboard/connect/referrals" className="text-sm text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {sentReferrals.length === 0 ? (
              <p className="text-gray-500 text-sm">No referrals sent yet</p>
            ) : (
              sentReferrals.map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{ref.caseType}</p>
                    <p className="text-sm text-gray-500">To: {ref.referredAttorney.name} ({ref.referredAttorney.firm})</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={ref.status} />
                    {ref.payoutAmount && (
                      <p className="text-sm font-semibold text-green-600 mt-1">+${ref.payoutAmount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Received Referrals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Received Referrals</h2>
            <Link href="/dashboard/connect/referrals" className="text-sm text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {receivedReferrals.length === 0 ? (
              <p className="text-gray-500 text-sm">No referrals received yet</p>
            ) : (
              receivedReferrals.map(ref => (
                <div key={ref.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{ref.caseType}</p>
                    <StatusBadge status={ref.status} />
                  </div>
                  <p className="text-sm text-gray-500">From: {ref.referringAttorney?.name || 'Unknown'}</p>
                  {ref.payoutAmount && (
                    <p className="text-sm font-semibold text-indigo-600 mt-1">${ref.payoutAmount.toLocaleString()}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Network Partners */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Network Partners</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Specialty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Referrals Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {networkPartners.map((partner, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{partner.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{partner.specialty}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{partner.referrals_sent}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-yellow-600">
                      ★ {partner.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    accepted: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    declined: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[status]}`}>
      {status}
    </span>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary-50 p-3 text-primary-600">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </div>
    </Link>
  );
}

