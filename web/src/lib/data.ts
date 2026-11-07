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
