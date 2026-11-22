import { useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import type { PracticeRequest } from '../lib/product-types'
import { buildPracticeSession, type PracticeCard } from '../lib/session-builder'
import { useProfile } from '../lib/store'
import { getSession } from '../lib/sync'
import { Rating } from '../lib/fsrs'
import { mapEnglishProfile, makeUnifiedCardId } from '../lib/migration-map'
import { STUDY_CONTENT_VERSION, useStudyCloud } from '../lib/study-cloud'
import type { ChineseGrade, Dim } from '../types'
import { rateChinese } from '../lib/chinese'
import EnglishCard, { type EnglishReviewResult } from './Study'
import ChineseReviewCard from './ChineseStudy'

interface Result {
  outcome: 'correct' | 'review' | 'assessed'
}

interface Session {
  queue: PracticeCard[]
  results: Result[]
  readPieceIds?: string[]
}

function restore(key: string): Session | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null
    if (saved && Array.isArray(saved.queue) && Array.isArray(saved.results) &&
      saved.results.length <= saved.queue.length) return saved
  } catch { /* Storage may be unavailable. */ }
}

function subscribeToAccount(notify: () => void) {
  window.addEventListener('kaogang-session', notify)
  return () => window.removeEventListener('kaogang-session', notify)
}

export default function PracticeSession({ ds, request }: { ds: Dataset; request: PracticeRequest }) {
  const cloud = useStudyCloud()
  const owner = useSyncExternalStore(subscribeToAccount, () => getSession()?.user ?? null)
  const roundOwner = cloud?.guest ? owner : cloud?.accountId ?? owner
  const storageKey = 'zhongkao-practice-v1:' + JSON.stringify([roundOwner, request])
  return <PracticeRound key={storageKey} storageKey={storageKey} ds={ds} request={request} />
}

function PracticeRound({ ds, request, storageKey }: { ds: Dataset; request: PracticeRequest; storageKey: string }) {
  const store = useProfile
  const cloud = useStudyCloud()
  const fresh = (): Session => ({ queue: buildPracticeSession(ds, store.getState().profile, request), results: [] })
  const [session, setSession] = useState<Session>(() => restore(storageKey) ?? fresh())
  const [storageError, setStorageError] = useState(false)
  const submitted = useRef(-1)
  const index = session.results.length
  const current = session.queue[index]
  const readPieceIds = Array.isArray(session.readPieceIds) ? session.readPieceIds : []
  const pieceId = current?.subject === 'chinese' && current.card.kind === 'segment-continuation'
    ? current.card.pieceId : undefined
  const needsReading = Boolean(pieceId && !readPieceIds.includes(pieceId))

  function save(next: Session) {
    setSession(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      setStorageError(true)
    }
  }

  function advance(outcome: Result['outcome'], apply: () => void) {
    if (submitted.current === index) return
    submitted.current = index
    try {
      if (request.mode === 'formal') apply()
    } catch {
      setStorageError(true)
    }
    save({ ...session, results: [...session.results, { outcome }] })
  }

  function record(subject: 'english' | 'chinese', key: string, skill: Dim | 'recall', grade: ChineseGrade | null) {
    if (!cloud?.review) return
    const cardId = makeUnifiedCardId(STUDY_CONTENT_VERSION, subject, key, skill)
    const state = mapEnglishProfile(store.getState().profile, STUDY_CONTENT_VERSION).learningStates
      .find((candidate) => candidate.cardId === cardId)
    if (state) cloud.review(state, grade)
  }

  function finishEnglish(result: EnglishReviewResult) {
    if (current?.subject !== 'english') return
    const card = current.card
    if (result.kind === 'triage') {
      advance('assessed', () => {
        store.getState().triage(card.key, result.verdict)
        record('english', card.key, 'w1', null)
        record('english', card.key, 'w2', null)
      })
      return
    }
    advance(result.rating >= Rating.Good ? 'correct' : 'review', () => {
      const { answer } = store.getState()
      if (card.kind === 'newWord') {
        answer(card.key, 'w1', Rating.Easy)
        record('english', card.key, 'w1', 'easy')
      }
      const dim = card.dim ?? 'w2'
      answer(card.key, dim, result.rating)
      const grade: ChineseGrade = result.rating === Rating.Easy ? 'easy' : result.rating === Rating.Good ? 'good'
        : result.rating === Rating.Hard ? 'hard' : 'again'
      record('english', card.key, dim, grade)
    })
  }

  const title = request.scope === 'today' ? '今日计划' : '专项训练'
  const reviewCards = session.queue.filter((_, i) => session.results[i]?.outcome === 'review')
  const warning = storageError && <p role="status" className="text-sm text-duo-red-dark">本机无法保存这轮的续练位置。</p>
  if (!current) {
    return (
      <section className="practice-launcher">
        <h1>{index ? '本轮完成' : '这个范围没有可练的题目'}</h1>
        <p className="practice-lead">
          {index > 0 && `已完成 ${index} 题，${reviewCards.length} 题需要巩固。`}
        </p>
        {warning}
        {reviewCards.length > 0 && (
          <button className="push mt-5" onClick={() => {
            submitted.current = -1
            save({ queue: reviewCards, results: [] })
          }}>重练需要巩固的题</button>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="choice" to={request.scope === 'today' ? '/today' : '/practice'}>返回{title}</Link>
          {index > 0 && <button className="choice" onClick={() => {
            submitted.current = -1
            save(fresh())
          }}>开始新一轮</button>}
        </div>
      </section>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink-soft">
        <span>{title} · {request.mode === 'formal' ? '计入学习进度' : '仅本轮练习'}</span>
        <Link to={request.scope === 'today' ? '/today' : '/practice'} className="choice ml-auto"
          onClick={() => save(session)}>暂停</Link>
      </div>
      {warning}
      <div className="flex items-center gap-3">
        <progress className="min-w-0 flex-1 accent-duo-green" aria-label="本轮进度" value={index} max={session.queue.length} />
        <span className="text-sm tabular-nums">{index + 1} / {session.queue.length}</span>
      </div>
      <div key={index}>
        {current.subject === 'english'
          ? <EnglishCard ds={ds} card={current.card} onDone={finishEnglish} />
          : <ChineseReviewCard card={current.card} needsReading={needsReading} onStartReciting={() => {
              if (pieceId && needsReading) save({ ...session, readPieceIds: [...readPieceIds, pieceId] })
            }} onGrade={(grade) => {
              const id = current.card.id
              advance(grade === 'good' || grade === 'easy' ? 'correct' : 'review', () => {
                const state = store.getState()
                state.setChineseCardState(id, rateChinese(state.profile.chineseProgress?.[id], grade))
                record('chinese', id, 'recall', grade)
              })
            }} />}
      </div>
    </div>
  )
}
