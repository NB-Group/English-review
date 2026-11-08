import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { Dim } from '../types'
import { isDue } from '../lib/fsrs'
import { dimsForLevel, goalLevelFor, useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const

/** 白色描边进度环（放在绿色横幅里） */
function Ring({ pct, size = 132 }: { pct: number; size?: number }) {
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
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
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

  const nodes = [
    { label: '到期复习', sub: '遗忘曲线要救的', n: stats.due, bg: 'var(--color-duo-blue)', dark: 'var(--color-duo-blue-dark)' },
    { label: '不会的词', sub: '最高优先', n: stats.p0, bg: 'var(--color-duo-red)', dark: 'var(--color-duo-red-dark)' },
    { label: '拼写存疑', sub: '每天抽查', n: stats.p1, bg: 'var(--color-duo-gold)', dark: 'var(--color-duo-gold-dark)' },
    { label: '待清洗', sub: '还没刷卡', n: stats.p2, bg: 'var(--color-duo-purple)', dark: 'var(--color-duo-purple-dark)' },
  ]

  return (
    <div>
      {/* ── 全宽绿色横幅：猫头鹰 + 大数字 + 环 ── */}
      <div className="-mx-5 -mt-1 bg-gradient-to-br from-duo-green to-duo-green-dark px-5 pb-10 pt-8 sm:-mx-8 sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <motion.span
                initial={reduce ? false : { rotate: -12, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                className="grid size-14 place-items-center rounded-2xl bg-white/20 text-3xl backdrop-blur"
              >
                🦉
              </motion.span>
              <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-[14px] font-extrabold text-ink">
                距中考 {Math.max(0, Math.ceil((new Date('2027-06-13').getTime() - Date.now()) / 86400000))} 天，稳住节奏
              </div>
            </div>
            <div className="mt-5 flex items-baseline justify-center gap-2 sm:justify-start">
              <span className="text-[76px] font-black leading-none tracking-tight text-white sm:text-[96px]">
                {total}
              </span>
              <span className="text-[22px] font-extrabold text-white/85">张卡</span>
            </div>
            <p className="mt-2 text-[14px] font-bold text-white/85">
              到期 {stats.due} ＋ 抽查 15 ＋ 清洗 {profile.dailyQuota.triage}
            </p>
            <button
              onClick={() => navigate('/study')}
              className="mt-6 w-full rounded-2xl bg-white py-4 text-[17px] font-black text-duo-green-dark shadow-[0_4px_0_rgba(0,0,0,0.18)] transition-transform active:translate-y-1 active:shadow-none sm:w-auto sm:px-14"
            >
              开始学习
            </button>
          </div>
          <Ring pct={pct} />
        </div>
      </div>

      {/* ── 学习路径：彩色圆节点 + 虚线连接 ── */}
      <div className="mx-auto mt-9 max-w-3xl">
        <h2 className="text-[15px] font-black text-ink">今天的战场</h2>
        <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {/* 连接虚线（桌面横向） */}
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden border-t-[3px] border-dashed border-hare sm:block" />
          {nodes.map((n, i) => (
            <motion.button
              key={n.label}
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 + i * 0.08 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/study')}
              className="relative z-10 flex flex-col items-center"
            >
              <span
                className="grid size-16 place-items-center rounded-full text-[22px] font-black text-white tabular-nums"
                style={{ background: n.bg, boxShadow: `0 4px 0 ${n.dark}` }}
              >
                {n.n}
              </span>
              <span className="mt-3 text-[14px] font-black text-ink">{n.label}</span>
              <span className="text-[12px] font-semibold text-ink-faint">{n.sub}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 熟词池脚注 */}
      <p className="mt-10 text-center text-[13px] font-bold text-ink-faint">
        🧊 还有 {stats.p3} 个滚瓜烂熟的词在抽查池里冬眠，抽查答错会被拖回来重学
      </p>
    </div>
  )
}
