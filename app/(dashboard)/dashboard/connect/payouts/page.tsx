import { redirect } from 'next/navigation';
import { connectClient } from '@/lib/api/connect-client';
import { hasServiceAccess } from '@/lib/subscriptions/service-access';
import Link from 'next/link';
import { ArrowLeft, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

export default async function PayoutsPage() {
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

  // Fetch payouts
  let payouts = null;
  let error = null;

  try {
    const response = await connectClient.getPayouts({ limit: 50 });
    payouts = response.payouts;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load payouts';
    console.error('Error loading payouts:', err);
  }

  // Calculate totals
  const totalEarned = payouts
    ?.filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  const pendingAmount = payouts
    ?.filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

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
            <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="mt-2 text-gray-600">
              Track your referral payouts and earnings
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">⚠️ {error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${totalEarned.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-green-50 p-3 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${pendingAmount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-yellow-50 p-3 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payouts</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {payouts?.length || 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      {payouts && payouts.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referral
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payouts.map((payout: any) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payout.referralId || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${payout.amount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PayoutStatusBadge status={payout.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.createdAt
                      ? new Date(payout.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No payouts yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Payouts will appear here once referrals are accepted and completed
          </p>
        </div>
      )}
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const icons = {
    pending: <Clock className="h-4 w-4" />,
    paid: <CheckCircle className="h-4 w-4" />,
    cancelled: <XCircle className="h-4 w-4" />,
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

