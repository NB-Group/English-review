import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Dim,
  EntryProgress,
  GoalLevel,
  GoalRule,
  TriageVerdict,
  UserProfile,
} from '../types'
import { Rating, rate, craftState } from './fsrs'

/** 全局用户状态：档案 + 学习动作（localStorage 持久化，v1 不做服务端同步） */

const DEFAULT_GOALS: GoalRule[] = [
  { id: 'g1', scope: { stars: [3] }, level: 'full' }, // ★★★ 全能
  { id: 'g2', scope: { stars: [2] }, level: 'dictation' },
  { id: 'g3', scope: { stars: [1] }, level: 'dictation' },
  { id: 'g4', scope: { stars: [0] }, level: 'recognize' },
  { id: 'g5', scope: { kind: 'phrase' }, level: 'dictation' },
]

interface ProfileState {
  profile: UserProfile
  setProfileName: (name: string) => void
  loadProfile: (p: UserProfile) => void
  setGoals: (goals: GoalRule[]) => void
  setQuota: (q: Partial<UserProfile['dailyQuota']>) => void
  getProgress: (key: string) => EntryProgress
  triage: (key: string, verdict: TriageVerdict) => void
  answer: (key: string, dim: Dim, r: Rating) => void
  resetProfile: () => void
}

function emptyProfile(name = 'me'): UserProfile {
  return {
    name,
    goals: DEFAULT_GOALS,
    progress: {},
    sentenceProgress: {},
    dailyQuota: { triage: 15, spotcheck: 5, newWords: 20 },
    createdAt: Date.now(),
  }
}

/** 清洗判定 → FSRS 种子（unknown 清空旧状态，支持复清洗）
 *  熟练：两维 45 天间隔（进抽查池）；认识拼不出：W1 20 天，W2 从零 */
function seedFromTriage(v: TriageVerdict): { w1: FsrsSeed; w2: FsrsSeed; reset: boolean } {
  switch (v) {
    case 'fluent':
      return { w1: craftState(45, 45), w2: craftState(45, 45), reset: true }
    case 'recognize':
      return { w1: craftState(20, 18), w2: null, reset: true }
    case 'unknown':
      return { w1: null, w2: null, reset: true }
  }
}
type FsrsSeed = ReturnType<typeof craftState> | null

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),

      setProfileName: (name) =>
        set((s) => ({ profile: { ...s.profile, name } })),

      loadProfile: (p) => set({ profile: p }),

      setGoals: (goals) => set((s) => ({ profile: { ...s.profile, goals } })),

      setQuota: (q) =>
        set((s) => ({ profile: { ...s.profile, dailyQuota: { ...s.profile.dailyQuota, ...q } } })),

      getProgress: (key) => get().profile.progress[key] ?? { triage: null, dims: {} },

      triage: (key, verdict) =>
        set((s) => {
          const prev = s.profile.progress[key] ?? { triage: null, dims: {} }
          const seeds = seedFromTriage(verdict)
          const dims = seeds.reset ? {} : { ...prev.dims }
          if (seeds.w1) dims.w1 = seeds.w1
          if (seeds.w2) dims.w2 = seeds.w2
          return {
            profile: {
              ...s.profile,
              progress: {
                ...s.profile.progress,
                [key]: { ...prev, triage: verdict, dims, degraded: false },
              },
            },
          }
        }),

      answer: (key, dim, r) =>
        set((s) => {
          const prev = s.profile.progress[key] ?? { triage: null, dims: {} }
          const dims = { ...prev.dims, [dim]: rate(prev.dims[dim] ?? null, r) }
          // 抽查池词答 Again → 降级标记（回正常队列）
          const degraded = prev.triage === 'fluent' && r === Rating.Again ? true : prev.degraded
          return {
            profile: {
              ...s.profile,
              progress: {
                ...s.profile.progress,
                [key]: { ...prev, dims, degraded },
              },
            },
          }
        }),

      resetProfile: () => set({ profile: emptyProfile(get().profile.name) }),
    }),
    {
      name: 'kaogang_v2_profile',
      onRehydrateStorage: () => (state) => {
        // 一次性迁移：旧版"熟练"种子（Easy×3 只产生 2-4 天间隔，淹没到期队列）升格为 45 天
        const p = state?.profile
        if (!p || (p as unknown as { seedsV2?: boolean }).seedsV2) return
        let fixed = 0
        for (const entry of Object.values(p.progress)) {
          const w1 = entry.dims.w1, w2 = entry.dims.w2
          const short = (s: unknown) => !!s && (s as { scheduled_days: number }).scheduled_days < 20
          if (entry.degraded) continue // 抽查降级词在正常复习队列，短间隔是合法进度，别重置
          if (entry.triage === 'fluent') {
            if (short(w1)) { entry.dims.w1 = craftState(45, 45); fixed++ }
            if (short(w2)) { entry.dims.w2 = craftState(45, 45); fixed++ }
          } else if (entry.triage === 'recognize' && short(w1)) {
            entry.dims.w1 = craftState(20, 18); fixed++
          }
        }
        // 老默认额度一次性升级（用户自定义过的值不动）
        if (p.dailyQuota) {
          if (p.dailyQuota.triage === 30) p.dailyQuota.triage = 15
          if (p.dailyQuota.newWords === 10) p.dailyQuota.newWords = 20
        }
        ;(p as unknown as { seedsV2?: boolean }).seedsV2 = true
        if (fixed > 0) {
          try {
            localStorage.setItem('kaogang_v2_profile', JSON.stringify({ state: { profile: p }, version: 0 }))
            console.log(`[迁移] ${fixed} 个旧熟练种子已升格为长间隔`)
          } catch { /* 忽略 */ }
        }
      },
    },
  ),
)

/** 目标等级解析：词条 → 该走的维度 */
export function dimsForLevel(level: GoalLevel): Dim[] {
  switch (level) {
    case 'skip':
      return []
    case 'recognize':
      return ['w1']
    case 'dictation':
      return ['w1', 'w2']
    case 'sentence':
      return ['w1', 'w2', 's1']
    case 'full':
      return ['w1', 'w2', 's1', 's2']
  }
}

export function goalLevelFor(
  goals: GoalRule[],
  entry: { stars: number; kind: 'word' | 'phrase' },
): GoalLevel {
  // 后加的规则优先（用户手动覆盖放后面）
  for (const rule of [...goals].reverse()) {
    if (rule.scope.kind && rule.scope.kind !== entry.kind) continue
    if (rule.scope.stars && !rule.scope.stars.includes(entry.stars)) continue
    return rule.level
  }
  return 'skip'
}
