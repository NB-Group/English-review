import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { TriageVerdict } from '../types'
import type { SessionCard } from '../lib/engine'
import { Rating } from '../lib/fsrs'
import { grade, type Grade } from '../lib/grader'
import { composeHintedAnswer, firstCharacterHint } from '../lib/hints'
import { speak } from '../lib/tts'

const EASE = [0.16, 1, 0.3, 1] as const

const KIND_LABEL: Record<SessionCard['kind'], string> = {
  review: '到期复习', spellSpot: '拼写抽查', fluentSpot: '熟词抽查',
  triage: '词汇摸底', newWord: '新词学习',
}
const KIND_TINT: Record<SessionCard['kind'], string> = {
  review: 'bg-duo-blue-tint/50', spellSpot: 'bg-duo-gold-tint/50',
  fluentSpot: 'bg-duo-purple-tint/50', triage: 'bg-duo-purple-tint/50',
  newWord: 'bg-duo-green-tint/50',
}

function Speaker({ word, big = false }: { word: string; big?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={() => speak(word)}
      onContextMenu={(e) => { e.preventDefault(); speak(word, { slow: true }) }}
      title="点击朗读 · 右键慢速"
      className={`push push-blue !px-0 ${big ? 'size-16 text-2xl' : 'size-11 text-base'}`}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" strokeLinecap="round"/></svg>
    </motion.button>
  )
}

export type EnglishReviewResult =
  | { kind: 'triage'; verdict: TriageVerdict }
  | { kind: 'review'; rating: Rating }

export default function EnglishCard({
  ds, card, onDone,
}: { ds: Dataset; card: SessionCard; onDone: (result: EnglishReviewResult) => void }) {
  if (card.kind === 'triage') {
    return <TriageCard card={card} onDone={(verdict) => onDone({ kind: 'triage', verdict })} />
  }
  const review = (rating: Rating) => onDone({ kind: 'review', rating })
  if (card.kind === 'newWord') return <NewWordCard ds={ds} card={card} onDone={review} />
  return <ReviewCard ds={ds} card={card} onDone={review} />
}

/* 舞台分区组件：prompt 在上（自动撑开居中），action 吸底 */

function Prompt({ kind, card, children }: { kind: SessionCard['kind']; card: SessionCard; children: React.ReactNode }) {
  return (
    <div className={"rounded-[28px] px-4 py-8 sm:px-8 " + KIND_TINT[kind]}>
      <div className="flex items-center justify-center gap-2 text-[12px] font-extrabold text-ink-faint">
        <span>{kind === 'review' && card.dim === 'w1' ? '认读' : KIND_LABEL[kind]}</span>
        <span>·</span>
        <span>{card.entryKind === 'word' ? `W${card.no}` : `P${card.no}`}</span>
        {card.stars > 0 && <span className="text-duo-gold-dark">{'★'.repeat(card.stars)}</span>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  )
}

/* ─────────── 清洗卡 ─────────── */

function TriageCard({ card, onDone }: { card: SessionCard; onDone: (v: TriageVerdict) => void }) {
  useEffect(() => { speak(card.headword) }, [card.headword])
  return (
    <div>
      <Prompt kind="triage" card={card}>
        <div className="flex items-center justify-center gap-5">
          <span className="study-headword text-[52px] font-black tracking-wide text-ink sm:text-[64px]">{card.headword}</span>
          <Speaker word={card.headword} big />
        </div>
        <p className="mt-4 text-[14px] font-bold text-ink-faint">先判断熟悉程度，再为你安排复习。</p>
      </Prompt>
      <div className="triage-options mt-10 flex flex-col gap-3">
        <button className="push w-full !py-4 text-lg" onClick={() => onDone('fluent')}>
          已经熟练 <span className="font-semibold opacity-75">认识也能拼写，定期抽查</span>
        </button>
        <button className="push push-gold w-full !py-4 text-lg" onClick={() => onDone('recognize')}>
          认识，需要练拼写 <span className="font-semibold opacity-75">见词知义，拼写要练</span>
        </button>
        <button className="push push-red w-full !py-4 text-lg" onClick={() => onDone('unknown')}>
          还不认识 <span className="font-semibold opacity-75">从零开始，最高优先</span>
        </button>
      </div>
    </div>
  )
}

/* ─────────── 新词三段卡 ─────────── */

function NewWordCard({
  ds, card, onDone,
}: { ds: Dataset; card: SessionCard; onDone: (r: Rating) => void }) {
  const word = card.entryKind === 'word' ? ds.wordByNo.get(card.no) : undefined
  const phrase = card.entryKind === 'phrase' ? ds.phraseByNo.get(card.no) : undefined
  const entry = word ?? phrase
  const ipa = word?.ipa ?? null
  const zh = word ? word.senses.map((s) => `${s.pos} ${s.zh}`).join('；') : (phrase?.meaning ?? '')
  const example = (word?.examples ?? phrase?.examples ?? [])[0]
  const [step, setStep] = useState(card.priorTriage === 'recognize' ? 1 : 0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Grade | null>(null)
  const [spellGrade, setSpellGrade] = useState<Grade>('wrong')

  useEffect(() => {
    if (step <= 1 && card.priorTriage !== 'recognize') speak(card.headword)
    if (step === 2 && example) speak(example.en)
  }, [step, card.headword, example])

  if (!entry) return null

  if (step === 0) {
    return (
      <div>
        <Prompt kind="newWord" card={card}>
          <div className="study-headword text-[52px] font-black tracking-wide text-ink sm:text-[64px]">{card.headword}</div>
          {ipa && <div className="mt-3 font-mono text-[16px] font-bold text-ink-faint">{ipa}</div>}
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Speaker word={card.headword} />
            <span className="text-[12px] font-bold text-ink-faint">右键慢速</span>
          </div>
        </Prompt>
        <div className="mt-10 flex justify-center">
          <button className="push w-full max-w-sm !py-4 text-lg" onClick={() => setStep(1)}>我会读了</button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
    const hint = firstCharacterHint(card.headword)
    const submit = () => {
      const answer = composeHintedAnswer(hint, input)
      const g = grade(answer, accepted)
      setSpellGrade(g)
      setResult(g)
    }
    return (
      <div>
        <Prompt kind="newWord" card={card}>
          <div className="flex justify-center"><Speaker word={card.headword} big /></div>
          <p className="mt-5 text-[14px] font-bold text-ink-faint">
            {typeof window !== 'undefined' && 'speechSynthesis' in window ? '听音拼词' : '本设备无法朗读，凭记忆拼写'}
          </p>
        </Prompt>
        <div className="mt-8">
          <div className="relative">
            <span
              aria-hidden="true"
              className="dictation-hint"
            >
              {hint}
            </span>
            <input
              autoFocus
              className="duo-input dictation-input text-left"
              placeholder="凭读音拼出来"
              value={input}
              disabled={result !== null}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !result && input.trim() && submit()}
            />
          </div>
          {result === null ? (
            <div className="mt-5 flex justify-center">
              <button className="push w-full max-w-sm !py-4 text-lg" disabled={!input.trim()} onClick={submit}>
                检查
              </button>
            </div>
          ) : (
            <Feedback
              grade={result} answer={card.headword} yours={composeHintedAnswer(hint, input)}
              onContinue={() => { setResult(null); setInput(''); setStep(2) }}
              continueLabel="继续"
            />
          )}
        </div>
      </div>
    )
  }

  const finalRating = spellGrade === 'exact' ? Rating.Good : spellGrade === 'near' ? Rating.Hard : Rating.Again
  return (
    <div>
      <Prompt kind="newWord" card={card}>
        <div className="text-[40px] font-black tracking-wide text-ink">{card.headword}</div>
        <div className="mt-4 text-[20px] font-extrabold text-ink">{zh}</div>
        {example && (
          <div className="mx-auto mt-7 max-w-lg rounded-2xl bg-mist px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-bold leading-relaxed text-ink">{example.en}</div>
              <Speaker word={example.en} />
            </div>
            <div className="mt-1.5 text-[13px] font-semibold text-ink-faint">{example.zh}</div>
            {example.rewrite && (
              <div className="mt-1.5 text-[13px] font-extrabold text-duo-blue-dark">{example.rewrite}</div>
            )}
          </div>
        )}
      </Prompt>
      <div className="mt-10 flex justify-center">
        <button className="push w-full max-w-sm !py-4 text-lg" onClick={() => onDone(finalRating)}>记住了</button>
      </div>
    </div>
  )
}

/* ─────────── 复习卡 ─────────── */

function ReviewCard({
  ds, card, onDone,
}: { ds: Dataset; card: SessionCard; onDone: (r: Rating) => void }) {
  const word = card.entryKind === 'word' ? ds.wordByNo.get(card.no) : undefined
  const phrase = card.entryKind === 'phrase' ? ds.phraseByNo.get(card.no) : undefined
  const zh = word ? word.senses.map((s) => `${s.pos} ${s.zh}`).join('；') : (phrase?.meaning ?? '')
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [autoRating, setAutoRating] = useState<Rating>(Rating.Good)
  const [picked, setPicked] = useState<Rating | null>(null)

  const isW1 = card.dim === 'w1'
  useEffect(() => { if (isW1) speak(card.headword) }, [card.key, isW1, card.headword])

  if (isW1) {
    return (
      <div>
        <Prompt kind={card.kind} card={card}>
          <div className="flex items-center justify-center gap-5">
            <span className="text-[48px] font-black tracking-wide text-ink sm:text-[60px]">{card.headword}</span>
            <Speaker word={card.headword} big />
          </div>
          <p className="mt-4 text-[14px] font-bold text-ink-faint">心里过一遍意思</p>
          {!revealed && (
            <div className="mt-10 flex justify-center">
              <button className="push push-blue w-full max-w-sm !py-4 text-lg" onClick={() => setRevealed(true)}>
                揭晓答案
              </button>
            </div>
          )}
          {revealed && (
            <div className="mx-auto mt-8 max-w-lg rounded-2xl bg-duo-blue-tint px-6 py-4 text-[19px] font-extrabold text-duo-blue-dark">
              {zh}
            </div>
          )}
        </Prompt>
        {revealed && (
          <div className="mt-10">
            <RatingRow auto={autoRating} picked={picked} onPick={setPicked} />
            <div className="mt-4 flex justify-center">
              <button className="push w-full max-w-sm !py-4 text-lg" disabled={picked === null}
                onClick={() => { if (picked !== null) onDone(picked) }}>
                继续
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
  const hint = firstCharacterHint(card.headword)
  const submit = () => {
    const answer = composeHintedAnswer(hint, input)
    const g = grade(answer, accepted)
    setAutoRating(g === 'exact' ? Rating.Good : g === 'near' ? Rating.Hard : Rating.Again)
    setRevealed(true)
  }
  return (
    <div>
      <Prompt kind={card.kind} card={card}>
        <p className="text-[14px] font-bold text-ink-faint">拼写</p>
        <div className="mt-4 text-[26px] font-extrabold leading-snug text-ink sm:text-[30px]">{zh}</div>
      </Prompt>
      <div className="mt-10">
        <div className="relative">
          <span
            aria-hidden="true"
            className="dictation-hint"
          >
            {hint}
          </span>
          <input
            autoFocus
            className="duo-input dictation-input text-left"
            placeholder="输入英文"
            value={input}
            disabled={revealed}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !revealed && input.trim() && submit()}
          />
        </div>
        {!revealed ? (
          <div className="mt-5 flex justify-center">
            <button className="push w-full max-w-sm !py-4 text-lg" disabled={!input.trim()} onClick={submit}>
              检查
            </button>
          </div>
        ) : (
          <Feedback
            grade={autoRating === Rating.Good ? 'exact' : autoRating === Rating.Hard ? 'near' : 'wrong'}
            answer={card.headword} yours={composeHintedAnswer(hint, input)}
            onContinue={() => onDone(picked ?? autoRating)}
            continueLabel="继续"
          >
            <RatingRow auto={autoRating} picked={picked} onPick={setPicked} />
          </Feedback>
        )}
      </div>
    </div>
  )
}

/* ─────────── 反馈面板 ─────────── */

function Feedback({
  grade, answer, yours, onContinue, continueLabel, children,
}: {
  grade: Grade
  answer: string
  yours: string
  onContinue: () => void
  continueLabel: string
  children?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const ok = grade !== 'wrong'
  const tint = ok ? 'var(--color-duo-green-tint)' : 'var(--color-duo-red-tint)'
  const ink = ok ? 'var(--color-duo-green-dark)' : 'var(--color-duo-red-dark)'
  const title = grade === 'exact' ? '太棒了' : grade === 'near' ? '很接近' : '再试试'
  const answerOptions = answer.split('/').map((option) => option.trim()).filter(Boolean)
  const shownAnswer = answerOptions.length > 1 && answerOptions.every((option) => !option.includes(' '))
    ? answerOptions.join(' 或 ')
    : answer
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="mt-5 rounded-2xl p-5"
      style={{ background: tint }}
    >
      <div className="text-[20px] font-black" style={{ color: ink }}>
        {ok ? '✓ ' : '✗ '}{title}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] font-extrabold">
        <span style={{ color: ink }}>正确 {shownAnswer}</span>
        {grade !== 'exact' && yours && (
          <span className="text-ink-soft">你写的 {yours}</span>
        )}
      </div>
      {children}
      <div className="mt-4 flex justify-end">
        <button className="push !py-3 px-10" onClick={onContinue}>{continueLabel}</button>
      </div>
    </motion.div>
  )
}

/* ─────────── 四键自评 ─────────── */

const RATING_META: Array<{ r: Rating; label: string; cls: string }> = [
  { r: Rating.Again, label: '重来', cls: 'bg-duo-red-tint text-duo-red-dark' },
  { r: Rating.Hard, label: '困难', cls: 'bg-duo-gold-tint text-duo-gold-dark' },
  { r: Rating.Good, label: '良好', cls: 'bg-duo-green-tint text-duo-green-dark' },
  { r: Rating.Easy, label: '简单', cls: 'bg-duo-blue-tint text-duo-blue-dark' },
]

function RatingRow({
  auto, picked, onPick,
}: { auto: Rating; picked: Rating | null; onPick: (r: Rating) => void }) {
  return (
    <div className="mt-4 flex gap-2">
      {RATING_META.map(({ r, label, cls }) => (
        <motion.button
          key={r}
          whileTap={{ scale: 0.94 }}
          onClick={() => onPick(r)}
          className={`flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition-all ${cls} ${
            picked === r ? 'ring-4 ring-white/80' : picked !== null ? 'opacity-45' : 'hover:brightness-95'
          }`}
        >
          {label}{r === auto && <span className="ml-1 opacity-60">建议</span>}
        </motion.button>
      ))}
    </div>
  )
}
