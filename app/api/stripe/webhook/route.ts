export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import { PLANS, PLAN_PACKET_LIMITS, type PlanId } from '@/lib/stripe/plans'

export async function POST(req: Request) {
  const body = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    // ── Subscription checkout completed ───────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const contractorId = session.metadata?.contractor_id
      const planId = session.metadata?.plan_id as PlanId | undefined

      if (!contractorId) break

      if (session.mode === 'subscription' && planId && session.subscription) {
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
        const monthlyLimit = PLAN_PACKET_LIMITS[planId] ?? 0
        const credits = monthlyLimit === null ? 9999 : monthlyLimit // 9999 = unlimited sentinel

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('subscriptions')
          .upsert({
            contractor_id: contractorId,
            stripe_customer_id: session.customer as string,
            stripe_sub_id: stripeSub.id,
            plan_id: planId,
            status: stripeSub.status,
            current_period_end: new Date((stripeSub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
            packet_credits: credits,
          }, { onConflict: 'contractor_id' })
      }

      // ── Packet purchase ───────────────────────────────────────────────────
      if (session.mode === 'payment') {
        const creditsToAdd = parseInt(session.metadata?.credits ?? '0', 10)
        if (creditsToAdd > 0) {
          // Increment packet_credits atomically using rpc
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).rpc('increment_packet_credits', {
            p_contractor_id: contractorId,
            p_amount: creditsToAdd,
          })
        }
      }
      break
    }

    // ── Subscription changed (upgrade / downgrade / cancel scheduled) ─────────
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription
      const contractorId = stripeSub.metadata?.contractor_id
      if (!contractorId) break

      const planId = stripeSub.metadata?.plan_id as PlanId | undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('subscriptions')
        .update({
          status: stripeSub.status,
          plan_id: planId ?? null,
          current_period_end: new Date((stripeSub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        })
        .eq('stripe_sub_id', stripeSub.id)
      break
    }

    // ── Subscription canceled ─────────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('subscriptions')
        .update({ status: 'canceled', packet_credits: 0 })
        .eq('stripe_sub_id', stripeSub.id)
      break
    }

    // ── Invoice paid — top up monthly credits on renewal ──────────────────────
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      // Only handle subscription invoices (not one-off payments)
      if (!(invoice as unknown as { subscription: string | null }).subscription) break

      const subId = (invoice as unknown as { subscription: string }).subscription
      const stripeSub = await stripe.subscriptions.retrieve(subId)
      const contractorId = stripeSub.metadata?.contractor_id
      const planId = stripeSub.metadata?.plan_id as PlanId | undefined
      if (!contractorId || !planId) break

      const monthlyLimit = PLAN_PACKET_LIMITS[planId]
      if (monthlyLimit === null) break // unlimited — no credit top-up needed

      // Reset credits to plan's monthly allowance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('subscriptions')
        .update({ packet_credits: monthlyLimit, status: 'active' })
        .eq('contractor_id', contractorId)
      break
    }

    default:
      // Unhandled event type — ignore
      break
  }

  return NextResponse.json({ received: true })
}
