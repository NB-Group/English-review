import { mapEnglishProfile, makeUnifiedCardId } from './migration-map.ts'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  name: 'student', goals: [], progress: {
    'w:73': {
      triage: 'recognize',
      dims: { w1: { due: 1732262400000, stability: 20, difficulty: 5, elapsed_days: 0, scheduled_days: 20, reps: 3, lapses: 0, state: 2 } },
    },
  }, sentenceProgress: {}, dailyQuota: { triage: 15, spotcheck: 5, newWords: 20 }, createdAt: 1732262400000,
}

const snapshot = mapEnglishProfile(profile, '2026.11.22', 1732262400000)
if (snapshot.learningStates[0]?.cardId !== makeUnifiedCardId('2026.11.22', 'english', 'w:73', 'w1')) {
  throw new Error('English card ID mapping failed')
}
if (snapshot.preferences.name !== 'student' || snapshot.source !== 'english-profile') {
  throw new Error('Profile migration metadata failed')
}

console.log('migration map tests passed')
