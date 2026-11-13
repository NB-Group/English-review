/** 考纲数据集类型（与 data/kaogang/*.json 对齐） */

export interface Sense {
  pos: string
  zh: string
}

export interface Inflection {
  note: string
  form: string
}

export interface Example {
  en: string
  zh: string
  rewrite: string | null
}

export interface Derivation {
  word: string
  pos: string
  zh: string
}

export interface WordEntry {
  no: number
  headword: string
  stars: 0 | 1 | 2 | 3
  three_level: boolean
  ipa: string | null
  inflections: Inflection[]
  senses: Sense[]
  textbook_tags: string[]
  examples: Example[]
  derivations: Derivation[]
  phrases: string[]
  synonyms: string[]
  antonyms: string[]
  proverbs: string[]
  notes: string[]
  page: number
  _flags?: string[]
}

export interface PhraseEntry {
  no: number
  headword: string
  stars: 0 | 1 | 2 | 3
  three_level: boolean
  pos: string | null
  meaning: string
  textbook_tags: string[]
  examples: Example[]
  notes: string[]
  page: number
}

export interface Sentence {
  id: string
  kind: 'word' | 'phrase'
  entry_no: number
  headword: string
  page: number
  en: string
  zh: string
  rewrite: string | null
}

export interface IrregularVerb {
  group: string
  infinitive: string
  ipa: string | null
  past: string | string[]
  past_ipa: string | string[] | null
  pp: string | string[] | null
  pp_ipa: string | string[] | null
  note: string | null
  star: boolean
}

/** 用户侧 */

/** 清洗判定 */
export type TriageVerdict = 'fluent' | 'recognize' | 'unknown'

/** 掌握维度 */
export type Dim = 'w1' | 'w2' | 's1' | 's2'

/** 目标等级（词集 → 等级） */
export type GoalLevel = 'skip' | 'recognize' | 'dictation' | 'sentence' | 'full'

export interface GoalRule {
  id: string
  scope: { stars?: number[]; kind?: 'word' | 'phrase'; threeLevelOnly?: boolean }
  level: GoalLevel
}

/** FSRS 卡片状态（ts-fsrs Card 的可序列化子集） */
export interface FsrsState {
  due: number // epoch ms
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: 0 | 1 | 2 | 3 // ts-fsrs 5.x: New=0 Learning=1 Review=2 Relearning=3
}

export interface EntryProgress {
  triage: TriageVerdict | null
  dims: Partial<Record<Dim, FsrsState>>
  degraded?: boolean // 抽查失败被降级
}

export interface UserProfile {
  name: string
  goals: GoalRule[]
  progress: Record<string, EntryProgress> // key: "w:598" / "p:22"
  sentenceProgress: Record<string, Record<Dim, FsrsState>> // key: sentence id
  dailyQuota: { triage: number; spotcheck: number; newWords: number }
  createdAt: number
}
