import type { Dataset } from './data'
import type { Dim, EntryProgress, GoalLevel, UserProfile } from '../types'
import { isDue } from './fsrs'
import { dimsForLevel, goalLevelFor } from './store'

/** 会话组牌：到期复习 → P1 拼写抽查 → P3 熟词抽查 → 清洗 → 新词
 *  防瞬时记忆：同词条同场冷却（隔 8 张）；形近/同族相邻规避由卡片选择时兜底 */

export type CardKind = 'review' | 'spellSpot' | 'fluentSpot' | 'triage' | 'newWord'

export interface SessionCard {
  key: string // "w:598" / "p:22"
  kind: CardKind
  entryKind: 'word' | 'phrase'
  no: number
  headword: string
  dim: Dim | null // 复习/抽查要考的维度
  stars: number
  priorTriage?: string // 新词卡来源摸底档（recognize → 跳过读音直接拼写）
}

export interface SessionPlan {
  cards: SessionCard[]
  stats: Record<CardKind, number>
  /** 没能进本场配额但存在的需求（给仪表盘看） */
  pending: { dueLeft: number; triageLeft: number; newLeft: number }
}

const COOLDOWN = 8

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function weakestDueDim(p: EntryProgress, dims: Dim[]): Dim | null {
  // 到期维度里挑稳定性最差的考
  const dueDims = dims.filter((d) => isDue(p.dims[d] ?? null))
  if (dueDims.length === 0) return null
  return dueDims.sort(
    (a, b) => (p.dims[a]?.stability ?? 0) - (p.dims[b]?.stability ?? 0),
  )[0]
}

export function buildSession(
  ds: Dataset,
  profile: UserProfile,
  budgets: { due: number; spellSpot: number; fluentSpot: number; triage: number; newWords: number },
  now = Date.now(),
): SessionPlan {
  const cards: SessionCard[] = []
  const stats: Record<CardKind, number> = {
    review: 0, spellSpot: 0, fluentSpot: 0, triage: 0, newWord: 0,
  }
  const lastPos = new Map<string, number>()

  const push = (c: SessionCard): boolean => {
    const last = lastPos.get(c.key) ?? -Infinity
    if (cards.length - last < COOLDOWN) return false // 冷却不够，本场跳过
    lastPos.set(c.key, cards.length)
    cards.push(c)
    stats[c.kind]++
    return true
  }

  const entries: Array<{ key: string; kind: 'word' | 'phrase'; no: number; headword: string; stars: number; level: GoalLevel; progress: EntryProgress }> =
    []

  for (const w of ds.words) {
    entries.push({
      key: `w:${w.no}`, kind: 'word', no: w.no, headword: w.headword,
      stars: w.stars, level: goalLevelFor(profile.goals, { stars: w.stars, kind: 'word' }),
      progress: profile.progress[`w:${w.no}`] ?? { triage: null, dims: {} },
    })
  }
  for (const p of ds.phrases) {
    entries.push({
      key: `p:${p.no}`, kind: 'phrase', no: p.no, headword: p.headword,
      stars: p.stars, level: goalLevelFor(profile.goals, { stars: p.stars, kind: 'phrase' }),
      progress: profile.progress[`p:${p.no}`] ?? { triage: null, dims: {} },
    })
  }

  // ── 各池（互斥条件，一个词条只进一个池）──
  // 到期复习：fluent 未降级且间隔 >40 天的不算欠账
  const dueList = entries
    .filter((e) => e.level !== 'skip' && e.progress.triage !== null)
    .map((e) => ({ e, dim: weakestDueDim(e.progress, dimsForLevel(e.level)) }))
    .filter(
      ({ e, dim }) =>
        dim !== null &&
        !(e.progress.triage === 'fluent' && !e.progress.degraded && e.progress.dims[dim!]!.scheduled_days > 40),
    )
    .sort(({ e: a }, { e: b }) => b.stars - a.stars)
    .map(({ e, dim }) => ({ key: e.key, kind: 'review', entryKind: e.kind, no: e.no, headword: e.headword, dim: dim!, stars: e.stars }) as SessionCard)

  // 拼写学习流（新词）：unknown 从零学；recognize 且从未练过拼写的直接进学习流——
  // "认识拼不出"的语义就是要练拼写，不该只等每天几张抽查
  const newList = entries
    .filter((e) => {
      if (e.level === 'skip') return false
      const p = e.progress
      if (p.triage === 'unknown') return !p.dims.w1 && !p.dims.w2
      if (p.triage === 'recognize') return !p.dims.w2
      return false
    })
    .sort((a, b) => b.stars - a.stars)
    .map((e) => ({ key: e.key, kind: 'newWord', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars, priorTriage: e.progress.triage }) as SessionCard & { priorTriage: string })

  // 清洗：还没摸过底的
  const triageList = entries
    .filter((e) => e.progress.triage === null && e.level !== 'skip')
    .sort((a, b) => b.stars - a.stars)
    .map((e) => ({ key: e.key, kind: 'triage', entryKind: e.kind, no: e.no, headword: e.headword, dim: null, stars: e.stars }) as SessionCard)

  // 抽查池
  // 抽查池排除本场已在学习流的词（同词不双占名额）
  const newKeys = new Set(newList.map((n) => n.key))
  const spellList = shuffle(
    entries.filter((e) => e.progress.triage === 'recognize' && e.level !== 'skip' && !isDue(e.progress.dims.w2 ?? null, now) && !newKeys.has(e.key)),
  ).map((e) => ({ key: e.key, kind: 'spellSpot', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars }) as SessionCard)
  const fluentList = shuffle(
    entries.filter((e) => e.progress.triage === 'fluent' && !e.progress.degraded && e.level !== 'skip'),
  ).map((e) => ({ key: e.key, kind: 'fluentSpot', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars }) as SessionCard)

  // ── 轮转混排：复习→新词→清洗→抽查 循环取卡，冷却不够就跳过取下一候选 ──
  // （避免"先连刷 30 张清洗才见到背词卡"的死节奏）
  const pools: Array<{ list: SessionCard[]; cap: number; kind: CardKind }> = [
    { list: dueList, cap: budgets.due, kind: 'review' },
    { list: newList, cap: budgets.newWords, kind: 'newWord' },
    { list: triageList, cap: budgets.triage, kind: 'triage' },
    { list: spellList, cap: budgets.spellSpot, kind: 'spellSpot' },
    { list: fluentList, cap: budgets.fluentSpot, kind: 'fluentSpot' },
  ]
  const heads = pools.map(() => 0)
  let progressed = true
  while (progressed) {
    progressed = false
    for (const pi of pools.keys()) {
      const pool = pools[pi]
      while (heads[pi] < pool.list.length) {
        if (stats[pool.kind] >= pool.cap) break
        const cand = pool.list[heads[pi]]
        heads[pi]++
        if (push(cand)) {
          progressed = true
          break
        }
      }
    }
  }

  return {
    cards,
    stats,
    pending: {
      dueLeft: Math.max(0, dueList.length - stats.review),
      triageLeft: Math.max(0, triageList.length - stats.triage),
      newLeft: Math.max(0, newList.length - stats.newWord),
    },
  }
}
