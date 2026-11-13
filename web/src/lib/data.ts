import type { IrregularVerb, PhraseEntry, Sentence, WordEntry } from '../types'

/** 数据集：从 /data/kaogang/ 静态加载，内存索引 */

export interface Dataset {
  words: WordEntry[]
  phrases: PhraseEntry[]
  sentences: Sentence[]
  irregularVerbs: IrregularVerb[]
  wordByNo: Map<number, WordEntry>
  phraseByNo: Map<number, PhraseEntry>
  wordsByLetter: Map<string, WordEntry[]>
}

let cache: Dataset | null = null
let loading: Promise<Dataset> | null = null

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function loadDataset(): Promise<Dataset> {
  if (cache) return Promise.resolve(cache)
  if (loading) return loading
  loading = Promise.all([
    fetchJson<WordEntry[]>('/data/kaogang/words.json'),
    fetchJson<PhraseEntry[]>('/data/kaogang/phrases.json'),
    fetchJson<Sentence[]>('/data/kaogang/sentences.json'),
    fetchJson<IrregularVerb[]>('/data/kaogang/irregular_verbs.json').catch(() => []),
  ]).then(([words, phrases, sentences, irregularVerbs]) => {
    // 归一化：OCR 遗留的 inflections 双形状（"复 lives /laɪvz/" 字符串 / note:null）
    for (const w of words) {
      if (!Array.isArray(w.inflections)) continue
      w.inflections = w.inflections
        .map((rawF) => {
          // 数据里混有 OCR 原文串与 note:null，类型声明之外的现实
          const f = rawF as string | { note?: string | null; form?: string }
          if (typeof f === 'string') {
            const m = f.match(/^(?:复|比较级|最高级)?\s*([^\s(（]+)/)
            const label = f.match(/^(复|比较级|最高级)/)?.[1] ?? ''
            return { note: label, form: m?.[1] ?? f.trim() }
          }
          return { note: f.note ?? '', form: f.form ?? '' }
        })
        .filter((f) => f.form)
    }
    const wordByNo = new Map(words.map((w) => [w.no, w]))
    const phraseByNo = new Map(phrases.map((p) => [p.no, p]))
    const wordsByLetter = new Map<string, WordEntry[]>()
    for (const w of words) {
      const letter = w.headword[0]?.toUpperCase() ?? '#'
      const bucket = wordsByLetter.get(letter) ?? []
      bucket.push(w)
      wordsByLetter.set(letter, bucket)
    }
    cache = { words, phrases, sentences, irregularVerbs, wordByNo, phraseByNo, wordsByLetter }
    return cache
  })
  return loading
}
