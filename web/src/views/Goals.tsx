import { useState } from 'react'
import type { GoalLevel, GoalRule } from '../types'
import { useProfile } from '../lib/store'

const LEVEL_META: Record<GoalLevel, { label: string; note: string; cls: string }> = {
  skip: { label: '忽略', note: '不进入学习流', cls: 'bg-mist text-ink-faint' },
  recognize: { label: '认读', note: '见词知义即可', cls: 'bg-duo-green-tint text-duo-green-dark' },
  dictation: { label: '默写', note: '听音能拼写', cls: 'bg-duo-green-tint text-duo-green-dark' },
  sentence: { label: '句子级', note: '例句也认读', cls: 'bg-duo-gold-tint text-duo-gold-dark' },
  full: { label: '全能', note: '例句挖空也要会', cls: 'bg-duo-purple-tint text-ink-soft' },
}
const LEVEL_ORDER: GoalLevel[] = ['skip', 'recognize', 'dictation', 'sentence', 'full']

export default function Goals() {
  const profile = useProfile((s) => s.profile)
  const setGoals = useProfile((s) => s.setGoals)
  const setQuota = useProfile((s) => s.setQuota)
  const setName = useProfile((s) => s.setProfileName)
  const reset = useProfile((s) => s.resetProfile)
  const [confirmReset, setConfirmReset] = useState(false)

  const update = (id: string, patch: Partial<GoalRule>) =>
    setGoals(profile.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const scopeLabel = (g: GoalRule) => {
    if (g.scope.kind === 'phrase') return '全部词组'
    if (g.scope.stars) return g.scope.stars.map((s) => '★'.repeat(s) || '无星').join(' / ') + ' 词'
    return '全部词条'
  }

  return (
    <div className="goals-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOW MUCH IS ENOUGH</div>
          <h1>由你决定，学到什么程度。</h1>
          <p>同一本考纲，每个人可以有不同的野心。后面添加的规则优先级更高。</p>
        </div>
        <span className="edition-label">目标设置 · {profile.goals.length} 条规则</span>
      </div>

      {/* 任务等级 */}
      <section className="card goals-section">
        <div className="goals-section-title">任务等级</div>
        <div className="goal-rules">
          {profile.goals.map((g) => (
            <div key={g.id} className="goal-rule">
              <span className="goal-scope">{scopeLabel(g)}</span>
              <span className="goal-arrow">→</span>
              <span className={`goal-level ${LEVEL_META[g.level].cls}`}>{LEVEL_META[g.level].label}</span>
              <span className="goal-note">{LEVEL_META[g.level].note}</span>
              <select
                className="duo-input goal-select"
                value={g.level}
                onChange={(e) => update(g.id, { level: e.target.value as GoalLevel })}
              >
                {LEVEL_ORDER.map((l) => (
                  <option key={l} value={l}>{LEVEL_META[l].label}</option>
                ))}
              </select>
              <button className="goal-remove" title="删除规则"
                onClick={() => setGoals(profile.goals.filter((x) => x.id !== g.id))}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="goal-adds">
          {[3, 2, 1, 0].map((s) => (
            <button key={s} className="goal-add"
              onClick={() => setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { stars: [s] }, level: 'dictation' }])}>
              + {'★★★'.slice(0, s) || '无星'} 规则
            </button>
          ))}
          <button className="goal-add"
            onClick={() => setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { kind: 'phrase' }, level: 'dictation' }])}>
            + 词组规则
          </button>
        </div>
      </section>

      {/* 每日额度 */}
      <section className="card goals-section">
        <div className="goals-section-title">每日额度</div>
        <div className="goal-quotas">
          {([['triage', '词汇摸底', 60], ['spotcheck', '词汇抽查', 20], ['newWords', '新词学习', 30]] as const).map(([k, label, max]) => (
            <label key={k} className="goal-quota">
              <div className="goal-quota-head">
                <span>{label}</span>
                <b>{profile.dailyQuota[k]}<small> / 天</small></b>
              </div>
              <input
                type="range" min={0} max={max}
                value={profile.dailyQuota[k]}
                onChange={(e) => setQuota({ [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </section>

      {/* 档案 */}
      <section className="card goals-section">
        <div className="goals-section-title">档案</div>
        <div className="goal-profile">
          <label className="goal-scope">用户名</label>
          <input className="duo-input goal-select" value={profile.name} onChange={(e) => setName(e.target.value)} />
          <span className="goal-note">学习记录保存在这台设备的浏览器里，换设备进度暂不跟随。</span>
        </div>
      </section>

      {/* 危险操作 */}
      <section className="card goals-section goals-danger">
        <div className="goals-section-title">重置</div>
        {confirmReset ? (
          <div className="goal-profile">
            <span className="goal-note">清空全部学习进度、摸底标记和记忆状态，无法恢复。</span>
            <button className="push push-red" onClick={reset}>确定清空</button>
            <button className="push" onClick={() => setConfirmReset(false)}>取消</button>
          </div>
        ) : (
          <button className="goal-add" onClick={() => setConfirmReset(true)}>重置学习档案…</button>
        )}
      </section>
    </div>
  )
}
