import { useEffect, useRef, useState } from 'react'
import { pieces, previousSegment, segmentsByPiece, type ChineseCard } from '../lib/chinese'
import type { ChineseGrade } from '../types'

const ratings: Array<[ChineseGrade, string]> = [
  ['again', '没想起来'], ['hard', '有点模糊'], ['good', '想起来了'], ['easy', '很熟练'],
]

export default function ChineseReviewCard({
  card, needsReading, onStartReciting, onGrade,
}: { card: ChineseCard; needsReading: boolean; onStartReciting: () => void; onGrade: (grade: ChineseGrade) => void }) {
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<string>()
  const [rereading, setRereading] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const moveFocus = useRef(false)
  const piece = pieces.find((item) => item.id === card.pieceId)
  const previous = card.segmentId ? previousSegment.get(card.segmentId) : undefined
  const isSense = card.kind === 'sense-recall'
  const segments = !isSense && piece ? segmentsByPiece.get(piece.id) : undefined
  const showOriginal = needsReading || rereading
  const correct = choice === card.answer

  useEffect(() => {
    if (moveFocus.current) {
      heading.current?.focus()
      moveFocus.current = false
    }
  }, [showOriginal])

  if (showOriginal && piece && segments?.length) {
    return (
      <section className="card px-5 py-7 sm:px-8">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold text-ink">{piece.title}</h1>
        {piece.author?.trim() && <p className="mt-2 text-sm text-ink-soft">{piece.author}</p>}
        <div className={`my-6 text-lg leading-loose text-ink ${piece.kind === 'prose' ? 'space-y-3' : ''}`}>
          {segments.map((segment) => <p key={segment.id}>{segment.text}</p>)}
        </div>
        <button className="push w-full" onClick={() => {
          moveFocus.current = true
          if (needsReading) onStartReciting()
          setRereading(false)
        }}>{needsReading ? '开始背诵' : '返回背诵'}</button>
      </section>
    )
  }

  return (
    <div>
      <section className="rounded-[28px] bg-duo-blue-tint/50 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-soft">
          <p className="font-bold">{isSense ? '文言词义' : piece?.title}</p>
          {!isSense && piece?.author?.trim() && <p>{piece.author}</p>}
        </div>
        {(card.context || previous) &&
          <p className="mt-5 text-xl leading-relaxed text-ink">{card.context ?? previous}</p>}
        <h1 ref={heading} tabIndex={-1} className="mt-3 text-2xl font-bold leading-relaxed text-ink">
          {isSense ? card.prompt : previous ? '背出接下来的一句或一段' : '背出开头的一句或一段'}
        </h1>
        {Boolean(segments?.length) && <button className="choice mt-4" onClick={() => {
          moveFocus.current = true
          setRereading(true)
        }}>回看原文</button>}
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
