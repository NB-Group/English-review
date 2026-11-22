import { createClient } from 'npm:@supabase/supabase-js@2.119.2'
import { mapEnglishProfile, STUDY_CONTENT_VERSION } from '../../../web/src/lib/migration-map.ts'
import type { UserProfile } from '../../../web/src/types.ts'

const headers = {
  'Access-Control-Allow-Origin': 'https://nb-group.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
}
const legacyEndpoint = 'https://nbgroup.pythonanywhere.com/api/account-data'

function result(status: number) {
  return new Response(JSON.stringify({ ok: status === 200 }), { status, headers })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return result(405)

  const body = await request.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const pin = typeof body?.pin === 'string' ? body.pin : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(username) || pin.length < 4 || pin.length > 128
    || password.length < 8 || new TextEncoder().encode(password).length > 72 || password === pin) return result(400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) },
  })
  const requestId = crypto.randomUUID()
  const { data, error } = await admin.rpc('reserve_study_legacy_claim', {
    request_username: username, request_id: requestId,
  })
  if (error) return result(503)
  const claim = data?.[0] as { user_id: string; legacy_username: string } | undefined
  if (!claim) return result(403)

  let release = true
  try {
    const legacy = await fetch(legacyEndpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auth', user: claim.legacy_username, pin }),
    })
    if (!legacy.ok) return result(legacy.status === 403 || legacy.status === 404 ? 403 : 503)
    const source = await legacy.json()
    if (source.ok !== true || !source.data || typeof source.data !== 'object') return result(503)
    const profile: UserProfile = {
      name: claim.legacy_username, createdAt: Date.now(), goals: [],
      dailyQuota: { triage: 15, spotcheck: 5, newWords: 20 }, progress: {},
      ...source.data,
    }
    const snapshot = mapEnglishProfile(profile, STUDY_CONTENT_VERSION)
    const refreshed = await admin.rpc('refresh_study_legacy_baseline', {
      target_user: claim.user_id, request_id: requestId,
      source_preferences: snapshot.preferences, source_states: snapshot.learningStates,
    })
    if (refreshed.error) return result(503)

    // Hold the reservation until it expires if the outcome of the Auth request is unknown.
    release = false
    const updated = await admin.auth.admin.updateUserById(claim.user_id, {
      password, app_metadata: { study_legacy_pending: false },
    })
    if (updated.error) return result(503)
    release = true
    return result(200)
  } catch {
    return result(503)
  } finally {
    if (release) await admin.rpc('release_study_legacy_claim', { target_user: claim.user_id, request_id: requestId })
  }
})
