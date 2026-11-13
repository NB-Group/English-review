import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { Dim } from '../types'
import { isDue } from '../lib/fsrs'
import {buildSession} from '../lib/engine'
import { dimsForLevel, goalLevelFor, useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

/** 白色描边进度环（放在绿色横幅里） */
function Ring({ pct, size = 132 }: { pct: number; size?: number }) {
  const reduce = useReducedMotion()
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="11" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#fff" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={reduce ? { duration: 0 } : { duration: 1, ease: EASE, delay: 0.2 }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central"
        fill="#fff" style={{ fontSize: size / 3.6, fontWeight: 900 }}>{pct}%</text>
      <text x="50%" y="61%" textAnchor="middle" fill="rgba(255,255,255,0.85)"
        style={{ fontSize: size / 12, fontWeight: 700 }}>默写进度</text>
    </svg>
  )
}

export default function Today({ ds }: { ds: Dataset }) {
  const profile = useProfile((s) => s.profile)
  const navigate = useNavigate()

  const stats = useMemo(() => {
    let p0 = 0, p1 = 0, p2 = 0, p3 = 0, due = 0, dictGoal = 0, dictDone = 0
    const entries: Array<{ key: string; kind: 'word' | 'phrase'; stars: number }> = []
    for (const w of ds.words) entries.push({ key: `w:${w.no}`, kind: 'word', stars: w.stars })
    for (const p of ds.phrases) entries.push({ key: `p:${p.no}`, kind: 'phrase', stars: p.stars })
    for (const e of entries) {
      const prog = profile.progress[e.key]
      const level = goalLevelFor(profile.goals, { stars: e.stars, kind: e.kind })
      if (level === 'skip') continue
      const dims = dimsForLevel(level)
      if (dims.includes('w2')) {
        dictGoal++
        if (prog?.dims.w2 && prog.dims.w2.state === 2 && prog.dims.w2.stability > 10) dictDone++
      }
      if (!prog?.triage) { p2++; continue }
      if (prog.triage === 'unknown' || prog.degraded) p0++
      else if (prog.triage === 'recognize') p1++
      else if (prog.triage === 'fluent') p3++
      for (const d of dims) {
        const st = prog.dims[d as Dim]
        if (st && isDue(st)) { due++; break }
      }
    }
    return { p0, p1, p2, p3, due, dictGoal, dictDone }
  }, [ds, profile])

  const pct = stats.dictGoal ? Math.round((stats.dictDone / stats.dictGoal) * 100) : 0
  const plan=useMemo(()=>buildSession(ds,profile,{due:60,spellSpot:profile.dailyQuota.spotcheck,fluentSpot:Math.max(2,Math.round(profile.dailyQuota.spotcheck/2)),triage:profile.dailyQuota.triage,newWords:profile.dailyQuota.newWords}),[ds,profile])
  const total = plan.cards.length

  const nodes = [
    { label: '到期复习', sub: '遗忘曲线要救的', n: plan.stats.review, bg: 'var(--color-duo-blue)', dark: 'var(--color-duo-blue-dark)' },
    { label: '不会的词', sub: '最高优先', n: stats.p0, bg: 'var(--color-duo-red)', dark: 'var(--color-duo-red-dark)' },
    { label: '拼写存疑', sub: '每天抽查', n: stats.p1, bg: 'var(--color-duo-gold)', dark: 'var(--color-duo-gold-dark)' },
    { label: '待清洗', sub: '还没刷卡', n: stats.p2, bg: 'var(--color-duo-purple)', dark: 'var(--color-duo-purple-dark)' },
  ]

  return <div className="today-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR DAILY PRACTICE</div><h1>让学过的，真正留下来。</h1><p>不用一次学完所有。先完成今天这一小步。</p></div><span className="edition-label">中考考纲 · {ds.words.length + ds.phrases.length} 个词条</span></div>
    <div className="today-hero-grid">
      <section className="daily-hero"><div className="hero-overline"><span className="light-dot"/>今日学习计划<span>DAILY PLAN</span></div><div className="hero-big"><span>{total}</span><div>张学习卡片<small>复习优先，再认识一些新词。</small></div></div><div className="hero-breakdown"><span>到期复习 <b>{plan.stats.review}</b></span><span>词汇抽查 <b>{plan.stats.spellSpot+plan.stats.fluentSpot}</b></span><span>词汇摸底 <b>{plan.stats.triage}</b></span></div><button className="start-session" onClick={()=>navigate('/study')}>开始今天的学习 <span>↗</span></button><div className="hero-line-art" aria-hidden="true"><svg viewBox="0 0 300 250"><path d="M20 225 C 100 225 10 65 105 65 S 110 195 195 160 S 210 15 280 15" fill="none" stroke="currentColor" strokeWidth="1"/>{[0,1,2,3,4].map(i=><ellipse key={i} cx="160" cy="125" rx={40+i*21} ry={20+i*19} fill="none" stroke="currentColor" strokeWidth=".7" transform={`rotate(-35 160 125)`}/>)}</svg></div></section>
      <section className="progress-panel"><div className="section-topline"><span>默写掌握度</span><span>↗</span></div><div className="progress-display"><Ring pct={pct}/></div><div className="progress-caption"><b>{stats.dictDone}</b><span>/ {stats.dictGoal} 个目标词汇</span></div><p>每一次主动回忆，<br/>都在加固你的记忆。</p><button onClick={()=>navigate('/goals')} className="text-link">调整我的目标 <span>→</span></button></section>
    </div>
    <div className="section-heading"><h2>从这里，继续前进。</h2><span>按记忆状态，安排下一次见面</span></div>
    <div className="memory-metrics">{nodes.map((n,i)=><button key={n.label} className="memory-metric" data-metric onClick={()=>navigate('/study')}><div className="metric-top"><span className={'metric-dot dot-'+i}/><span>{['到期复习','还不熟悉','需要巩固','尚未摸底'][i]}</span><span className="metric-arrow">↗</span></div><div className="metric-number">{n.n}<small>词</small></div><div className="metric-foot">{['及时回想，对抗遗忘','重点照顾这些词汇','认识之后，再练拼写','从一次简单的判断开始'][i]}</div></button>)}</div>
    <div className="today-bottom"><section className="vocabulary-preview"><div className="section-topline"><span>词库里的一次相遇</span><span>WORD OF THE MOMENT</span></div><div className="preview-word">{ds.words.find(w=>w.headword==='remember')?.headword??ds.words[0]?.headword}<span> / 从认识到掌握</span></div><p>{ds.words.find(w=>w.headword==='remember')?.senses[0]?.zh??ds.words[0]?.senses[0]?.zh}</p><button className="text-link" onClick={()=>navigate('/library')}>浏览完整考纲词库 <span>→</span></button></section><section className="quiet-note"><span className="tiny-label">A NOTE TO YOURSELF</span><h3>记不住，也没关系。</h3><p>复习本来就是一次次重新想起。<br/>已熟练的 {stats.p3} 个词也会定期回到抽查里。</p></section></div>
  </div>
}
