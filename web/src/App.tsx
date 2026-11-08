import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { loadDataset, type Dataset } from './lib/data'
import Today from './views/Today'
import Library from './views/Library'
import Study from './views/Study'
import Goals from './views/Goals'

const EASE = [0.16, 1, 0.3, 1] as const
const EXAM_DATE = new Date('2027-06-13')

function View({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.main
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6"
    >
      {children}
    </motion.main>
  )
}

function Wordmark() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <motion.div
        initial={{ rotate: -8, scale: 0.8, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className="grid size-10 place-items-center rounded-2xl bg-duo-green text-xl shadow-[0_3px_0_var(--color-duo-green-dark)]"
      >
        🦉
      </motion.div>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-wide text-ink">考纲词汇</div>
        <div className="eyebrow mt-0.5">SHANGHAI · 2027</div>
      </div>
    </NavLink>
  )
}

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const reduce = useReducedMotion()

  useEffect(() => {
    loadDataset().then(setDs).catch((e) => setError(String(e)))
  }, [])

  const daysLeft = useMemo(
    () => Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000)),
    [],
  )

  const tabCls = ({ isActive }: { isActive: boolean }) =>
    `relative px-4 py-3 text-sm font-extrabold tracking-wide transition-colors ${
      isActive ? 'text-duo-blue' : 'text-ink-soft hover:text-ink'
    }`

  return (
    <div className="min-h-dvh bg-snow">
      <header className="sticky top-0 z-30 border-b-2 border-hare bg-snow/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2.5 sm:px-6">
          <Wordmark />
          <nav className="ml-4 flex items-stretch self-stretch">
            {([
              ['/', '今日', true],
              ['/study', '学习', true],
              ['/library', '词库', true],
              ['/goals', '目标', true],
            ] as const).map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={tabCls}>
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-2 -bottom-[2px] h-[4px] rounded-t-full bg-duo-blue"
                        transition={{ duration: 0.3, ease: EASE }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="chip hidden bg-duo-green-tint text-duo-green-dark sm:inline-flex">
              ⏳ 中考 {daysLeft} 天
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mx-auto mt-9 max-w-4xl px-4 sm:px-6">
          <div className="card p-6 text-duo-red" style={{ borderColor: 'var(--color-duo-red)' }}>
            <div className="text-lg font-extrabold">数据加载失败</div>
            <p className="mt-2 text-sm text-ink-soft">{error}</p>
            <p className="mt-2 text-sm text-ink-soft">
              请确认 server.py 在 8080 端口运行，data/kaogang/ 数据集已生成。
            </p>
          </div>
        </div>
      ) : !ds ? (
        <div className="mx-auto mt-28 max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="text-5xl"
          >
            🦉
          </motion.div>
          <p className="mt-4 font-extrabold text-ink-soft">正在加载考纲数据集…</p>
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
