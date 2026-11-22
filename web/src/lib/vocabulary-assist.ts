import type { Grade } from './grader'

export type VocabularyAssist = (request: { expected: string; clue: string } & (
  { intent: 'hint' } | { intent: 'grade'; answer: string }
), signal: AbortSignal) => Promise<{ grade?: Grade; hint?: string }>
