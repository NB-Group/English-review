import type { ChineseCardState, Dim, FsrsState, UserProfile } from '../types'

export type UnifiedCardStatus = 'new' | 'learning' | 'review' | 'mastered'

export interface UnifiedLearningState {
  cardId: string
  status: UnifiedCardStatus
  dueAt: string
  intervalDays: number
  lapseCount: number
  updatedAt: string
}

export interface UnifiedPreferences {
  name: string
  goals: UserProfile['goals']
  dailyQuota: UserProfile['dailyQuota']
}

export interface MigrationSnapshot {
  preferences: UnifiedPreferences
  learningStates: UnifiedLearningState[]
  source: 'english-profile'
  contentVersion: string
}

const ENGLISH_DIMS: Dim[] = ['w1', 'w2', 's1', 's2']

export function makeUnifiedCardId(contentVersion: string, subject: 'english' | 'chinese', key: string, skill: string): string {
  return `card:${contentVersion}:${subject}:${key}:${skill}`
}

function stateStatus(state: FsrsState, now: number): UnifiedCardStatus {
  if (state.state === 2 && state.scheduled_days > 40 && state.due > now) return 'mastered'
  if (state.state === 2) return 'review'
  return 'learning'
}

function fromFsrs(
  cardId: string,
  state: FsrsState,
  now: number,
): UnifiedLearningState {
  return {
    cardId,
    status: stateStatus(state, now),
    dueAt: new Date(state.due).toISOString(),
    intervalDays: state.scheduled_days,
    lapseCount: state.lapses,
    updatedAt: new Date(now).toISOString(),
  }
}

function fromChinese(
  cardId: string,
  state: ChineseCardState,
): UnifiedLearningState {
  return {
    cardId,
    status: state.intervalDays >= 30 ? 'mastered' : state.intervalDays > 0 ? 'review' : 'learning',
    dueAt: state.dueAt,
    intervalDays: state.intervalDays,
    lapseCount: state.lapseCount,
    updatedAt: state.updatedAt,
  }
}

export function mapEnglishProfile(profile: UserProfile, contentVersion: string, now = Date.now()): MigrationSnapshot {
  const learningStates: UnifiedLearningState[] = []
  for (const [entryKey, entry] of Object.entries(profile.progress)) {
    if (entry.triage === 'skip') continue
    for (const dim of ENGLISH_DIMS) {
      const state = entry.dims[dim]
      if (state) learningStates.push(fromFsrs(makeUnifiedCardId(contentVersion, 'english', entryKey, dim), state, now))
    }
  }
  for (const [cardKey, state] of Object.entries(profile.chineseProgress ?? {})) {
    learningStates.push(fromChinese(makeUnifiedCardId(contentVersion, 'chinese', cardKey, 'recall'), state))
  }
  return {
    preferences: { name: profile.name, goals: profile.goals, dailyQuota: profile.dailyQuota },
    learningStates,
    source: 'english-profile',
    contentVersion,
  }
}
