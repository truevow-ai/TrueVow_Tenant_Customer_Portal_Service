import { redirect } from 'next/navigation';
import { hasServiceAccess } from '@/lib/subscriptions/service-access';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateReferralForm } from '@/components/connect/CreateReferralForm';

export default async function NewReferralPage() {
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

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard/connect/referrals"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Referral</h1>
          <p className="mt-2 text-gray-600">
            Refer a case to another attorney in the network
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <CreateReferralForm />
      </div>
    </div>
  );
}

