import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseDb, getFirebaseFunctions, isFirebaseConfigured } from './firebaseClient'
import { loadStoredStates, saveStoredStates } from '../utils/storage'

const ADMIN_TOKEN_KEY = 'statesAtlasAdminToken'
const LEGACY_ADMIN_TOKEN_KEY = 'states-atlas.admin-token.v1'
const CONFIG_MESSAGE = 'Editor unlock is not configured yet. Check the Firebase function and secrets.'
const WRONG_SECRET_MESSAGE = 'That secret phrase doesn’t match. Try again.'
const ENTRIES_COLLECTION = 'stateTravelEntries'
const ADMIN_FUNCTION = 'statesAdmin'

export { isFirebaseConfigured }

function toIsoDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value.toDate instanceof Function) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return ''
}

function toStateEntry(row = {}) {
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
    updatedAt: toIsoDate(row.updated_at),
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

function getCallable() {
  const functions = getFirebaseFunctions()
  if (!functions) return null
  return httpsCallable(functions, ADMIN_FUNCTION)
}

function getCallableStatus(error) {
  const code = error?.code || ''
  return code.includes('unauthenticated') || code.includes('permission-denied') ? 401 : 500
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
  if (!isFirebaseConfigured) {
    return loadStoredStates() ?? []
  }

  const db = getFirebaseDb()
  const snapshot = await getDocs(query(collection(db, ENTRIES_COLLECTION), orderBy('state_code')))

  return snapshot.docs.map((doc) => toStateEntry({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function upsertStateTravelEntry(entry, auth = {}) {
  if (!isFirebaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    const nextStates = storedStates.some((state) => state.code === entry.code)
      ? storedStates.map((state) => (state.code === entry.code ? entry : state))
      : [...storedStates, entry]
    saveStoredStates(nextStates)
    return { entry, adminToken: auth.adminToken || '' }
  }

  const callAdmin = getCallable()
  if (!callAdmin) {
    const error = new Error(CONFIG_MESSAGE)
    error.status = 500
    throw error
  }

  try {
    const result = await callAdmin({
      action: 'upsert',
      adminToken: auth.adminToken || undefined,
      entry: toDatabaseEntry(entry),
      secretPhrase: auth.secretPhrase || undefined,
    })

    return {
      adminToken: result.data?.adminToken,
      entry: toStateEntry(result.data?.entry),
    }
  } catch (error) {
    const status = getCallableStatus(error)
    const nextError = new Error(status === 401 ? WRONG_SECRET_MESSAGE : (error.message || CONFIG_MESSAGE))
    nextError.status = status
    throw nextError
  }
}

export async function validateEditorAccess({ adminToken, secretPhrase } = {}) {
  const trimmedPhrase = typeof secretPhrase === 'string' ? secretPhrase.trim() : ''
  const token = typeof adminToken === 'string' ? adminToken.trim() : ''

  if (!isFirebaseConfigured) {
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  const callAdmin = getCallable()
  if (!callAdmin) {
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  let result
  try {
    result = await callAdmin({
      action: 'validate',
      adminToken: token || undefined,
      secretPhrase: trimmedPhrase || undefined,
    })
  } catch (error) {
    const status = getCallableStatus(error)
    if (status === 401) {
      return {
        adminToken: '',
        message: WRONG_SECRET_MESSAGE,
        ok: false,
      }
    }

    console.warn('statesAdmin validation request failed.', error instanceof Error ? error.message : error)
    return {
      adminToken: '',
      message: CONFIG_MESSAGE,
      ok: false,
    }
  }

  const returnedToken = typeof result.data?.adminToken === 'string'
    ? result.data.adminToken.trim()
    : ''

  if (result.data?.ok !== true || !returnedToken) {
    console.warn('statesAdmin validation returned an invalid success payload.', {
      hasAdminToken: Boolean(returnedToken),
      ok: result.data?.ok,
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
  if (!isFirebaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    saveStoredStates(storedStates.filter((state) => state.code !== entryIdOrStateCode && state.id !== entryIdOrStateCode))
    return { success: true, adminToken: auth.adminToken || '' }
  }

  const callAdmin = getCallable()
  if (!callAdmin) {
    const error = new Error(CONFIG_MESSAGE)
    error.status = 500
    throw error
  }

  try {
    const result = await callAdmin({
      action: 'delete',
      adminToken: auth.adminToken || undefined,
      id: /^([A-Z]{2}|CAN)$/.test(entryIdOrStateCode) ? undefined : entryIdOrStateCode,
      secretPhrase: auth.secretPhrase || undefined,
      state_code: /^([A-Z]{2}|CAN)$/.test(entryIdOrStateCode) ? entryIdOrStateCode : undefined,
    })

    return result.data
  } catch (error) {
    const status = getCallableStatus(error)
    const nextError = new Error(status === 401 ? WRONG_SECRET_MESSAGE : (error.message || CONFIG_MESSAGE))
    nextError.status = status
    throw nextError
  }
}
