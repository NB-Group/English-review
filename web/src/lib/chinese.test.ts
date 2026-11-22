import { cards, selectChineseSession } from './chinese.ts'

const session = selectChineseSession(cards, {}, 20, new Date('2026-11-22T08:00:00.000Z'))

if (session.length === 0) throw new Error('Chinese session should contain cards')
if (new Set(session.map((card) => card.id)).size !== session.length) {
  throw new Error('Chinese session should not repeat cards')
}
if (session.length > 20) throw new Error('Chinese session exceeded its limit')

console.log('Chinese session tests passed')
