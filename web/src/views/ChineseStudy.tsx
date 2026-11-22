import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cards, selectChineseSession, type ChineseCard } from '../lib/chinese'
import type { ChineseCardState, ChineseGrade } from '../types'
import { useProfile } from '../lib/store'

const STORAGE_KEY = 'zhongkao_v1_card_states'

function loadLegacyStates(): Record<string, ChineseCardState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, ChineseCardState> : {}
  } catch {
    return {}
  }
}

function nextState(previous: ChineseCardState | undefined, grade: ChineseGrade): ChineseCardState {
  const previousInterval = previous?.intervalDays ?? 0
  const intervalDays = grade === 'again'
    ? 0
    : grade === 'hard'
      ? Math.max(1, previousInterval)
      : grade === 'good'
        ? Math.max(1, Math.round(Math.max(1, previousInterval) * 2.2))
        : Math.max(3, Math.round(Math.max(1, previousInterval) * 3.5))
  const dueAt = intervalDays === 0
    ? new Date(Date.now() + 10 * 60 * 1000)
    : new Date(Date.now() + intervalDays * 86400000)
  return {
    dueAt: dueAt.toISOString(), intervalDays,
    lapseCount: (previous?.lapseCount ?? 0) + (grade === 'again' ? 1 : 0),
    lastGrade: grade, updatedAt: new Date().toISOString(),
  }
}

const RATINGS: Array<{ grade: ChineseGrade; label: string }> = [
  { grade: 'again', label: '再来一次' },
  { grade: 'hard', label: '模糊' },
  { grade: 'good', label: '想起了' },
  { grade: 'easy', label: '很熟' },
]

function CardHeader({ card, index, total }: { card: ChineseCard; index: number; total: number }) {
  return (
    <div className="flex items-center justify-between text-[12px] font-extrabold text-ink-faint">
      <span>{card.kind === 'sense-recall' ? '实词义项' : '诗文句段'}</span>
      <span>{index + 1} / {total}</span>
    </div>
  )
}

export default function ChineseStudy() {
  const navigate = useNavigate()
  const setChineseCardState = useProfile((state) => state.setChineseCardState)
  const profileStates = useProfile((state) => state.profile.chineseProgress ?? {})
  const [states, setStates] = useState<Record<string, ChineseCardState>>(() => ({ ...loadLegacyStates(), ...profileStates }))
  const [session] = useState<ChineseCard[]>(() => selectChineseSession(cards, states, 20))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [wrongChoice, setWrongChoice] = useState<string | null>(null)
  const card = session[index]

  const grade = (value: ChineseGrade) => {
    if (!card) return
    const next = { ...states, [card.id]: nextState(states[card.id], value) }
    setStates(next)
    setChineseCardState(card.id, next[card.id])
    setRevealed(false)
    setWrongChoice(null)
    setIndex((current) => current + 1)
  }

  if (!card) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col items-center justify-center px-5 text-center sm:px-8">
        <div className="rounded-[28px] bg-duo-green-tint px-8 py-10">
          <p className="text-[12px] font-extrabold tracking-[0.2em] text-duo-green-dark">ZHONGKAO RECALL</p>
          <h1 className="mt-4 text-3xl font-black text-ink">今天的中文背诵完成了</h1>
          <p className="mt-3 text-sm font-bold text-ink-soft">新的内容和到期卡片会在下一次学习时继续出现。</p>
        </div>
        <button className="push mt-8 w-full max-w-sm !py-4 text-lg" onClick={() => navigate('/')}>回到今日计划</button>
      </div>
    )
  }

  const choose = (option: string) => {
    if (option === card.answer) grade('good')
    else { setWrongChoice(option); setRevealed(true) }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col px-5 sm:px-8">
      <div className="flex items-center gap-4 py-4">
        <div className="duo-track flex-1"><div className="duo-fill" style={{ width: `${(index / session.length) * 100}%` }} /></div>
        <span className="text-[13px] font-extrabold tabular-nums text-ink-faint">{index + 1}/{session.length}</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="rounded-[28px] bg-duo-blue-tint/50 px-5 py-8 sm:px-8">
          <CardHeader card={card} index={index} total={session.length} />
          <div className="mt-8">
            {card.context && <p className="text-[15px] font-bold leading-relaxed text-ink-soft">{card.context}</p>}
            <h1 className="mt-4 text-[26px] font-black leading-relaxed text-ink sm:text-[34px]">{card.prompt}</h1>
            {card.kind === 'sense-recall' && card.options && !revealed && (
              <div className="mt-8 grid gap-3">
                {card.options.map((option) => <button key={option} className="push w-full !justify-start !py-4 text-left text-base" onClick={() => choose(option)}>{option}</button>)}
              </div>
            )}
            {card.kind === 'segment-continuation' && !revealed && (
              <button className="push push-blue mt-8 w-full !py-4 text-lg" onClick={() => setRevealed(true)}>显示答案</button>
            )}
            {revealed && (
              <div className="mt-8 rounded-2xl bg-snow px-5 py-5">
                {wrongChoice && <p className="text-sm font-bold text-duo-red-dark">你选了：{wrongChoice}</p>}
                <p className="mt-2 text-xl font-black leading-relaxed text-ink">{card.answer}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {RATINGS.map((item) => <button key={item.grade} className="rounded-xl bg-mist px-3 py-3 text-sm font-extrabold text-ink-soft" onClick={() => grade(item.grade)}>{item.label}</button>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
