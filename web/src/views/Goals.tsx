import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { GoalLevel, GoalRule } from '../types'
import { useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

const LEVEL_LABEL: Record<GoalLevel, string> = {
  skip: '忽略',
  recognize: '认读（见词知义）',
  dictation: '默写（音→形）',
  sentence: '句子级（+例句认读）',
  full: '全能（+例句挖空）',
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
    <div className="mt-6 space-y-4">
      <section className="glass p-6">
        <div className="eyebrow mb-4">PROFILE</div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-ink-faint">用户名</label>
          <input
            className="cyber-input w-48"
            value={profile.name}
            onChange={(e) => setName(e.target.value)}
          />
          <span className="text-xs text-ink-faint">v1 仅本机档案；账号同步 M2 接入</span>
        </div>
      </section>

      <section className="glass p-6">
        <div className="eyebrow mb-1">TASK LEVELS · 任务等级</div>
        <p className="mb-5 text-xs text-ink-faint">下面一条规则一行：词集 → 等级。后面的规则优先级更高（手动覆盖往后加）。</p>
        <div className="space-y-2">
          {profile.goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white/3 p-3"
            >
              <span className="w-32 text-sm text-ink-soft">{scopeLabel(g)}</span>
              <span className="text-ink-faint">→</span>
              <select
                className="cyber-input flex-1 text-sm"
                value={g.level}
                onChange={(e) => update(g.id, { level: e.target.value as GoalLevel })}
              >
                {LEVEL_ORDER.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                ))}
              </select>
              <button
                className="rounded-lg border border-rose/40 px-3 py-1.5 text-xs text-rose hover:bg-rose/10"
                onClick={() => setGoals(profile.goals.filter((x) => x.id !== g.id))}
              >
                删除
              </button>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[3, 2, 1, 0].map((s) => (
            <button
              key={s}
              className="rounded-lg border border-line-bright px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
              onClick={() =>
                setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { stars: [s] }, level: 'dictation' }])
              }
            >
              + {'★'.repeat(s) || '无星'} 规则
            </button>
          ))}
          <button
            className="rounded-lg border border-line-bright px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            onClick={() => setGoals([...profile.goals, { id: `g${Date.now()}`, scope: { kind: 'phrase' }, level: 'dictation' }])}
          >
            + 词组规则
          </button>
        </div>
      </section>

      <section className="glass p-6">
        <div className="eyebrow mb-4">DAILY QUOTA · 每日额度</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['triage', '清洗', 60], ['spotcheck', '抽查', 20], ['newWords', '新词', 30]] as const).map(([k, label, max]) => (
            <label key={k} className="block">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-ink-soft">{label}/天</span>
                <span className="font-mono tabular-nums text-ink">{profile.dailyQuota[k]}</span>
              </div>
              <input
                type="range" min={0} max={max}
                value={profile.dailyQuota[k]}
                onChange={(e) => setQuota({ [k]: Number(e.target.value) })}
                className="w-full accent-[#00f2ff]"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="glass p-6">
        <div className="eyebrow mb-4">DANGER ZONE</div>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-rose">清空全部学习进度、清洗标记和 FSRS 状态，确定？</span>
            <button className="rounded-lg bg-rose/20 px-4 py-2 text-sm text-rose" onClick={reset}>确定清空</button>
            <button className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft" onClick={() => setConfirmReset(false)}>取消</button>
          </div>
        ) : (
          <button className="rounded-lg border border-rose/40 px-4 py-2 text-sm text-rose hover:bg-rose/10" onClick={() => setConfirmReset(true)}>
            重置学习档案…
          </button>
        )}
      </section>
    </div>
  )
}
