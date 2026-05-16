import { redirect } from 'next/navigation';
import { connectClient } from '@/lib/api/connect-client';
import { hasServiceAccess } from '@/lib/subscriptions/service-access';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

export default async function ReferralsPage() {
  // Get tenantId from environment (production should use auth session)
  const tenantId = process.env.OAKWOOD_TENANT_ID;
  
  if (!tenantId) {
    console.error('OAKWOOD_TENANT_ID not configured');
    redirect('/dashboard');
  }

  // Check access
  // CONNECT is archived; this page is kept for reference only
  const hasAccess = await hasServiceAccess(tenantId, 'connect' as any);
  if (!hasAccess) {
    redirect('/dashboard/connect');
  }

  // Fetch referrals
  let referrals = null;
  let error = null;

  try {
    const response = await connectClient.listReferrals({ limit: 50 });
    referrals = response.referrals;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load referrals';
    console.error('Error loading referrals:', err);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/connect"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Referrals</h1>
            <p className="mt-2 text-gray-600">
              View all your sent and received referrals
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/connect/referrals/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          + Send Referral
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">⚠️ {error}</p>
        </div>
      )}

      {referrals && referrals.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attorney
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jurisdiction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.map((referral) => (
                <tr key={referral.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {referral.referredAttorney.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {referral.referredAttorney.firm}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {referral.caseType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {referral.jurisdiction}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={referral.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {referral.payoutAmount ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {referral.payoutAmount.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No referrals yet</p>
          <Link
            href="/dashboard/connect/referrals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
          >
            Send Your First Referral
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const icons = {
    pending: <Clock className="h-4 w-4" />,
    accepted: <CheckCircle className="h-4 w-4" />,
    declined: <XCircle className="h-4 w-4" />,
    completed: <CheckCircle className="h-4 w-4" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

