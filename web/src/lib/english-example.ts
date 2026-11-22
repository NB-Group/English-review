import type { Dataset } from './data'
import type { Example } from '../types'

export function getEnglishExample(ds: Dataset, kind: 'word' | 'phrase', no: number): Example | undefined {
  const entry = kind === 'word' ? ds.wordByNo.get(no) : ds.phraseByNo.get(no)
  return entry?.examples.find((item) => item.en.trim() && item.zh.trim())
    ?? ds.sentences.find((item) => item.kind === kind && item.entry_no === no && item.en.trim() && item.zh.trim())
}

export function getExampleCloze(example: Example, headword: string) {
  for (const answer of headword.split('/').map((part) => part.trim()).filter(Boolean)) {
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])', 'i').exec(example.en)
    if (!match) continue
    return {
      text: example.en.slice(0, match.index) + '____' + example.en.slice(match.index + match[0].length),
      answer: match[0],
    }
  }
}
