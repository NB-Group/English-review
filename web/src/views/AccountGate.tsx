import { useEffect, useRef, useState } from 'react'
import { useProfile } from '../lib/store'
import { ApiError, mergeProfiles, adoptRemote, auth, claim, logout, peek, pushProfile, getSession, startAutoSync } from '../lib/sync'

/** 账号门：名字 + PIN 认领制。
 *  服务器配置了 Turnstile / 注册口令时自动出现对应关卡，未配置则零打扰。 */

type Mode = 'ask' | 'auth' | 'claim'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

export function AccountGate() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('ask')
  const [user, setUser] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [regCode, setRegCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [needRegCode, setNeedRegCode] = useState(false)
  const [tsKey, setTsKey] = useState('')
  const [cfToken, setCfToken] = useState('')
  const tsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startAutoSync()
    const s = getSession()
    if (s) {
      auth(s.user, s.pin)
        .then(({ data, rev }) => {
          if (rev > s.rev && data && Object.keys(data).length > 0) adoptRemote(data)
          else if (rev < s.rev) void pushProfile()
        })
        .catch((e) => {
          // 只有凭证类错误才登出；网络瞬断保留本地会话（离线优先）
          if (e instanceof ApiError && (e.status === 403 || e.status === 404)) logout()
        })
    } else if (!localStorage.getItem('kaogang_gate_dismissed')) {
      setOpen(true) // 首访引导一次，跳过后不再打扰（侧栏常驻登录入口）
    }
  }, [])

  // 侧栏游客位点击 → 重新唤起
  useEffect(() => {
    const openGate = () => { setOpen(true); setMode('ask'); setErr('') }
    window.addEventListener('kaogang-gate-open', openGate)
    return () => window.removeEventListener('kaogang-gate-open', openGate)
  }, [])

  // 注册模式 + 有 sitekey：动态加载 Turnstile 组件
  useEffect(() => {
    if (!tsKey || mode !== 'claim' || cfToken) return
    const mount = () => {
      if (window.turnstile && tsRef.current && !tsRef.current.childElementCount) {
        window.turnstile.render(tsRef.current, {
          sitekey: tsKey,
          callback: (t: string) => setCfToken(t),
          'expired-callback': () => setCfToken(''),
          theme: 'light',
        })
      }
    }
    if (window.turnstile) return mount()
    window.onTurnstileLoad = mount
    if (!document.getElementById('ts-script')) {
      const s = document.createElement('script')
      s.id = 'ts-script'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
      s.async = true
      document.head.appendChild(s)
    }
  }, [tsKey, mode, cfToken])

  if (!open) return null

  const submitUser = async () => {
    if (!user.trim()) return setErr('先输入名字（比如拼音）')
    setBusy(true); setErr('')
    try {
      const r = await peek(user.trim())
      setTsKey(r.tsKey || '')
      setNeedRegCode(!!r.registerCode)
      setMode(r.exists ? 'auth' : 'claim')
    } catch (e) {
      setErr(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const submitPin = async () => {
    if (pin.length < 4) return setErr('PIN 至少 4 位')
    if (mode === 'claim' && pin !== pin2) return setErr('两次输入的 PIN 不一致')
    if (mode === 'claim' && needRegCode && !regCode.trim()) return setErr('需要注册口令（问老师/同学要）')
    setBusy(true); setErr('')
    try {
      if (mode === 'claim') {
        await claim(user.trim(), pin, regCode.trim(), cfToken)
        await pushProfile() // 把本机已有进度带上去
      } else {
        const { data } = await auth(user.trim(), pin)
        const local = useProfile.getState().profile
        if (data && data.progress && Object.keys(data.progress).length > 0) {
          // 两侧都有进度 → 合并（词条并集），再上传合并结果
          useProfile.getState().loadProfile(mergeProfiles(local, data))
        }
        await pushProfile()
      }
      setOpen(false)
    } catch (e) {
      setErr(String((e as Error).message))
      window.turnstile?.reset()
      setCfToken('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate-backdrop">
      <div className="gate-panel">
        <div className="tiny-label">YOUR PROGRESS, PORTABLE</div>
        <h1>把学习进度带在身上。</h1>
        <p>
          用一个名字和 4 位 PIN 认领档案，换设备、清缓存都不会丢。
          <br />也可以先跳过，进度只保存在这台设备上。
        </p>

        {mode === 'ask' && (
          <div className="gate-form">
            <input className="duo-input" placeholder="你的名字（英文或拼音）" value={user}
              onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitUser()} autoFocus />
            <button className="push" disabled={busy} onClick={submitUser}>继续</button>
            <button
              className="gate-skip"
              onClick={() => {
                localStorage.setItem('kaogang_gate_dismissed', '1')
                setOpen(false)
              }}
            >
              先跳过，直接用 →
            </button>
          </div>
        )}

        {mode !== 'ask' && (
          <div className="gate-form">
            <div className="gate-user">{user.trim()} · {mode === 'claim' ? '新档案' : '已有档案'}</div>
            {mode === 'claim' && needRegCode && (
              <input className="duo-input" placeholder="注册口令（问老师/同学要）" value={regCode}
                onChange={(e) => setRegCode(e.target.value)} />
            )}
            <input className="duo-input" placeholder={mode === 'claim' ? '设置 4 位以上 PIN' : 'PIN'} value={pin} type="password"
              onChange={(e) => setPin(e.target.value)} autoFocus />
            {mode === 'claim' && (
              <input className="duo-input" placeholder="再输一次 PIN" value={pin2} type="password"
                onChange={(e) => setPin2(e.target.value)} />
            )}
            {mode === 'claim' && tsKey && <div ref={tsRef} className="gate-turnstile" />}
            <button className="push" disabled={busy || (mode === 'claim' && !!tsKey && !cfToken)} onClick={submitPin}>
              {mode === 'claim' ? '认领这个档案' : '登录'}
            </button>
            <button className="gate-skip" onClick={() => { setMode('ask'); setErr(''); setCfToken('') }}>← 换个名字</button>
          </div>
        )}

        {err && <div className="gate-err">{err}</div>}
      </div>
    </div>
  )
}

/** 侧栏底部账号位（会话变化时刷新） */
export function AccountChip() {
  const [name, setName] = useState(() => getSession()?.user ?? '')
  useEffect(() => {
    const onSession = () => setName(getSession()?.user ?? '')
    window.addEventListener('kaogang-session', onSession)
    return () => window.removeEventListener('kaogang-session', onSession)
  }, [])
  if (!name) {
    return (
      <button
        className="sidebar-bottom"
        style={{ background: 'none', border: 0, textAlign: 'left', cursor: 'pointer' }}
        onClick={() => window.dispatchEvent(new CustomEvent('kaogang-gate-open'))}
        title="登录账号，进度云同步"
      >
        <span className="status-dot" />
        进度只在本机 · 点此登录
      </button>
    )
  }
  return (
    <div className="sidebar-bottom">
      <span className="status-dot" />
      {name} · 已同步
      <button className="gate-skip" style={{ marginLeft: 6 }} onClick={() => { logout(); location.reload() }}>
        退出
      </button>
    </div>
  )
}
