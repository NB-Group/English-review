import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { cards, pieces } from '../lib/chinese'

export default function ProductLibrary({ ds }: { ds: Dataset }) {
  const navigate = useNavigate()
  const [subject, setSubject] = useState<'english' | 'chinese' | 'chemistry'>('english')
  return (
    <div className="product-library">
      <div className="page-heading"><div><div className="eyebrow">CONTENT LIBRARY</div><h1>所有内容，都在这里。</h1><p>先浏览，再决定今天要练什么。</p></div></div>
      <div className="content-subject-tabs">
        {([['english', '英语'], ['chinese', '语文'], ['chemistry', '化学']] as const).map(([value, label]) => <button key={value} className={subject === value ? 'active' : ''} onClick={() => setSubject(value)}>{label}</button>)}
      </div>
      {subject === 'english' && (
        <section className="library-overview">
          <div className="content-stat"><b>{ds.words.length}</b><span>个单词</span></div>
          <div className="content-stat"><b>{ds.phrases.length}</b><span>个词组</span></div>
          <button className="push" onClick={() => navigate('/practice?subject=english&scope=all-phrases&mode=formal&order=textbook')}>全部词组默写 ↗</button>
          <button className="push push-ghost" onClick={() => navigate('/practice?subject=english&scope=all-words&mode=formal&order=textbook')}>全部单词认知 ↗</button>
        </section>
      )}
      {subject === 'chinese' && (
        <section className="content-pack-list">
          <div className="content-pack-summary"><b>{pieces.length}</b><span>篇诗文篇目</span><b>{cards.length}</b><span>张复习卡片</span><button className="push" onClick={() => navigate('/chinese')}>开始中文背诵 ↗</button></div>
          <div className="piece-grid">{pieces.slice(0, 60).map((piece) => <button key={piece.id} onClick={() => navigate('/chinese')}><b>{piece.title}</b><span>{piece.author ?? '篇目复习'} · {piece.kind === 'poem' ? '诗词' : '文言文'}</span></button>)}</div>
        </section>
      )}
      {subject === 'chemistry' && <section className="chemistry-placeholder"><b>化学内容即将接入</b><span>方程式书写、配平和实验现象会使用独立的输入组件。</span></section>}
    </div>
  )
}
