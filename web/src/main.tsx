import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

// URL 大小写规范化：GitHub 仓库名带大写时与构建 base 小写不一致会让路由失配白屏
{
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
  const pn = location.pathname
  if (pn.toLowerCase().startsWith(base.toLowerCase()) && !pn.startsWith(base)) {
    history.replaceState(null, '', base + pn.slice(base.length))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, "") || "/"}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
