import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
} from 'ts-fsrs'
import type { FsrsState } from '../types'

/** ts-fsrs 封装：可序列化状态 <-> Card，判分驱动，清洗种子 */

const f = fsrs(
  generatorParameters({
    request_retention: 0.9, // 中考备考：偏紧的保留率
    enable_fuzz: true,
  }),
)

export { Rating }

export function emptyState(now = new Date()): FsrsState {
  return serialize(createEmptyCard(now))
}

export function serialize(card: Card): FsrsState {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
  }
}

export function deserialize(s: FsrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: undefined,
  } as Card
}

/** 对一张卡评分，返回新状态 */
export function rate(state: FsrsState | null, rating: Rating): FsrsState {
  const card = state ? deserialize(state) : createEmptyCard(new Date())
  const next = f.repeat(card, new Date())[rating as Exclude<Rating, Rating.Manual>].card
  return serialize(next)
}

/** 模拟连续成功历史做种子（清洗用）
 *  ratings 依次评分，每次把时间推进到该卡 due 再评 */
export function seed(ratings: Rating[]): FsrsState {
  let card = createEmptyCard(new Date())
  for (const r of ratings) {
    const rec = f.repeat(card, new Date())[r as Exclude<Rating, Rating.Manual>]
    card = rec.card
  }
  return serialize(card)
}

/** 直接构造一张"已牢固"的复习卡（清洗种子用）
 *  模拟评分链无法产生足够长的间隔（Easy×3 只有 2-4 天），
 *  熟练词必须手工给长间隔，否则几天内集体到期淹没复习队列 */
export function craftState(days: number, stability: number): FsrsState {
  const now = Date.now()
  return {
    due: now + days * 86400000,
    stability,
    difficulty: 4.5,
    elapsed_days: 0,
    scheduled_days: days,
    reps: 5,
    lapses: 0,
    state: 2, // Review
  }
}

/** 到期判断（含 learning 卡：due 在过去或现在） */
export function isDue(state: FsrsState | null, now = Date.now()): boolean {
  if (!state) return false
  return state.due <= now
}

/** 下次到期的人类可读描述 */
export function describeDue(state: FsrsState | null, now = Date.now()): string {
  if (!state) return '未开始'
  const diff = state.due - now
  if (diff <= 0) return '待复习'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} 分钟后`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} 小时后`
  return `${Math.round(hours / 24)} 天后`
}
