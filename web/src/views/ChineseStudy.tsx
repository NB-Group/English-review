import { useState } from 'react'
import { pieces, previousSegment, type ChineseCard } from '../lib/chinese'
import type { ChineseGrade } from '../types'

const ratings: Array<[ChineseGrade, string]> = [
  ['again', '没想起来'], ['hard', '有点模糊'], ['good', '想起来了'], ['easy', '很熟练'],
]

export default function ChineseReviewCard({
  card, onGrade,
}: { card: ChineseCard; onGrade: (grade: ChineseGrade) => void }) {
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<string>()
  const piece = pieces.find((item) => item.id === card.pieceId)
  const previous = card.segmentId ? previousSegment.get(card.segmentId) : undefined
  const isSense = card.kind === 'sense-recall'
  const correct = choice === card.answer

  return (
    <div>
      <section className="rounded-[28px] bg-duo-blue-tint/50 px-5 py-8 sm:px-8">
        <p className="text-sm font-bold text-ink-soft">{isSense ? '文言词义' : piece?.title}</p>
        {(card.context || previous) &&
          <p className="mt-5 text-xl leading-relaxed text-ink">{card.context ?? previous}</p>}
        <h1 className="mt-3 text-2xl font-bold leading-relaxed text-ink">
          {isSense ? card.prompt : previous ? '背出接下来的一句或一段' : '背出开头的一句或一段'}
        </h1>
      </section>
      <div className="mt-6">
        {!revealed && (isSense && card.options?.length ? (
          <div className="grid gap-3">
            {card.options.map((option) => (
              <button key={option} className="choice-line w-full" onClick={() => { setChoice(option); setRevealed(true) }}>{option}</button>
            ))}
          </div>
        ) : <button className="push w-full" onClick={() => setRevealed(true)}>查看答案</button>)}
        {revealed && (
          <section className="card p-5" aria-live="polite">
            <p className="text-sm font-bold text-ink-soft">{choice ? correct ? '答对了' : '再复习一下' : '参考答案'}</p>
            <p className="mt-2 text-xl font-bold leading-relaxed">{card.answer}</p>
            {choice ? (
              <button className="push mt-5 w-full" onClick={() => onGrade(correct ? 'good' : 'again')}>下一题</button>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {ratings.map(([grade, label]) => <button key={grade} className="choice" onClick={() => onGrade(grade)}>{label}</button>)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
