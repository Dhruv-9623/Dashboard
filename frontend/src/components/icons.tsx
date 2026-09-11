import type { SVGProps } from 'react'

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
} as const

type IconProps = SVGProps<SVGSVGElement>

export const GridIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const InboxIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 13h4l1.5 3h5L16 13h4" />
    <path d="M5.4 5h13.2a2 2 0 0 1 1.9 1.4L22 13v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4l1.5-6.6A2 2 0 0 1 5.4 5Z" />
  </svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6L12 3Z" />
    <path d="M12 9v3.5" />
    <path d="M12 16h.01" />
  </svg>
)

export const PulseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 12h3.5l2-6 3.5 12 2.5-8 1.5 2H21" />
  </svg>
)

export const SettingsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5 8.9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9.5a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
)

export const BuildingIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15" />
    <path d="M12 10h7a1 1 0 0 1 1 1v10" />
    <path d="M2 21h20" />
    <path d="M7 9h2M7 13h2M7 17h2M16 14h1M16 17h1" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export const XIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const SparkIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </svg>
)

export const WarningIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </svg>
)

export const FileIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </svg>
)

export const LogOutIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
)

export const MessageIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 3.6 11.5a8.4 8.4 0 0 1 8.4-8.4h.5a8.4 8.4 0 0 1 8.5 8.4Z" />
  </svg>
)

export const CalendarIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </svg>
)

export const HeartIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M19.5 5.6a5 5 0 0 0-7.1 0l-.4.4-.4-.4a5 5 0 1 0-7.1 7.1l7.5 7.5 7.5-7.5a5 5 0 0 0 0-7.1Z" />
  </svg>
)

export const NewsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 5h12a1 1 0 0 1 1 1v13H5a1 1 0 0 1-1-1V5Z" />
    <path d="M17 9h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2" />
    <path d="M7 9h6M7 13h6M7 16h4" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const ChartIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 15v-4M12 15V7M17 15v-6" />
  </svg>
)

export const SendIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" />
  </svg>
)

export const UsersIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
    <circle cx="9" cy="7" r="3.5" />
    <path d="M22 20v-1.5a4 4 0 0 0-3-3.9M16.5 3.6a4 4 0 0 1 0 7" />
  </svg>
)

export const ScaleIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3v18M7 21h10" />
    <path d="M5 7h14M6.5 7 3.5 13a3 3 0 0 0 6 0L6.5 7ZM17.5 7l-3 6a3 3 0 0 0 6 0l-3-6Z" />
  </svg>
)

export const MailIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const RocketIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 14c-1.5 1.5-2 5-2 5s3.5-.5 5-2a2.8 2.8 0 0 0-3-3Z" />
    <path d="M13.5 12.5 19 7a4.5 4.5 0 0 0-6.5-6.5v0L7 6" />
    <path d="M11.5 5.5 8 5 5 8l2 2M18.5 12.5 19 16l-3 3-2-2" />
  </svg>
)

export const CoinsIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
  </svg>
)
