import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Phone, Brain, TrendingUp, Check, ArrowRight,
  Shield, Clock, BarChart3, Zap, Users, Star,
  ChevronRight, AlertCircle
} from 'lucide-react'
import snapshot from '@/lib/pricing/pricing-snapshot.json'

export const metadata: Metadata = {
  title: 'TrueVow Pricing — Pipeline Control for PI Firms',
  description: 'Control your entire revenue pipeline: INTAKE + LEVERAGE + SETTLE. Never miss a case. Never under-settle.',
}

// ─── Snapshot staleness check ───────────────────────────────────────────────
// If the snapshot is older than stale_threshold_days, we show a sales-contact
// message rather than risk displaying stale pricing. This prevents Legal issues
// when the Billing Service catalog changes but the build snapshot is old.

function isSnapshotStale(): boolean {
  const meta = (snapshot as any).snapshot_metadata
  const snapshotDate = new Date(meta.snapshot_date)
  const thresholdMs = (meta.stale_threshold_days || 7) * 24 * 60 * 60 * 1000
  return Date.now() - snapshotDate.getTime() > thresholdMs
}

// Transform snapshot catalog shape to page rendering shape
function normalizePricing(raw: any) {
  const catalog = raw.catalog || raw
  const find = (arr: Array<{ plan: string }>, plan: string) => arr.find((p: any) => p.plan === plan) || {} as any
  return {
    version: catalog.version,
    effectiveDate: catalog.effective_date,
    intake: {
      solo:     { monthly: find(catalog.intake, 'solo').monthly_price,     included: find(catalog.intake, 'solo').a_plus_unlocks_included,     extra: find(catalog.intake, 'solo').a_plus_overage,     voiceMinutes: find(catalog.intake, 'solo').voice_minutes_included,     attorneys: find(catalog.intake, 'solo').attorneys,     calendars: find(catalog.intake, 'solo').calendars },
      growth:   { monthly: find(catalog.intake, 'growth').monthly_price,   included: find(catalog.intake, 'growth').a_plus_unlocks_included,   extra: find(catalog.intake, 'growth').a_plus_overage,   voiceMinutes: find(catalog.intake, 'growth').voice_minutes_included,   attorneys: find(catalog.intake, 'growth').attorneys,     calendars: find(catalog.intake, 'growth').calendars },
      team:     { monthly: find(catalog.intake, 'team').monthly_price,     included: find(catalog.intake, 'team').a_plus_unlocks_included,     extra: find(catalog.intake, 'team').a_plus_overage,     voiceMinutes: find(catalog.intake, 'team').voice_minutes_included,   attorneys: find(catalog.intake, 'team').attorneys,     calendars: find(catalog.intake, 'team').calendars },
    },
    leverage: {
      solo:     { monthly: find(catalog.leverage, 'solo').standalone_price,    withIntake: find(catalog.leverage, 'solo').ecosystem_price,    included: find(catalog.leverage, 'solo').active_cases_included,    extra: find(catalog.leverage, 'solo').case_overage },
      growth:   { monthly: find(catalog.leverage, 'growth').standalone_price,  withIntake: find(catalog.leverage, 'growth').ecosystem_price,  included: find(catalog.leverage, 'growth').active_cases_included,  extra: find(catalog.leverage, 'growth').case_overage },
      team:     { monthly: find(catalog.leverage, 'team').standalone_price,    withIntake: find(catalog.leverage, 'team').ecosystem_price,    included: find(catalog.leverage, 'team').active_cases_included,    extra: find(catalog.leverage, 'team').case_overage },
    },
    settle: {
      perCase:     catalog.settle.single_report,
      withTrueVow: catalog.settle.ecosystem_rate,
      bundle11:    catalog.settle.pack_11,
      bundle25:    catalog.settle.pack_25,
      proMonthly:  catalog.settle.pro_monthly,
      proIncluded: catalog.settle.pro_included_reports,
      proExtra:    catalog.settle.pro_overage,
    },
    followup: {
      starter: { monthly: find(catalog.addons.follow_up, 'starter').monthly_price, actions: find(catalog.addons.follow_up, 'starter').actions_included, voiceMinutes: find(catalog.addons.follow_up, 'starter').connected_voice_minutes_included },
      scale:   { monthly: find(catalog.addons.follow_up, 'scale').monthly_price,   actions: find(catalog.addons.follow_up, 'scale').actions_included,   voiceMinutes: find(catalog.addons.follow_up, 'scale').connected_voice_minutes_included },
    },
    complete: {
      starter: { monthly: find(catalog.addons.complete, 'starter').monthly_price, packets: find(catalog.addons.complete, 'starter').packets_included, storage: find(catalog.addons.complete, 'starter').storage_included, reminders: 1 },
      scale:   { monthly: find(catalog.addons.complete, 'scale').monthly_price,   packets: find(catalog.addons.complete, 'scale').packets_included,   storage: find(catalog.addons.complete, 'scale').storage_included,   reminders: 2 },
    },
    recordings: {
      only:              { monthly: find(catalog.addons.recordings_transcripts, 'recordings_only').monthly_price,      minutes: find(catalog.addons.recordings_transcripts, 'recordings_only').minutes_included },
      transcriptStarter: { monthly: find(catalog.addons.recordings_transcripts, 'transcripts_starter').monthly_price, minutes: find(catalog.addons.recordings_transcripts, 'transcripts_starter').minutes_included },
      transcriptScale:   { monthly: find(catalog.addons.recordings_transcripts, 'transcripts_scale').monthly_price,   minutes: find(catalog.addons.recordings_transcripts, 'transcripts_scale').minutes_included },
    },
  }
}

// ─── Shared Components ──────────────────────────────────────────────────────

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`px-6 py-20 md:px-12 lg:px-20 ${className}`}>{children}</section>
}

function H2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white ${className}`}>{children}</h2>
}

function Lead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl ${className}`}>{children}</p>
}

function CtaButton({ href, children, primary = true }: { href: string; children: React.ReactNode; primary?: boolean }) {
  const base = 'inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all'
  const styles = primary
    ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-lg'
    : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 dark:bg-transparent dark:text-white dark:border-gray-700 dark:hover:border-gray-600'
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  )
}

function Price({ amount, period = '/mo' }: { amount: number; period?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-4xl font-bold text-gray-900 dark:text-white">${amount}</span>
      <span className="text-gray-500 dark:text-gray-400">{period}</span>
    </div>
  )
}

function IncludedItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
      {children}
    </li>
  )
}

function TierCard({
  name,
  price,
  period,
  badge,
  included,
  extraPrice,
  features,
  popular = false,
}: {
  name: string
  price: React.ReactNode
  period?: string
  badge?: string
  included?: number
  extraPrice?: number
  features: React.ReactNode[]
  popular?: boolean
}) {
  return (
    <div className={`relative rounded-2xl p-6 md:p-8 ${popular ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xl scale-[1.02]' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${popular ? 'bg-white text-gray-900 dark:bg-gray-900 dark:text-white' : ''}`}>
            <Star className="h-3 w-3" /> Most Popular
          </span>
        </div>
      )}
      <div className="mb-6">
        <p className={`text-sm font-semibold uppercase tracking-wider ${popular ? 'text-gray-300 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {name}
        </p>
        <div className="mt-3">{price}</div>
        {period && <p className={`text-sm mt-1 ${popular ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500'}`}>{period}</p>}
      </div>
      {included !== undefined && (
        <div className={`mb-4 py-3 px-4 rounded-lg text-sm font-medium ${popular ? 'bg-white/10 dark:bg-gray-900/10' : 'bg-gray-50 dark:bg-gray-800'}`}>
          <span className={popular ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}>{included}</span>
          <span className={popular ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500'}> included</span>
          {extraPrice !== undefined && (
            <span className={popular ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500'}> · ${extraPrice} extra</span>
          )}
        </div>
      )}
      <ul className="space-y-3">{features}</ul>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const stale = isSnapshotStale()
  const PRICING = normalizePricing(snapshot)
  const i = PRICING.intake
  const l = PRICING.leverage
  const s = PRICING.settle
  const f = PRICING.followup
  const c = PRICING.complete
  const r = PRICING.recordings
  const meta = (snapshot as any).snapshot_metadata

  return (
    <main className="min-h-screen bg-white dark:bg-black">

      {/* ═══════════════════════════════════════════════════════════════
          STALE SNAPSHOT BANNER
          ═══════════════════════════════════════════════════════════════ */}
      {stale && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Pricing is being updated. Please contact sales for current pricing.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Snapshot from {meta.snapshot_date ? new Date(meta.snapshot_date).toLocaleDateString() : 'unknown'}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════ */}
      <Section className="pt-24 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium mb-8">
            <AlertCircle className="h-4 w-4" />
            You&apos;re not losing cases because of marketing
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white">
            Control Your<br />
            <span className="text-gray-400 dark:text-gray-500">Revenue Pipeline</span>
          </h1>
          <Lead>
            Most firms don&apos;t have a marketing problem. They have a <strong>pipeline control problem</strong>.
            TrueVow fixes the entire flow — which cases you get, how you run them, and how much they settle for.
          </Lead>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CtaButton href="/sign-up">
              Get Started <ArrowRight className="h-4 w-4" />
            </CtaButton>
            <CtaButton href="#pricing" primary={false}>
              See Pricing
            </CtaButton>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          STALE STATE: CONTACT SALES
          ═══════════════════════════════════════════════════════════════ */}
      {stale && (
        <Section className="bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-2xl mx-auto text-center">
            <H2>Contact Sales for Current Pricing</H2>
            <Lead className="mx-auto">
              Our pricing is being updated. Reach out to our team for the most current plans and rates.
            </Lead>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton href="mailto:sales@truevow.com">
                Email Sales <ArrowRight className="h-4 w-4" />
              </CtaButton>
              <CtaButton href="tel:+1-800-TRUEVOW" primary={false}>
                Call Sales
              </CtaButton>
            </div>
          </div>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PRICING SECTIONS (hidden when stale)
          ═══════════════════════════════════════════════════════════════ */}
      {!stale && (
      <div>
      <Section className="bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <H2 className="text-center">One System. Every Stage.</H2>
          <Lead className="text-center mx-auto">
            TrueVow controls what happens from first call to final settlement.
          </Lead>

          <div className="mt-12 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="grid grid-cols-3 gap-0">
              <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stage</div>
              <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Without TrueVow</div>
              <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">With TrueVow</div>

              {/* INTAKE row */}
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-gray-900 dark:text-white">INTAKE</span>
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
                Missed calls, slow follow-up, no qualification
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-200">
                Every call answered. Best leads identified instantly.
              </div>

              {/* LEVERAGE row */}
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-gray-900 dark:text-white">LEVERAGE</span>
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
                Guesswork, inconsistent case structure
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-200">
                Structured cases from day one. Stronger positioning.
              </div>

              {/* SETTLE row */}
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-gray-900 dark:text-white">SETTLE</span>
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
                Under-settling, uncertainty, lowball offers accepted
              </div>
              <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-200">
                Clear value before every decision. Data-driven negotiation.
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — INTAKE
          ═══════════════════════════════════════════════════════════════ */}
      <Section id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Step 1</span>
          </div>
          <H2>INTAKE — Capture Every Opportunity</H2>
          <Lead>AI-powered intake that never misses a call and instantly identifies your best leads.</Lead>

          <div className="mt-12 grid md:grid-cols-3 gap-6 lg:gap-8">
            <TierCard
              name="Solo"
              price={<Price amount={i.solo.monthly} />}
              included={i.solo.included}
              extraPrice={i.solo.extra}
              features={[
                <IncludedItem key="1">{i.solo.included} A+ unlocks included</IncludedItem>,
                <IncludedItem key="2">{i.solo.voiceMinutes.toLocaleString()} routed voice minutes/month</IncludedItem>,
                <IncludedItem key="3">Single attorney</IncludedItem>,
                <IncludedItem key="4">Single calendar</IncludedItem>,
                <IncludedItem key="5">A, B, C, and D leads visible without unlock</IncludedItem>,
                <IncludedItem key="6">Additional A+ unlocks at ${i.solo.extra}/unlock</IncludedItem>,
                <IncludedItem key="7">Designed for one-attorney intake coverage</IncludedItem>,
              ]}
            />
            <TierCard
              name="Growth"
              price={<Price amount={i.growth.monthly} />}
              included={i.growth.included}
              extraPrice={i.growth.extra}
              popular
              features={[
                <IncludedItem key="1">{i.growth.included} A+ unlocks included</IncludedItem>,
                <IncludedItem key="2">{i.growth.voiceMinutes.toLocaleString()} routed voice minutes/month</IncludedItem>,
                <IncludedItem key="3">Single attorney seat</IncludedItem>,
                <IncludedItem key="4">Multiple connected calendars</IncludedItem>,
                <IncludedItem key="5">A, B, C, and D leads visible without unlock</IncludedItem>,
                <IncludedItem key="6">Additional A+ unlocks at ${i.growth.extra}/unlock</IncludedItem>,
                <IncludedItem key="7">FOLLOW-UP, COMPLETE, and recording/transcript add-ons available</IncludedItem>,
              ]}
            />
            <TierCard
              name="Team"
              price={<Price amount={i.team.monthly} />}
              included={i.team.included}
              extraPrice={i.team.extra}
              features={[
                <IncludedItem key="1">{i.team.included} A+ unlocks included</IncludedItem>,
                <IncludedItem key="2">{i.team.voiceMinutes.toLocaleString()} routed voice minutes/month</IncludedItem>,
                <IncludedItem key="3">Up to {i.team.attorneys} attorneys</IncludedItem>,
                <IncludedItem key="4">Multiple connected calendars</IncludedItem>,
                <IncludedItem key="5">A, B, C, and D leads visible without unlock</IncludedItem>,
                <IncludedItem key="6">Additional A+ unlocks at ${i.team.extra}/unlock</IncludedItem>,
                <IncludedItem key="7">FOLLOW-UP, COMPLETE, and recording/transcript add-ons available</IncludedItem>,
              ]}
            />
          </div>
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Included A+ unlocks reset monthly and do not roll over.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW A+ UNLOCKS WORK
          ═══════════════════════════════════════════════════════════════ */}
      <Section className="bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <H2 className="text-center">How A+ Unlocks Work</H2>
          <Lead className="text-center mx-auto">
            Every lead is graded. A, B, C, and D leads are visible without unlock.
          </Lead>
          <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Only <strong className="text-gray-900 dark:text-white">A+ leads</strong> require an unlock. A+ leads are high-priority opportunities based on injury, treatment, jurisdiction, timing, and liability signals.
            </p>
            <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              Each plan includes monthly A+ unlocks. If included unlocks are used, additional A+ unlocks are added to the monthly invoice based on the plan.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          OPTIONAL INTAKE ADD-ONS
          ═══════════════════════════════════════════════════════════════ */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <H2 className="text-center">Optional INTAKE Add-Ons</H2>
          <Lead className="text-center mx-auto">
            Add-ons are available for Growth and Team plans. Solo is kept simple for one-attorney intake coverage.
          </Lead>

          <div className="mt-12 grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* FOLLOW-UP */}
            <div className="rounded-2xl p-6 md:p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">FOLLOW-UP</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${f.starter.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{f.starter.actions} follow-up actions included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{f.starter.voiceMinutes} connected outbound AI voice minutes included</p>
                  <p className="text-xs text-gray-500 mt-2">For missed calls, form submissions, reminders, and callback requests</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${f.scale.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{f.scale.actions} follow-up actions included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{f.scale.voiceMinutes} connected outbound AI voice minutes included</p>
                  <p className="text-xs text-gray-500 mt-2">For higher-volume follow-up workflows</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Additional actions and connected voice minutes billed based on plan terms. Available on Growth and Team.
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                A follow-up action means one outbound SMS follow-up, one outbound call attempt, or one scheduled reminder action. Connected AI voice minutes are counted separately when Benjamin handles an answered outbound call.
              </p>
            </div>

            {/* COMPLETE */}
            <div className="rounded-2xl p-6 md:p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-blue-500" />
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">TrueVow COMPLETE&trade;</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Secure post-call intake packet for collecting details that should not slow down the live call.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${c.starter.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{c.starter.packets} packets included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.starter.storage} storage included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.starter.reminders} automated reminder per packet</p>
                  <p className="text-xs text-gray-500 mt-2">Additional packets billed at $9/packet</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${c.scale.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{c.scale.packets} packets included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.scale.storage} storage included</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Up to {c.scale.reminders} automated reminders per packet</p>
                  <p className="text-xs text-gray-500 mt-2">Additional packets billed at $5/packet</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Available on Growth and Team.</p>
            </div>

            {/* Recordings & Transcripts */}
            <div className="rounded-2xl p-6 md:p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="h-5 w-5 text-green-500" />
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recordings &amp; Transcripts</p>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                Recording and transcript features are optional and configured during onboarding based on firm policy, caller disclosure requirements, and jurisdiction.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${r.only.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.only.minutes.toLocaleString()} recorded minutes included</p>
                  <p className="text-xs text-gray-500 mt-2">180-day retention configuration available</p>
                  <p className="text-xs text-gray-500 mt-1">Additional recorded minutes billed at $0.05/min</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${r.transcriptStarter.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.transcriptStarter.minutes.toLocaleString()} transcribed minutes included</p>
                  <p className="text-xs text-gray-500 mt-2">Recording + transcript access</p>
                  <p className="text-xs text-gray-500 mt-1">Additional transcribed minutes billed at $0.15/min</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">${r.transcriptScale.monthly}/mo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.transcriptScale.minutes.toLocaleString()} transcribed minutes included</p>
                  <p className="text-xs text-gray-500 mt-2">Built for higher-volume firms</p>
                  <p className="text-xs text-gray-500 mt-1">Additional transcribed minutes billed at $0.10/min</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Available on Growth and Team.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2 — LEVERAGE
          ═══════════════════════════════════════════════════════════════ */}
      <Section className="bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Step 2</span>
          </div>
          <H2>LEVERAGE — Structure Every Case</H2>
          <Lead>Turn cases into stronger outcomes with structured data, deadline tracking, and demand validation.</Lead>

          <div className="mt-12 grid md:grid-cols-3 gap-6 lg:gap-8">
            <TierCard
              name="Solo"
              price={<Price amount={l.solo.monthly} />}
              included={l.solo.included}
              extraPrice={l.solo.extra}
              features={[
                <IncludedItem key="1">{l.solo.included} active cases included</IncludedItem>,
                <IncludedItem key="2">Damages calculator</IncludedItem>,
                <IncludedItem key="3">Deadline tracking</IncludedItem>,
                <IncludedItem key="4">Demand letter validation</IncludedItem>,
                <IncludedItem key="5">SETTLE submission bridge</IncludedItem>,
                <IncludedItem key="6"><span className="text-green-600 font-medium">${l.solo.withIntake}/mo with INTAKE</span></IncludedItem>,
              ]}
            />
            <TierCard
              name="Growth"
              price={<Price amount={l.growth.monthly} />}
              included={l.growth.included}
              extraPrice={l.growth.extra}
              popular
              features={[
                <IncludedItem key="1">{l.growth.included} active cases included</IncludedItem>,
                <IncludedItem key="2">Everything in Solo</IncludedItem>,
                <IncludedItem key="3">Team collaboration</IncludedItem>,
                <IncludedItem key="4">Shared case visibility</IncludedItem>,
                <IncludedItem key="5"><span className="text-green-600 font-medium">${l.growth.withIntake}/mo with INTAKE</span></IncludedItem>,
              ]}
            />
            <TierCard
              name="Team"
              price={<Price amount={l.team.monthly} />}
              included={l.team.included}
              extraPrice={l.team.extra}
              features={[
                <IncludedItem key="1">{l.team.included} active cases included</IncludedItem>,
                <IncludedItem key="2">Everything in Growth</IncludedItem>,
                <IncludedItem key="3">Advanced analytics</IncludedItem>,
                <IncludedItem key="4">High-volume support</IncludedItem>,
                <IncludedItem key="5"><span className="text-green-600 font-medium">${l.team.withIntake}/mo with INTAKE</span></IncludedItem>,
              ]}
            />
          </div>
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Active case capacity, not case credits. Unused capacity does not roll over. Lower ecosystem pricing applies when INTAKE is active.
          </p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 3 — SETTLE
          ═══════════════════════════════════════════════════════════════ */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Step 3</span>
          </div>
          <H2>SETTLE — Maximize Case Value</H2>
          <Lead>Know what your case is worth before every decision. Data-driven negotiation, not guesswork.</Lead>

          <div className="mt-12 grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Pay-as-you-go */}
            <div className="rounded-2xl p-6 md:p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pay-As-You-Go</p>
              <div className="mt-3">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">${s.perCase}</span>
                <span className="text-gray-500 dark:text-gray-400"> / report</span>
              </div>
              <p className="mt-2 text-sm text-green-600 font-medium">${s.withTrueVow} ecosystem rate with active INTAKE or LEVERAGE</p>
              <ul className="mt-6 space-y-3">
                <IncludedItem>Settlement range (low / mid / high)</IncludedItem>
                <IncludedItem>Comparable cases</IncludedItem>
                <IncludedItem>Confidence level</IncludedItem>
                <IncludedItem>Negotiation signal</IncludedItem>
              </ul>
            </div>

            {/* Bundles */}
            <div className="rounded-2xl p-6 md:p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bundles</p>
              <div className="mt-3 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">${s.bundle11}</span>
                  <span className="text-sm text-gray-500">11-Pack</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">${s.bundle25}</span>
                  <span className="text-sm text-gray-500">25-Pack</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Best for firms running multiple cases simultaneously.</p>
              <ul className="mt-6 space-y-3">
                <IncludedItem>Everything in Pay-As-You-Go</IncludedItem>
                <IncludedItem>Bulk pricing discount</IncludedItem>
              </ul>
            </div>

            {/* SETTLE PRO */}
            <div className="relative rounded-2xl p-6 md:p-8 bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
                  <Star className="h-3 w-3" /> Best Value
                </span>
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-300 dark:text-gray-500">SETTLE PRO</p>
              <div className="mt-3">
                <span className="text-4xl font-bold">${s.proMonthly}</span>
                <span className="text-gray-400 dark:text-gray-500"> / mo</span>
              </div>
              <div className="mt-3 py-3 px-4 rounded-lg bg-white/10 dark:bg-gray-900/10 text-sm">
                <span className="font-medium">{s.proIncluded} reports included</span>
                <span className="text-gray-400 dark:text-gray-600"> · ${s.proExtra}/report after</span>
              </div>
              <ul className="mt-6 space-y-3">
                <IncludedItem>Priority processing</IncludedItem>
                <IncludedItem>Everything in Pay-As-You-Go</IncludedItem>
                <IncludedItem>Batch report generation</IncludedItem>
                <IncludedItem>Dedicated support</IncludedItem>
              </ul>
            </div>
          </div>
          <div className="mt-8 max-w-3xl mx-auto p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <p className="text-gray-700 dark:text-gray-300">
              If SETTLE does not have enough data to generate a meaningful report, you are not charged.
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Pack and Pro report balances are subject to expiration and rollover rules shown in the Customer Portal.
            </p>
          </div>
        </div>
      </Section>
      </div>)}

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════════════ */}
      <Section className="bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <H2>How It All Works Together</H2>
          <Lead className="mx-auto">Three stages. One controlled pipeline. Predictable outcomes.</Lead>

          <div className="mt-12 grid sm:grid-cols-4 gap-8">
            {[
              { icon: Phone, label: 'INTAKE', text: 'Captures and qualifies every call' },
              { icon: Zap, label: 'You', text: 'Respond instantly to the best leads' },
              { icon: TrendingUp, label: 'LEVERAGE', text: 'Structures the case properly' },
              { icon: BarChart3, label: 'SETTLE', text: 'Tells you what it\'s actually worth' },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-gray-900 dark:text-white" />
                </div>
                <p className="mt-4 font-semibold text-gray-900 dark:text-white">{step.label}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{step.text}</p>
                {idx < 3 && (
                  <ChevronRight className="hidden sm:block absolute top-5 -right-4 h-5 w-5 text-gray-300 dark:text-gray-700" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">This is how firms move from:</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              {[
                { from: 'Reactive', to: 'Controlled' },
                { from: 'Inconsistent', to: 'Predictable' },
                { from: 'Guessing', to: 'Confident' },
              ].map((item) => (
                <div key={item.from} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">{item.from}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.to}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          REAL IMPACT
          ═══════════════════════════════════════════════════════════════ */}
      <Section>
        <div className="max-w-4xl mx-auto text-center">
          <H2>Real Impact</H2>
          <Lead className="mx-auto">What firms actually care about.</Lead>

          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            {[
              { icon: Phone, title: 'More calls turned into cases', desc: '24/7 AI intake means no lead slips through' },
              { icon: Shield, title: 'Less time wasted on weak leads', desc: 'Instant grading shows you where to focus' },
              { icon: Clock, title: 'Faster response → higher conversion', desc: 'Priority alerts for A+ leads within seconds' },
              { icon: TrendingUp, title: 'Stronger cases → better settlements', desc: 'Structured data + comparable values = leverage' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 text-left">
                <div className="h-10 w-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <p className="text-lg">
              Even improving <strong>1–2 cases per month</strong> or <strong>+$5K on a single case</strong> covers the entire system many times over.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          DISCLAIMER + CTA
          ═══════════════════════════════════════════════════════════════ */}
      <Section className="bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">What TrueVow Is</p>
            <p className="mt-3 text-lg text-gray-900 dark:text-white">
              TrueVow is not a call answering service, a case management system, or a replacement for your judgment.
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              It is a system that helps you get better cases and make better decisions.
            </p>
          </div>

          <div className="mt-16">
            <H2>Get Started</H2>
            <Lead className="mx-auto">Start with INTAKE. Add LEVERAGE when you want better control. Use SETTLE when decisions matter.</Lead>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <CtaButton href="/sign-up">
                Start with INTAKE <ArrowRight className="h-4 w-4" />
              </CtaButton>
              <CtaButton href="/sign-in" primary={false}>
                Already a member? Sign In
              </CtaButton>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="px-6 py-12 border-t border-gray-200 dark:border-gray-800 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          TrueVow — Pipeline Control for Personal Injury Firms
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Prices subject to change. See Customer Portal for current pricing.
        </p>
        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
          Pricing as of {meta.snapshot_date ? new Date(meta.snapshot_date).toLocaleDateString() : 'unknown'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
          <Link href="/sign-in" className="hover:text-gray-600 dark:hover:text-gray-300">Sign In</Link>
          <Link href="/sign-up" className="hover:text-gray-600 dark:hover:text-gray-300">Sign Up</Link>
          <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300">Dashboard</Link>
        </div>
      </footer>
    </main>
  )
}
