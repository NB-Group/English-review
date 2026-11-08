import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { Dim } from '../types'
import { isDue } from '../lib/fsrs'
import { dimsForLevel, goalLevelFor, useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

function Ring({ pct, size = 150 }: { pct: number; size?: number }) {
  const r = size / 2 - 11
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hare)" strokeWidth="13" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-duo-green)" strokeWidth="13" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={{ duration: 1, ease: EASE }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
        className="fill-ink" style={{ fontSize: size / 3.4, fontWeight: 900 }}>
        {pct}%
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-[#777]"
        style={{ fontSize: size / 12, fontWeight: 700 }}>
        默写进度
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
  const total = stats.due + 15 + profile.dailyQuota.triage

  const buckets = [
    { label: '到期复习', sub: '遗忘曲线要救的', n: stats.due, ink: 'text-duo-blue-dark', bar: 'bg-duo-blue' },
    { label: '不会的词', sub: '最高优先', n: stats.p0, ink: 'text-duo-red-dark', bar: 'bg-duo-red' },
    { label: '拼写存疑', sub: '每天抽查', n: stats.p1, ink: 'text-duo-gold-dark', bar: 'bg-duo-gold' },
    { label: '待清洗', n: stats.p2, sub: '还没刷卡', ink: 'text-duo-purple-dark', bar: 'bg-duo-purple' },
  ]

  return (
    <div className="pt-10">
      {/* 主视觉：倒计时 + 进度环 */}
      <div className="-mx-5 rounded-[28px] bg-duo-green-tint/50 px-5 py-10 sm:-mx-8 sm:px-12">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <div className="flex items-baseline gap-3 sm:justify-start">
            <motion.span
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-[88px] font-black leading-none tracking-tight text-duo-green-dark sm:text-[104px]"
            >
              {total}
            </motion.span>
            <span className="text-2xl font-extrabold text-ink-soft">张卡</span>
          </div>
          <p className="mt-3 text-[15px] font-bold text-ink-soft">
            今天最少要过的量 · 到期 {stats.due} ＋ 抽查 15 ＋ 清洗 {profile.dailyQuota.triage}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-ink-faint">
            熟词池 {stats.p3} 个在冬眠，抽查失败会被拖回来重学
          </p>
          <button onClick={() => navigate('/study')} className="push mt-7 w-full py-4 text-lg sm:w-auto sm:px-14">
            开始学习
          </button>
        </div>
        <Ring pct={pct} />
      </div>
      </div>

      {/* 四桶：裸排统计，细线分隔 */}
      <div className="hairline-x mt-12 grid grid-cols-2 gap-y-8 pt-8 sm:grid-cols-4">
        {buckets.map((b) => (
          <button
            key={b.label}
            onClick={() => navigate('/study')}
            className="group text-left sm:border-l-2 sm:border-hare sm:pl-5 sm:first:border-l-0 sm:first:pl-0"
          >
            <div className={`text-[34px] font-black leading-none tabular-nums ${b.ink}`}>{b.n}</div>
            <div className="mt-2 h-1.5 w-8 rounded-full" ><div className={`h-full w-full rounded-full ${b.bar}`} /></div>
            <div className="mt-2 text-[13px] font-extrabold text-ink group-hover:text-ink">{b.label}</div>
            <div className="text-[12px] font-semibold text-ink-faint">{b.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
