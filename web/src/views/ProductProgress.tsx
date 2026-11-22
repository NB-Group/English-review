import { Link } from 'react-router-dom'
import type { Dataset } from '../lib/data'
import { cards } from '../lib/chinese'
import { goalLevelFor, useProfile } from '../lib/store'

export default function ProductProgress({ ds }: { ds: Dataset }) {
  const profile = useProfile((state) => state.profile)
  const entries = [
    ...ds.words.map((word) => ({ ...word, kind: 'word' as const, key: 'w:' + word.no })),
    ...ds.phrases.map((phrase) => ({ ...phrase, kind: 'phrase' as const, key: 'p:' + phrase.no })),
  ]
  const englishDone = entries.filter((entry) => {
    const goal = goalLevelFor(profile.goals, entry)
    const progress = profile.progress[entry.key]
    return goal !== 'skip' && (goal === 'recognize' ? progress?.dims.w1 : progress?.dims.w2)
  }).length
  const chineseDone = cards.filter((card) => profile.chineseProgress?.[card.id]).length
  const englishTotal = entries.filter((entry) => goalLevelFor(profile.goals, entry) !== 'skip').length
  return (
    <div className="product-progress">
      <div className="page-heading"><div><div className="eyebrow">YOUR PROGRESS</div><h1>每一门，都有下一步。</h1><p>把学习状态放在同一个地方，按学科决定今天的投入。</p></div></div>
      <section className="progress-subject-grid">
        <article className="progress-subject progress-subject--english"><div><span>英语</span><b>{englishDone}</b><small>/ {englishTotal} 个词条已有学习记录</small></div><div className="progress-bar"><i style={{ width: `${Math.min(100, Math.round((englishDone / Math.max(1, englishTotal)) * 100))}%` }} /></div></article>
        <article className="progress-subject progress-subject--chinese"><div><span>语文</span><b>{chineseDone}</b><small>/ {cards.length} 张卡片已有学习记录</small></div><div className="progress-bar"><i style={{ width: `${Math.min(100, Math.round((chineseDone / Math.max(1, cards.length)) * 100))}%` }} /></div></article>
      </section>
      <section className="card goals-section progress-settings-note"><div className="goals-section-title">英语学习目标</div><p>英语的「认识即可」「需要默写」和每日额度仍在原有目标设置中管理。</p><Link to="/settings">打开英语目标设置</Link></section>
    </div>
  )
}
