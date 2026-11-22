import { createClient } from '@supabase/supabase-js'
import type { ChineseGrade, UserProfile } from '../types'
import { restoreMigratedProfile, type UnifiedLearningState, type UnifiedPreferences } from './migration-map'

export interface UnifiedReviewEvent {
  eventId: string
  cardId: string
  grade: ChineseGrade | null
  reviewedAtClient: string
  timeZone: string
  contentVersion: string
  state: UnifiedLearningState
}

export interface UnifiedBackend {
  getSession(): Promise<{ id: string; username: string } | null>
  signIn(username: string, password: string): Promise<{ id: string; username: string }>
  signUp(username: string, password: string, inviteLink: string): Promise<{ id: string; username: string }>
  signOut(): Promise<void>
  loadProfile(defaults: UserProfile): Promise<UserProfile>
  updatePreferences(ownerId: string, preferences: UnifiedPreferences): Promise<void>
  appendReviewEvent(ownerId: string, event: UnifiedReviewEvent): Promise<void>
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
    schedulerState: (row.scheduler_state ?? undefined) as UnifiedLearningState['schedulerState'],
    lastGrade: (row.last_grade ?? undefined) as UnifiedLearningState['lastGrade'],
  }
}

export function createUnifiedBackend(url: string, anonKey: string): UnifiedBackend {
  const client = createClient(url, anonKey)

  async function signIn(username: string, password: string) {
    const { data, error } = await client.auth.signInWithPassword({ email: authEmail(username), password })
    if (error) throw error
    return { id: data.user.id, username: username.trim().toLowerCase() }
  }

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
      return data.session ? {
        id: data.session.user.id, username: (data.session.user.email ?? '').split('@')[0],
      } : null
    },
    signIn,
    signUp: async (username, password, inviteLink) => {
      const { error } = await client.functions.invoke('register-student', { body: { username, password, inviteLink } })
      if (error) throw error
      return signIn(username, password)
    },
    signOut: async () => {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
    loadProfile: async (defaults) => {
      const id = await userId()
      const { data, error } = await client.from('user_preferences').select('preferences').eq('user_id', id).maybeSingle()
      if (error) throw error
      const preferences = (data?.preferences ?? {}) as Partial<UnifiedPreferences>
      const states: UnifiedLearningState[] = []
      const pageSize = 500
      for (let offset = 0; ; offset += pageSize) {
        const rows = await client.from('learning_states').select('*').eq('user_id', id)
          .order('card_id').range(offset, offset + pageSize - 1)
        if (rows.error) throw rows.error
        states.push(...(rows.data ?? []).map(toState))
        if ((rows.data?.length ?? 0) < pageSize) break
      }
      return restoreMigratedProfile({
        name: defaults.name, goals: defaults.goals, dailyQuota: defaults.dailyQuota, ...preferences,
      }, states, defaults)
    },
    updatePreferences: async (ownerId, preferences) => {
      const { error } = await client.from('user_preferences').upsert({ user_id: ownerId, preferences, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    appendReviewEvent: async (ownerId, event) => {
      const { error } = await client.rpc('record_study_review', {
        expected_user: ownerId,
        event_id: event.eventId,
        grade: event.grade,
        content_version: event.contentVersion,
        review_state: event.state,
      })
      if (error) throw error
    },
  }
}
