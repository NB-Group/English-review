import type { Dataset } from './data'
import type { UserProfile } from '../types'
import type { PracticeRequest } from './product-types'
import { buildSession, buildVocabularyPractice, shuffle, type SessionCard } from './engine'
import { cards, pieces, selectChineseSession, type ChineseCard } from './chinese'

export type PracticeCard =
  | { subject: 'english'; card: SessionCard }
  | { subject: 'chinese'; card: ChineseCard }

const pieceKinds = new Map(pieces.map((piece) => [piece.id, piece.kind]))

export function buildPracticeSession(ds: Dataset, profile: UserProfile, request: PracticeRequest): PracticeCard[] {
  if (request.scope !== 'today' && request.subject === 'english') {
    return buildVocabularyPractice(
      ds, request.scope === 'all-words' ? 'word' : 'phrase', request.order,
      request.skill ?? 'dictation', request.phraseIds,
    ).map((card) => ({ subject: 'english', card }))
  }

  if (request.scope !== 'today') {
    const selected = cards.filter((card) => {
      if (request.scope === 'senses') return card.kind === 'sense-recall'
      if (request.scope === 'piece') return card.pieceId === request.pieceId
      return card.pieceId && pieceKinds.get(card.pieceId) === (request.scope === 'poetry' ? 'poem' : 'prose')
    })
    return (request.order === 'random' ? shuffle(selected) : selected).map((card) => ({ subject: 'chinese', card }))
  }

  const quota = profile.dailyQuota
  const english = request.subject === 'chinese' ? [] : buildSession(ds, profile, {
    due: 60, spellSpot: quota.spotcheck, fluentSpot: Math.ceil(quota.spotcheck / 2),
    triage: quota.triage, newWords: quota.newWords,
  }).cards
  const chinese = request.subject === 'english' ? [] : selectChineseSession(cards, profile.chineseProgress ?? {}, 20)
  const queue: PracticeCard[] = []
  for (let index = 0; index < Math.max(english.length, chinese.length); index++) {
    if (english[index]) queue.push({ subject: 'english', card: english[index] })
    if (chinese[index]) queue.push({ subject: 'chinese', card: chinese[index] })
  }
  return queue
}
