import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { cards, pieces } from '../lib/chinese'
import { practiceLink } from '../lib/product-types'
import Library from './Library'

export default function ProductLibrary({ ds }: { ds: Dataset }) {
  const [params, setParams] = useSearchParams()
  const subject = params.get('subject') === 'chinese' ? 'chinese' : 'english'
  const [query, setQuery] = useState('')
  const shown = pieces.filter((piece) => (piece.title + (piece.author ?? '')).includes(query.trim()))
  return (
    <div className="product-library">
      <h1 className="mb-5 text-3xl font-bold">内容库</h1>
      <div className="content-subject-tabs" aria-label="学科">
        {([['english', '英语'], ['chinese', '语文']] as const).map(([value, label]) => (
          <button key={value} aria-pressed={subject === value} className={subject === value ? 'active' : ''}
            onClick={() => setParams(value === 'chinese' ? { subject: value } : {})}>{label}</button>
        ))}
      </div>
      {subject === 'english' ? <Library ds={ds} /> : (
        <section>
          <div className="content-pack-summary">
            <span>{pieces.length} 篇诗文 · {cards.length} 道复习题</span>
            <Link className="choice" to="/practice?subject=chinese&scope=senses">练习文言词义</Link>
            <Link className="choice" to="/practice?subject=chinese&scope=poetry">练习古诗词</Link>
            <Link className="choice" to="/practice?subject=chinese&scope=wenyan">练习文言文</Link>
          </div>
          <label className="mt-4 block">
            <span className="sr-only">搜索篇目</span>
            <input className="duo-input" placeholder="搜索篇目或作者" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="piece-grid">
            {shown.map((piece) => (
              <Link key={piece.id} className="choice" to={practiceLink({
                subject: 'chinese', scope: 'piece', pieceId: piece.id, mode: 'formal', order: 'textbook',
              })}>
                <b>{piece.title}</b>
                <span>{piece.kind === 'poem' ? '古诗词' : '文言文'} {piece.author}</span>
              </Link>
            ))}
          </div>
          {shown.length === 0 && <p className="mt-5">没有匹配的篇目。</p>}
        </section>
      )}
    </div>
  )
}
