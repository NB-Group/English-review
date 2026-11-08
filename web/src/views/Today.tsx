import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { Dim } from '../types'
import { isDue } from '../lib/fsrs'
import { dimsForLevel, goalLevelFor, useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

function Ring({ pct, size = 168 }: { pct: number; size?: number }) {
  const r = size / 2 - 12
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hare)" strokeWidth="14" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-duo-green)" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={{ duration: 1.1, ease: EASE }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central"
        className="fill-ink font-extrabold" style={{ fontSize: size / 3.6 }}>
        {pct}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-[#777] font-bold" style={{ fontSize: size / 11 }}>
        默写级进度
      </text>
    </svg>
  )
}

export default function Today({ ds }: { ds: Dataset }) {
  const profile = useProfile((s) => s.profile)
  const reduce = useReducedMotion()
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

  const buckets = [
    { label: '到期复习', n: stats.due, hint: '遗忘曲线今天要救的', emoji: '⚡', tint: 'bg-duo-blue-tint', ink: 'text-duo-blue-dark' },
    { label: '不会的词', n: stats.p0, hint: '最优先搞掉', emoji: '🎯', tint: 'bg-duo-red-tint', ink: 'text-duo-red-dark' },
    { label: '拼写存疑', n: stats.p1, hint: '每天抽查默写', emoji: '✏️', tint: 'bg-duo-gold-tint', ink: 'text-[#8a6a00]' },
    { label: '待清洗', n: stats.p2, hint: '还没刷过卡', emoji: '🧺', tint: 'bg-duo-purple-tint', ink: 'text-duo-purple-dark' },
  ]

  return (
    <div className="mt-8">
      {/* 主卡：进度环 + 冲刺文案 */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="card flex flex-col items-center gap-8 p-8 sm:flex-row sm:p-10"
      >
        <Ring pct={pct} />
        <div className="text-center sm:text-left">
          <div className="eyebrow">TODAY · 冲刺计划</div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            今天最少 <span className="text-duo-green">{stats.due + 15 + profile.dailyQuota.triage}</span> 张卡
          </h1>
          <p className="mt-3 font-bold text-ink-soft">
            到期 {stats.due} · 抽查 15 · 清洗 {profile.dailyQuota.triage}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-faint">
            清洗和复习混在同一场，高星词优先。{stats.p3 > 0 && ` 熟词抽查池还有 ${stats.p3} 个。`}
          </p>
          <button onClick={() => navigate('/study')} className="push mt-6 w-full text-lg sm:w-auto sm:px-12 sm:py-4">
            ▶ 开始学习
          </button>
        </div>
      </motion.section>

      {/* 四桶 */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {buckets.map((b, i) => (
          <motion.button
            key={b.label}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.06 * i }}
            whileHover={reduce ? undefined : { y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/study')}
            className="card flex items-center gap-4 p-5 text-left"
          >
            <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-2xl ${b.tint}`}>{b.emoji}</span>
            <span>
              <span className={`block text-3xl font-extrabold tabular-nums ${b.ink}`}>{b.n}</span>
              <span className="block text-sm font-extrabold text-ink">{b.label}</span>
              <span className="block text-xs font-semibold text-ink-faint">{b.hint}</span>
            </span>
          </motion.button>
        ))}
      </div>

      {/* 熟词池 */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-ink-faint"
      >
        <span className="chip bg-mist">🧊 滚瓜烂熟 {stats.p3} 个在抽查池里冬眠</span>
      </motion.div>
    </div>
  )
}
