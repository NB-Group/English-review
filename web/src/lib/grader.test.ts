import { grade } from './grader.ts'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`)
}

const alternatives = ['anybody / anyone', 'anybody', 'anyone']
assertEqual(grade('anybody', alternatives), 'exact', 'first alternative')
assertEqual(grade('anyone', alternatives), 'exact', 'second alternative')
assertEqual(grade('anybody anyone', alternatives), 'exact', 'both word alternatives')
assertEqual(grade('anybody/anyone', alternatives), 'exact', 'slash-separated alternatives')
assertEqual(grade('anybody anybody', alternatives), 'wrong', 'repeating one alternative')
assertEqual(grade('a bit', ['a bit (of)']), 'exact', 'omitting optional phrase suffix')
assertEqual(grade('a bit of', ['a bit (of)']), 'exact', 'including optional phrase suffix')
assertEqual(grade('manner', ['manner(s)']), 'exact', 'optional letter')
assertEqual(grade('be located at', ['be located (in/on/at)']), 'exact', 'alternatives inside optional parentheses')

console.log('grader tests passed')
