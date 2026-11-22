import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { buildSession } from '../lib/engine'
import { cards, selectChineseSession } from '../lib/chinese'
import { useProfile } from '../lib/store'

export default function ProductToday({ ds }: { ds: Dataset }) {
  const navigate = useNavigate()
  const profile = useProfile((state) => state.profile)
  const english = useMemo(() => buildSession(ds, profile, {
    due: 60, spellSpot: profile.dailyQuota.spotcheck,
    fluentSpot: Math.max(2, Math.round(profile.dailyQuota.spotcheck / 2)),
    triage: profile.dailyQuota.triage, newWords: profile.dailyQuota.newWords,
  }), [ds, profile])
  const chinese = useMemo(() => selectChineseSession(cards, profile.chineseProgress ?? {}, 20), [profile.chineseProgress])
  const englishCount = english.cards.length
  const chineseCount = chinese.length
  const total = englishCount + chineseCount

  return (
    <div className="product-today">
      <header className="product-heading">
        <div>
          <div className="eyebrow">ZHONGKAO REVIEW</div>
          <h1>今天学什么，由你决定。</h1>
          <p>系统给你一份建议，也给你自由选择专项训练的入口。</p>
        </div>
        <div className="product-total"><b>{total}</b><span>张今日卡片</span></div>
      </header>

      <section className="product-hero">
        <div>
          <div className="hero-overline"><span className="light-dot" />今日计划 <span>ALL SUBJECTS</span></div>
          <h2>语文和英语，都在这里继续。</h2>
          <p>预计用时 {Math.max(1, Math.round(total * 1.4))} 分钟</p>
        </div>
        <button className="start-session" onClick={() => navigate('/practice?subject=english&scope=today')}>开始今日任务 <span>↗</span></button>
      </section>

      <div className="section-heading"><h2>按学科继续</h2><span>每一门都可以单独开始</span></div>
      <section className="subject-grid">
        <button className="subject-card subject-card--english" onClick={() => navigate('/practice?subject=english&scope=today')}>
          <span className="subject-card__label">英语</span><b>{englishCount}</b><small>张卡片 · 默写和复习</small><span className="subject-card__arrow">↗</span>
        </button>
        <button className="subject-card subject-card--chinese" onClick={() => navigate('/chinese')}>
          <span className="subject-card__label">语文</span><b>{chineseCount}</b><small>张卡片 · 诗文和实词</small><span className="subject-card__arrow">↗</span>
        </button>
        <div className="subject-card subject-card--chemistry subject-card--disabled">
          <span className="subject-card__label">化学</span><b>—</b><small>方程式书写即将接入</small><span className="subject-card__arrow">○</span>
        </div>
      </section>

      <div className="section-heading"><h2>专项训练</h2><span>指定范围，马上开始</span></div>
      <section className="practice-shortcuts">
        <button onClick={() => navigate('/practice?subject=english&scope=all-phrases&mode=formal&order=textbook')}><b>全部词组默写</b><span>按考纲顺序检查 347 个词组</span><i>↗</i></button>
        <button onClick={() => navigate('/practice')}><b>自选练习</b><span>选择学科、范围和练习方式</span><i>↗</i></button>
      </section>
    </div>
  )
}
