import { createContext, useContext } from 'react'
import type { ChineseGrade } from '../types'
import type { UnifiedLearningState } from './migration-map'
import type { UnifiedReviewEvent } from './unified-backend'

export const STUDY_CONTENT_VERSION = '2026.11.22'

export interface StudyCloud {
  accountId: string
  review: (state: UnifiedLearningState, grade: ChineseGrade | null) => void
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
