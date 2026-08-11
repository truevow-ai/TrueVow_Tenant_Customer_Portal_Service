'use client';

import { XCircle, Check, Info } from 'lucide-react';
import type { TrialInfo } from '@/lib/billing/client';
import { formatDate } from '@/lib/billing/client';

interface TrialExpiredCardProps {
  trial: TrialInfo;
  onSelectPlan?: (planId: 'solo' | 'growth' | 'team') => void;
}

const PLAN_OPTIONS: Array<{
  planId: 'solo' | 'growth' | 'team';
  name: string;
  displayName: string;
  price: string;
  description: string;
  recommended?: boolean;
}> = [
  {
    planId: 'solo' as const,
    name: 'INTAKE',
    displayName: 'Solo',
    price: '$499/mo',
    description: '40 calls included, $15/call overage',
  },
  {
    planId: 'growth' as const,
    name: 'PIPELINE',
    displayName: 'Growth',
    price: '$1,299/mo',
    description: '100 calls included, $12/call overage',
    recommended: true,
  },
  {
    planId: 'team' as const,
    name: 'OPERATIONS',
    displayName: 'Team',
    price: '$1,999/mo',
    description: '200 calls included, $10/call overage',
  },
];

export function TrialExpiredCard({
  trial,
  onSelectPlan,
}: TrialExpiredCardProps) {
  const reasonLabel =
    trial.trial_end_reason === 'INTAKE_LIMIT'
      ? '12-intake limit reached'
      : trial.trial_end_reason === 'TIME_LIMIT'
        ? '90-day time limit reached'
        : 'Trial period ended';

  return (
    <div className="mb-8 bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Trial Complete</h2>
            <p className="text-sm text-muted-foreground">
              Your {trial.duration_days}-day trial ended on{' '}
              {trial.trial_ended_at ? formatDate(trial.trial_ended_at) : 'N/A'}
            </p>
          </div>
          <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Expired
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Reason</p>
            <p className="text-sm font-semibold text-card-foreground">{reasonLabel}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Intakes Used</p>
            <p className="text-sm font-semibold text-card-foreground">
              {trial.intakes_used} of {trial.intake_limit}
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Your data and portal access are preserved. Select a paid plan to continue using INTAKE.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">
          Select Your Paid Plan
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          {PLAN_OPTIONS.map((plan) => (
            <div
              key={plan.planId}
              className={`rounded-lg p-4 border-2 transition-all ${
                plan.recommended
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              {plan.recommended && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary mb-2">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-card-foreground">
                  {plan.name}
                </h4>
              </div>
              <p className="text-lg font-bold text-card-foreground">
                {plan.price}
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {plan.description}
              </p>
              {onSelectPlan && (
                <button
                  onClick={() => onSelectPlan(plan.planId)}
                  className={`inline-flex items-center gap-1.5 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    plan.recommended
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border text-card-foreground hover:bg-muted'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  Select {plan.displayName}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TrialExpiredCard;
