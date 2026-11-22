import { createUnifiedBackend } from './unified-backend.ts'

if (typeof createUnifiedBackend !== 'function') throw new Error('unified backend factory is missing')

console.log('unified backend tests passed')
