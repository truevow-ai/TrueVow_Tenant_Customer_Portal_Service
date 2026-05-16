'use client';

/**
 * PilotModeBanner - SETTLE Cohort V-front (2026-05-07)
 * 
 * Disclosure component for pilot-mode SETTLE intelligence responses.
 * Renders ONLY when backend EstimateResponse.is_pilot_response === true,
 * signalling the response was produced via the pilot-mode gate path
 * (ADR S-2 v2): state-tier aggregation with sentinel-row exclusion and
 * a narrative-bearing case floor.
 * 
 * Three-layer transparency design:
 *   1. Banner (this component) - visual disclosure above the data
 *   2. Confidence label preserved as statistical measure (NOT overridden)
 *   3. range_justification text from backend - attorney-facing detail
 * 
 * Per Cohort T architectural decision: confidence is NOT downgraded in
 * the pilot path; this banner is the dedicated UI signal so attorneys
 * can distinguish pilot-tier estimates from production county/state.
 */

import { Info } from 'lucide-react';

export interface PilotModeBannerProps {
  /** Number of comparable cases backing the estimate (backend n_cases). */
  nCases: number;
  /** State label for jurisdictional context (e.g., "AZ", "FL"). Optional. */
  stateLabel?: string;
  /** Optional className extension for layout overrides. */
  className?: string;
}

export function PilotModeBanner({ nCases, stateLabel, className = '' }: PilotModeBannerProps) {
  const stateText = stateLabel ? ` ${stateLabel}` : '';
  return (
    <div
      data-testid="pilot-mode-banner"
      className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            PILOT - Limited Data Disclosure
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            This estimate was produced from{stateText} statewide pilot-tier data
            ({nCases} comparable case{nCases === 1 ? '' : 's'} with full narrative).
            County-level data was insufficient to clear the production floor.
            Treat this range as directional and confirm against your own case
            specifics before relying on it for negotiation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PilotModeBanner;