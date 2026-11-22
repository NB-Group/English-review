import { composeHintedAnswer, firstCharacterHint } from './hints.ts'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`)
}

assertEqual(firstCharacterHint('important'), 'i', 'word')
assertEqual(firstCharacterHint('take care of'), 't', 'phrase')
assertEqual(firstCharacterHint('  take care of'), 't', 'leading whitespace')
assertEqual(firstCharacterHint(''), '', 'empty answer')
assertEqual(composeHintedAnswer('a', 'll'), 'all', 'typed suffix')
assertEqual(composeHintedAnswer('a', 'all'), 'all', 'complete pasted answer')
assertEqual(composeHintedAnswer('', 'all'), 'all', 'empty hint')

console.log('firstCharacterHint tests passed')
