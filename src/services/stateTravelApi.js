import { loadStoredStates, saveStoredStates } from '../utils/storage'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const DEV_EDITOR_PHRASE = import.meta.env.VITE_DEV_EDITOR_PHRASE
const ADMIN_TOKEN_KEY = 'statesAtlasAdminToken'
const LEGACY_ADMIN_TOKEN_KEY = 'states-atlas.admin-token.v1'
const CONFIG_MESSAGE = 'Editor unlock is not configured yet. Check the Supabase function and secrets.'
const WRONG_SECRET_MESSAGE = 'That secret phrase doesn’t match. Try again.'

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function isLocalDevHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

function getHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

function toStateEntry(row) {
  return {
    code: row.state_code,
    name: row.state_name,
    status: row.status,
    firstVisitedYear: row.first_visited_year ?? '',
    favoriteMemory: row.favorite_memory ?? '',
    badges: row.badges ?? [],
    vibeRating: row.vibe_rating ?? 0,
    honorableMention: Boolean(row.honorable_mention),
    citiesVisited: row.cities_visited ?? [],
    parksVisited: row.parks_visited ?? [],
    updatedAt: row.updated_at ?? '',
  }
}

function toDatabaseEntry(entry) {
  return {
    state_code: entry.code,
    state_name: entry.name,
    status: entry.status,
    first_visited_year: entry.firstVisitedYear || null,
    favorite_memory: entry.favoriteMemory || null,
    badges: entry.badges ?? [],
    vibe_rating: entry.vibeRating || null,
    honorable_mention: Boolean(entry.honorableMention),
    cities_visited: entry.citiesVisited ?? [],
    parks_visited: entry.parksVisited ?? [],
  }
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.error || 'The atlas request failed.')
    error.status = response.status
    error.details = payload.details
    throw error
  }

  return payload
}

async function readJsonPayload(response) {
  return response.json().catch(() => ({}))
}

export function getStoredAdminToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY)
    || window.sessionStorage.getItem(LEGACY_ADMIN_TOKEN_KEY)
    || ''
}

export function storeAdminToken(token) {
  if (typeof window === 'undefined' || !token) return
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  window.sessionStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY)
}

export async function fetchStateTravelEntries() {
  if (!isSupabaseConfigured) {
    return loadStoredStates() ?? []
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/state_travel_entries?select=*`, {
    headers: getHeaders(),
  })
  const rows = await readJsonResponse(response)

  return rows.map(toStateEntry)
}

export async function upsertStateTravelEntry(entry, auth = {}) {
  if (!isSupabaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    const nextStates = storedStates.some((state) => state.code === entry.code)
      ? storedStates.map((state) => (state.code === entry.code ? entry : state))
      : [...storedStates, entry]
    saveStoredStates(nextStates)
    return { entry, adminToken: auth.adminToken || '' }
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/states-admin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      action: 'upsert',
      adminToken: auth.adminToken || undefined,
      entry: toDatabaseEntry(entry),
      secretPhrase: auth.secretPhrase || undefined,
    }),
  })
  const payload = await readJsonResponse(response)

  return {
    adminToken: payload.adminToken,
    entry: toStateEntry(payload.entry),
  }
}

export async function validateEditorAccess({ adminToken, secretPhrase } = {}) {
  const trimmedPhrase = typeof secretPhrase === 'string' ? secretPhrase.trim() : ''
  const token = typeof adminToken === 'string' ? adminToken.trim() : ''

  if (!isSupabaseConfigured) {
    if (isLocalDevHost() && DEV_EDITOR_PHRASE) {
      if (
        (trimmedPhrase && trimmedPhrase === DEV_EDITOR_PHRASE)
        || (token && token.startsWith('dev-editor:'))
      ) {
        return { adminToken: token || `dev-editor:${Date.now()}`, ok: true }
      }

      return {
        adminToken: '',
        message: WRONG_SECRET_MESSAGE,
        ok: false,
      }
    }

    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  let response
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/states-admin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        adminToken: token || undefined,
        action: 'validate',
        secretPhrase: trimmedPhrase || undefined,
      }),
    })
  } catch (error) {
    console.warn('states-admin validation request failed.', error instanceof Error ? error.message : error)
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  const payload = await readJsonPayload(response)

  if (response.status === 401) {
    return {
      adminToken: '',
      message: WRONG_SECRET_MESSAGE,
      ok: false,
    }
  }

  if (!response.ok) {
    console.warn('states-admin validation failed.', {
      error: payload.error,
      status: response.status,
    })
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  const returnedToken = typeof payload.adminToken === 'string' ? payload.adminToken.trim() : ''

  if (payload.ok !== true || !returnedToken) {
    console.warn('states-admin validation returned an invalid success payload.', {
      hasAdminToken: Boolean(returnedToken),
      ok: payload.ok,
    })
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  return {
    adminToken: returnedToken,
    ok: true,
  }
}

export async function validateAdminSecret(secretPhrase) {
  return validateEditorAccess({ secretPhrase })
}

export async function deleteStateTravelEntry(entryIdOrStateCode, auth = {}) {
  if (!isSupabaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    saveStoredStates(storedStates.filter((state) => state.code !== entryIdOrStateCode && state.id !== entryIdOrStateCode))
    return { success: true, adminToken: auth.adminToken || '' }
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/states-admin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      action: 'delete',
      adminToken: auth.adminToken || undefined,
      id: entryIdOrStateCode.length === 2 ? undefined : entryIdOrStateCode,
      secretPhrase: auth.secretPhrase || undefined,
      state_code: entryIdOrStateCode.length === 2 ? entryIdOrStateCode : undefined,
    }),
  })

  return readJsonResponse(response)
}
