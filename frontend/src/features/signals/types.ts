export enum SignalType {
  FUNDING = 'FUNDING',
  HIRING = 'HIRING',
  REGULATORY = 'REGULATORY',
  MARKET = 'MARKET',
  PRODUCT = 'PRODUCT',
}

export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

export interface SignalDTO {
  id: string
  relatedStartupId: string | null
  relatedStartupName: string | null
  relatedVCFirmId: string | null
  relatedVCFirmName: string | null
  sourceUrl: string | null
  headline: string
  summary: string | null
  signalType: SignalType
  sentiment: Sentiment
  publishedAt: string
  aiGenerated: boolean
}

export const signalTypeLabels: Record<SignalType, string> = {
  [SignalType.FUNDING]: 'Funding',
  [SignalType.HIRING]: 'Hiring',
  [SignalType.REGULATORY]: 'Regulatory',
  [SignalType.MARKET]: 'Market',
  [SignalType.PRODUCT]: 'Product',
}

export const sentimentVariants: Record<Sentiment, 'success' | 'secondary' | 'danger'> = {
  [Sentiment.POSITIVE]: 'success',
  [Sentiment.NEUTRAL]: 'secondary',
  [Sentiment.NEGATIVE]: 'danger',
}

export const sentimentLabels: Record<Sentiment, string> = {
  [Sentiment.POSITIVE]: 'Positive',
  [Sentiment.NEUTRAL]: 'Neutral',
  [Sentiment.NEGATIVE]: 'Negative',
}
