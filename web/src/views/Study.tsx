import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { TriageVerdict } from '../types'
import { buildSession, type SessionCard, type SessionPlan } from '../lib/engine'
import { Rating } from '../lib/fsrs'
import { grade } from '../lib/grader'
import { useProfile } from '../lib/store'
import { speak } from '../lib/tts'

const EASE = [0.16, 1, 0.3, 1] as const

const KIND_LABEL: Record<SessionCard['kind'], string> = {
  review: '到期复习',
  spellSpot: '拼写抽查',
  fluentSpot: '熟词抽查',
  triage: '大清洗',
  newWord: '新词学习',
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
    // 每次进入页面重建一次；profile 引用变化不重建（否则答一题重建队列）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ds],
  )

  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const card = plan.cards[idx]
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (card) inputRef.current?.focus()
  }, [idx, card])

  if (done || !card) {
    return <EndScreen plan={plan} onRestart={() => { setIdx(0); setDone(false) }} />
  }

  const next = () => {
    if (idx + 1 >= plan.cards.length) setDone(true)
    else setIdx(idx + 1)
  }

  return (
    <div className="mt-6">
      {/* 进度 */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon to-violet"
            animate={{ width: `${((idx + 1) / plan.cards.length) * 100}%` }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </div>
        <span className="font-mono text-xs tabular-nums text-ink-faint">
          {idx + 1}/{plan.cards.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${card.key}-${card.kind}-${idx}`}
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -14 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="glass-strong mx-auto max-w-2xl p-8 sm:p-10"
        >
          <div className="eyebrow mb-6">
            {KIND_LABEL[card.kind]} · {card.entryKind === 'word' ? `W${card.no}` : `P${card.no}`}
            {card.stars > 0 && <span className="ml-2 text-amber">{'★'.repeat(card.stars)}</span>}
          </div>

          {card.kind === 'triage' && (
            <TriageCard card={card} onDone={(v) => { doTriage(card.key, v); next() }} />
          )}
          {card.kind === 'newWord' && (
            <NewWordCard
              ds={ds}
              card={card}
              onDone={(r) => {
                doAnswer(card.key, 'w1', Rating.Easy)
                doAnswer(card.key, 'w2', r)
                next()
              }}
            />
          )}
          {(card.kind === 'review' || card.kind === 'spellSpot' || card.kind === 'fluentSpot') && (
            <ReviewCard
              ds={ds}
              card={card}
              onDone={(r) => { doAnswer(card.key, card.dim ?? 'w2', r); next() }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------- 清洗卡 ---------- */

function TriageCard({ card, onDone }: { card: SessionCard; onDone: (v: TriageVerdict) => void }) {
  useEffect(() => {
    speak(card.headword)
  }, [card.headword])

  const btn =
    'flex-1 rounded-xl border border-line-bright px-4 py-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]'

  return (
    <div>
      <button
        onClick={() => speak(card.headword, { slow: true })}
        className="font-display text-4xl tracking-wide text-ink hover:text-neon sm:text-5xl"
      >
        {card.headword}
      </button>
      <p className="mt-2 text-sm text-ink-faint">点击朗读 · 慢速再点一次</p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <motion.button whileTap={{ scale: 0.97 }} className={`${btn} border-mint/40`} onClick={() => onDone('fluent')}>
          <div className="text-mint">滚瓜烂熟</div>
          <div className="mt-1 text-xs text-ink-faint">the / a 这种，只防抽查</div>
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className={`${btn} border-amber/40`} onClick={() => onDone('recognize')}>
          <div className="text-amber">认识，拼不出</div>
          <div className="mt-1 text-xs text-ink-faint">见词知义，拼写要练</div>
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className={`${btn} border-rose/40`} onClick={() => onDone('unknown')}>
          <div className="text-rose">啥词这是</div>
          <div className="mt-1 text-xs text-ink-faint">从零开始，最高优先</div>
        </motion.button>
      </div>
    </div>
  )
}

/* ---------- 新词三段卡 ---------- */

function NewWordCard({
  ds, card, onDone,
}: { ds: Dataset; card: SessionCard; onDone: (r: Rating) => void }) {
  const word = card.entryKind === 'word' ? ds.wordByNo.get(card.no) : undefined
  const phrase = card.entryKind === 'phrase' ? ds.phraseByNo.get(card.no) : undefined
  const entry = word ?? phrase
  const ipa = word?.ipa ?? null
  const zh = word ? word.senses.map((s) => `${s.pos} ${s.zh}`).join('；') : (phrase?.meaning ?? '')
  const example = (word?.examples ?? phrase?.examples ?? [])[0]
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [spellResult, setSpellResult] = useState<'exact' | 'near' | 'wrong' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 0) speak(card.headword)
    if (step === 1) { speak(card.headword); setTimeout(() => inputRef.current?.focus(), 80) }
    if (step === 2 && example) speak(example.en)
  }, [step, card.headword, example])

  if (!entry) return null

  // ① 读 + 形
  if (step === 0) {
    return (
      <div>
        <div className="font-display text-5xl tracking-wide text-ink">{card.headword}</div>
        {ipa && <div className="mt-3 font-mono text-lg text-ink-soft">{ipa}</div>}
        <button onClick={() => speak(card.headword, { slow: true })} className="mt-4 text-sm text-neon hover:underline">
          🔊 慢速再听
        </button>
        <div className="mt-9 flex justify-end">
          <PrimaryBtn onClick={() => setStep(1)}>我会读了 →</PrimaryBtn>
        </div>
      </div>
    )
  }

  // ② 听写预演（音→形）
  if (step === 1) {
    const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
    const submit = () => {
      const g = grade(input, accepted)
      setSpellResult(g)
    }
    return (
      <div>
        <div className="eyebrow mb-4">听音拼词</div>
        <button onClick={() => speak(card.headword)} className="text-sm text-neon hover:underline">
          🔊 再听一遍
        </button>
        <input
          ref={inputRef}
          className="cyber-input mt-4 w-full text-xl"
          placeholder="凭读音拼出来…"
          value={input}
          disabled={spellResult !== null}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !spellResult && submit()}
        />
        {spellResult === null ? (
          <div className="mt-5 flex justify-end">
            <PrimaryBtn onClick={submit} disabled={!input.trim()}>检查</PrimaryBtn>
          </div>
        ) : (
          <div className="mt-5">
            <div className={`rounded-xl p-4 ${spellResult === 'exact' ? 'bg-mint/10 text-mint' : spellResult === 'near' ? 'bg-amber/10 text-amber' : 'bg-rose/10 text-rose'}`}>
              {spellResult === 'exact' ? '一次拼对，漂亮' : spellResult === 'near' ? `差一点：正确是 ${card.headword}` : `正确拼写：${card.headword}`}
            </div>
            <div className="mt-4 flex justify-end">
              <PrimaryBtn onClick={() => setStep(2)}>继续 →</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ③ 释义 + 例句
  const r = spellResult === 'exact' ? Rating.Good : spellResult === 'near' ? Rating.Hard : Rating.Again
  return (
    <div>
      <div className="font-display text-2xl text-ink">{card.headword}</div>
      <div className="mt-3 text-lg text-ink-soft">{zh}</div>
      {example && (
        <div className="glass mt-6 p-5">
          <div className="text-ink">{example.en}</div>
          <div className="mt-2 text-sm text-ink-faint">{example.zh}</div>
          {example.rewrite && <div className="mt-2 text-sm text-neon/80">{example.rewrite}</div>}
        </div>
      )}
      <div className="mt-8 flex justify-end">
        <PrimaryBtn onClick={() => onDone(r)}>记住了，下一个 →</PrimaryBtn>
      </div>
    </div>
  )
}

/* ---------- 复习卡 ---------- */

function ReviewCard({
  ds, card, onDone,
}: { ds: Dataset; card: SessionCard; onDone: (r: Rating) => void }) {
  const word = card.entryKind === 'word' ? ds.wordByNo.get(card.no) : undefined
  const phrase = card.entryKind === 'phrase' ? ds.phraseByNo.get(card.no) : undefined
  const zh = word ? word.senses.map((s) => `${s.pos} ${s.zh}`).join('；') : (phrase?.meaning ?? '')
  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [autoRating, setAutoRating] = useState<Rating>(Rating.Good)
  const inputRef = useRef<HTMLInputElement>(null)

  const isW1 = card.dim === 'w1'
  useEffect(() => {
    if (isW1) speak(card.headword)
    else setTimeout(() => inputRef.current?.focus(), 80)
  }, [card.key, isW1, card.headword])

  // W1：见词/听词 → 回想词义 → 揭示 → 四键
  if (isW1) {
    return (
      <div>
        <div className="font-display text-4xl text-ink">{card.headword}</div>
        <button onClick={() => speak(card.headword, { slow: true })} className="mt-3 text-sm text-neon hover:underline">🔊 慢速</button>
        {!revealed ? (
          <div className="mt-9 flex justify-end">
            <PrimaryBtn onClick={() => setRevealed(true)}>想起来了，看答案</PrimaryBtn>
          </div>
        ) : (
          <div className="mt-6">
            <div className="glass p-5 text-lg text-ink-soft">{zh}</div>
            <RatingRow auto={autoRating} onPick={onDone} />
          </div>
        )}
      </div>
    )
  }

  // W2：中文 → 拼写
  const accepted = [card.headword, ...card.headword.split('/')].map((s) => s.trim()).filter(Boolean)
  const submit = () => {
    const g = grade(input, accepted)
    setAutoRating(g === 'exact' ? Rating.Good : g === 'near' ? Rating.Hard : Rating.Again)
    setRevealed(true)
  }
  return (
    <div>
      <div className="eyebrow mb-4">拼写</div>
      <div className="text-xl text-ink-soft">{zh}</div>
      <input
        ref={inputRef}
        className="cyber-input mt-5 w-full text-xl"
        placeholder="输入英文…"
        value={input}
        disabled={revealed}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !revealed && input.trim() && submit()}
      />
      {!revealed ? (
        <div className="mt-5 flex justify-end">
          <PrimaryBtn onClick={submit} disabled={!input.trim()}>提交</PrimaryBtn>
        </div>
      ) : (
        <div className="mt-5">
          <div className={`rounded-xl p-4 ${autoRating === Rating.Good ? 'bg-mint/10 text-mint' : autoRating === Rating.Hard ? 'bg-amber/10 text-amber' : 'bg-rose/10 text-rose'}`}>
            正确拼写：{card.headword}　你写的：{input || '（空）'}
          </div>
          <RatingRow auto={autoRating} onPick={onDone} />
        </div>
      )}
    </div>
  )
}

/* ---------- 通用件 ---------- */

function PrimaryBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-r from-neon to-violet px-6 py-3 font-medium text-[#05070f] disabled:opacity-40"
    >
      {children}
    </motion.button>
  )
}

const RATING_META: Array<{ r: Rating; label: string; cls: string }> = [
  { r: Rating.Again, label: '重来', cls: 'border-rose/50 text-rose' },
  { r: Rating.Hard, label: '困难', cls: 'border-amber/50 text-amber' },
  { r: Rating.Good, label: '良好', cls: 'border-mint/50 text-mint' },
  { r: Rating.Easy, label: '简单', cls: 'border-neon/50 text-neon' },
]

function RatingRow({ auto, onPick }: { auto: Rating; onPick: (r: Rating) => void }) {
  return (
    <div className="mt-6 flex gap-3">
      {RATING_META.map(({ r, label, cls }) => (
        <motion.button
          key={r}
          whileTap={{ scale: 0.96 }}
          onClick={() => onPick(r)}
          className={`flex-1 rounded-xl border px-3 py-3 text-sm transition-all ${cls} ${r === auto ? 'bg-white/10 ring-1 ring-white/25' : 'opacity-70 hover:opacity-100'}`}
        >
          {label}
          {r === auto && <span className="ml-1 text-[10px] text-ink-faint">建议</span>}
        </motion.button>
      ))}
    </div>
  )
}

function EndScreen({ plan, onRestart }: { plan: SessionPlan; onRestart: () => void }) {
  const items = Object.entries(plan.stats).filter(([, n]) => n > 0)
  return (
    <div className="glass-strong mx-auto mt-12 max-w-xl p-10 text-center">
      <div className="text-5xl">🎯</div>
      <h2 className="font-display mt-4 text-2xl text-ink">本场完成</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {items.map(([k, n]) => (
          <span key={k} className="glass px-4 py-2 text-sm text-ink-soft">
            {KIND_LABEL[k as SessionCard['kind']]} <span className="font-mono tabular-nums text-ink">{n}</span>
          </span>
        ))}
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <PrimaryBtn onClick={onRestart}>再来一轮</PrimaryBtn>
      </div>
    </div>
  )
}
