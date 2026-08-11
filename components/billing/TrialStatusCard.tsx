'use client';

import { Clock, BarChart3, ArrowRight, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { TrialInfo, SuccessorPlan } from '@/lib/billing/client';
import {
  calculateTrialDaysRemaining,
  calculateIntakeProgressPercent,
  formatDate,
  formatCents,
} from '@/lib/billing/client';

interface TrialStatusCardProps {
  trial: TrialInfo;
  successor: SuccessorPlan | null | undefined;
  onSelectPlan?: () => void;
  onAddPaymentMethod?: () => void;
}

export function TrialStatusCard({
  trial,
  successor,
  onSelectPlan,
  onAddPaymentMethod,
}: TrialStatusCardProps) {
  const daysRemaining = calculateTrialDaysRemaining(trial);
  const intakePercent = calculateIntakeProgressPercent(trial);
  const hasSuccessor = !!successor;
  const isBillingReady = successor?.billing_ready ?? false;

  const urgencyState = daysRemaining !== null && daysRemaining <= 14
    ? 'urgent'
    : intakePercent >= 80
      ? 'note'
      : 'normal';

  return (
    <div className="mb-8 bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            urgencyState === 'urgent'
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <Clock className={`h-6 w-6 ${
              urgencyState === 'urgent'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
            }`} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Current Plan</h2>
            <p className="text-sm text-muted-foreground">
              {trial.duration_days}-Day / {trial.intake_limit}-Intake Trial
            </p>
          </div>
          <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Active Trial
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              Intakes Used
            </p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-card-foreground">
                {trial.intakes_used}
              </span>
              <span className="text-sm text-muted-foreground mb-1">
                of {trial.intake_limit}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  intakePercent >= 90
                    ? 'bg-red-500'
                    : intakePercent >= 75
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${intakePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intakePercent >= 100
                ? 'All intakes used'
                : `${trial.intake_limit - trial.intakes_used} intakes remaining`}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              Time Remaining
            </p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-card-foreground">
                {daysRemaining ?? 0}
              </span>
              <span className="text-sm text-muted-foreground mb-1">days</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>Started {formatDate(trial.trial_started_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Expires {formatDate(trial.trial_expires_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {trial.intakes_used >= trial.intake_limit * 0.75 && !hasSuccessor && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Your trial is nearly complete
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Select a paid plan now to continue uninterrupted service when your trial ends.
              </p>
            </div>
          </div>
        )}
      </div>

      {hasSuccessor ? (
        <SuccessorSection
          successor={successor}
          onSelectPlan={onSelectPlan}
          onAddPaymentMethod={onAddPaymentMethod}
        />
      ) : (
        <NoSuccessorSection onSelectPlan={onSelectPlan} />
      )}
    </div>
  );
}

function SuccessorSection({
  successor,
  onSelectPlan,
  onAddPaymentMethod,
}: {
  successor: SuccessorPlan;
  onSelectPlan?: () => void;
  onAddPaymentMethod?: () => void;
}) {
  const isBillingReady = successor.billing_ready;

  return (
    <div className="border-t border-border bg-muted/30 p-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-card-foreground">Next Plan</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="text-lg font-bold text-card-foreground">
            {successor.plan_display_name}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {successor.plan_id === 'growth'
              ? 'Growth'
              : successor.plan_id === 'team'
                ? 'Team'
                : 'Solo'}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Price Locked At</p>
          <p className="text-lg font-bold text-card-foreground">
            {formatCents(successor.monthly_price_cents)}/mo
          </p>
          <p className="text-xs text-muted-foreground">
            Selected {formatDate(successor.selected_at)}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Payment</p>
          {isBillingReady ? (
            <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Payment method on file
            </p>
          ) : (
            <p className="text-sm font-semibold text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Payment method needed
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {isBillingReady ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Begins automatically when your trial ends. No service interruption.
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Add a payment method to guarantee automatic conversion at trial end.
            </>
          )}
        </p>

        <div className="flex gap-2 ml-auto">
          {!isBillingReady && onAddPaymentMethod && (
            <button
              onClick={onAddPaymentMethod}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Add Payment Method
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {onSelectPlan && (
            <button
              onClick={onSelectPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border text-card-foreground hover:bg-muted transition-colors"
            >
              Change Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NoSuccessorSection({
  onSelectPlan,
}: {
  onSelectPlan?: () => void;
}) {
  return (
    <div className="border-t border-border bg-muted/30 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-card-foreground">
            No paid plan selected yet
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a plan now to continue uninterrupted service when your trial ends.
          </p>
        </div>
        {onSelectPlan && (
          <button
            onClick={onSelectPlan}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Select Your Plan
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default TrialStatusCard;
