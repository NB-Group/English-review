import { createClient } from '@supabase/supabase-js'
import type { ChineseGrade, GoalRule } from '../types'
import type { UnifiedLearningState, UnifiedPreferences } from './migration-map'

export interface UnifiedReviewEvent {
  eventId: string
  cardId: string
  grade: ChineseGrade
  reviewedAtClient: string
  timeZone: string
  contentVersion: string
}

export interface UnifiedBackend {
  getSession(): Promise<unknown>
  signIn(username: string, password: string): Promise<void>
  signOut(): Promise<void>
  getPreferences(): Promise<UnifiedPreferences>
  updatePreferences(preferences: UnifiedPreferences): Promise<void>
  getLearningStates(): Promise<Record<string, UnifiedLearningState>>
  appendReviewEvent(event: UnifiedReviewEvent): Promise<void>
}

function authEmail(username: string): string {
  return `${username.trim().toLowerCase()}@students.invalid`
}

function toState(row: Record<string, unknown>): UnifiedLearningState {
  return {
    cardId: String(row.card_id),
    status: row.status as UnifiedLearningState['status'],
    dueAt: String(row.due_at),
    intervalDays: Number(row.interval_days),
    lapseCount: Number(row.lapse_count),
    updatedAt: String(row.updated_at),
  }
}

export function createUnifiedBackend(url: string, anonKey: string): UnifiedBackend {
  const client = createClient(url, anonKey)

  async function userId(): Promise<string> {
    const { data, error } = await client.auth.getUser()
    if (error) throw error
    if (!data.user) throw new Error('登录状态已失效，请重新登录')
    return data.user.id
  }

  return {
    getSession: async () => {
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session
    },
    signIn: async (username, password) => {
      const { error } = await client.auth.signInWithPassword({ email: authEmail(username), password })
      if (error) throw error
    },
    signOut: async () => {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
    getPreferences: async () => {
      const id = await userId()
      const { data, error } = await client.from('user_preferences').select('preferences').eq('user_id', id).maybeSingle()
      if (error) throw error
      const preferences = (data?.preferences ?? {}) as Partial<UnifiedPreferences>
      return {
        name: String(preferences.name ?? ''),
        goals: (preferences.goals ?? []) as GoalRule[],
        dailyQuota: preferences.dailyQuota ?? { triage: 15, spotcheck: 5, newWords: 20 },
      }
    },
    updatePreferences: async (preferences) => {
      const id = await userId()
      const { error } = await client.from('user_preferences').upsert({ user_id: id, preferences, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    getLearningStates: async () => {
      const id = await userId()
      const { data, error } = await client.from('learning_states').select('*').eq('user_id', id)
      if (error) throw error
      return Object.fromEntries((data ?? []).map((row) => [String(row.card_id), toState(row)]))
    },
    appendReviewEvent: async (event) => {
      const id = await userId()
      const { error } = await client.from('review_events').upsert({
        user_id: id,
        event_id: event.eventId,
        card_id: event.cardId,
        grade: event.grade,
        reviewed_at_client: event.reviewedAtClient,
        time_zone: event.timeZone,
        content_version: event.contentVersion,
      }, { onConflict: 'event_id', ignoreDuplicates: true })
      if (error) throw error
    },
  }
}
