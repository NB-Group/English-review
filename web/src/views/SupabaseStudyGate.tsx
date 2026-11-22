import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useProfile, emptyProfile } from '../lib/store'
import { mapEnglishProfile, type UnifiedPreferences } from '../lib/migration-map'
import { makeReviewEvent, STUDY_CONTENT_VERSION, StudyCloudContext, type StudyCloud } from '../lib/study-cloud'
import { createUnifiedBackend } from '../lib/unified-backend'
import type { UserProfile } from '../types'
import { acknowledgeReview, enqueueReview, pendingReviews } from '../lib/study-outbox'

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
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<StudyCloud['review']>()
  const [status, setStatus] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void backend.getSession().then(setAccount).catch(() => {
      setStatus('无法恢复登录，请重新登录。')
      setAccount(null)
    })
  }, [backend])

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
        accountId: account.id, username: account.username, review: sync,
        signOut: async () => { await backend.signOut(); location.reload() },
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
      const session = register ? await backend.signUp(username.trim(), password, inviteLink.trim())
        : await backend.signIn(username.trim(), password)
      setPassword('')
      setAccount(session)
    } catch {
      setStatus(register ? '注册失败。请检查用户名、密码和班级邀请码。' : '登录失败。请检查用户名、密码和网络。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate-backdrop">
      <section className="gate-panel">
        <h1>{account ? '载入学习档案' : register ? '注册中考复习' : '登录中考复习'}</h1>
        {status && <p role="status">{status}</p>}
        {account && status && <button className="push" onClick={() => location.reload()}>重新载入</button>}
        {account === null && (
          <form className="gate-form" onSubmit={(event) => void authenticate(event)}>
            <label>用户名<input className="duo-input" value={username} autoComplete="username" required onChange={(event) => setUsername(event.target.value)} /></label>
            <label>密码<input className="duo-input" type="password" value={password} required
              autoComplete={register ? 'new-password' : 'current-password'} onChange={(event) => setPassword(event.target.value)} /></label>
            {register && <label>班级邀请码<input className="duo-input" value={inviteLink} required onChange={(event) => setInviteLink(event.target.value)} /></label>}
            <button className="push" disabled={busy}>{register ? '注册' : '登录'}</button>
            <button className="gate-skip" type="button" onClick={() => setRegister(!register)}>{register ? '已有账号，去登录' : '用班级邀请码注册'}</button>
          </form>
        )}
      </section>
    </div>
  )
}
