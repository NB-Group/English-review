import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { GoalLevel, GoalRule } from '../types'
import { useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

const LEVEL_META: Record<GoalLevel, { label: string; cls: string }> = {
  skip: { label: '忽略', cls: 'bg-hare/60 text-ink-faint' },
  recognize: { label: '认读', cls: 'bg-duo-blue-tint text-duo-blue-dark' },
  dictation: { label: '默写', cls: 'bg-duo-green-tint text-duo-green-dark' },
  sentence: { label: '句子级', cls: 'bg-duo-gold-tint text-[#8a6a00]' },
  full: { label: '全能', cls: 'bg-duo-purple-tint text-duo-purple-dark' },
}
const LEVEL_ORDER: GoalLevel[] = ['skip', 'recognize', 'dictation', 'sentence', 'full']

export default function Goals() {
  const profile = useProfile((s) => s.profile)
  const setGoals = useProfile((s) => s.setGoals)
  const setQuota = useProfile((s) => s.setQuota)
  const setName = useProfile((s) => s.setProfileName)
  const reset = useProfile((s) => s.resetProfile)
  const reduce = useReducedMotion()
  const [confirmReset, setConfirmReset] = useState(false)

  const update = (id: string, patch: Partial<GoalRule>) =>
    setGoals(profile.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const scopeLabel = (g: GoalRule) => {
    if (g.scope.kind === 'phrase') return '全部词组'
    if (g.scope.stars) return g.scope.stars.map((s) => '★'.repeat(s) || '无星').join(' / ') + ' 词'
    return '全部词条'
  }

  return (
    <div className="mt-6 space-y-5">
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="card p-6"
      >
        <h2 className="text-[15px] font-extrabold text-ink">档案</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-extrabold text-ink-soft">用户名</label>
          <input
            className="duo-input !w-48 !py-2"
            value={profile.name}
            onChange={(e) => setName(e.target.value)}
          />
          <span className="text-xs font-bold text-ink-faint">v1 仅本机档案 · 账号同步 M2 接入</span>
        </div>
      </motion.section>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
        className="card p-6"
      >
        <h2 className="text-[15px] font-extrabold text-ink">任务等级</h2>
        <p className="mb-5 text-xs font-bold text-ink-faint">一行一条：词集 → 等级。越靠后的规则优先级越高（手动覆盖往后加）。</p>
        <div className="space-y-2.5">
          {profile.goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: 0.04 * i }}
              className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-hare bg-snow p-3"
            >
              <span className="w-32 text-sm font-extrabold text-ink">{scopeLabel(g)}</span>
              <span className="chip bg-mist text-ink-faint">→</span>
              <span className={`chip ${LEVEL_META[g.level].cls}`}>{LEVEL_META[g.level].label}</span>
              <select
                className="duo-input ml-auto !w-40 !py-2 text-sm"
                value={g.level}
                onChange={(e) => update(g.id, { level: e.target.value as GoalLevel })}
              >
                {LEVEL_ORDER.map((l) => (
                  <option key={l} value={l}>{LEVEL_META[l].label}</option>
                ))}
              </select>
              <button
                className="chip !py-2 bg-duo-red-tint text-duo-red-dark hover:brightness-95"
                onClick={() => setGoals(profile.goals.filter((x) => x.id !== g.id))}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[3, 2, 1, 0].map((s) => (
            <button
              key={s}
              className="chip !py-2 bg-mist text-ink-soft hover:bg-hare/60"
              onClick={() => setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { stars: [s] }, level: 'dictation' }])}
            >
              + {'★'.repeat(s) || '无星'} 规则
            </button>
          ))}
          <button
            className="chip !py-2 bg-mist text-ink-soft hover:bg-hare/60"
            onClick={() => setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { kind: 'phrase' }, level: 'dictation' }])}
          >
            + 词组规则
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.1 }}
        className="card p-6"
      >
        <h2 className="text-[15px] font-extrabold text-ink">每日额度</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {([['triage', '🧺 清洗', 60], ['spotcheck', '✏️ 抽查', 20], ['newWords', '🌱 新词', 30]] as const).map(([k, label, max]) => (
            <label key={k} className="block">
              <div className="mb-2 flex justify-between text-sm font-extrabold">
                <span className="text-ink-soft">{label}/天</span>
                <span className="tabular-nums text-duo-green-dark">{profile.dailyQuota[k]}</span>
              </div>
              <input
                type="range" min={0} max={max}
                value={profile.dailyQuota[k]}
                onChange={(e) => setQuota({ [k]: Number(e.target.value) })}
                className="w-full accent-[#58cc02]"
              />
            </label>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.15 }}
        className="card p-6"
      >
        <h2 className="text-[15px] font-extrabold text-ink">危险操作</h2>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-extrabold text-duo-red-dark">清空全部学习进度、清洗标记和 FSRS 状态，确定？</span>
            <button className="push push-red !py-2.5" onClick={reset}>确定清空</button>
            <button className="push push-ghost !py-2.5" onClick={() => setConfirmReset(false)}>取消</button>
          </div>
        ) : (
          <button className="push push-red !py-2.5" onClick={() => setConfirmReset(true)}>重置学习档案…</button>
        )}
      </motion.section>
    </div>
  )
}
