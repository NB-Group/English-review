import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useProfile, emptyProfile, profileStorageKey } from '../lib/store'
import { mapEnglishProfile, type UnifiedPreferences } from '../lib/migration-map'
import { makeReviewEvent, STUDY_CONTENT_VERSION, StudyCloudContext, type StudyCloud } from '../lib/study-cloud'
import { createUnifiedBackend } from '../lib/unified-backend'
import type { UserProfile } from '../types'
import { acknowledgeReview, enqueueReview, pendingReviews } from '../lib/study-outbox'

const guestPreference = 'study-guest-mode'

function readStored<T>(key: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}

export default function SupabaseStudyGate({
  url, keyValue, children,
}: { url: string; keyValue: string; children: ReactNode }) {
  const [backend] = useState(() => createUnifiedBackend(url, keyValue))
  const [account, setAccount] = useState<{ id: string; username: string } | null>()
  const [guest, setGuest] = useState(() => readStored<boolean>(guestPreference) === true)
  const [guestReady, setGuestReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<StudyCloud['review']>()
  const [status, setStatus] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'legacy'>('login')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void backend.getSession().then(setAccount).catch(() => {
      setStatus('无法恢复登录，请重新登录。')
      setAccount(null)
    })
  }, [backend])

  useEffect(() => {
    if (account !== null || !guest) return
    const cached = readStored<{ state?: { profile?: UserProfile }; version?: number }>(profileStorageKey)
    useProfile.getState().loadProfile(cached?.state?.profile ?? emptyProfile('游客'))
    setGuestReady(true)
    return useProfile.subscribe(({ profile }) => {
      try {
        localStorage.setItem(profileStorageKey, JSON.stringify({ state: { profile }, version: cached?.version ?? 0 }))
      } catch {
        setStatus('本机档案保存失败，请检查浏览器的存储设置。')
      }
    })
  }, [account, guest])

  useEffect(() => {
    if (!account) return
    const ownerId = account.id
    const ownerName = account.username
    let active = true
    let flushing = false
    let opening = false
    let dispatcher: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined
    const profileKey = 'study-cloud-profile:' + account.id
    const preferencesKey = 'study-cloud-pending-preferences:' + ownerId

    async function flush() {
      if (!active || flushing) return false
      flushing = true
      try {
        for (const event of await pendingReviews(ownerId)) {
          if (!active) return false
          await backend.appendReviewEvent(ownerId, event)
          await acknowledgeReview(ownerId, event.eventId)
        }
        const serialized = localStorage.getItem(preferencesKey)
        if (active && serialized) {
          await backend.updatePreferences(ownerId, JSON.parse(serialized) as UnifiedPreferences)
          if (localStorage.getItem(preferencesKey) === serialized) localStorage.removeItem(preferencesKey)
        }
        const empty = active && (await pendingReviews(ownerId)).length === 0 && !localStorage.getItem(preferencesKey)
        if (empty) setStatus('')
        else if (active) retry()
        return empty
      } catch {
        if (active) setStatus('进度已保存在本机，云同步待重试。')
        return false
      } finally {
        flushing = false
      }
    }

    const retry = () => {
      clearTimeout(dispatcher)
      dispatcher = setTimeout(() => void flush(), 400)
    }

    async function openProfile() {
      if (opening) return
      opening = true
      try { await restoreProfile() } finally { opening = false }
    }

    async function restoreProfile() {
      const cached = readStored<UserProfile>(profileKey)
      const defaults = cached ?? emptyProfile(ownerName)
      let next = defaults
      try {
        if (await flush()) next = await backend.loadProfile(defaults)
        else if (!cached) throw new Error('No cached study profile')
      } catch {
        if (!active) return
        if (!cached) { setStatus('暂时无法载入云端档案。请联网后重试。'); return }
        setStatus('已打开本机档案，云同步待重试。')
      }
      if (!active) return
      localStorage.setItem(profileKey, JSON.stringify(next))
      useProfile.getState().loadProfile(next)
      unsubscribe = useProfile.subscribe(({ profile }) => {
        localStorage.setItem(profileKey, JSON.stringify(profile))
        const preferences = mapEnglishProfile(profile, STUDY_CONTENT_VERSION).preferences
        localStorage.setItem(preferencesKey, JSON.stringify(preferences))
        retry()
      })
      const review: StudyCloud['review'] = (state, grade) => {
        void enqueueReview(ownerId, makeReviewEvent(state, grade)).then(retry).catch(() => {
          if (active) setStatus('复习结果保存在本机，云同步队列写入失败。')
        })
      }
      setSync(() => review)
      setReady(true)
    }

    void openProfile().catch(() => { if (active) setStatus('本机档案保存失败，请检查浏览器的存储设置。') })
    const onOnline = () => {
      if (!unsubscribe) void openProfile()
      else void flush()
    }
    window.addEventListener('online', onOnline)
    return () => {
      active = false
      clearTimeout(dispatcher)
      unsubscribe?.()
      window.removeEventListener('online', onOnline)
    }
  }, [account, backend])

  if (account && ready && sync) {
    return (
      <StudyCloudContext.Provider value={{
        accountId: account.id, username: account.username, review: sync, assistVocabulary: backend.assistVocabulary,
        signOut: async () => { await backend.signOut(); location.reload() },
      }}>
        {status && <div className="px-4 py-2 text-sm text-ink-soft" role="status">{status}</div>}
        {children}
      </StudyCloudContext.Provider>
    )
  }

  if (account === null && guestReady) {
    return (
      <StudyCloudContext.Provider value={{
        accountId: 'local', username: '本机档案', guest: true,
        signOut: async () => { localStorage.removeItem(guestPreference); location.reload() },
      }}>
        {status && <div className="px-4 py-2 text-sm text-ink-soft" role="status">{status}</div>}
        {children}
      </StudyCloudContext.Provider>
    )
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    try {
      const session = mode === 'legacy' ? await backend.claimLegacyAccount(username.trim(), pin, password)
        : mode === 'register' ? await backend.signUp(username.trim(), password, inviteLink.trim())
          : await backend.signIn(username.trim(), password)
      setPassword('')
      setPin('')
      setAccount(session)
    } catch {
      setStatus(mode === 'legacy' ? '旧账号验证失败。请核对用户名和原 PIN，或稍后重试。已经设置过密码的话，请直接登录。'
        : mode === 'register' ? '注册失败。请检查用户名、密码和班级邀请码。' : '登录失败。请检查用户名、密码和网络。')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: typeof mode) {
    setMode(next)
    setStatus('')
    setPassword('')
    setPin('')
  }

  return (
    <div className="gate-backdrop">
      <section className="gate-panel">
        <h1>{account ? '载入学习档案' : mode === 'legacy' ? '激活旧账号' : mode === 'register' ? '注册中考复习' : '登录中考复习'}</h1>
        {status && <p role="status">{status}</p>}
        {account && status && <button className="push" onClick={() => location.reload()}>重新载入</button>}
        {account === null && (
          <form className="gate-form" onSubmit={(event) => void authenticate(event)}>
            {mode === 'legacy' && <p>用原 PIN 确认身份，设置新密码后即可继续之前的学习。</p>}
            <label>用户名<input className="duo-input" value={username} autoComplete="username" required onChange={(event) => setUsername(event.target.value)} /></label>
            {mode === 'legacy' && <label>原 PIN<input className="duo-input" type="password" value={pin} required
              autoComplete="current-password" onChange={(event) => setPin(event.target.value)} /></label>}
            <label>{mode === 'legacy' ? '新密码（至少 8 位）' : '密码'}<input className="duo-input" type="password" value={password} required
              minLength={mode === 'login' ? undefined : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(event) => setPassword(event.target.value)} /></label>
            {mode === 'register' && <label>班级邀请码<input className="duo-input" value={inviteLink} required onChange={(event) => setInviteLink(event.target.value)} /></label>}
            <button className="push" disabled={busy}>{mode === 'legacy' ? '设置密码并登录' : mode === 'register' ? '注册' : '登录'}</button>
            {mode === 'login' ? <>
              <button className="gate-skip" type="button" disabled={busy} onClick={() => switchMode('legacy')}>用原 PIN 激活旧账号</button>
              <button className="gate-skip" type="button" disabled={busy} onClick={() => switchMode('register')}>用班级邀请码注册</button>
              <button className="gate-skip" type="button" disabled={busy} onClick={() => {
                try { localStorage.setItem(guestPreference, 'true') } catch { /* The session can still run. */ }
                setStatus('')
                setGuest(true)
              }}>仅在本机学习</button>
            </> : <button className="gate-skip" type="button" disabled={busy} onClick={() => switchMode('login')}>返回登录</button>}
          </form>
        )}
      </section>
    </div>
  )
}
