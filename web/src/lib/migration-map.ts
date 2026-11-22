import type { ChineseCardState, ChineseGrade, Dim, EntryProgress, FsrsState, UserProfile } from '../types.ts'

export const STUDY_CONTENT_VERSION = '2026.11.22'

export type UnifiedCardStatus = 'new' | 'learning' | 'review' | 'mastered'

export interface UnifiedLearningState {
  cardId: string
  status: UnifiedCardStatus
  dueAt: string
  intervalDays: number
  lapseCount: number
  updatedAt: string
  schedulerState?: FsrsState
  lastGrade?: ChineseGrade
}

export interface UnifiedPreferences {
  name: string
  goals: UserProfile['goals']
  dailyQuota: UserProfile['dailyQuota']
  createdAt?: number
  entryMetadata?: Record<string, Omit<EntryProgress, 'dims'>>
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

function fromFsrs(
  cardId: string,
  state: FsrsState,
  now: number,
): UnifiedLearningState {
  return {
    cardId,
    status: state.state === 0 ? 'new' : state.state === 2 ? 'review' : 'learning',
    dueAt: new Date(state.due).toISOString(),
    intervalDays: state.scheduled_days,
    lapseCount: state.lapses,
    updatedAt: new Date(now).toISOString(),
    schedulerState: {
      due: state.due, stability: state.stability, difficulty: state.difficulty,
      elapsed_days: state.elapsed_days, scheduled_days: state.scheduled_days,
      reps: state.reps, lapses: state.lapses, state: state.state,
    },
  }
}

function fromChinese(
  cardId: string,
  state: ChineseCardState,
): UnifiedLearningState {
  return {
    cardId,
    status: state.intervalDays > 0 ? 'review' : 'learning',
    dueAt: state.dueAt,
    intervalDays: state.intervalDays,
    lapseCount: state.lapseCount,
    updatedAt: state.updatedAt,
    lastGrade: state.lastGrade,
  }
}

export function mapEnglishProfile(profile: UserProfile, contentVersion: string, now = Date.now()): MigrationSnapshot {
  const learningStates: UnifiedLearningState[] = []
  const entryMetadata: NonNullable<UnifiedPreferences['entryMetadata']> = {}
  for (const [entryKey, entry] of Object.entries(profile.progress)) {
    const { triage, degraded, lastSeenAt } = entry
    entryMetadata[entryKey] = { triage, degraded, lastSeenAt }
    for (const dim of ENGLISH_DIMS) {
      const state = entry.dims[dim]
      if (state) learningStates.push(fromFsrs(makeUnifiedCardId(contentVersion, 'english', entryKey, dim), state, now))
    }
  }
  for (const [sentenceKey, dimensions] of Object.entries(profile.sentenceProgress ?? {})) {
    for (const dim of ENGLISH_DIMS) {
      const state = dimensions[dim]
      if (state) learningStates.push(fromFsrs(makeUnifiedCardId(contentVersion, 'english', 'sentence:' + sentenceKey, dim), state, now))
    }
  }
  for (const [cardKey, state] of Object.entries(profile.chineseProgress ?? {})) {
    learningStates.push(fromChinese(makeUnifiedCardId(contentVersion, 'chinese', cardKey, 'recall'), state))
  }
  return {
    preferences: {
      name: profile.name, goals: profile.goals, dailyQuota: profile.dailyQuota,
      createdAt: profile.createdAt, entryMetadata,
    },
    learningStates,
    source: 'english-profile',
    contentVersion,
  }
}

export function restoreMigratedProfile(
  preferences: UnifiedPreferences,
  states: UnifiedLearningState[],
  defaults: UserProfile,
): UserProfile {
  const progress: UserProfile['progress'] = {}
  const sentenceProgress: UserProfile['sentenceProgress'] = {}
  const chineseProgress: NonNullable<UserProfile['chineseProgress']> = {}

  for (const [key, metadata] of Object.entries(preferences.entryMetadata ?? {})) {
    progress[key] = { ...metadata, dims: {} }
  }

  for (const state of states) {
    const english = /^card:[^:]+:english:(.+):(w1|w2|s1|s2)$/.exec(state.cardId)
    if (english && state.schedulerState) {
      const [, key, skill] = english
      const dim = skill as Dim
      if (key.startsWith('sentence:')) {
        const sentenceId = key.slice('sentence:'.length)
        const dimensions = sentenceProgress[sentenceId] ??= {}
        dimensions[dim] = state.schedulerState
      } else {
        const entry = progress[key] ??= { triage: null, dims: {} }
        entry.dims[dim] = state.schedulerState
      }
      continue
    }
    const chinese = /^card:[^:]+:chinese:(.+):recall$/.exec(state.cardId)
    // The original Chinese app stored native content IDs in the same table.
    const cardId = chinese?.[1] ?? (/^card:[a-f0-9]+$/.test(state.cardId) ? state.cardId : undefined)
    if (cardId) {
      const previous = chineseProgress[cardId]
      if (previous && Date.parse(previous.updatedAt) >= Date.parse(state.updatedAt)) continue
      chineseProgress[cardId] = {
        dueAt: state.dueAt, intervalDays: state.intervalDays, lapseCount: state.lapseCount,
        lastGrade: state.lastGrade, updatedAt: state.updatedAt,
      }
    }
  }

  return {
    name: preferences.name || defaults.name,
    goals: preferences.goals,
    dailyQuota: preferences.dailyQuota,
    createdAt: preferences.createdAt ?? defaults.createdAt,
    progress, sentenceProgress, chineseProgress,
  }
}
