import cardsData from '../data/zhongkao-qwen-2026.11.22/cards.json'
import piecesData from '../data/zhongkao-qwen-2026.11.22/pieces.json'
import segmentsData from '../data/zhongkao-qwen-2026.11.22/segments.json'
import type { ChineseCardState, ChineseGrade } from '../types'

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

export const cards = cardsData as ChineseCard[]
export const pieces = piecesData as Array<{ id: string; kind: 'poem' | 'prose'; title: string; author?: string; textbookLocation?: string }>

const orderedSegments = new Map(segmentsData.map((segment) => [segment.pieceId + ':' + segment.order, segment.text]))
export const previousSegment = new Map(segmentsData.map((segment) =>
  [segment.id, orderedSegments.get(segment.pieceId + ':' + (segment.order - 1))] as const))

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

export function rateChinese(previous: ChineseCardState | undefined, grade: ChineseGrade, now = Date.now()): ChineseCardState {
  const interval = previous?.intervalDays ?? 0
  const intervalDays = grade === 'again' ? 0 : grade === 'hard' ? Math.max(1, interval)
    : grade === 'good' ? interval === 0 ? 1 : Math.round(interval * 2.2)
      : Math.max(3, Math.round(Math.max(1, interval) * 3.5))
  return {
    dueAt: new Date(now + (intervalDays === 0 ? 600_000 : intervalDays * 86_400_000)).toISOString(),
    intervalDays, lapseCount: (previous?.lapseCount ?? 0) + Number(grade === 'again'),
    lastGrade: grade, updatedAt: new Date(now).toISOString(),
  }
}
