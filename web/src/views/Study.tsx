import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { TriageVerdict } from '../types'
import { buildSession, type SessionCard, type SessionPlan } from '../lib/engine'
import { Rating } from '../lib/fsrs'
import { grade, type Grade } from '../lib/grader'
import { useProfile } from '../lib/store'
import { speak } from '../lib/tts'

const EASE = [0.16, 1, 0.3, 1] as const

const KIND_META: Record<SessionCard['kind'], { label: string; cls: string }> = {
  review: { label: '到期复习', cls: 'bg-duo-blue-tint text-duo-blue-dark' },
  spellSpot: { label: '拼写抽查', cls: 'bg-duo-gold-tint text-[#8a6a00]' },
  fluentSpot: { label: '熟词抽查', cls: 'bg-duo-purple-tint text-duo-purple-dark' },
  triage: { label: '大清洗', cls: 'bg-duo-purple-tint text-duo-purple-dark' },
  newWord: { label: '新词学习', cls: 'bg-duo-green-tint text-duo-green-dark' },
}

function Speaker({ word, size = 'md' }: { word: string; size?: 'md' | 'lg' }) {
  const [on, setOn] = useState(false)
  const fire = (slow = false) => {
    setOn(true)
    speak(word, { slow })
    window.setTimeout(() => setOn(false), 1400)
  }
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      animate={on ? { scale: [1, 1.18, 1] } : {}}
      onClick={() => fire()}
      onContextMenu={(e) => { e.preventDefault(); fire(true) }}
      title="点击朗读 · 右键慢速"
      className={`push push-blue !px-0 ${size === 'lg' ? 'size-16 text-2xl' : 'size-11 text-base'}`}
    >
      🔊
    </motion.button>
  )
}

export default function Study({ ds }: { ds: Dataset }) {
  const profile = useProfile((s) => s.profile)
  const doTriage = useProfile((s) => s.triage)
  const doAnswer = useProfile((s) => s.answer)
  const reduce = useReducedMotion()

  const plan: SessionPlan = useMemo(
    () =>
      buildSession(ds, profile, {
        due: 60, spellSpot: 10, fluentSpot: 5,
        triage: profile.dailyQuota.triage, newWords: profile.dailyQuota.newWords,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ds],
  )

  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [streak, setStreak] = useState(0)
  const card = plan.cards[idx]

  useEffect(() => {
    if (!card) return
    setStreak(0)
  }, [plan])

  if (done || !card) {
    return <EndScreen plan={plan} onRestart={() => { setIdx(0); setDone(false) }} />
  }

  const next = () => (idx + 1 >= plan.cards.length ? setDone(true) : setIdx(idx + 1))
  const bumpStreak = (good: boolean) => setStreak((s) => (good ? s + 1 : 0))

  return (
    <div className="mt-5 flex min-h-[calc(100dvh-9rem)] flex-col">
      {/* 顶栏：进度 + 连击 */}
      <div className="flex items-center gap-4">
        <div className="duo-track flex-1">
          <div className="duo-fill" style={{ width: `${((idx) / plan.cards.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="popLayout">
          {streak >= 2 && (
            <motion.span
              key="streak"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              className="chip bg-duo-gold-tint text-[#8a6a00]"
            >
              🔥 {streak}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-sm font-extrabold tabular-nums text-ink-faint">
          {idx + 1}/{plan.cards.length}
        </span>
      </div>

      {/* 卡片区 */}
      <div className="relative mt-6 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${card.key}-${card.kind}-${idx}`}
            initial={reduce ? false : { x: 90, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mx-auto w-full max-w-2xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className={`chip ${KIND_META[card.kind].cls}`}>{KIND_META[card.kind].label}</span>
              <span className="text-xs font-bold text-ink-faint">
                {card.entryKind === 'word' ? `W${card.no}` : `P${card.no}`}
              </span>
              {card.stars > 0 && (
                <span className="chip bg-duo-gold-tint text-[#8a6a00]">{'★'.repeat(card.stars)}</span>
              )}
            </div>

            {card.kind === 'triage' && (
              <TriageCard
                card={card}
                onDone={(v) => { doTriage(card.key, v); bumpStreak(true); next() }}
              />
            )}
            {card.kind === 'newWord' && (
              <NewWordCard
                ds={ds} card={card} bumpStreak={bumpStreak}
                onDone={(r) => {
                  doAnswer(card.key, 'w1', Rating.Easy)
                  doAnswer(card.key, 'w2', r)
                  bumpStreak(r !== Rating.Again)
                  next()
                }}
              />
            )}
            {(card.kind === 'review' || card.kind === 'spellSpot' || card.kind === 'fluentSpot') && (
              <ReviewCard
                ds={ds} card={card} bumpStreak={bumpStreak}
                onDone={(r) => { doAnswer(card.key, card.dim ?? 'w2', r); bumpStreak(r !== Rating.Again); next() }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─────────── 清洗卡 ─────────── */

function TriageCard({ card, onDone }: { card: SessionCard; onDone: (v: TriageVerdict) => void }) {
  useEffect(() => { speak(card.headword) }, [card.headword])
  return (
    <div className="card p-8 text-center sm:p-10">
      <div className="flex items-center justify-center gap-4">
        <div className="text-5xl font-black tracking-wide text-ink sm:text-6xl">{card.headword}</div>
        <Speaker word={card.headword} size="lg" />
      </div>
      <p className="mt-3 text-sm font-bold text-ink-faint">这个词你熟到什么程度？</p>
      <div className="mt-8 flex flex-col gap-3">
        <button className="push w-full !py-4 text-lg" onClick={() => onDone('fluent')}>
          😎 滚瓜烂熟 <span className="font-semibold opacity-80">— the / a 这种，只防抽查</span>
        </button>
        <button className="push push-gold w-full !py-4 text-lg" onClick={() => onDone('recognize')}>
          🤔 认识，拼不出 <span className="font-semibold opacity-80">— 见词知义，拼写要练</span>
        </button>
        <button className="push push-red w-full !py-4 text-lg" onClick={() => onDone('unknown')}>
          😵 啥词这是 <span className="font-semibold opacity-80">— 从零开始，最高优先</span>
        </button>
      </div>
    </div>
  )
}

/* ─────────── 新词三段卡 ─────────── */

function NewWordCard({
  ds, card, bumpStreak, onDone,
}: {
  ds: Dataset; card: SessionCard
  bumpStreak: (g: boolean) => void
  onDone: (r: Rating) => void
}) {
  const word = card.entryKind === 'word' ? ds.wordByNo.get(card.no) : undefined
  const phrase = card.entryKind === 'phrase' ? ds.phraseByNo.get(card.no) : undefined
  const entry = word ?? phrase
  const ipa = word?.ipa ?? null
  const zh = word ? word.senses.map((s) => `${s.pos} ${s.zh}`).join('；') : (phrase?.meaning ?? '')
  const example = (word?.examples ?? phrase?.examples ?? [])[0]
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Grade | null>(null)
  const [spellGrade, setSpellGrade] = useState<Grade>('wrong')

  useEffect(() => {
    if (step === 0) speak(card.headword)
    if (step === 1) speak(card.headword)
    if (step === 2 && example) speak(example.en)
  }, [step, card.headword, example])

  if (!entry) return null

  if (step === 0) {
    return (
      <div className="card p-8 text-center sm:p-10">
        <div className="text-5xl font-black tracking-wide text-ink sm:text-6xl">{card.headword}</div>
        {ipa && <div className="mt-3 font-mono text-lg font-bold text-ink-soft">{ipa}</div>}
        <div className="mt-5 flex items-center justify-center gap-3">
          <Speaker word={card.headword} />
          <span className="text-xs font-bold text-ink-faint">右键慢速</span>
        </div>
        <div className="mt-8 flex justify-center">
          <button className="push px-12 py-4 text-lg" onClick={() => setStep(1)}>我会读了 →</button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
    const submit = () => {
      const g = grade(input, accepted)
      setSpellGrade(g)
      setResult(g)
      bumpStreak(g === 'exact')
    }
    return (
      <div className="card p-8 sm:p-10">
        <div className="eyebrow text-center">① 听音拼词</div>
        <div className="mt-4 flex justify-center"><Speaker word={card.headword} size="lg" /></div>
        <input
          autoFocus
          className="duo-input mt-6 text-center text-2xl"
          placeholder="凭读音拼出来…"
          value={input}
          disabled={result !== null}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !result && input.trim() && submit()}
        />
        {result === null ? (
          <div className="mt-6 flex justify-center">
            <button className="push w-full max-w-xs py-4 text-lg" disabled={!input.trim()} onClick={submit}>
              检 查
            </button>
          </div>
        ) : (
          <Feedback
            ok={result === 'exact'}
            title={result === 'exact' ? '一次拼对，漂亮！' : result === 'near' ? '差一点！' : '再看看'}
            answer={card.headword}
            yours={input}
            onContinue={() => { setResult(null); setInput(''); setStep(2) }}
            continueLabel="继续 →"
          />
        )}
      </div>
    )
  }

  const finalRating = spellGrade === 'exact' ? Rating.Good
    : spellGrade === 'near' ? Rating.Hard : Rating.Again
  return (
    <div className="card p-8 sm:p-10">
      <div className="eyebrow text-center">② 记住意思</div>
      <div className="mt-4 text-center text-3xl font-black text-ink">{card.headword}</div>
      <div className="mt-2 text-center text-xl font-extrabold text-ink-soft">{zh}</div>
      {example && (
        <div className="mt-6 rounded-2xl bg-mist p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="font-bold text-ink">{example.en}</div>
            <Speaker word={example.en} />
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-faint">{example.zh}</div>
          {example.rewrite && <div className="mt-1 text-sm font-bold text-duo-blue-dark">{example.rewrite}</div>}
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <button className="push px-12 py-4 text-lg" onClick={() => onDone(finalRating)}>
          记住了，下一个 →
        </button>
      </div>
    </div>
  )
}

/* ─────────── 复习卡 ─────────── */

function ReviewCard({
  ds, card, bumpStreak, onDone,
}: {
  ds: Dataset; card: SessionCard
  bumpStreak: (g: boolean) => void
  onDone: (r: Rating) => void
}) {
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
      <div className="card p-8 text-center sm:p-10">
        <div className="flex items-center justify-center gap-4">
          <div className="text-4xl font-black tracking-wide text-ink sm:text-5xl">{card.headword}</div>
          <Speaker word={card.headword} size="lg" />
        </div>
        {!revealed ? (
          <>
            <p className="mt-4 text-sm font-bold text-ink-faint">心里过一遍意思，然后揭晓</p>
            <div className="mt-8 flex justify-center">
              <button className="push push-blue px-10 py-4 text-lg" onClick={() => setRevealed(true)}>
                揭晓答案
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-2xl bg-duo-blue-tint p-5 text-lg font-extrabold text-duo-blue-dark">{zh}</div>
            <RatingRow auto={autoRating} picked={picked} onPick={setPicked} />
            <div className="mt-4 flex justify-center">
              <button className="push px-12 py-4 text-lg" disabled={picked === null}
                onClick={() => { bumpStreak(picked !== Rating.Again); onDone(picked!) }}>
                继续 →
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
  const submit = () => {
    const g = grade(input, accepted)
    setAutoRating(g === 'exact' ? Rating.Good : g === 'near' ? Rating.Hard : Rating.Again)
    setRevealed(true)
    bumpStreak(g !== 'wrong')
  }
  return (
    <div className="card p-8 sm:p-10">
      <div className="eyebrow text-center">拼写</div>
      <div className="mt-4 text-center text-2xl font-extrabold text-ink">{zh}</div>
      <input
        autoFocus
        className="duo-input mt-6 text-center text-2xl"
        placeholder="输入英文…"
        value={input}
        disabled={revealed}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !revealed && input.trim() && submit()}
      />
      {!revealed ? (
        <div className="mt-6 flex justify-center">
          <button className="push w-full max-w-xs py-4 text-lg" disabled={!input.trim()} onClick={submit}>
            检 查
          </button>
        </div>
      ) : (
        <Feedback
          ok={autoRating !== Rating.Again}
          title={autoRating === Rating.Good ? '太棒了！' : autoRating === Rating.Hard ? '很接近！' : '再试试'}
          answer={card.headword}
          yours={input}
          onContinue={() => onDone(picked ?? autoRating)}
          continueLabel="继续 →"
        >
          <RatingRow auto={autoRating} picked={picked} onPick={setPicked} inline />
        </Feedback>
      )}
    </div>
  )
}

/* ─────────── 反馈面板（多邻国底部横幅）─────────── */

function Feedback({
  ok, title, answer, yours, onContinue, continueLabel, children,
}: {
  ok: boolean
  title: string
  answer: string
  yours: string
  onContinue: () => void
  continueLabel: string
  children?: React.ReactNode
}) {
  const tint = ok ? 'var(--color-duo-green-tint)' : 'var(--color-duo-red-tint)'
  const ink = ok ? 'var(--color-duo-green-dark)' : 'var(--color-duo-red-dark)'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="mt-6 rounded-2xl p-6"
      style={{ background: tint }}
    >
      <div className="text-xl font-black" style={{ color: ink }}>
        {ok ? '✓ ' : '✗ '}{title}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="chip bg-white/70" style={{ color: ink }}>正确：{answer}</span>
        {yours && yours !== answer && <span className="chip bg-white/70 text-ink-soft">你写的：{yours}</span>}
      </div>
      {children}
      <div className="mt-5 flex justify-end">
        <button className="push px-10 py-3.5" onClick={onContinue}>{continueLabel}</button>
      </div>
    </motion.div>
  )
}

/* ─────────── 四键自评 ─────────── */

const RATING_META: Array<{ r: Rating; label: string; cls: string }> = [
  { r: Rating.Again, label: '重来', cls: 'bg-duo-red-tint text-duo-red-dark' },
  { r: Rating.Hard, label: '困难', cls: 'bg-duo-gold-tint text-[#8a6a00]' },
  { r: Rating.Good, label: '良好', cls: 'bg-duo-green-tint text-duo-green-dark' },
  { r: Rating.Easy, label: '简单', cls: 'bg-duo-blue-tint text-duo-blue-dark' },
]

function RatingRow({
  auto, picked, onPick, inline,
}: {
  auto: Rating
  picked: Rating | null
  onPick: (r: Rating) => void
  inline?: boolean
}) {
  return (
    <div className={`flex gap-2 ${inline ? 'mt-4' : 'mt-6'}`}>
      {RATING_META.map(({ r, label, cls }) => (
        <motion.button
          key={r}
          whileTap={{ scale: 0.94 }}
          onClick={() => onPick(r)}
          className={`chip flex-1 justify-center !py-3 transition-all ${cls} ${
            picked === r ? 'ring-4 ring-white/80 brightness-95' : picked !== null ? 'opacity-50' : 'hover:brightness-95'
          }`}
        >
          {label}
          {r === auto && <span className="text-[10px] font-bold opacity-70">建议</span>}
        </motion.button>
      ))}
    </div>
  )
}

/* ─────────── 结束页 ─────────── */

function EndScreen({ plan, onRestart }: { plan: SessionPlan; onRestart: () => void }) {
  const items = Object.entries(plan.stats).filter(([, n]) => n > 0)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="card mx-auto mt-16 max-w-lg p-10 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-6xl"
      >
        🏆
      </motion.div>
      <h2 className="mt-4 text-3xl font-black text-duo-green-dark">本场完成！</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {items.map(([k, n]) => (
          <span key={k} className={`chip !py-2 ${KIND_META[k as SessionCard['kind']].cls}`}>
            {KIND_META[k as SessionCard['kind']].label} × {n}
          </span>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <button className="push px-10 py-4 text-lg" onClick={onRestart}>再来一轮</button>
      </div>
    </motion.div>
  )
}
