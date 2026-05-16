export const PLANS = {
  solo_monthly: {
    priceId: process.env.STRIPE_PRICE_SOLO!,
    name: 'Solo',
    description: 'For individual handymen and small remodelers',
    price: 79,
    monthlyPackets: 10,
    features: ['10 proposal packets/month', 'Branded PDF export', 'Email templates', 'Client management'],
  },
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO!,
    name: 'Pro',
    description: 'For active contractors doing multiple jobs',
    price: 149,
    monthlyPackets: 30,
    features: ['30 proposal packets/month', 'Everything in Solo', 'Priority support'],
  },
  team_monthly: {
    priceId: process.env.STRIPE_PRICE_TEAM!,
    name: 'Team',
    description: 'For multi-user shops',
    price: 299,
    monthlyPackets: null, // unlimited
    features: ['Unlimited packets', 'Everything in Pro', 'Up to 5 users'],
  },
} as const

export const PACKET_PACKS = {
  pack_5: {
    priceId: process.env.STRIPE_PRICE_PACK_5!,
    name: '5 Packets',
    credits: 5,
    price: 35,
  },
  pack_15: {
    priceId: process.env.STRIPE_PRICE_PACK_15!,
    name: '15 Packets',
    credits: 15,
    price: 79,
  },
} as const

export type PlanId = keyof typeof PLANS
export type PackId = keyof typeof PACKET_PACKS

export const PLAN_PACKET_LIMITS: Record<string, number | null> = {
  solo_monthly: 10,
  pro_monthly: 30,
  team_monthly: null,
}
