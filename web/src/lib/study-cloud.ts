import { createContext, useContext } from 'react'
import type { ChineseGrade } from '../types'
import { STUDY_CONTENT_VERSION, type UnifiedLearningState } from './migration-map'
import type { UnifiedReviewEvent } from './unified-backend'
import type { VocabularyAssist } from './vocabulary-assist'

export { STUDY_CONTENT_VERSION } from './migration-map'

export interface StudyCloud {
  accountId: string
  review?: (state: UnifiedLearningState, grade: ChineseGrade | null) => void
  guest?: boolean
  assistVocabulary?: VocabularyAssist
  signOut: () => Promise<void>
  username: string
}

export const StudyCloudContext = createContext<StudyCloud | null>(null)

export function useStudyCloud() {
  return useContext(StudyCloudContext)
}

export function makeReviewEvent(state: UnifiedLearningState, grade: ChineseGrade | null): UnifiedReviewEvent {
  return {
    cardId: state.cardId, eventId: crypto.randomUUID(), grade,
    reviewedAtClient: state.updatedAt, contentVersion: STUDY_CONTENT_VERSION,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    state,
  }
}
