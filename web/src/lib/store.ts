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
import { Rating, rate, seed } from './fsrs'

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
    dailyQuota: { triage: 30, spotcheck: 5, newWords: 10 },
    createdAt: Date.now(),
  }
}

/** 清洗判定 → FSRS 种子（unknown 清空旧状态，支持复清洗） */
function seedFromTriage(v: TriageVerdict): { w1: FsrsSeed; w2: FsrsSeed; reset: boolean } {
  switch (v) {
    case 'fluent': // 滚瓜烂熟：两维都长间隔，进抽查池
      return {
        w1: seed([Rating.Easy, Rating.Easy, Rating.Easy]),
        w2: seed([Rating.Easy, Rating.Easy, Rating.Easy]),
        reset: true,
      }
    case 'recognize': // 认识拼不出：W1 长间隔，W2 从零
      return { w1: seed([Rating.Good, Rating.Good]), w2: null, reset: true }
    case 'unknown': // 全部从零
      return { w1: null, w2: null, reset: true }
  }
}
type FsrsSeed = ReturnType<typeof seed> | null

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),

      setProfileName: (name) =>
        set((s) => ({ profile: { ...s.profile, name } })),

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
