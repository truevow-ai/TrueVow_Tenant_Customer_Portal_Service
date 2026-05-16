'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast?: boolean;
}

const routeLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'intake': 'Intake & Leads',
  'draft': 'DRAFT Validation',
  'settle': 'SETTLE Data Bank',
  'connect': 'CONNECT Referrals',
  'verify': 'VERIFY Service',
  'team': 'Team Management',
  'notifications': 'Messages & Notifications',
  'billing': 'Billing & Usage',
  'settings': 'Settings',
  'payouts': 'Payouts',
  'referrals': 'Referrals',
  'new': 'New Referral',
  'contribute': 'Contribute Data',
  'query': 'Query Data',
  'reports': 'Reports',
  'invite': 'Invite Member',
};

export function Breadcrumb() {
  const pathname = usePathname();
  
  // Don't show breadcrumb on root dashboard
  if (pathname === '/dashboard') {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Build breadcrumb items
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/dashboard' },
    ...pathSegments.slice(1).map((segment, index) => {
      const href = '/dashboard/' + pathSegments.slice(1, index + 2).join('/');
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      return {
        label,
        href,
        isLast: index === pathSegments.length - 2,
      };
    }),
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 && (
              <li className="text-gray-400 dark:text-gray-500">
                <ChevronRight size={16} />
              </li>
            )}
            <li>
              {item.isLast ? (
                <span className="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {index === 0 && <Home size={14} />}
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

// Compact version for mobile or constrained spaces
export function BreadcrumbCompact() {
  const pathname = usePathname();
  
  if (pathname === '/dashboard') {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const currentPage = routeLabels[pathSegments[pathSegments.length - 1]] || 
    pathSegments[pathSegments.length - 1];
  const parentPath = '/dashboard/' + pathSegments.slice(1, -1).join('/');
  const parentLabel = pathSegments.length > 2 ? 
    routeLabels[pathSegments[pathSegments.length - 2]] || 'Back' : 'Dashboard';

  return (
    <nav className="mb-4">
      <Link
        href={parentPath}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <ChevronRight size={16} className="rotate-180" />
        Back to {parentLabel}
      </Link>
      <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{currentPage}</h2>
    </nav>
  );
}
