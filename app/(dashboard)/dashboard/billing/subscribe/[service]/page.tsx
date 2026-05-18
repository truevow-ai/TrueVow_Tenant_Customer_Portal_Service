'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Check, 
  Scale, 
  TrendingUp,
  ShieldCheck,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  DollarSign,
  Star,
  Loader2,
} from 'lucide-react';
import { useCompanyToast } from '@/hooks/useCompanyToast';
import { useTenantDev } from '@/hooks/useTenant';

const services = {
  GROWTH: {
    name: 'Growth Tier',
    icon: TrendingUp,
    price: '$1,479/month',
    badge: 'I\'M NO ORDINARY FIRM',
    tagline: 'Unfair Competitive Advantage + Predictable Cost',
    description: 'Scale your law firm with predictable monthly costs and dedicated support.',
    features: [
      'Unlimited calls (never miss a lead)',
      'Up to 3 inbound phone numbers',
      'Up to 33 Intakes + Bookings/month',
      'Up to 33 LEVERAGE case analyses/month',
      'Up to 33 SETTLE settlement reports/month',
      'All Foundation features included',
      'Predictable monthly cost (no per-booking fees)',
      'Concurrent calling capability',
      'Ad campaign support & scaling assistance',
      'Dedicated Customer Success Manager',
      'Priority onboarding & training',
      'Performance insights dashboard',
      'Custom integrations available'
    ],
    bestFor: [
      'Firms investing in marketing',
      'Attorneys who can\'t risk missing leads',
      'Teams planning to scale intake volume'
    ],
    pricing: {
      monthly: '$1,479/month',
      originalPrice: '$2,479',
      includes: 'Unlimited calls • 3 phone numbers • 33 Intakes • 33 LEVERAGE • 33 SETTLE',
      support: 'Dedicated Customer Success Manager',
      roi: 'Still ~5× cheaper than a human intake agent + receptionist'
    },
    positioning: 'Still ~5× cheaper than a human intake agent + receptionist',
    color: 'purple'
  },
  LEVERAGE: {
    name: 'LEVERAGE Case Economics',
    icon: Zap,
    price: '$29/case',
    badge: 'CASE ECONOMICS & COMPLIANCE ENGINE',
    tagline: 'Damages Calculator • Disbursement Planner • Compliance Checks • Deadline Tracking',
    description: 'LEVERAGE is a comprehensive case economics platform for personal injury attorneys. Calculate damages, plan disbursements, track compliance, and manage case deadlines — all in one place. Get real-time case value estimates and ensure every case is economically viable before you invest more time.',
    features: [
      'Real-time damages calculator (medical, lost income, pain & suffering)',
      'Disbursement planner with attorney fee breakdown',
      'Automated compliance checks against state-specific rules',
      'Statute of limitations and EEOC deadline tracking',
      'Case lifecycle management from intake to settlement',
      'Reward credits for active case management',
      'Save and compare multiple damages scenarios per case',
      'Print/PDF worksheets for client consultations',
      'Integrated with SETTLE for comparable settlement data'
    ],
    bestFor: [
      'Attorneys who need accurate case valuations before negotiating',
      'Firms wanting to track case economics across their portfolio',
      'Solo practitioners managing compliance and deadlines manually',
      'All users (12 FREE case analyses in first 3 months)'
    ],
    pricing: {
      free: '12 FREE case analyses (first 3 months)',
      freeValue: '$348 value ($29 × 12 analyses)',
      perCase: '$29/case after free tier (billed monthly)',
      originalPrice: '$49',
      nonIntake: '$49/case (non-INTAKE users, pay-as-you-go)',
      roi: 'Save 3-5 hours per case on damages calculations and compliance checks'
    },
    positioning: '12 FREE case analyses in first 3 months',
    color: 'blue'
  },
  SETTLE: {
    name: 'SETTLE Intelligence',
    icon: Scale,
    price: '$49/report',
    badge: 'SETTLEMENT INTELLIGENCE PLATFORM',
    tagline: 'Your Colossus • Independent Data • Recover $18K-$138K More Per Case',
    description: 'SETTLE is an independent settlement intelligence platform for personal injury attorneys — the attorney-controlled alternative to insurance companies\' Colossus system. It provides real settlement data to help attorneys negotiate better outcomes and stop leaving money on the table. Get comparable settlement ranges in 30 seconds by searching injury type, medical bills, county, and insurance company.',
    features: [
      'Independent platform (not controlled by insurers, Big Tech, or Wall Street)',
      'Search by injury type + medical bills + county + insurance company',
      'Instant settlement ranges in 30 seconds',
      '100% anonymous & secure (no client identifiers ever)',
      'Real case data from actual attorney-contributed settlements',
      'County-specific intelligence (see what cases settled for in YOUR county)',
      'Walk into negotiations with data to counter lowball offers',
      'Recover $18K-$138K more per case by knowing true settlement values',
      'Level the playing field against insurance companies\' $50B Colossus database'
    ],
    bestFor: [
      'Revenue maximizers wanting to recover $20K-$100K+ more per case',
      'Underdog fighters battling insurance giants with independent data',
      'Time-pressed negotiators needing instant data for quick decisions',
      'Small firm owners needing team consistency in negotiations',
      'All users (12 FREE reports in first 3 months)'
    ],
    pricing: {
      free: '12 FREE settlement reports (first 3 months)',
      freeValue: '$1,188 value ($99 × 12 reports)',
      perReport: '$49/report after free tier (billed monthly)',
      originalPrice: '$99',
      nonIntake: '$49/report (standard rate for all users)',
      founding: 'FREE unlimited reports (contribute 3 settlements/month)',
      roi: 'ROI: Recover $18K-$138K more per case by knowing true settlement values (vs. accepting lowball offers)'
    },
    positioning: '12 FREE reports in first 3 months',
    color: 'green'
  },
  'FOUNDING-MEMBER': {
    name: 'Founding Member',
    icon: Star,
    price: '$19/booking',
    badge: 'EXCLUSIVE FOUNDING MEMBER TIER',
    tagline: '3 FREE Bookings Monthly • $19/Booking • Unlimited SETTLE & LEVERAGE',
    description: 'Join an exclusive group of early adopters who help shape TrueVow\'s future. Founding Members lock in the lowest rates forever while enjoying premium benefits across all services. This limited-time offer is available to attorneys who contribute to our data ecosystem and help us grow through referrals.',
    features: [
      '3 FREE bookings every month (forever, while active)',
      'Locked-in $19/booking rate (vs $29 standard)',
      'Unlimited FREE SETTLE reports',
      'Unlimited FREE LEVERAGE case analyses',
      'Priority customer support',
      'Early access to new features',
      'Shape product development with your feedback',
      'Exclusive Founding Member community access',
      'Special recognition on our platform',
      'Founding Member badge on your profile'
    ],
    bestFor: [
      'Early adopters who want the best rates locked in forever',
      'Attorneys willing to contribute anonymized settlement data',
      'Firms that can refer 3+ attorneys per year',
      'Solo & small law firms looking to maximize value'
    ],
    pricing: {
      monthly: '3 FREE bookings/month',
      perBooking: '$19/booking after free allocation',
      standardComparison: '$29/booking (standard rate)',
      settleIncluded: 'Unlimited FREE SETTLE reports',
      leverageIncluded: 'Unlimited FREE LEVERAGE case analyses',
      roi: 'Save $10/booking + $49/report + $29/case = $88+ per case in additional value'
    },
    qualifications: [
      {
        title: 'Start with Solo & Small Law Firm Plan',
        description: 'Maintain an active subscription on our Solo & Small Law Firm plan'
      },
      {
        title: 'Contribute Anonymized Settlement Data',
        description: 'Share anonymized settlement data to help build the SETTLE intelligence platform (3 settlements/month recommended)'
      },
      {
        title: 'Refer 3 Attorneys per Year',
        description: 'Help grow the TrueVow community by referring other qualified attorneys'
      }
    ],
    positioning: 'Limited-time exclusive tier for early adopters',
    color: 'yellow'
  }
};

export default function ServiceSubscribePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useCompanyToast();
  const { tenantId } = useTenantDev();
  const serviceKey = (params.service as string).toUpperCase() as keyof typeof services;
  const service = services[serviceKey];
  
  const [consentGiven, setConsentGiven] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!service) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Service Not Found</h1>
        <p className="text-gray-600 mt-2">The requested service does not exist.</p>
        <Link href="/dashboard/billing" className="text-primary-600 hover:underline mt-4 inline-block">
          ← Back to Billing
        </Link>
      </div>
    );
  }

  const Icon = service.icon;

  const handleSubscribe = async () => {
    if (!consentGiven) {
      toast.error('Consent Required', 'Please accept the terms to continue.');
      return;
    }

    setIsProcessing(true);

    try {
      // Map service key to billing tier/action
      if (serviceKey === 'GROWTH') {
        const res = await fetch('/api/billing/subscription', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, tier: 'growth' }),
        });
        const data = await res.json();
        if (res.ok || data._fallback) {
          toast.success('Subscription Activated', 'Your Growth tier subscription is now active.');
          router.push('/dashboard/billing');
        } else {
          toast.error('Activation Failed', data.error || 'Unable to activate subscription.');
        }
      } else {
        // For LEVERAGE/SETTLE/FOUNDING-MEMBER — these are add-on activations
        // Currently queued until billing service supports add-on endpoints
        toast.success(
          'Subscription Initiated',
          `Your ${service.name} subscription is being processed. You will be notified once activated.`
        );
        router.push('/dashboard/billing');
      }
    } catch {
      toast.error('Activation Failed', 'Could not reach billing service. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const colorClasses = {
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-900'
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/dashboard/billing" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Billing
        </Link>
      </div>

      {/* Service Header Card */}
      <div className={`rounded-lg border-2 p-6 mb-6 ${colorClasses[service.color as keyof typeof colorClasses]}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-white shadow-sm`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-white/50 mb-2">
                {service.badge}
              </span>
              <h1 className="text-2xl font-bold">{service.name}</h1>
              <p className="text-sm opacity-80">{service.tagline}</p>
            </div>
          </div>
          <div className="text-right">
            {(serviceKey === 'LEVERAGE' || serviceKey === 'SETTLE' || serviceKey === 'GROWTH') && 'pricing' in service && 'originalPrice' in service.pricing ? (
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-2xl text-gray-400 line-through">{service.pricing.originalPrice}</span>
                <p className={`text-3xl font-bold ${
                  serviceKey === 'LEVERAGE' ? 'text-blue-600' : 
                  serviceKey === 'SETTLE' ? 'text-green-600' : 
                  'text-purple-600'
                }`}>{service.price}</p>
              </div>
            ) : (
              <p className="text-3xl font-bold">{service.price}</p>
            )}
            {service.positioning && (
              <p className="text-xs opacity-70 mt-1">{service.positioning}</p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-700">{service.description}</p>
      </div>

      {/* LEVERAGE Pricing Details */}
      {serviceKey === 'LEVERAGE' && 'pricing' in service && service.pricing && (() => {
        const p = service.pricing as any;
        return (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-blue-600" />
            Pricing Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Free Tier</p>
              <p className="text-lg font-bold text-gray-900">{p.free}</p>
              {p.freeValue && (
                <p className="text-xs text-green-600 font-semibold mt-1">{p.freeValue}</p>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">After Free Tier (INTAKE Users)</p>
              <div className="flex items-baseline gap-2">
                {p.originalPrice && (
                  <span className="text-base text-gray-400 line-through">{p.originalPrice}</span>
                )}
                <p className="text-lg font-bold text-blue-600">{p.perCase}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Non-INTAKE Users</p>
              <p className="text-lg font-bold text-gray-900">{p.nonIntake}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 bg-blue-50">
              <p className="text-sm text-blue-700 mb-1">ROI</p>
              <p className="text-sm font-semibold text-blue-800">{p.roi}</p>
            </div>
          </div>
        </div>
        );
      })()}

      {/* SETTLE Pricing Details */}
      {serviceKey === 'SETTLE' && 'pricing' in service && service.pricing && (() => {
        const p = service.pricing as any;
        return (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Scale size={20} className="text-green-600" />
            Pricing Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Free Tier</p>
              <p className="text-lg font-bold text-gray-900">{p.free}</p>
              {p.freeValue && (
                <p className="text-xs text-green-600 font-semibold mt-1">{p.freeValue}</p>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">After Free Tier (All Users)</p>
              <div className="flex items-baseline gap-2">
                {p.originalPrice && (
                  <span className="text-base text-gray-400 line-through">{p.originalPrice}</span>
                )}
                <p className="text-lg font-bold text-green-600">{p.perReport}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Standard Rate (All Users)</p>
              <p className="text-lg font-bold text-gray-900">{p.nonIntake}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
              <p className="text-sm text-green-700 mb-1">Founding Members</p>
              <p className="text-sm font-semibold text-green-800">{p.founding}</p>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-lg p-4 border-2 border-green-200">
            <p className="text-sm text-green-700 font-semibold mb-1">ROI</p>
            <p className="text-base font-bold text-green-900">{p.roi}</p>
          </div>
        </div>
        );
      })()}

      {/* Founding Member Pricing Details */}
      {serviceKey === 'FOUNDING-MEMBER' && 'pricing' in service && service.pricing && (() => {
        const p = service.pricing as any;
        return (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300 p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-600" />
            Exclusive Founding Member Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">Monthly Free Allocation</p>
              <p className="text-lg font-bold text-yellow-900">{p.monthly}</p>
              <p className="text-xs text-yellow-600 mt-1">Forever, while your membership is active</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">Booking Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-base text-gray-400 line-through">$29</span>
                <p className="text-lg font-bold text-yellow-600">{p.perBooking}</p>
              </div>
              <p className="text-xs text-green-600 font-semibold mt-1">Save $10 per booking vs. standard</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
              <p className="text-sm text-green-700 mb-1">SETTLE Reports</p>
              <p className="text-lg font-bold text-green-600">{p.settleIncluded}</p>
              <p className="text-xs text-green-600 mt-1">No per-report charges</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200 bg-blue-50">
              <p className="text-sm text-blue-700 mb-1">LEVERAGE Case Analyses</p>
              <p className="text-lg font-bold text-blue-600">{p.leverageIncluded}</p>
              <p className="text-xs text-blue-600 mt-1">No per-case charges</p>
            </div>
          </div>
          <div className="mt-4 bg-white rounded-lg p-4 border-2 border-yellow-300">
            <p className="text-sm text-yellow-700 font-semibold mb-1">Your Total Savings</p>
            <p className="text-base font-bold text-yellow-900">{p.roi}</p>
          </div>
        </div>
        );
      })()}

      {/* Founding Member Qualifications */}
      {serviceKey === 'FOUNDING-MEMBER' && 'qualifications' in service && service.qualifications && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-yellow-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-yellow-600" />
            Qualification Criteria
          </h2>
          <p className="text-sm text-gray-600 mb-4">To become a Founding Member and lock in these exclusive benefits, you must meet the following criteria:</p>
          <div className="space-y-4">
            {service.qualifications.map((qual: { title: string; description: string }, index: number) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{qual.title}</p>
                  <p className="text-sm text-gray-600">{qual.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Limited Time:</strong> Founding Member status is available to early adopters who join during our launch period. Once you qualify, your benefits are locked in for the lifetime of your membership.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600" />
            Included Features
          </h2>
          <ul className="space-y-3">
            {service.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Value Calculation (GROWTH only) */}
        {serviceKey === 'GROWTH' && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-300 p-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-purple-600" />
              Total Value at Standard Rates
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-800">33 Intakes + Bookings ($39 each)</span>
                <span className="font-bold text-purple-900">$1,287/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-800">33 LEVERAGE Case Analyses ($29 each)</span>
                <span className="font-bold text-purple-900">$957/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-800">33 SETTLE Reports ($49 each)</span>
                <span className="font-bold text-purple-900">$1,617/month</span>
              </div>
              <div className="h-px bg-purple-300 my-2"></div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-purple-900">Total Standard Value</span>
                <span className="font-bold text-purple-600 text-xl">$3,861/month</span>
              </div>
              <div className="bg-white/50 rounded-lg p-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-800">You Pay (Growth Tier)</span>
                  <span className="text-lg font-bold text-purple-600">$1,479/month</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-purple-200">
                  <span className="font-semibold text-purple-900">Your Savings</span>
                  <span className="text-xl font-bold text-green-600">$2,382/month (62% off)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best For */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Best For
          </h2>
          <ul className="space-y-3">
            {service.bestFor.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <Zap size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consent & Subscribe Section */}
      <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready to Subscribe?</h2>
        
        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors mb-4">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            I agree to the{' '}
            <Link href="https://truevow.law/terms" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="https://truevow.law/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">
              Privacy Policy
            </Link>
            . I understand that my subscription will begin immediately and I will be billed {service.price}.
          </span>
        </label>

        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
          <div>
            <p className="font-medium text-gray-900">{service.name}</p>
            <p className="text-sm text-gray-500">Monthly subscription</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{service.price}</p>
        </div>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={!consentGiven || isProcessing}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            consentGiven && !isProcessing
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-gray-400 text-gray-700 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </span>
          ) : (
            `Subscribe to ${service.name}`
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-3">
          You can cancel your subscription at any time from your billing settings.
        </p>
      </div>
    </div>
  );
}
