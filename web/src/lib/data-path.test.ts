import { datasetBasePath } from './data-path.ts'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`)
}

assertEqual(datasetBasePath('/', undefined), '/data/kaogang/', 'local base')
assertEqual(datasetBasePath('/English-review/', undefined), '/English-review/data/kaogang/', 'GitHub Pages base')
assertEqual(datasetBasePath('/English-review/', 'https://cdn.example/data/'), 'https://cdn.example/data/kaogang/', 'configured base')

console.log('datasetBasePath tests passed')
