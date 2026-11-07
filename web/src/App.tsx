import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { loadDataset, type Dataset } from './lib/data'
import Today from './views/Today'
import Library from './views/Library'
import Study from './views/Study'
import Goals from './views/Goals'

const EASE = [0.16, 1, 0.3, 1] as const

function View({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.main
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-8"
    >
      {children}
    </motion.main>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-full text-sm transition-colors ${
    isActive ? 'bg-white/10 text-ink' : 'text-ink-faint hover:text-ink-soft'
  }`

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    loadDataset().then(setDs).catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#05070f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-8">
          <div className="mr-2 flex items-baseline gap-2">
            <span className="font-display text-lg tracking-wide text-ink">考纲词汇</span>
            <span className="eyebrow hidden sm:inline">SHANGHAI 2027</span>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              今日
            </NavLink>
            <NavLink to="/study" className={navClass}>
              学习
            </NavLink>
            <NavLink to="/library" className={navClass}>
              词库
            </NavLink>
            <NavLink to="/goals" className={navClass}>
              目标
            </NavLink>
          </nav>
        </div>
      </header>

      {error ? (
        <div className="mx-auto mt-9 max-w-5xl px-4 sm:px-8">
          <div className="rounded-2xl border border-rose/30 bg-rose/10 p-6 text-rose">
            数据加载失败：{error}
            <p className="mt-2 text-sm text-ink-soft">
              请确认已运行 <code>python tools/kaogang/merge.py</code> 生成 data/kaogang/ 数据集，
              且 server.py 在 8080 端口运行。
            </p>
          </div>
        </div>
      ) : !ds ? (
        <div className="mx-auto mt-24 max-w-5xl px-4 text-center sm:px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="mx-auto size-8 rounded-full border-2 border-line border-t-neon"
          />
          <p className="mt-4 text-ink-soft">正在加载考纲数据集…</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<View><Today ds={ds} /></View>} />
            <Route path="/study" element={<View><Study ds={ds} /></View>} />
            <Route path="/library" element={<View><Library ds={ds} /></View>} />
            <Route path="/goals" element={<View><Goals /></View>} />
          </Routes>
        </AnimatePresence>
      )}
    </div>
  )
}
