import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Dataset } from '../lib/data'
import type { Dim } from '../types'
import { isDue } from '../lib/fsrs'
import { dimsForLevel, goalLevelFor, useProfile } from '../lib/store'

const EASE = [0.16, 1, 0.3, 1] as const
const EXAM_DATE = new Date('2027-06-13') // 上海中考首日（按惯例六月中旬，可改）

/** 桶：P0 不会 / P1 拼写存疑 / P2 待清洗 / P3 熟词抽查池 */
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
      // 到期数
      for (const d of dims) {
        const st = prog.dims[d as Dim]
        if (st && isDue(st)) { due++; break }
      }
    }
    return { p0, p1, p2, p3, due, dictGoal, dictDone }
  }, [ds, profile])

  const daysToExam = Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000))

  const rings = [
    { label: '到期复习', n: stats.due, hint: '遗忘曲线今天要救的', cls: 'text-neon' },
    { label: 'P0 不会', n: stats.p0, hint: '最需要搞的', cls: 'text-rose' },
    { label: 'P1 拼写存疑', n: stats.p1, hint: '抽查池', cls: 'text-amber' },
    { label: 'P2 待清洗', n: stats.p2, hint: '还没刷过卡', cls: 'text-violet' },
  ]

  return (
    <div className="mt-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="eyebrow">TODAY</div>
          <h1 className="font-display mt-1 text-3xl text-ink">
            距中考 <span className="text-neon">{daysToExam}</span> 天
          </h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-faint">默写级目标进度</div>
          <div className="font-mono text-2xl tabular-nums text-ink">
            {stats.dictDone}<span className="text-ink-faint">/{stats.dictGoal}</span>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rings.map((r, i) => (
          <motion.button
            key={r.label}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.05 * i }}
            whileHover={{ y: -2 }}
            onClick={() => navigate('/study')}
            className="glass p-5 text-left"
          >
            <div className={`font-mono text-3xl tabular-nums ${r.cls}`}>{r.n}</div>
            <div className="mt-1 text-sm text-ink-soft">{r.label}</div>
            <div className="text-xs text-ink-faint">{r.hint}</div>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
        className="glass-strong mt-4 flex flex-col items-center gap-4 p-8 sm:flex-row sm:justify-between"
      >
        <div>
          <div className="text-lg text-ink">
            今天最少要过 {stats.due + 15 + profile.dailyQuota.triage} 张卡
          </div>
          <div className="mt-1 text-sm text-ink-faint">
            到期 {stats.due} + 抽查 15 + 清洗 {profile.dailyQuota.triage}，清洗和复习混在同一场
          </div>
        </div>
        <button
          onClick={() => navigate('/study')}
          className="rounded-xl bg-gradient-to-r from-neon to-violet px-8 py-4 font-medium text-[#05070f] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          开始学习 →
        </button>
      </motion.div>
    </div>
  )
}
