import { PlanTier } from './types'

interface PlanDefinition {
  tier: PlanTier
  name: string
  price: string
  cadence: string
  blurb: string
  features: string[]
  highlight?: boolean
}

export const PLANS: PlanDefinition[] = [
  {
    tier: PlanTier.FREE,
    name: 'Free',
    price: '₹0',
    cadence: 'forever',
    blurb: 'Evaluate the workflow on a handful of deals.',
    features: [
      '10 scored opportunities / month',
      'Up to 15 portfolio companies',
      'Manual conflict checks',
      '1 seat',
    ],
  },
  {
    tier: PlanTier.STARTER,
    name: 'Starter',
    price: '₹24,000',
    cadence: 'per month',
    blurb: 'For a small fund running an active pipeline.',
    features: [
      '150 scored opportunities / month',
      'Unlimited portfolio companies',
      'Conflict Sentinel with citations',
      'Weekly Portfolio Pulse digest',
      'Up to 5 seats',
    ],
    highlight: true,
  },
  {
    tier: PlanTier.GROWTH,
    name: 'Growth',
    price: '₹65,000',
    cadence: 'per month',
    blurb: 'For funds with a dedicated deal team.',
    features: [
      'Unlimited scored opportunities',
      'Unlimited portfolio companies',
      'Priority scoring queue',
      'Daily or weekly digest cadence',
      'Unlimited seats + full audit export',
    ],
  },
]
