import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { buildPracticeSession } from '../lib/session-builder'
import { useProfile } from '../lib/store'

export default function ProductToday({ ds }: { ds: Dataset }) {
  const navigate = useNavigate()
  const profile = useProfile((state) => state.profile)
  const plan = useMemo(() => buildPracticeSession(ds, profile, {
    subject: 'all', scope: 'today', mode: 'formal', order: 'priority',
  }), [ds, profile])
  const englishCount = plan.filter((item) => item.subject === 'english').length
  const chineseCount = plan.length - englishCount

  return (
    <div className="product-today">
      <header className="product-heading">
        <div>
          <h1>今天</h1>
        </div>
        <div className="product-total"><b>{plan.length}</b><span>张今日卡片</span></div>
      </header>

      <section className="product-hero">
        <div>
          <div className="hero-overline"><span className="light-dot" />今日计划 </div>
          <h2>语文 {chineseCount} 题 · 英语 {englishCount} 题</h2>
        </div>
        <button className="start-session" onClick={() => navigate('/practice?subject=all&scope=today')}>开始或继续今日任务 <span>↗</span></button>
      </section>

      <div className="section-heading"><h2>按学科继续</h2><span>每一门都可以单独开始</span></div>
      <section className="subject-grid">
        <button className="subject-card subject-card--english" onClick={() => navigate('/practice?subject=english&scope=today')}>
          <span className="subject-card__label">英语</span><b>{englishCount}</b><small>张卡片 · 默写和复习</small><span className="subject-card__arrow">↗</span>
        </button>
        <button className="subject-card subject-card--chinese" onClick={() => navigate('/practice?subject=chinese&scope=today')}>
          <span className="subject-card__label">语文</span><b>{chineseCount}</b><small>张卡片 · 诗文和实词</small><span className="subject-card__arrow">↗</span>
        </button>
      </section>

      <div className="section-heading"><h2>专项训练</h2><span>指定范围，马上开始</span></div>
      <section className="practice-shortcuts">
        <button onClick={() => navigate('/practice?subject=english&scope=all-phrases&mode=formal&order=textbook')}><b>全部词组默写</b><span>按考纲顺序检查 {ds.phrases.length} 个词组</span><i>↗</i></button>
        <button onClick={() => navigate('/practice')}><b>自选练习</b><span>选择学科、范围和练习方式</span><i>↗</i></button>
      </section>
    </div>
  )
}
