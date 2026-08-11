'use client';

import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { SuccessorPlan } from '@/lib/billing/client';
import { formatDate, formatCents, getPlanDisplayName } from '@/lib/billing/client';

interface SuccessorPlanBadgeProps {
  successor: SuccessorPlan;
}

export function SuccessorPlanBadge({ successor }: SuccessorPlanBadgeProps) {
  const isBillingReady = successor.billing_ready;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          Next Plan Scheduled
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Plan</span>
          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
            {successor.plan_display_name} ({getPlanDisplayName(successor.plan_id)})
          </p>
        </div>

        <div>
          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Price</span>
          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
            {formatCents(successor.monthly_price_cents)}/mo
          </p>
        </div>

        <div>
          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Selected</span>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {formatDate(successor.selected_at)}
          </p>
        </div>

        <div className="ml-auto">
          {isBillingReady ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Payment Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Payment Needed
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
        {isBillingReady
          ? 'Your paid plan begins automatically when the trial ends.'
          : 'Add a payment method to guarantee uninterrupted service.'}
      </p>
    </div>
  );
}

export default SuccessorPlanBadge;
