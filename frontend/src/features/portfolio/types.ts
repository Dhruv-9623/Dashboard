export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface DigestAlertDTO {
  investmentId: string | null
  startupName: string | null
  severity: AlertSeverity
  message: string
}

export interface DigestDTO {
  id: string
  vcFirmId: string
  periodStart: string
  periodEnd: string
  sentAt: string | null
  summaryMarkdown: string
  alerts: DigestAlertDTO[]
  companyCount: number
  createdAt: string
}

export const severityLabels: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'Info',
  [AlertSeverity.WARNING]: 'Warning',
  [AlertSeverity.CRITICAL]: 'Critical',
}
