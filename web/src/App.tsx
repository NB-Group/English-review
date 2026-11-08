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
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="mx-auto w-full max-w-3xl px-5 pb-16 sm:px-8"
    >
      {children}
    </motion.main>
  )
}

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    loadDataset().then(setDs).catch((e) => setError(String(e)))
  }, [])

  const daysLeft = useMemo(
    () => Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000)),
    [],
  )

  const tabCls = ({ isActive }: { isActive: boolean }) =>
    `relative px-3.5 py-3 text-[15px] font-extrabold transition-colors ${
      isActive ? 'text-duo-blue' : 'text-ink-soft hover:text-ink'
    }`

  return (
    <div className="min-h-dvh bg-snow">
      <header className="sticky top-0 z-30 border-b-2 border-hare bg-snow">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-5 sm:px-8">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-duo-green text-base shadow-[0_2px_0_var(--color-duo-green-dark)]">
              🦉
            </span>
            <span className="text-[17px] font-extrabold tracking-wide text-ink">考纲词汇</span>
          </NavLink>
          <nav className="ml-2 flex items-stretch self-stretch">
            {([['/', '今日'], ['/study', '学习'], ['/library', '词库'], ['/goals', '目标']] as const).map(
              ([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'} className={tabCls}>
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-1.5 -bottom-[2px] h-[4px] rounded-t-full bg-duo-blue"
                          transition={{ duration: 0.25, ease: EASE }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ),
            )}
          </nav>
          <span className="ml-auto text-[13px] font-extrabold text-ink-faint">
            中考 <span className="text-duo-green-dark">{daysLeft}</span> 天
          </span>
        </div>
      </header>

      {error ? (
        <div className="mx-auto mt-9 max-w-3xl px-5 sm:px-8">
          <div className="rounded-2xl bg-duo-red-tint p-6">
            <div className="text-lg font-extrabold text-duo-red-dark">数据加载失败</div>
            <p className="mt-1 text-sm font-bold text-ink-soft">{error}</p>
            <p className="mt-2 text-sm font-bold text-ink-soft">
              确认 server.py 在 8080 端口运行，data/kaogang/ 数据集已生成。
            </p>
          </div>
        </div>
      ) : !ds ? (
        <div className="mx-auto mt-32 max-w-3xl px-5 text-center sm:px-8">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="text-4xl"
          >
            🦉
          </motion.div>
          <p className="mt-3 font-extrabold text-ink-soft">正在加载考纲数据集…</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<View><Today ds={ds} /></View>} />
            <Route path="/study" element={<Study ds={ds} />} />
            <Route path="/library" element={<View><Library ds={ds} /></View>} />
            <Route path="/goals" element={<View><Goals /></View>} />
          </Routes>
        </AnimatePresence>
      )}
    </div>
  )
}
