import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('contractor_id', user.id)
    .maybeSingle() as { data: { stripe_customer_id: string | null } | null }

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Please subscribe first.' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
