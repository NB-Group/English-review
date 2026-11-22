export type StudySubject = 'english' | 'chinese' | 'chemistry'
export type ActiveSubject = Exclude<StudySubject, 'chemistry'>
export type PracticeScope = 'today' | 'all-phrases' | 'all-words' | 'phrases' | 'senses' | 'poetry' | 'wenyan' | 'piece'
export type PracticeMode = 'formal' | 'practice'

export interface PracticeRequest {
  subject: ActiveSubject | 'all'
  scope: PracticeScope
  mode: PracticeMode
  order: 'priority' | 'textbook' | 'random'
  skill?: 'recognize' | 'dictation'
  phraseIds?: number[]
  pieceId?: string
}

export function parsePracticeRequest(search: string): PracticeRequest | null {
  const params = new URLSearchParams(search)
  const subject = params.get('subject') ?? 'english'
  if (subject !== 'english' && subject !== 'chinese' && subject !== 'all') return null
  const requestedScope = params.get('scope') ?? 'today'
  const allowed = subject === 'english' ? ['today', 'all-phrases', 'all-words', 'phrases']
    : subject === 'chinese' ? ['today', 'senses', 'poetry', 'wenyan', 'piece'] : ['today']
  if (!allowed.includes(requestedScope)) return null
  const scope = requestedScope as PracticeScope
  const order = params.get('order')
  const skill = params.get('skill')
  const request: PracticeRequest = {
    subject, scope, mode: params.get('mode') === 'practice' ? 'practice' : 'formal',
    order: scope === 'today' ? 'priority' : order === 'random' ? 'random' : 'textbook',
  }
  if (scope === 'all-words' || scope === 'all-phrases' || scope === 'phrases') {
    request.skill = skill === 'recognize' || (scope === 'all-words' && skill !== 'dictation') ? 'recognize' : 'dictation'
  }
  if (scope === 'phrases') {
    const ids = params.get('ids')?.split(',') ?? []
    request.phraseIds = [...new Set(ids.filter((id) => /^[1-9][0-9]*$/.test(id)).map(Number).filter(Number.isSafeInteger))]
    if (!request.phraseIds.length) return null
  }
  if (scope === 'piece') {
    const pieceId = params.get('piece')
    if (!pieceId) return null
    request.pieceId = pieceId
  }
  return request
}

export function practiceLink(request: PracticeRequest): string {
  const params = new URLSearchParams({ subject: request.subject, scope: request.scope, mode: request.mode, order: request.order })
  if (request.skill) params.set('skill', request.skill)
  if (request.phraseIds) params.set('ids', request.phraseIds.join(','))
  if (request.pieceId) params.set('piece', request.pieceId)
  return '/practice?' + params
}
