/**
 * Service Access Guard Component
 * 
 * Wraps service pages to check subscription access and show upgrade prompt if needed.
 */

import { redirect } from 'next/navigation';
import { hasServiceAccess, getUpgradeUrl, getServiceDisplayName } from '@/lib/subscriptions/service-access';
import type { ServiceName } from '@/lib/subscriptions/service-access';

interface ServiceAccessGuardProps {
  tenantId: string;
  serviceName: ServiceName;
  children: React.ReactNode;
}

export async function ServiceAccessGuard({
  tenantId,
  serviceName,
  children,
}: ServiceAccessGuardProps) {
  const hasAccess = await hasServiceAccess(tenantId, serviceName);

  if (!hasAccess) {
    redirect(getUpgradeUrl(serviceName));
  }

  return <>{children}</>;
}

