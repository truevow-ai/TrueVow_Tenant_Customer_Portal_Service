/**
 * Service Subscription Access Control
 *
 * Customer-facing products (4):
 *   INTAKE   Capture and qualify prospects
 *   TRACE    Client Engagement and Case Readiness
 *            Moves approved prospects through engagement, signature,
 *            Matter activation, evidence, treatment tracking, records
 *            development, and case readiness. Packages RETAINER internally.
 *   SETTLE   Prepare for and evaluate resolution
 *   COMMAND  Portfolio oversight and analytics
 *
 * RETAINER: Internal architecture only — NOT a customer-facing product.
 *   Packaged commercially inside TRACE. Law-firm users see the RETAINER
 *   workspace within the Customer Portal, not as a separate product.
 *
 * INTAKE pricing:
 *   Solo / Entry     $499/mo    40 calls   $15/overflow
 *   Growth / Mid     $1,299/mo  100 calls  $12/overflow
 *   Team             $1,999/mo  200 calls  $10/overflow
 *   All tiers: month-to-month, no lead unlock fees, all records
 *   visible, Spanish agent, calendar booking, priority SMS for
 *   qualified leads, audio/transcripts by firm opt-in, export
 *   automation, 180-day retention for enabled audio/transcripts.
 *
 * TRACE pricing (3 levels, per matter):
 *   TRACE Start       $35/matter   Engagement, signing, activation, handoff
 *   TRACE Essential   $179/matter  Start + essential case-development tracking
 *   TRACE Complete    $299/matter  Full engagement + case-development workflow
 *   New INTAKE customers: first 12 matters at TRACE Complete (value $3,588)
 *
 * TRACE Start includes (via internal RETAINER modules):
 *   Representation-review workflow, structured conflict-review process,
 *   engagement-package preparation, Client Portal delivery, consent and
 *   signatures, completed-copy delivery, matter activation, audit record.
 *
 * SETTLE pricing:
 *   Per Case         $79/report  Pay-as-you-go
 *   Pro              $299/mo     15 reports/mo, $25/additional
 *   SETTLE Pro requires active INTAKE or LEVERAGE subscription.
 *   Unused reports roll over (cap 63), expire 12 months after
 *   issuance, do not carry over after cancellation. Pro access
 *   resets on cancellation.
 *   Public page: two-card model (Per Case $79 / Pro $299).
 *
 * COMMAND pricing:
 *   Core             Included    Automatically granted
 *   Pro              $99/mo/firm Recurring subscription, no usage meter
 *
 * Billing architecture:
 *   Billing Service → authoritative for catalog, prices, entitlements, usage
 *   Financial Accounting → authoritative for invoices, payments, tax, ledger
 *   Customer Portal → display layer only, never calculates or authorizes prices
 *   Product services → emit operational events, never calculate customer prices
 *
 * INTAKE is billed per billable call, not per minute.
 * Call duration is an internal cost/capacity metric (non-billable shadow meter).
 *
 * DRAFT: Legacy.
 *
 * Server-side access checks from unified Billing Service API endpoint.
 * NO HARDCODED DEFAULTS - all data comes from API.
 *
 * GET /api/v1/billing/tenants/{tenant_id}/feature-access
 */

import { 
  getFeatureAccess, 
  FeatureAccessResponse,
  FeatureAccess,
  FoundingIntelligenceInfo,
  SettleStatus
} from '@/lib/billing/client';

export type ServiceName = 'intake' | 'draft' | 'settle' | 'trace' | 'retainer';

export interface ServiceAccessResult {
  hasAccess: boolean;
  source: 'tier' | 'addon' | 'founding_benefit' | 'upgrade_required' | 'not_launched' | 'error';
  upgradeUrl?: string;
  badge: string;
  price?: string;
  quota?: number;
}

/**
 * Error thrown when feature access data cannot be fetched
 */
export class FeatureAccessFetchError extends Error {
  constructor(message: string, public readonly tenantId: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FeatureAccessFetchError';
  }
}

/**
 * Check if tenant has access to a specific service
 */
export async function hasServiceAccess(
  tenantId: string,
  serviceName: ServiceName,
  userId?: string
): Promise<boolean> {
  try {
    const featureAccess = await getFeatureAccess(tenantId, userId);
    const access = resolveServiceAccess(featureAccess, serviceName);
    return access.hasAccess;
  } catch (error) {
    console.error(`Error checking service access for ${serviceName}:`, error);
    return false;
  }
}

/**
 * Get detailed service access information
 */
export async function getServiceAccess(
  tenantId: string,
  serviceName: ServiceName,
  userId?: string
): Promise<ServiceAccessResult> {
  const featureAccess = await getFeatureAccess(tenantId, userId);
  return resolveServiceAccess(featureAccess, serviceName);
}

/**
 * Get full feature access response from API
 */
export async function getTenantFeatureAccess(
  tenantId: string,
  userId?: string
): Promise<FeatureAccessResponse> {
  return getFeatureAccess(tenantId, userId);
}

/**
 * Resolve service access from API response
 */
function resolveServiceAccess(
  featureAccess: FeatureAccessResponse,
  serviceName: ServiceName
): ServiceAccessResult {
  const { features, founding_intelligence, settle_status } = featureAccess;

  // INTAKE
  if (serviceName === 'intake') {
    return resolveFeature(features.intake, founding_intelligence);
  }

  // DRAFT
  if (serviceName === 'draft') {
    return resolveFeature(features.draft, founding_intelligence);
  }

  // SETTLE - with launch gate
  if (serviceName === 'settle') {
    return resolveSettle(features.settle, founding_intelligence, settle_status);
  }

  // TRACE
  if (serviceName === 'trace') {
    return resolveFeature(features.trace, founding_intelligence);
  }

  // RETAINER
  if (serviceName === 'retainer') {
    return resolveFeature(features.retainer, founding_intelligence);
  }

  return {
    hasAccess: false,
    source: 'upgrade_required',
    badge: 'Upgrade Required',
    upgradeUrl: '/dashboard/billing/upgrade',
  };
}

function resolveFeature(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null
): ServiceAccessResult {
  if (!feature.enabled) {
    return {
      hasAccess: false,
      source: 'upgrade_required',
      badge: feature.source === 'addon' ? 'Add-on' : 'Upgrade Required',
      upgradeUrl: '/dashboard/billing/upgrade',
    };
  }

  const isFoundingBenefit = feature.source === 'founding_benefit' || 
    (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled);

  const price = isFoundingBenefit && foundingIntelligence?.locked_unlock_price_cents
    ? `$${foundingIntelligence.locked_unlock_price_cents / 100} (locked)`
    : feature.per_use_price_cents > 0
      ? `$${feature.per_use_price_cents / 100}`
      : undefined;

  return {
    hasAccess: true,
    source: feature.source ?? 'tier',
    badge: getBadgeFromSource(feature.source, feature.monthly_quota),
    price,
    quota: feature.monthly_quota > 0 ? feature.monthly_quota : undefined,
  };
}

function resolveSettle(
  feature: FeatureAccess,
  foundingIntelligence: FoundingIntelligenceInfo | null,
  settleStatus: SettleStatus
): ServiceAccessResult {
  // Not launched yet
  if (!settleStatus.launched) {
    return {
      hasAccess: false,
      source: 'not_launched',
      badge: foundingIntelligence?.is_member 
        ? 'Coming Soon (Founding)' 
        : 'Coming Soon',
      upgradeUrl: foundingIntelligence?.is_member ? undefined : '/dashboard/billing/upgrade',
    };
  }

  // Founding member gets contribution access
  if (foundingIntelligence?.is_member && foundingIntelligence.benefits_enabled) {
    return {
      hasAccess: true,
      source: 'founding_benefit',
      badge: 'Founding Benefit',
      price: 'Contribution access',
    };
  }

  return resolveFeature(feature, foundingIntelligence);
}

function getBadgeFromSource(
  source: FeatureAccess['source'], 
  quota: number
): string {
  switch (source) {
    case 'tier':
      return quota > 0 ? `${quota} free/mo` : 'Included';
    case 'addon':
      return 'Active (Add-on)';
    case 'founding_benefit':
      return 'Founding Benefit';
    default:
      return 'Enabled';
  }
}

/**
 * Get service display name
 */
export function getServiceDisplayName(serviceName: ServiceName): string {
  const names: Record<ServiceName, string> = {
    intake: 'INTAKE',
    draft: 'DRAFT',
    settle: 'SETTLE',
    trace: 'TRACE',
    retainer: 'RETAINER',
  };
  return names[serviceName];
}

/**
 * Get service description
 */
export function getServiceDescription(serviceName: ServiceName): string {
  const descriptions: Record<ServiceName, string> = {
    intake: 'Lead capture and intake management',
    draft: 'Legal document validation',
    settle: 'Settlement intelligence and contribution',
    trace: 'Client Engagement and Case Readiness',
    retainer: 'Engagement management, conflict review, and client activation',
  };
  return descriptions[serviceName];
}

/**
 * Get upgrade URL for a service
 */
export function getUpgradeUrl(serviceName: ServiceName): string {
  return `/dashboard/billing/subscribe/${serviceName}`;
}
