import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PLANS, PACKET_PACKS } from '@/lib/stripe/plans'
import { cn } from '@/lib/utils'
import { CheckoutButton, PortalButton } from './BillingClient'

interface SubRow {
  plan_id: string | null
  status: string
  current_period_end: string | null
  packet_credits: number
  stripe_customer_id: string | null
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-gray-100 text-gray-500',
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; packs?: string }>
}) {
  const { success, packs } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('plan_id, status, current_period_end, packet_credits, stripe_customer_id')
    .eq('contractor_id', user.id)
    .maybeSingle() as { data: SubRow | null }

  const currentPlanId = sub?.plan_id ?? null
  const status = sub?.status ?? 'trialing'
  const credits = sub?.packet_credits ?? 0
  const hasStripeCustomer = !!sub?.stripe_customer_id
  const isUnlimited = currentPlanId === 'team_monthly'
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and proposal packet credits.</p>
      </div>

      {/* Confirmation banners */}
      {success === '1' && (
        <div className="flex items-start gap-3 bg-green-50 rounded-xl border border-green-200 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Subscription activated!</p>
            <p className="text-xs text-green-700 mt-0.5">Your credits have been added. Go generate some proposals.</p>
          </div>
        </div>
      )}
      {packs === '1' && (
        <div className="flex items-start gap-3 bg-green-50 rounded-xl border border-green-200 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Packet credits added!</p>
            <p className="text-xs text-green-700 mt-0.5">Credits are available immediately.</p>
          </div>
        </div>
      )}

      {/* Current plan status */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Current plan</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-900">
                {currentPlanId ? PLANS[currentPlanId as keyof typeof PLANS]?.name ?? currentPlanId : 'Trial'}
              </p>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[status] ?? STATUS_COLORS.trialing)}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            {periodEnd && (
              <p className="text-xs text-gray-400 mt-0.5">Renews {periodEnd}</p>
            )}
          </div>
          {hasStripeCustomer && <PortalButton />}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Credits remaining</p>
            <p className="text-2xl font-bold text-gray-900">
              {isUnlimited ? '∞' : credits}
            </p>
            {!isUnlimited && (
              <p className="text-xs text-gray-400">1 credit = 1 proposal PDF</p>
            )}
          </div>
          {status === 'trialing' && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2 flex-1">
              Trial includes 2 free proposals. Subscribe to get a monthly allowance.
            </p>
          )}
        </div>
      </section>

      {/* Plan cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          {currentPlanId ? 'Change plan' : 'Choose a plan'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([id, plan]) => {
            const isCurrent = id === currentPlanId
            return (
              <div
                key={id}
                className={cn(
                  'bg-white rounded-xl border p-5 flex flex-col gap-4',
                  isCurrent ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    {isCurrent && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <CheckoutButton
                    type="subscription"
                    planId={id}
                    label={currentPlanId ? 'Switch plan' : 'Subscribe'}
                    className="w-full"
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Packet packs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Top-up credits</h2>
        <p className="text-xs text-gray-500 mb-3">Buy extra packets any time — they stack with your monthly allowance.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(PACKET_PACKS) as [string, typeof PACKET_PACKS[keyof typeof PACKET_PACKS]][]).map(([id, pack]) => (
            <div key={id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{pack.name}</p>
                <p className="text-xs text-gray-500">${pack.price} one-time · {pack.credits} proposal credits</p>
              </div>
              <CheckoutButton
                type="pack"
                packId={id}
                label={`Buy $${pack.price}`}
                variant="outline"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
