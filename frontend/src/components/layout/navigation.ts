import type { SVGProps } from 'react'
import { UserType } from '@/features/auth/types'
import {
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  CoinsIcon,
  GridIcon,
  HeartIcon,
  InboxIcon,
  MailIcon,
  MessageIcon,
  NewsIcon,
  PulseIcon,
  RocketIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
} from '@/components/icons'

interface NavItem {
  to: string
  label: string
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const vcNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: GridIcon },
      { to: '/insights', label: 'Insights', Icon: ChartIcon },
    ],
  },
  {
    label: 'Deals',
    items: [
      { to: '/deal-flow', label: 'Deal Flow', Icon: CoinsIcon },
      { to: '/deal-triage', label: 'Deal Triage', Icon: InboxIcon },
      { to: '/pool', label: 'Pool', Icon: BuildingIcon },
      { to: '/outreach', label: 'Outreach', Icon: MailIcon },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/investments', label: 'Investments', Icon: RocketIcon },
      { to: '/conflict-sentinel', label: 'Conflict Sentinel', Icon: ShieldIcon },
      { to: '/pulse', label: 'Portfolio Pulse', Icon: PulseIcon },
    ],
  },
  {
    label: 'Network',
    items: [
      { to: '/discover', label: 'Discover Startups', Icon: SearchIcon },
      { to: '/messages', label: 'Messages', Icon: MessageIcon },
      { to: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
      { to: '/events', label: 'Events', Icon: CalendarIcon },
    ],
  },
  {
    label: 'Intel',
    items: [
      { to: '/signals', label: 'Signals', Icon: NewsIcon },
      { to: '/suggestions', label: 'AI Suggestions', Icon: SparkIcon },
    ],
  },
]

const startupNav: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: GridIcon },
      { to: '/insights', label: 'Insights', Icon: ChartIcon },
    ],
  },
  {
    label: 'Fundraise',
    items: [
      { to: '/funding', label: 'Funding Rounds', Icon: CoinsIcon },
      { to: '/discover', label: 'Discover Investors', Icon: SearchIcon },
      { to: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
    ],
  },
  {
    label: 'Network',
    items: [
      { to: '/messages', label: 'Messages', Icon: MessageIcon },
      { to: '/events', label: 'Events', Icon: CalendarIcon },
    ],
  },
  {
    label: 'Intel',
    items: [
      { to: '/signals', label: 'Signals', Icon: NewsIcon },
      { to: '/suggestions', label: 'AI Suggestions', Icon: SparkIcon },
    ],
  },
]

export const navFor = (userType: UserType | null | undefined) =>
  userType === UserType.STARTUP ? startupNav : vcNav
