import { composeHintedAnswer, contextHint, firstCharacterHint, spellingSubmission } from './hints.ts'

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
assertEqual(spellingSubmission('a bit (of)', 'bit'), 'a bit', 'single-letter first word needs a space')
assertEqual(spellingSubmission('a lot of/lots of', 'lots of'), 'lots of', 'a full alternate answer keeps its own first letter')
assertEqual(spellingSubmission('take care of', 'ake care of'), 'take care of', 'adding the first character keeps the phrase intact')
assertEqual(contextHint('a lot of/lots of', 'There are a lot of visitors.'), 'There are ____ visitors.', 'context masks answer')

console.log('firstCharacterHint tests passed')
