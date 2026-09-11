export enum OutreachStatus {
  SENT = 'SENT',
  SEEN = 'SEEN',
  RESPONDED = 'RESPONDED',
  IGNORED = 'IGNORED',
}

export interface OutreachDTO {
  id: string
  fromFirmId: string
  fromFirmName: string
  toStartupId: string
  toStartupName: string
  subject: string
  body: string
  status: OutreachStatus
  sentAt: string
}

export interface CreateOutreachRequest {
  toStartupId: string
  subject: string
  body: string
}

export const outreachStatusLabels: Record<OutreachStatus, string> = {
  [OutreachStatus.SENT]: 'Sent',
  [OutreachStatus.SEEN]: 'Seen',
  [OutreachStatus.RESPONDED]: 'Responded',
  [OutreachStatus.IGNORED]: 'No response',
}

export const outreachStatusVariants: Record<
  OutreachStatus,
  'secondary' | 'default' | 'success' | 'warning'
> = {
  [OutreachStatus.SENT]: 'secondary',
  [OutreachStatus.SEEN]: 'default',
  [OutreachStatus.RESPONDED]: 'success',
  [OutreachStatus.IGNORED]: 'warning',
}
