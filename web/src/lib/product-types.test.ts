import { parsePracticeRequest } from './product-types.ts'

const request = parsePracticeRequest('?subject=english&scope=all-phrases&mode=practice&order=textbook')
if (request.subject !== 'english' || request.scope !== 'all-phrases' || request.mode !== 'practice' || request.order !== 'textbook') {
  throw new Error('practice request parsing failed')
}

const defaults = parsePracticeRequest('')
if (defaults.subject !== 'english' || defaults.scope !== 'today' || defaults.mode !== 'formal' || defaults.order !== 'priority') {
  throw new Error('practice request defaults failed')
}

console.log('product type tests passed')
