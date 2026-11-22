import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { loadDataset, type Dataset } from './lib/data'
import ProductToday from './views/ProductToday'
import PracticeLauncher from './views/PracticeLauncher'
import ProductLibrary from './views/ProductLibrary'
import Study from './views/Study'
import ChineseStudy from './views/ChineseStudy'
import ProductProgress from './views/ProductProgress'
import { AccountGate, AccountChip } from './views/AccountGate'

const nav = [
  ['/today', '今天', '◷'],
  ['/practice', '专项训练', '↗'],
  ['/library', '内容库', '▤'],
  ['/progress', '进度', '◎'],
]

function PracticeRoute({ ds }: { ds: Dataset }) {
  const [params] = useSearchParams()
  return params.get('scope') ? <Study ds={ds} /> : <PracticeLauncher />
}

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [error, setError] = useState('')
  const location = useLocation()
  const days = Math.max(0, Math.ceil((new Date('2027-06-13').getTime() - Date.now()) / 86400000))

  useEffect(() => { loadDataset().then(setDs).catch((e) => setError(String(e))) }, [])

  const isFocusPage = ['/study', '/chinese'].includes(location.pathname) || location.pathname === '/practice' && Boolean(location.search)

  return (
    <div className="workspace">
      <aside className="sidebar">
        <NavLink to="/today" className="wordmark">
          <span className="brand-mark">中<span>↗</span></span>
          <div>中考复习<small>ZHONGKAO REVIEW</small></div>
        </NavLink>
        <div className="nav-caption">我的学习空间</div>
        <nav>
          {nav.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/today'} className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}>
              <span>{icon}</span>{label}<i>↗</i>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note"><div className="tiny-label">KEEP SHOWING UP</div><p>A little,<br />every day.</p><span>每一次复习，都会留下痕迹。</span><div className="note-rule" /><span>距离中考 <b>{days}</b> 天</span></div>
        <AccountChip />
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <div className="breadcrumb">我的学习空间 <span>/</span> <b>{nav.find((n) => n[0] === location.pathname)?.[1] ?? '今天'}</b></div>
          <div className="header-right"><span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</span><div className="profile-mark">我</div></div>
        </header>
        <div className={'page-content' + (isFocusPage ? ' focus-page' : '')}>
          {error ? <div className="empty-state"><h1>暂时没有加载成功</h1><p>请检查网络后刷新页面，学习记录仍保存在本机。</p><details><summary>查看详情</summary>{error}</details></div>
            : !ds ? <div className="empty-state">正在整理你的词库…</div>
              : <Routes>
                <Route path="/" element={<Navigate to="/today" replace />} />
                <Route path="/today" element={<ProductToday ds={ds} />} />
                <Route path="/practice" element={<PracticeRoute ds={ds} />} />
                <Route path="/library" element={<ProductLibrary ds={ds} />} />
                <Route path="/study" element={<Study ds={ds} />} />
                <Route path="/chinese" element={<ChineseStudy />} />
                <Route path="/progress" element={<ProductProgress ds={ds} />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>}
        </div>
        <footer className="workspace-footer"><span>ZHONGKAO REVIEW</span><span>学过的，值得记住。</span></footer>
      </div>
      <AccountGate />
    </div>
  )
}
