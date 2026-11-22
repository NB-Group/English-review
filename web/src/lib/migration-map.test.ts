import { mapEnglishProfile, makeUnifiedCardId, restoreMigratedProfile } from './migration-map.ts'
import type { UserProfile } from '../types'

const savedFsrs = { due: 1732262400000, stability: 20, difficulty: 5, elapsed_days: 0, scheduled_days: 20, reps: 3, lapses: 0, state: 2 as const }

const profile: UserProfile = {
  name: 'student', goals: [], progress: {
    'w:73': {
      triage: 'recognize',
      lastSeenAt: 1732262400000,
      dims: { w1: savedFsrs },
    },
    'p:12': { triage: 'skip', dims: {} },
  }, sentenceProgress: { s00001: { s1: savedFsrs } }, dailyQuota: { triage: 15, spotcheck: 5, newWords: 20 }, createdAt: 1732262400000,
}

const snapshot = mapEnglishProfile(profile, '2026.11.22', 1732262400000)
if (snapshot.learningStates[0]?.cardId !== makeUnifiedCardId('2026.11.22', 'english', 'w:73', 'w1')) {
  throw new Error('English card ID mapping failed')
}
if (snapshot.preferences.name !== 'student' || snapshot.source !== 'english-profile') {
  throw new Error('Profile migration metadata failed')
}
if (snapshot.preferences.entryMetadata?.['p:12']?.triage !== 'skip' ||
    snapshot.preferences.entryMetadata?.['w:73']?.lastSeenAt !== 1732262400000 ||
    snapshot.preferences.createdAt !== profile.createdAt) {
  throw new Error('Existing profile metadata must survive migration')
}
if (snapshot.learningStates[0]?.schedulerState?.stability !== 20 ||
    snapshot.learningStates[1]?.cardId !== 'card:2026.11.22:english:sentence:s00001:s1') {
  throw new Error('FSRS parameters and sentence progress must survive migration')
}

const restored = restoreMigratedProfile(snapshot.preferences, snapshot.learningStates, profile)
if (JSON.stringify(restored.progress['w:73'].dims.w1) !== JSON.stringify(profile.progress['w:73'].dims.w1) ||
    restored.progress['p:12'].triage !== 'skip' ||
    restored.sentenceProgress.s00001?.s1?.due !== savedFsrs.due) {
  throw new Error('Migrated state must restore to the original scheduler and progress fields')
}

console.log('migration map tests passed')
