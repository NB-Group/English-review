import { buildSession } from './engine.ts'
import type { Dataset } from './data.ts'
import type { EntryProgress, UserProfile, WordEntry } from '../types.ts'

function state(due: number) {
  return { due, stability: 10, difficulty: 5, elapsed_days: 0, scheduled_days: 10, reps: 1, lapses: 0, state: 2 as const }
}

function word(no: number): WordEntry {
  return {
    no, headword: `word-${no}`, stars: 2, three_level: true, ipa: null,
    inflections: [], senses: [{ pos: 'n.', zh: `词 ${no}` }], textbook_tags: [],
    examples: [], derivations: [], phrases: [], synonyms: [], antonyms: [], proverbs: [], notes: [], page: no,
  }
}

function dataset(words: WordEntry[]): Dataset {
  return {
    words, phrases: [], sentences: [], irregularVerbs: [],
    wordByNo: new Map(words.map((entry) => [entry.no, entry])),
    phraseByNo: new Map(), wordsByLetter: new Map(),
  }
}

function profile(progress: Record<string, EntryProgress>): UserProfile {
  return {
    name: 'test',
    goals: [{ id: 'all', scope: { stars: [2] }, level: 'full' }],
    progress, sentenceProgress: {}, dailyQuota: { triage: 0, spotcheck: 5, newWords: 0 }, createdAt: Date.now(),
  }
}

const now = Date.now()
const fluent = (lastSeenAt?: number): EntryProgress => ({
  triage: 'fluent', dims: { w1: state(now - 1), w2: state(now + 86400000) }, lastSeenAt,
})

const duplicatePlan = buildSession(
  dataset(Array.from({ length: 10 }, (_, i) => word(i + 1))),
  profile(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`w:${i + 1}`, fluent(now - 86400000 * 2)]))),
  { due: 9, spellSpot: 0, fluentSpot: 1, triage: 0, newWords: 0 }, now,
)
const keys = duplicatePlan.cards.map((card) => card.key)
if (new Set(keys).size !== keys.length) throw new Error('a session must not repeat an entry')

const recentPlan = buildSession(
  dataset([word(1)]), profile({ 'w:1': fluent(now - 60 * 60 * 1000) }),
  { due: 0, spellSpot: 0, fluentSpot: 1, triage: 0, newWords: 0 }, now,
)
if (recentPlan.stats.fluentSpot !== 0) throw new Error('a recently checked fluent entry must be deferred')

console.log('engine tests passed')
