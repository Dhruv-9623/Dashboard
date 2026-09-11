export enum SuggestionType {
  VC_FOR_STARTUP = 'VC_FOR_STARTUP',
  STARTUP_FOR_VC = 'STARTUP_FOR_VC',
}

export enum SuggestionStatus {
  PENDING = 'PENDING',
  DISMISSED = 'DISMISSED',
  ACTIONED = 'ACTIONED',
}

export interface AISuggestionDTO {
  id: string
  suggestionType: SuggestionType
  targetId: string
  targetName: string
  targetSector: string | null
  targetStage: string | null
  targetLogoUrl: string | null
  /** 0.0–1.0 */
  score: number
  reasoning: string
  status: SuggestionStatus
  generatedAt: string
}
