export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { PLANS, PACKET_PACKS, type PlanId, type PackId } from '@/lib/stripe/plans'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type: 'subscription' | 'pack'; planId?: string; packId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('contractor_profiles')
    .select('company_name, email')
    .eq('id', user.id)
    .single() as { data: { company_name: string; email: string | null } | null }

  // Get or create Stripe customer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('contractor_id', user.id)
    .maybeSingle() as { data: { stripe_customer_id: string | null } | null }

  let customerId = sub?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.company_name,
      metadata: { contractor_id: user.id },
    })
    customerId = customer.id

    // Persist customer ID so future checkout flows skip creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subscriptions')
      .upsert({ contractor_id: user.id, stripe_customer_id: customerId, status: 'trialing' }, { onConflict: 'contractor_id' })
  }

  if (body.type === 'subscription') {
    const planId = body.planId as PlanId | undefined
    const plan = planId ? PLANS[planId] : null
    if (!plan) return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      metadata: { contractor_id: user.id, plan_id: planId! },
      subscription_data: { metadata: { contractor_id: user.id, plan_id: planId! } },
      success_url: `${APP_URL}/billing?success=1`,
      cancel_url: `${APP_URL}/billing`,
    })

    return NextResponse.json({ url: session.url })
  }

  if (body.type === 'pack') {
    const packId = body.packId as PackId | undefined
    const pack = packId ? PACKET_PACKS[packId] : null
    if (!pack) return NextResponse.json({ error: 'Invalid pack.' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      metadata: { contractor_id: user.id, pack_id: packId!, credits: String(pack.credits) },
      success_url: `${APP_URL}/billing?packs=1`,
      cancel_url: `${APP_URL}/billing`,
    })

    return NextResponse.json({ url: session.url })
  }

  return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
}
