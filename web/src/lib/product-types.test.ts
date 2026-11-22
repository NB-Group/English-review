import { parsePracticeRequest } from './product-types.ts'

const request = parsePracticeRequest('?subject=english&scope=all-phrases&mode=practice&order=textbook')
if (!request || request.subject !== 'english' || request.scope !== 'all-phrases' || request.mode !== 'practice' || request.order !== 'textbook') {
  throw new Error('practice request parsing failed')
}

const defaults = parsePracticeRequest('')
if (!defaults || defaults.subject !== 'english' || defaults.scope !== 'today' || defaults.mode !== 'formal' || defaults.order !== 'priority') {
  throw new Error('practice request defaults failed')
}

console.log('product type tests passed')

const selected = parsePracticeRequest('?subject=english&scope=phrases&ids=2,2,3,no,0')
if (!selected || selected.phraseIds?.join(',') !== '2,3') throw new Error('selected phrase IDs should be valid and unique')
if (parsePracticeRequest('?subject=chinese&scope=all-phrases') !== null) throw new Error('invalid subject and scope should be rejected')
