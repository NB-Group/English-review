import { grade } from './grader.ts'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`)
}

const alternatives = ['anybody / anyone', 'anybody', 'anyone']
assertEqual(grade('anybody', alternatives), 'exact', 'first alternative')
assertEqual(grade('anyone', alternatives), 'exact', 'second alternative')
assertEqual(grade('anybody anyone', alternatives), 'exact', 'both word alternatives')
assertEqual(grade('anybody/anyone', alternatives), 'exact', 'slash-separated alternatives')

console.log('grader tests passed')
