import cardsData from '../data/zhongkao-qwen-2026.11.22/cards.json'

export type ChineseCardKind = 'sense-recall' | 'segment-continuation'

export interface ChineseCard {
  id: string
  kind: ChineseCardKind
  pieceId?: string
  segmentId?: string
  senseId?: string
  prompt: string
  context?: string
  options?: string[]
  answer: string
  estimatedSeconds: number
}

export interface ChineseCardState {
  dueAt: string
  intervalDays: number
  lapseCount: number
  lastGrade?: 'again' | 'hard' | 'good' | 'easy'
  updatedAt: string
}

export const cards = cardsData as ChineseCard[]

export function selectChineseSession(
  source: ChineseCard[],
  states: Record<string, ChineseCardState>,
  limit: number,
  now = new Date(),
): ChineseCard[] {
  const due = source.filter((card) => {
    const state = states[card.id]
    return state && new Date(state.dueAt) <= now
  })
  const fresh = source.filter((card) => !states[card.id])
  return [...due, ...fresh].slice(0, limit)
}
