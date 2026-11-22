import type { Dataset } from './data'
import type { Example } from '../types'

export function getEnglishExample(ds: Dataset, kind: 'word' | 'phrase', no: number): Example | undefined {
  const entry = kind === 'word' ? ds.wordByNo.get(no) : ds.phraseByNo.get(no)
  return entry?.examples.find((item) => item.en.trim() && item.zh.trim())
    ?? ds.sentences.find((item) => item.kind === kind && item.entry_no === no && item.en.trim() && item.zh.trim())
}
