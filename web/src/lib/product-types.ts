export type StudySubject = 'english' | 'chinese' | 'chemistry'
export type PracticeScope = 'today' | 'all-phrases' | 'all-words' | 'poetry' | 'wenyan' | 'chemistry-equations'
export type PracticeMode = 'formal' | 'practice'

export interface PracticeRequest {
  subject: StudySubject
  scope: PracticeScope
  mode: PracticeMode
  order: 'priority' | 'textbook' | 'random'
}

export function parsePracticeRequest(search: string): PracticeRequest {
  const params = new URLSearchParams(search)
  const subject = params.get('subject') as StudySubject | null
  const scope = params.get('scope') as PracticeScope | null
  const mode = params.get('mode') as PracticeMode | null
  const order = params.get('order') as PracticeRequest['order'] | null
  return {
    subject: subject === 'chinese' || subject === 'chemistry' ? subject : 'english',
    scope: scope ?? 'today',
    mode: mode === 'practice' ? 'practice' : 'formal',
    order: order === 'textbook' || order === 'random' ? order : 'priority',
  }
}
