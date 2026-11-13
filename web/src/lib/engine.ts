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

  // 1) 到期复习（跳过 skip / 未清洗未开学的；fluent 未降级且间隔 >40 天的不算欠账）
  const dueEntries = entries
    .filter((e) => e.level !== 'skip' && e.progress.triage !== null)
    .map((e) => ({ e, dim: weakestDueDim(e.progress, dimsForLevel(e.level)) }))
    .filter(
      ({ e, dim }) =>
        dim !== null &&
        !(e.progress.triage === 'fluent' && !e.progress.degraded && e.progress.dims[dim!]!.scheduled_days > 40),
    )
    // 高星=常考词，优先保住
    .sort(({ e: a }, { e: b }) => b.stars - a.stars)
  for (const { e, dim } of dueEntries) {
    if (stats.review >= budgets.due) break
    push({ key: e.key, kind: 'review', entryKind: e.kind, no: e.no, headword: e.headword, dim: dim!, stars: e.stars })
  }

  // 2) P1 拼写抽查：recognize 且 w2 未到期（不欠复习时主动抽查拼写）
  const spellPool = shuffle(
    entries.filter((e) => e.progress.triage === 'recognize' && e.level !== 'skip' && !isDue(e.progress.dims.w2 ?? null, now)),
  )
  for (const e of spellPool) {
    if (stats.spellSpot >= budgets.spellSpot) break
    push({ key: e.key, kind: 'spellSpot', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars })
  }

  // 3) P3 熟词抽查：fluent 且未降级
  const fluentPool = shuffle(
    entries.filter((e) => e.progress.triage === 'fluent' && !e.progress.degraded && e.level !== 'skip'),
  )
  for (const e of fluentPool) {
    if (stats.fluentSpot >= budgets.fluentSpot) break
    push({ key: e.key, kind: 'fluentSpot', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars })
  }

  // 4) 清洗（P2 未清洗，高星优先）
  const triagePool = entries
    .filter((e) => e.progress.triage === null && e.level !== 'skip')
    .sort((a, b) => b.stars - a.stars)
  let triaged = 0
  for (const e of triagePool) {
    if (triaged >= budgets.triage) break
    if (push({ key: e.key, kind: 'triage', entryKind: e.kind, no: e.no, headword: e.headword, dim: null, stars: e.stars })) triaged++
  }

  // 5) 新词（P0：unknown 且高星优先；带 dictation 级以上才进新词流）
  // 已开始的词（有 w1/w2 状态）走复习流，否则同一批词每天重教、饿死后续新词
  const newPool = entries
    .filter((e) =>
      e.progress.triage === 'unknown' &&
      !e.progress.dims.w1 && !e.progress.dims.w2 &&
      e.level !== 'skip')
    .sort((a, b) => b.stars - a.stars)
  for (const e of newPool) {
    if (stats.newWord >= budgets.newWords) break
    push({ key: e.key, kind: 'newWord', entryKind: e.kind, no: e.no, headword: e.headword, dim: 'w2', stars: e.stars })
  }

  return {
    cards,
    stats,
    pending: {
      dueLeft: Math.max(0, dueEntries.length - stats.review),
      triageLeft: Math.max(0, triagePool.length - triaged),
      newLeft: Math.max(0, newPool.length - stats.newWord),
    },
  }
}
