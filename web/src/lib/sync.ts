import { useProfile } from './store'
import type { UserProfile } from '../types'

/** 账号同步层：PIN 认领制，server.py 的 /api/account-data action 协议
 *  离线优先：本地照常学，登录后按 rev 新者胜合并 */

const SESSION_KEY = 'kaogang_session'

export interface Session {
  user: string
  pin: string
  rev: number
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function setSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new CustomEvent('kaogang-session', { detail: s }))
}

export class ApiError extends Error {
  status: number
  constructor(msg: string, status: number) {
    super(msg)
    this.status = status
  }
}

async function api(body: Record<string, unknown>) {
  let res: Response
  try {
    res = await fetch('/api/account-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('网络不可达', 0) // status 0 = 网络错误，不应触发登出
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status)
  return data
}

/** 档案合并（登录两侧都有进度时）：progress 按词条并集，碰撞取维度更多的；
 *  偏好（goals/配额/名字）用本机当前值。绝不整档覆盖丢数据。 */
export function mergeProfiles(local: UserProfile, remote: UserProfile): UserProfile {
  if (!remote || typeof remote !== 'object' || !remote.progress) return local
  const progress = { ...remote.progress }
  for (const [k, entry] of Object.entries(local.progress || {})) {
    const r = progress[k]
    if (!r) { progress[k] = entry; continue }
    if (Object.keys(entry.dims || {}).length >= Object.keys(r.dims || {}).length) progress[k] = entry
  }
  return {
    ...local,
    progress,
    sentenceProgress: { ...(remote.sentenceProgress || {}), ...(local.sentenceProgress || {}) },
  }
}

export async function peek(
  user: string,
): Promise<{ exists: boolean; hasPin: boolean; registerCode?: boolean; tsKey?: string }> {
  return api({ action: 'peek', user })
}

export async function claim(user: string, pin: string, regCode = '', cfToken = ''): Promise<Session> {
  const r = await api({ action: 'claim', user, pin, registerCode: regCode, cfToken })
  const s = { user, pin, rev: r.rev }
  setSession(s)
  return s
}

export async function auth(user: string, pin: string): Promise<{ session: Session; data: UserProfile; rev: number }> {
  const r = await api({ action: 'auth', user, pin })
  const s = { user, pin, rev: r.rev }
  setSession(s)
  return { session: s, data: r.data, rev: r.rev }
}

export function logout() {
  setSession(null)
}

/** 用服务器档案覆盖本地（服务器更新时） */
export function adoptRemote(data: UserProfile) {
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    useProfile.getState().loadProfile({ ...data, name: data.name || useProfile.getState().profile.name })
  }
}

/** 推送本地档案；rev 落后被拒则采用服务器版本 */
export async function pushProfile(): Promise<'ok' | 'conflict' | 'offline'> {
  const s = getSession()
  if (!s) return 'offline'
  try {
    const r = await api({ action: 'save', user: s.user, pin: s.pin, rev: s.rev, data: useProfile.getState().profile })
    if (r.conflict) {
      setSession({ ...s, rev: r.rev })
      adoptRemote(r.data)
      return 'conflict'
    }
    setSession({ ...s, rev: r.rev })
    return 'ok'
  } catch {
    return 'offline'
  }
}

let syncReady = false
let timer: number | undefined

/** 启动自动同步：登录后每次档案变化防抖推送，离线静默 */
export function startAutoSync() {
  if (syncReady) return
  syncReady = true
  useProfile.subscribe(() => {
    if (!getSession()) return
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void pushProfile(), 400)
  })
  window.addEventListener('beforeunload', () => {
    const s = getSession()
    if (!s) return
    navigator.sendBeacon?.(
      '/api/account-data',
      new Blob(
        [JSON.stringify({ action: 'save', user: s.user, pin: s.pin, rev: s.rev, data: useProfile.getState().profile })],
        { type: 'application/json' },
      ),
    )
  })
}
